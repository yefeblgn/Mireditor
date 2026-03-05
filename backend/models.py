from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)


class UserSetting(Base):
    __tablename__ = "user_settings"
    setting_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    theme = Column(Enum("light", "dark", "system"), default="dark")
    language = Column(String(5), default="tr-TR")
    auto_save = Column(Boolean, default=True)


class Draft(Base):
    __tablename__ = "drafts"
    draft_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    title = Column(String(255), default="Adsız Taslak")
    file_path = Column(String(500), nullable=False)
    file_size_kb = Column(Integer)
    last_modified = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_cloud_synced = Column(Boolean, default=False)


class AiUsageLog(Base):
    __tablename__ = "ai_usage_log"
    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    feature_name = Column(String(100))
    tokens_used = Column(Integer, default=1)
    used_at = Column(DateTime, default=datetime.utcnow)


class AppUpdate(Base):
    __tablename__ = "app_updates"
    update_id = Column(Integer, primary_key=True, autoincrement=True)
    version_number = Column(String(20), nullable=False)
    platform = Column(Enum("windows", "macos", "linux"), nullable=False)
    download_url = Column(String(500), nullable=False)
    release_notes = Column(Text)
    is_critical = Column(Boolean, default=False)
    release_date = Column(DateTime, default=datetime.utcnow)

