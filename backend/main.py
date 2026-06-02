"""
Mireditor Backend — Python 3.14 / FastAPI / asyncmy
Yüksek performanslı, tam async, profesyonel mimari.
"""

from __future__ import annotations

import base64
import io
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional

import asyncmy
import jwt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import bcrypt as _bcrypt
from PIL import Image, ImageEnhance, ImageFilter
from pydantic import BaseModel, EmailStr, field_validator

load_dotenv()

# Windows terminali UTF-8 çıktısı için
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]

# ─── Rembg (opsiyonel — onnxruntime gerektirir) ───────────────────────────────

try:
    from rembg import remove as rembg_remove
    REMBG_AVAILABLE = True
except Exception:
    REMBG_AVAILABLE = False

# ─── Yapılandırma ─────────────────────────────────────────────────────────────

DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", "3306")),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "db":       os.getenv("DB_NAME",     "mireditor"),
    "autocommit": True,
}

JWT_SECRET  = os.getenv("JWT_SECRET", "local-dev-secret")
JWT_ALGO    = "HS256"
JWT_EXPIRE  = int(os.getenv("JWT_EXPIRE_DAYS", "7"))
APP_VERSION = os.getenv("APP_VERSION", "0.0.1")
PORT        = int(os.getenv("PORT", "3000"))

def _hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain[:72].encode(), _bcrypt.gensalt()).decode()

def _verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain[:72].encode(), hashed.encode())

# ─── Renkli Logger ────────────────────────────────────────────────────────────

RESET = "\x1b[0m"; BOLD = "\x1b[1m"
CYAN = "\x1b[36m"; GREEN = "\x1b[32m"; YELLOW = "\x1b[33m"
RED = "\x1b[31m"; MAGENTA = "\x1b[35m"; GRAY = "\x1b[90m"

def _ts() -> str:
    return datetime.now().strftime("%d.%m.%Y %H:%M:%S")

def log_info(msg: str, ip: str = ""):
    ip_s = f" {GRAY}[{ip}]{RESET}" if ip else ""
    print(f"{CYAN}{BOLD}[INFO]{RESET}      {GRAY}[{_ts()}]{RESET}{ip_s} {msg}")

def log_warn(msg: str, ip: str = ""):
    ip_s = f" {GRAY}[{ip}]{RESET}" if ip else ""
    print(f"{YELLOW}{BOLD}[WARN]{RESET}      {GRAY}[{_ts()}]{RESET}{ip_s} {YELLOW}{msg}{RESET}", file=sys.stderr)

def log_error(msg: str, ip: str = ""):
    ip_s = f" {GRAY}[{ip}]{RESET}" if ip else ""
    print(f"{RED}{BOLD}[ERROR]{RESET}     {GRAY}[{_ts()}]{RESET}{ip_s} {RED}{msg}{RESET}", file=sys.stderr)

def log_important(msg: str, ip: str = ""):
    ip_s = f" {GRAY}[{ip}]{RESET}" if ip else ""
    print(f"{GREEN}{BOLD}[IMPORTANT]{RESET} {GRAY}[{_ts()}]{RESET}{ip_s} {GREEN}{BOLD}{msg}{RESET}")

def log_req(method: str, path: str, status_code: int, ip: str, ms: float):
    sc = GREEN if status_code < 400 else (YELLOW if status_code < 500 else RED)
    print(
        f"{MAGENTA}{BOLD}[REQ]{RESET}       {GRAY}[{_ts()}]{RESET} {GRAY}[{ip}]{RESET} "
        f"{BOLD}{method:<6}{RESET} {path:<35} {sc}{status_code}{RESET} {GRAY}{ms:.1f}ms{RESET}"
    )

# ─── DB Havuzu ────────────────────────────────────────────────────────────────

_pool: asyncmy.Pool | None = None

async def get_pool() -> asyncmy.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncmy.create_pool(**DB_CONFIG, minsize=2, maxsize=20)
    return _pool

async def get_conn():
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn

# ─── DB Başlatma ──────────────────────────────────────────────────────────────

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS drafts (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NOT NULL,
    title      VARCHAR(255) NOT NULL DEFAULT 'Adsız',
    data       LONGTEXT     NOT NULL,
    size_bytes INT          DEFAULT 0,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""

async def init_db():
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            for stmt in SCHEMA.strip().split(";"):
                s = stmt.strip()
                if s:
                    await cur.execute(s)
    log_important("Veritabanı tabloları hazır.")

# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log_important(f"Mireditor Backend başlatılıyor — http://localhost:{PORT}")
    log_info(f"rembg (arka plan kaldirma): {'[OK] aktif' if REMBG_AVAILABLE else '[--] devre disi'}")
    try:
        await init_db()
    except Exception as e:
        log_error(f"DB başlatma hatası: {e}")
    yield
    global _pool
    if _pool:
        _pool.close()
        await _pool.wait_closed()
    log_info("Sunucu kapatıldı.")

# ─── Uygulama ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Mireditor API",
    version=APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request Logger Middleware ────────────────────────────────────────────────

@app.middleware("http")
async def request_logger(request: Request, call_next):
    start = time.perf_counter()
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or \
         (request.client.host if request.client else "-")
    response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    log_req(request.method, request.url.path, response.status_code, ip, ms)
    return response

# ─── JWT Yardımcıları ─────────────────────────────────────────────────────────

def create_token(user_id: int, username: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE)
    return jwt.encode({"sub": str(user_id), "username": username, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGO)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi dolmuş.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token.")

async def current_user(request: Request) -> dict:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token gerekli.")
    return decode_token(auth[7:])

# ─── Pydantic Modeller ────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("username")
    @classmethod
    def username_len(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Kullanıcı adı en az 2 karakter olmalıdır.")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_len(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Şifre en az 6 karakter olmalıdır.")
        return v

class LoginIn(BaseModel):
    username: str
    password: str

class DraftSaveIn(BaseModel):
    title: str = "Adsız"
    data: str  # GEF JSON

class ImageFilterIn(BaseModel):
    image: str           # base64 data URL veya saf base64
    operation: str       # brightness|contrast|blur|sharpen|grayscale|sepia|saturate|hue_rotate
    value: float = 1.0   # 0.0 – 3.0 arası (işleme göre anlamlı aralık)

class RemoveBgIn(BaseModel):
    image: str           # base64 data URL

class UpscaleIn(BaseModel):
    image: str           # base64 data URL
    scale: float = 2.0   # 1.0 – 4.0

# ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────

def _decode_b64_image(b64: str) -> Image.Image:
    """base64 data URL veya ham base64 → PIL Image"""
    if b64.startswith("data:"):
        b64 = b64.split(",", 1)[1]
    data = base64.b64decode(b64)
    return Image.open(io.BytesIO(data)).convert("RGBA")

def _encode_png(img: Image.Image) -> str:
    """PIL Image → base64 PNG data URL"""
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

def _encode_jpeg(img: Image.Image, quality: int = 90) -> str:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=quality, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def _apply_sepia(img: Image.Image) -> Image.Image:
    r = img.convert("RGB")
    pixels = r.load()
    w, h = r.size
    for y in range(h):
        for x in range(w):
            pr, pg, pb = pixels[x, y]  # type: ignore
            tr = min(255, int(pr * 0.393 + pg * 0.769 + pb * 0.189))
            tg = min(255, int(pr * 0.349 + pg * 0.686 + pb * 0.168))
            tb = min(255, int(pr * 0.272 + pg * 0.534 + pb * 0.131))
            pixels[x, y] = (tr, tg, tb)  # type: ignore
    return r.convert("RGBA")

# ─── Routes — Auth ────────────────────────────────────────────────────────────

@app.post("/api/auth/register", status_code=201)
async def register(body: RegisterIn, request: Request, conn=Depends(get_conn)):
    ip = request.client.host if request.client else "-"
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM users WHERE username=%s OR email=%s LIMIT 1",
            (body.username, body.email.strip().lower()),
        )
        existing = await cur.fetchone()
        if existing:
            log_warn(f"Kayıt çakışması: {body.username} / {body.email}", ip)
            raise HTTPException(409, "Bu kullanıcı adı veya email zaten kayıtlı.")
        hashed = _hash_password(body.password)
        await cur.execute(
            "INSERT INTO users (username, email, password) VALUES (%s, %s, %s)",
            (body.username, body.email.strip().lower(), hashed),
        )
    log_important(f"Yeni kullanıcı: {body.username} <{body.email}>", ip)
    return {"message": "Hesap başarıyla oluşturuldu."}

@app.post("/api/auth/login")
async def login(body: LoginIn, request: Request, conn=Depends(get_conn)):
    ip = request.client.host if request.client else "-"
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, username, email, password FROM users WHERE username=%s LIMIT 1",
            (body.username.strip(),),
        )
        row = await cur.fetchone()
    if not row or not _verify_password(body.password, row[3]):
        log_warn(f"Giriş başarısız: {body.username}", ip)
        raise HTTPException(401, "Geçersiz kullanıcı adı veya şifre.")
    token = create_token(row[0], row[1])
    log_important(f"Giriş: {row[1]}", ip)
    return {"token": token, "user": {"id": row[0], "username": row[1], "email": row[2]}}

# ─── Routes — Sağlık ──────────────────────────────────────────────────────────

@app.get("/api/health")
async def health(conn=Depends(get_conn)):
    async with conn.cursor() as cur:
        await cur.execute("SELECT 1+1 AS r")
        row = await cur.fetchone()
    ok = row and row[0] == 2
    return {"status": "success" if ok else "error", "message": "Veritabanı bağlantısı aktif." if ok else "DB hatası"}

# ─── Routes — Taslaklar ───────────────────────────────────────────────────────

@app.get("/api/drafts")
async def list_drafts(user=Depends(current_user), conn=Depends(get_conn)):
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, title, updated_at, LENGTH(data) AS size_bytes FROM drafts WHERE user_id=%s ORDER BY updated_at DESC",
            (int(user["sub"]),),
        )
        rows = await cur.fetchall()
    return [
        {"id": r[0], "title": r[1], "updated_at": r[2].isoformat() if r[2] else None, "size_bytes": r[3]}
        for r in rows
    ]

@app.get("/api/drafts/{draft_id}")
async def get_draft(draft_id: int, user=Depends(current_user), conn=Depends(get_conn)):
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id, title, data, updated_at FROM drafts WHERE id=%s AND user_id=%s LIMIT 1",
            (draft_id, int(user["sub"])),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(404, "Taslak bulunamadı.")
    return {"id": row[0], "title": row[1], "data": row[2], "updated_at": row[3].isoformat() if row[3] else None}

@app.post("/api/drafts/save", status_code=201)
async def save_draft(body: DraftSaveIn, request: Request, user=Depends(current_user), conn=Depends(get_conn)):
    ip = request.client.host if request.client else "-"
    uid = int(user["sub"])
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM drafts WHERE user_id=%s AND title=%s LIMIT 1",
            (uid, body.title),
        )
        existing = await cur.fetchone()
        if existing:
            await cur.execute(
                "UPDATE drafts SET data=%s, updated_at=NOW() WHERE id=%s",
                (body.data, existing[0]),
            )
            log_info(f"Taslak güncellendi: \"{body.title}\" ({user['username']})", ip)
            return {"id": existing[0], "updated": True}
        await cur.execute(
            "INSERT INTO drafts (user_id, title, data) VALUES (%s, %s, %s)",
            (uid, body.title, body.data),
        )
        new_id = cur.lastrowid
    log_important(f"Taslak kaydedildi: \"{body.title}\" ({user['username']})", ip)
    return {"id": new_id, "updated": False}

@app.delete("/api/drafts/{draft_id}")
async def delete_draft(draft_id: int, request: Request, user=Depends(current_user), conn=Depends(get_conn)):
    ip = request.client.host if request.client else "-"
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM drafts WHERE id=%s AND user_id=%s",
            (draft_id, int(user["sub"])),
        )
        affected = cur.rowcount
    if not affected:
        raise HTTPException(404, "Taslak bulunamadı.")
    log_info(f"Taslak silindi: id={draft_id} ({user['username']})", ip)
    return {"deleted": True}

# ─── Routes — AI Görüntü İşleme ───────────────────────────────────────────────

@app.post("/api/ai/filter")
async def ai_filter(body: ImageFilterIn):
    """
    Pillow tabanlı sunucu taraflı görüntü filtreleri.
    operation: brightness|contrast|blur|sharpen|grayscale|sepia|saturate
    value: filtre şiddeti (1.0 = orijinal)
    """
    try:
        img = _decode_b64_image(body.image)
        op = body.operation.lower()
        v = max(0.0, min(5.0, body.value))

        if op == "brightness":
            out = ImageEnhance.Brightness(img).enhance(v)
        elif op == "contrast":
            out = ImageEnhance.Contrast(img).enhance(v)
        elif op == "saturate":
            out = ImageEnhance.Color(img).enhance(v)
        elif op == "sharpen":
            out = ImageEnhance.Sharpness(img).enhance(v)
        elif op == "blur":
            radius = max(0.0, v * 3)
            out = img.filter(ImageFilter.GaussianBlur(radius=radius))
        elif op == "grayscale":
            out = img.convert("L").convert("RGBA")
        elif op == "sepia":
            out = _apply_sepia(img)
        else:
            raise HTTPException(422, f"Bilinmeyen işlem: {op}")

        return {"result": _encode_png(out), "operation": op, "value": v}
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"AI filter hatası: {e}")
        raise HTTPException(500, f"Görüntü işleme hatası: {str(e)}")

@app.post("/api/ai/remove-bg")
async def ai_remove_bg(body: RemoveBgIn):
    """
    Arka plan kaldırma.
    rembg kuruluysa: derin öğrenme modeli (U²-Net) kullanılır.
    Değilse: kenar tespiti + alpha maskeleme fallback.
    """
    try:
        img = _decode_b64_image(body.image)
        if REMBG_AVAILABLE:
            # rembg: RGBA çıktı, arka plan transparan
            buf_in = io.BytesIO()
            img.save(buf_in, format="PNG")
            buf_in.seek(0)
            result_bytes = rembg_remove(buf_in.read())
            out = Image.open(io.BytesIO(result_bytes)).convert("RGBA")
        else:
            # Fallback: kenarları yumuşat, basit eşikleme
            gray = img.convert("L")
            mask = gray.point(lambda p: 255 if p > 240 else 0)
            out = img.copy()
            out.putalpha(Image.eval(mask, lambda p: 255 - p))
        return {"result": _encode_png(out), "engine": "rembg" if REMBG_AVAILABLE else "fallback"}
    except Exception as e:
        log_error(f"Remove-bg hatası: {e}")
        raise HTTPException(500, f"Arka plan kaldırma hatası: {str(e)}")

@app.post("/api/ai/upscale")
async def ai_upscale(body: UpscaleIn):
    """
    Pillow Lanczos ile yüksek kaliteli büyütme.
    scale: 1.0 – 4.0 (varsayılan 2.0)
    """
    try:
        img = _decode_b64_image(body.image)
        scale = max(1.0, min(4.0, body.scale))
        nw = int(img.width * scale)
        nh = int(img.height * scale)
        if nw > 8000 or nh > 8000:
            raise HTTPException(422, "Büyütülmüş görüntü maksimum 8000×8000 px'i geçemez.")
        out = img.resize((nw, nh), Image.LANCZOS)
        return {"result": _encode_png(out), "original": f"{img.width}×{img.height}", "upscaled": f"{nw}×{nh}"}
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Upscale hatası: {e}")
        raise HTTPException(500, f"Büyütme hatası: {str(e)}")

@app.post("/api/ai/batch-filter")
async def ai_batch_filter(body: dict):
    """
    Birden fazla filtreyi sırayla uygula.
    body: { image: str, operations: [{op, value}, ...] }
    """
    try:
        img = _decode_b64_image(body["image"])
        ops = body.get("operations", [])
        for step in ops:
            single = ImageFilterIn(image=_encode_png(img), operation=step["op"], value=step.get("value", 1.0))
            result = await ai_filter(single)
            img = _decode_b64_image(result["result"])
        return {"result": _encode_png(img), "steps": len(ops)}
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Batch filter hatası: {e}")
        raise HTTPException(500, str(e))

# ─── Routes — Sistem ──────────────────────────────────────────────────────────

@app.get("/api")
async def root():
    return {
        "name": "Mireditor API",
        "version": APP_VERSION,
        "python": sys.version,
        "rembg": REMBG_AVAILABLE,
        "docs": "/api/docs",
    }

@app.get("/api/capabilities")
async def capabilities():
    """Frontend'e hangi AI özelliklerinin kullanılabilir olduğunu bildir."""
    return {
        "filter":    True,
        "remove_bg": REMBG_AVAILABLE,
        "upscale":   True,
        "batch":     True,
    }

# ─── Giriş Noktası ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=True,
        log_level="warning",  # uvicorn kendi logunu sustur — bizimki daha güzel
    )
