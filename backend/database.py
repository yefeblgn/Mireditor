import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite for local testing if MySQL is not available
DATABASE_URL = "sqlite+aiosqlite:///./mireditor.db"

engine = create_async_engine(DATABASE_URL, echo=True, future=True)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

# Bağımlılık (Dependency)
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
