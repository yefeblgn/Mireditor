import os
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables
load_dotenv()

MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_DB = os.getenv("MYSQL_DB")

# Standard MySQL connection string (Sync)
# phpMyAdmin ile uyumlu standart pymysql sürücüsü kullanılır
if MYSQL_USER:
    safe_password = urllib.parse.quote_plus(MYSQL_PASSWORD or "")
    DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{safe_password}@{MYSQL_HOST}:3306/{MYSQL_DB}"
else:
    DATABASE_URL = "sqlite:///./mireditor.db"

# Sync engine
if MYSQL_USER:
    engine = create_engine(
        DATABASE_URL,
        echo=True,
        pool_pre_ping=True,
        pool_recycle=10,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
    )
else:
    engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# Bağımlılık (Dependency)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

