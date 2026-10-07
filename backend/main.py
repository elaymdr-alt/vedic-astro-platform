"""FastAPI backend — health, cities, calendar, chart (P05 + P07-T03 subset)."""
from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine import compute_chart  # noqa: E402
from engine.calendar import (  # noqa: E402
    gregorian_to_jalali, is_valid_jalali, jalali_to_gregorian,
)
from backend.cities import search_cities  # noqa: E402
from backend.schemas import BirthInput, CalendarConvertIn  # noqa: E402

app = FastAPI(title="Vedic Astro API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}


@app.get("/cities")
def cities(q: str = Query(default=""), limit: int = Query(default=8, le=20)) -> dict:
    return {"items": search_cities(q, limit)}


@app.post("/calendar/convert")
def calendar_convert(body: CalendarConvertIn) -> dict:
    try:
        if body.direction == "jalali_to_gregorian":
            if not is_valid_jalali(body.year, body.month, body.day):
                raise HTTPException(status_code=422, detail={
                    "code": "INVALID_JALALI", "message": "تاریخ شمسی نامعتبر است"})
            gy, gm, gd = jalali_to_gregorian(body.year, body.month, body.day)
            return {"year": gy, "month": gm, "day": gd}
        gy, gm, gd = body.year, body.month, body.day
        jy, jm, jd = gregorian_to_jalali(gy, gm, gd)
        return {"year": jy, "month": jm, "day": jd}
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=422, detail={
            "code": "CONVERT_FAILED", "message": str(exc)})


@app.post("/chart/compute")
def chart_compute(body: BirthInput) -> dict:
    gy, gm, gd = body.year, body.month, body.day
    if body.calendar == "jalali":
        if not is_valid_jalali(body.year, body.month, body.day):
            raise HTTPException(status_code=422, detail={
                "code": "INVALID_JALALI", "message": "تاریخ شمسی نامعتبر است (مثل ۳۰ اسفند سال غیرکبیسه)"})
        gy, gm, gd = jalali_to_gregorian(body.year, body.month, body.day)
    try:
        chart = compute_chart(
            year=gy, month=gm, day=gd,
            hour_local=body.hour + body.minute / 60.0,
            tz_offset=body.tz_offset, lat=body.lat, lon=body.lon,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail={
            "code": "ENGINE_FAILED", "message": str(exc)})
    return {"input_gregorian": {"year": gy, "month": gm, "day": gd}, "chart": chart}
