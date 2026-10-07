"""Pydantic schemas — structured errors per P07 (TEST-api)."""
from __future__ import annotations

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


class CalendarConvertIn(BaseModel):
    direction: Literal["jalali_to_gregorian", "gregorian_to_jalali"]
    year: int
    month: int
    day: int


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict | None = None
