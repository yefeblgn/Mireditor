from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import engine, Base, get_db

app = FastAPI(title="Mireditor API", version="1.0.0")

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

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "Bağlantı Başarılı (Async)"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
