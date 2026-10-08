"""SQLAlchemy models for the AstroBinesh platform."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), default="user")  # user | admin | astrologer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profiles = relationship("BirthProfile", back_populates="owner", cascade="all, delete-orphan")
    dreams = relationship("DreamEntry", back_populates="owner", cascade="all, delete-orphan")
    shared_profiles = relationship(
        "ProfileShare", back_populates="shared_with_user", cascade="all, delete-orphan"
    )


class BirthProfile(Base):
    __tablename__ = "birth_profiles"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    display_name = Column(String(120), nullable=False)
    calendar = Column(String(10), default="jalali")  # jalali | gregorian
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    day = Column(Integer, nullable=False)
    hour = Column(Integer, default=0)
    minute = Column(Integer, default=0)
    tz_offset = Column(Float, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    time_precision = Column(String(15), default="exact")  # exact | approximate | unknown
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="profiles")
    shares = relationship("ProfileShare", back_populates="profile", cascade="all, delete-orphan")
    calculations = relationship("Calculation", back_populates="profile", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="profile", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("owner_id", "display_name", name="uq_owner_profile_name"),)


class ProfileShare(Base):
    __tablename__ = "profile_shares"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("birth_profiles.id"), nullable=False)
    shared_with_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    permission = Column(String(20), default="view")  # view | edit | admin
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("BirthProfile", back_populates="shares")
    shared_with_user = relationship("User", back_populates="shared_profiles")

    __table_args__ = (UniqueConstraint("profile_id", "shared_with_user_id", name="uq_share"),)


class Calculation(Base):
    __tablename__ = "calculations"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("birth_profiles.id"), nullable=False)
    chart_type = Column(String(20), default="D1")  # D1 | D9 | etc.
    result_json = Column(Text, nullable=False)
    engine_version = Column(String(30))
    input_hash = Column(String(64), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("BirthProfile", back_populates="calculations")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("birth_profiles.id"), nullable=False)
    report_type = Column(String(30), default="full")  # full | pdf | transit | synastry
    status = Column(String(20), default="queued")  # queued | running | succeeded | failed
    result_url = Column(Text)
    error_message = Column(Text)
    job_id = Column(String(120), index=True)
    result_json = Column(Text)
    idempotency_key = Column(String(120))
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    profile = relationship("BirthProfile", back_populates="reports")

    __table_args__ = (UniqueConstraint("profile_id", "idempotency_key", name="uq_report_idem"),)


class DreamEntry(Base):
    __tablename__ = "dream_entries"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(160), default="")
    text = Column(Text, nullable=False)
    mood = Column(String(30), default="")
    reflection = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    reflected_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="dreams")
