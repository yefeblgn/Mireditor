from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, select
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from database import engine, Base, get_db
from models import User, Draft, AppUpdate
from pydantic import BaseModel
from packaging import version as pkg_version
import hashlib
import secrets
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

app = FastAPI(title="Mireditor API", version="1.0.0")

class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, password_hash: str) -> bool:
    return hash_password(plain_password) == password_hash

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    # Sync create_all
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Mireditor Core API Çalışıyor. C# & React Native için hazır."}

@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.email == request.username) | (User.username == request.username)
    ).first()

    if user and verify_password(request.password, user.password_hash):
        return {
            "token": f"mireditor_jwt_{user.user_id}_{secrets.token_hex(16)}",
            "user": {
                "id": user.user_id,
                "username": user.username,
                "email": user.email,
                "role": "poweruser"
            }
        }

    # Fallback: Mock login (admin/123)
    if request.username == "admin" and request.password == "123":
        return {
            "token": "mireditor_premium_jwt_token_2026",
            "user": {"id": 1, "username": "admin", "role": "poweruser"}
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz kullanıcı adı veya şifre"
    )

@app.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if len(request.username.strip()) < 2:
        raise HTTPException(status_code=422, detail="Kullanıcı adı en az 2 karakter olmalıdır.")
    if len(request.password) < 6:
        raise HTTPException(status_code=422, detail="Şifre en az 6 karakter olmalıdır.")

    email_lower = request.email.strip().lower()
    username_clean = request.username.strip()

    # Email veya username unique kontrolü
    existing = db.query(User).filter(
        (User.email == email_lower) | (User.username == username_clean)
    ).first()
    if existing:
        if existing.email == email_lower:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu email adresi zaten kayıtlı.")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu kullanıcı adı zaten alınmış.")

    new_user = User(
        username=username_clean,
        email=email_lower,
        password_hash=hash_password(request.password),
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
    except OperationalError as e:
        logger.error(f"DB OperationalError on register: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Veritabani baglantisi gecici olarak kesildi. Lutfen tekrar deneyin."
        )
    except SQLAlchemyError as e:
        logger.error(f"DB error on register: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Veritabani islemi sirasinda bir hata olustu."
        )

    return {
        "message": "Kayıt başarılı",
        "user": {
            "id": new_user.user_id,
            "username": new_user.username,
            "email": new_user.email,
        }
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "Baglanti Basarili"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─── Auto Update Check ───
@app.get("/check-update")
def check_update(
    current_version: str = "0.0.1",
    platform: str = "windows",
    db: Session = Depends(get_db),
):
    """Mevcut sürümü kontrol et, yeni sürüm varsa bildir."""
    try:
        # En son sürümü bul (release_date'e göre en yeni)
        result = db.execute(
            select(AppUpdate)
            .where(AppUpdate.platform == platform)
            .order_by(AppUpdate.release_date.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()

        if not latest:
            return {
                "update_available": False,
                "current_version": current_version,
                "message": "Güncelleme bilgisi bulunamadı",
            }

        # Sürüm karşılaştır
        try:
            has_update = pkg_version.parse(latest.version_number) > pkg_version.parse(current_version)
        except Exception:
            has_update = latest.version_number != current_version

        if has_update:
            return {
                "update_available": True,
                "current_version": current_version,
                "latest_version": latest.version_number,
                "download_url": latest.download_url,
                "release_notes": latest.release_notes,
                "is_critical": latest.is_critical,
                "release_date": latest.release_date.isoformat() if latest.release_date else None,
            }
        else:
            return {
                "update_available": False,
                "current_version": current_version,
                "latest_version": latest.version_number,
                "message": "Güncel sürümdesiniz",
            }
    except Exception as e:
        # DB hatası durumunda güncelleme kontrolünü atla
        return {
            "update_available": False,
            "current_version": current_version,
            "message": f"Güncelleme kontrolü başarısız: {str(e)}",
        }


@app.get("/drafts/{user_id}")
def get_user_drafts(user_id: int, db: Session = Depends(get_db)):
    """Kullanıcının taslak/projelerini getir"""
    drafts = db.query(Draft).filter(Draft.user_id == user_id).order_by(Draft.last_modified.desc()).all()

    return {
        "drafts": [
            {
                "id": d.draft_id,
                "title": d.title,
                "file_path": d.file_path,
                "file_size_kb": d.file_size_kb,
                "last_modified": d.last_modified.isoformat() if d.last_modified else None,
                "is_cloud_synced": d.is_cloud_synced,
            }
            for d in drafts
        ]
    }
