"""Pydantic schemas — structured errors per P07 (TEST-api)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class BirthInput(BaseModel):
    calendar: Literal["jalali", "gregorian"] = "jalali"
    year: int = Field(..., ge=1200, le=2100, description="jalali ~1200-1500 or gregorian 1900-2100")
    month: int = Field(..., ge=1, le=12)
    day: int = Field(..., ge=1, le=31)
    hour: int = Field(..., ge=0, le=23)
    minute: int = Field(..., ge=0, le=59)
    tz_offset: float = Field(..., ge=-12, le=14, description="e.g. 3.5 for Asia/Tehran")
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    node: Literal["mean", "true"] = Field("mean", description="Rahu/Ketu: mean or true node")
    tz: str | None = Field(
        None, description="IANA zone (e.g. Asia/Tehran). When given, the UTC offset is derived "
                          "from tzdb for the birth date and `tz_offset` is ignored.")
    fold: int | None = Field(None, ge=0, le=1, description="resolves a repeated local hour")
    time_precision: Literal["exact", "approximate", "unknown"] = Field(
        default="exact", description="P05-T05: unknown omits time-sensitive outputs")


class CalendarConvertIn(BaseModel):
    direction: Literal["jalali_to_gregorian", "gregorian_to_jalali"]
    year: int
    month: int
    day: int


class TimezoneConvertIn(BaseModel):
    """Local wall time -> UTC using IANA rules (P05-T04)."""
    year: int = Field(..., ge=1800, le=2200)
    month: int = Field(..., ge=1, le=12)
    day: int = Field(..., ge=1, le=31)
    hour: int = Field(..., ge=0, le=23)
    minute: int = Field(..., ge=0, le=59)
    tz: str = Field(..., min_length=1, description="IANA zone, e.g. Asia/Tehran")
    fold: int | None = Field(None, ge=0, le=1, description="0/1 resolves an ambiguous (repeated) hour")


class SynastryInput(BaseModel):
    """Two natal charts; `a` is the reference chart (P08-T02)."""
    a: BirthInput
    b: BirthInput


class TransitScanInput(BaseModel):
    """Transit scan up to 90 days from a UTC start (P08-T03)."""
    natal: BirthInput
    start_utc: datetime = Field(..., description="UTC start of the scan window; naive values are treated as UTC")
    days: int = Field(30, ge=0, le=90, description="scan length in days (max 90)")


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict | None = None


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=80)
    email: str = Field(..., max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(..., min_length=8, max_length=128)


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    role: str

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileIn(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=120)
    calendar: Literal["jalali", "gregorian"] = "jalali"
    year: int = Field(..., ge=1200, le=2100)
    month: int = Field(..., ge=1, le=12)
    day: int = Field(..., ge=1, le=31)
    hour: int = Field(0, ge=0, le=23)
    minute: int = Field(0, ge=0, le=59)
    tz_offset: float = Field(..., ge=-12, le=14)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    time_precision: Literal["exact", "approximate", "unknown"] = "exact"


class ProfileOut(ProfileIn):
    id: int
    owner_id: int

    model_config = {"from_attributes": True}


class RectifyEventIn(BaseModel):
    type: str
    calendar: Literal["jalali", "gregorian"] = "jalali"
    year: int = Field(..., ge=1200, le=2100)
    month: int = Field(1, ge=1, le=12)
    day: int = Field(1, ge=1, le=31)
    precision: Literal["day", "month", "year"] = "day"


class RectifyIn(BaseModel):
    """Estimate the birth time from life events (set-valued, never a single minute)."""
    calendar: Literal["jalali", "gregorian"] = "jalali"
    year: int = Field(..., ge=1200, le=2100)
    month: int = Field(..., ge=1, le=12)
    day: int = Field(..., ge=1, le=31)
    tz: str | None = None
    tz_offset: float = Field(3.5, ge=-12, le=14)
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    window_from: str = Field("00:00", pattern=r"^\d{2}:\d{2}$")
    window_to: str = Field("23:59", pattern=r"^\d{2}:\d{2}$")
    approx_time: str | None = Field(None, pattern=r"^\d{2}:\d{2}$",
                                    description="best remembered time; used as a soft prior")
    approx_sigma_min: int = Field(90, ge=5, le=360)
    events: list[RectifyEventIn] = Field(..., min_length=1, max_length=14)
    step_minutes: int = Field(4, ge=1, le=15)
    permutations: int = Field(60, ge=0, le=200)
