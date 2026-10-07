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
