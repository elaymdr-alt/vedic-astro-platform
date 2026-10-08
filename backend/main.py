"""FastAPI backend — health, cities, calendar, chart, time, synastry, transits (P05 + P07 + P08)."""
from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from datetime import timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine import compute_chart, interpret_chart  # noqa: E402
from engine.calendar import (  # noqa: E402
    gregorian_to_jalali, is_valid_jalali, jalali_to_gregorian,
)
from engine.ephemeris import EphemerisUnavailable  # noqa: E402
from engine.synastry import synastry as synastry_of  # noqa: E402
from engine.timezone import TimezoneError, local_to_utc  # noqa: E402
from engine.transit import transit_scan  # noqa: E402
from backend.cities import search_cities  # noqa: E402
from backend.database import init_db  # noqa: E402
from backend.routes import router as api_router  # noqa: E402
from backend.schemas import (  # noqa: E402
    BirthInput, CalendarConvertIn, SynastryInput, TimezoneConvertIn,
    TransitScanInput,
)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="AstroBinesh API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router)


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


def _build_chart(body: BirthInput) -> dict:
    """BirthInput -> engine chart dict; raises HTTPException on bad input."""
    gy, gm, gd = body.year, body.month, body.day
    if body.calendar == "jalali":
        if not is_valid_jalali(body.year, body.month, body.day):
            raise HTTPException(status_code=422, detail={
                "code": "INVALID_JALALI", "message": "تاریخ شمسی نامعتبر است (مثل ۳۰ اسفند سال غیرکبیسه)"})
        gy, gm, gd = jalali_to_gregorian(body.year, body.month, body.day)
    tz_offset = body.tz_offset
    if body.tz:
        # Historical/DST-aware offset from tzdb; ambiguous or non-existent local
        # times stop here and never reach the engine (P05 acceptance).
        try:
            tz_offset = local_to_utc(
                gy, gm, gd, body.hour, body.minute, body.tz, fold=body.fold,
            ).utc_offset_hours
        except TimezoneError as exc:
            raise HTTPException(status_code=422, detail={
                "code": exc.code, "message": exc.message, "details": exc.details or {}})
        except ValueError as exc:
            raise HTTPException(status_code=422, detail={
                "code": "INVALID_DATE", "message": str(exc)})
    try:
        return compute_chart(
            year=gy, month=gm, day=gd,
            hour_local=body.hour + body.minute / 60.0,
            tz_offset=tz_offset, lat=body.lat, lon=body.lon,
            time_precision=body.time_precision, node=body.node,
        )
    except EphemerisUnavailable as exc:
        raise HTTPException(status_code=503, detail={
            "code": "EPHEMERIS_UNAVAILABLE", "message": str(exc)})
    except Exception as exc:
        raise HTTPException(status_code=500, detail={
            "code": "ENGINE_FAILED", "message": str(exc)})


@app.post("/chart/compute")
def chart_compute(body: BirthInput) -> dict:
    gy, gm, gd = body.year, body.month, body.day
    if body.calendar == "jalali":
        if not is_valid_jalali(body.year, body.month, body.day):
            raise HTTPException(status_code=422, detail={
                "code": "INVALID_JALALI", "message": "تاریخ شمسی نامعتبر است (مثل ۳۰ اسفند سال غیرکبیسه)"})
        gy, gm, gd = jalali_to_gregorian(body.year, body.month, body.day)
    chart = _build_chart(body)
    return {"input_gregorian": {"year": gy, "month": gm, "day": gd}, "chart": chart}


@app.post("/time/convert")
def time_convert(body: TimezoneConvertIn) -> dict:
    """Local wall time -> UTC via IANA rules (P05-T04). Errors are structured."""
    try:
        conv = local_to_utc(
            body.year, body.month, body.day, body.hour, body.minute,
            body.tz, fold=body.fold,
        )
    except TimezoneError as exc:
        raise HTTPException(status_code=422, detail={
            "code": exc.code, "message": exc.message, "details": exc.details or {}})
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=422, detail={
            "code": "TIMEZONE_FAILED", "message": str(exc)})
    return {
        "utc": conv.utc.isoformat(),
        "utc_offset_hours": conv.utc_offset_hours,
        "ambiguous": conv.ambiguous,
        "fold": conv.fold,
        "confidence": conv.confidence,
    }


@app.post("/chart/interpret")
def chart_interpret(body: BirthInput) -> dict:
    """Traceable Persian report from a computed chart (P08-T05/T06)."""
    return {"report": interpret_chart(_build_chart(body))}


@app.post("/chart/synastry")
def chart_synastry(body: SynastryInput) -> dict:
    """Compare two natal charts; `a` is the reference (P08-T02)."""
    return {"synastry": synastry_of(_build_chart(body.a), _build_chart(body.b))}


@app.post("/transit/scan")
def transit_scan_endpoint(body: TransitScanInput) -> dict:
    """Ingresses + exact contacts vs a natal chart over ≤90 days (P08-T03/T04)."""
    natal = _build_chart(body.natal)
    start = body.start_utc
    if start.tzinfo is None:
        # Naive timestamps are interpreted as UTC (documented in the schema).
        start = start.replace(tzinfo=timezone.utc)
    return {"scan": transit_scan(natal, start, body.days)}
