from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserSetting(Base):
    __tablename__ = "user_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    theme = Column(String(50), default="dark")
    language = Column(String(10), default="tr")
    export_format = Column(String(20), default="png")
    
class Draft(Base):
    __tablename__ = "drafts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_name = Column(String(255))
    file_url = Column(String(500))
    file_size_kb = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

class AiUsageLog(Base):
    __tablename__ = "ai_usage_log"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    feature_used = Column(String(100))
    tokens_consumed = Column(Integer, default=1)
    used_at = Column(DateTime, default=datetime.utcnow)

class AppUpdate(Base):
    __tablename__ = "app_updates"
    update_id = Column(Integer, primary_key=True, autoincrement=True)
    version_number = Column(String(50), unique=True, index=True, nullable=False)
    platform = Column(String(50), default="windows")
    download_url = Column(String(500))
    release_notes = Column(Text)
    is_critical = Column(Boolean, default=False)
    release_date = Column(DateTime, default=datetime.utcnow)

