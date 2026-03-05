from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from database import engine, Base, get_db
from models import User, Draft, AppUpdate
from pydantic import BaseModel, EmailStr
from packaging import version as pkg_version
import hashlib
import secrets
from datetime import datetime

app = FastAPI(title="Mireditor API", version="1.0.0")

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str

# Basit password hash (prod'da bcrypt/argon2 kullan)
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}:{h}"

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, h = hashed.split(":")
        return hashlib.sha256((salt + password).encode()).hexdigest() == h
    except Exception:
        return False

# CORS (Frontend ile Backend haberleşmesi için)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Prod'da domainleri belirle
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        # Uyarı: Prod'da tabloları Alembic ile yönetin, create_all tehlikelidir
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {"message": "Mireditor Core API Çalışıyor. C# & React Native için hazır."}

@app.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Önce DB'den kullanıcı ara (email veya full_name ile)
    result = await db.execute(
        select(User).where(
            (User.email == request.username) | (User.full_name == request.username)
        )
    )
    user = result.scalar_one_or_none()

    if user and verify_password(request.password, user.password_hash):
        return {
            "token": f"mireditor_jwt_{user.id}_{secrets.token_hex(16)}",
            "user": {
                "id": user.id,
                "username": user.full_name,
                "email": user.email,
                "role": "poweruser"
            }
        }

    # Fallback: Mock login (admin/123) — geliştirme kolaylığı
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
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Validasyon
    if len(request.full_name.strip()) < 2:
        raise HTTPException(status_code=422, detail="Ad soyad en az 2 karakter olmalıdır.")
    if len(request.password) < 6:
        raise HTTPException(status_code=422, detail="Şifre en az 6 karakter olmalıdır.")

    # Email unique kontrolü
    result = await db.execute(
        select(User).where(User.email == request.email.strip().lower())
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu email adresi zaten kayıtlı."
        )

    # Yeni kullanıcı oluştur
    new_user = User(
        full_name=request.full_name.strip(),
        email=request.email.strip().lower(),
        password_hash=hash_password(request.password),
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "message": "Kayıt başarılı",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
        }
    }

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "Bağlantı Başarılı (Async)"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ─── Auto Update Check ───
@app.get("/check-update")
async def check_update(
    current_version: str = "0.0.1",
    platform: str = "windows",
    db: AsyncSession = Depends(get_db),
):
    """Mevcut sürümü kontrol et, yeni sürüm varsa bildir."""
    try:
        # En son sürümü bul (release_date'e göre en yeni)
        result = await db.execute(
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
async def get_user_drafts(user_id: int, db: AsyncSession = Depends(get_db)):
    """Kullanıcının taslak/projelerini getir"""
    result = await db.execute(
        select(Draft).where(Draft.user_id == user_id).order_by(Draft.created_at.desc())
    )
    drafts = result.scalars().all()

    return {
        "drafts": [
            {
                "id": d.id,
                "file_name": d.file_name,
                "file_url": d.file_url,
                "file_size_kb": d.file_size_kb,
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "color": "#3b82f6"
            }
            for d in drafts
        ]
    }
