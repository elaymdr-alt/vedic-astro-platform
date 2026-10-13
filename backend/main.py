"""FastAPI backend — health, cities, calendar, chart, time, synastry, transits (P05 + P07 + P08)."""
from __future__ import annotations

import os
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
from engine import rectify as rect  # noqa: E402
from engine.daily import build_daily  # noqa: E402
from backend.cities import search_cities  # noqa: E402
from backend.workers import run_isolated  # noqa: E402
from backend.database import init_db  # noqa: E402
from backend.routes import router as api_router  # noqa: E402
from backend.chat_routes import router as chat_router  # noqa: E402
from backend.reports import router as reports_router  # noqa: E402
from backend.dreams import router as dreams_router  # noqa: E402
from backend.schemas import (  # noqa: E402
    BirthInput, CalendarConvertIn, DailyIn, RectifyIn, SynastryInput, TimezoneConvertIn,
    TransitScanInput,
)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield
    from backend.workers import shutdown
    shutdown()


app = FastAPI(title="AstroBinesh API", version="0.1.0", lifespan=lifespan)

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(api_router)
app.include_router(chat_router)
app.include_router(reports_router)
app.include_router(dreams_router)


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


@app.post("/chart/areas")
def chart_areas(body: BirthInput) -> dict:
    """Plain-language, everyday-use reports per life area (work, money, love, …)."""
    from datetime import date as _d
    from engine.life_areas import life_area_reports
    chart = _build_chart(body)
    return life_area_reports(chart, _d.today(), body.tz_offset)


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


def _to_gregorian(calendar: str, y: int, m: int, d: int) -> tuple[int, int, int]:
    if calendar == "jalali":
        if not is_valid_jalali(y, m, d):
            raise HTTPException(status_code=422, detail={
                "code": "INVALID_JALALI", "message": "تاریخ شمسی نامعتبر است"})
        return jalali_to_gregorian(y, m, d)
    return y, m, d


def _hhmm_to_min(s: str) -> int:
    h, m = s.split(":")
    if not (0 <= int(h) <= 23 and 0 <= int(m) <= 59):
        raise HTTPException(status_code=422, detail={
            "code": "INVALID_TIME", "message": "ساعت نامعتبر است"})
    return int(h) * 60 + int(m)


@app.get("/rectify/event-types")
def rectify_event_types() -> dict:
    return {"items": [{"type": k, "label_fa": v[2], "houses": sorted(v[0])}
                      for k, v in rect.EVENT_TYPES.items()]}


@app.post("/rectify")
async def rectify_birth_time(body: RectifyIn) -> dict:
    """Probabilistic birth-time estimate from life events (never a single certain minute)."""
    from datetime import date as _date
    gy, gm, gd = _to_gregorian(body.calendar, body.year, body.month, body.day)
    tz_offset = body.tz_offset
    if body.tz:
        try:  # offset at local noon of the birth date (DST-aware)
            tz_offset = local_to_utc(gy, gm, gd, 12, 0, body.tz, fold=0).utc_offset_hours
        except TimezoneError as exc:
            raise HTTPException(status_code=422, detail={
                "code": exc.code, "message": exc.message, "details": exc.details or {}})
    events = []
    for e in body.events:
        if e.type not in rect.EVENT_TYPES:
            raise HTTPException(status_code=422, detail={
                "code": "UNKNOWN_EVENT_TYPE", "message": f"نوع رویداد ناشناخته: {e.type}"})
        ey, em, ed = _to_gregorian(e.calendar, e.year, e.month, e.day if e.precision == "day" else 1)
        try:
            events.append(rect.Event(e.type, _date(ey, em, ed), e.precision))
        except ValueError:
            raise HTTPException(status_code=422, detail={
                "code": "INVALID_DATE", "message": "تاریخ رویداد نامعتبر است"})
    w0, w1 = _hhmm_to_min(body.window_from), _hhmm_to_min(body.window_to)
    if w1 < w0:
        raise HTTPException(status_code=422, detail={
            "code": "INVALID_WINDOW", "message": "پایان بازه باید بعد از شروع باشد"})
    try:
        return await run_isolated(
            rect.rectify,
            gy, gm, gd, tz_offset, body.lat, body.lon, events, window=(w0, w1),
            step_min=body.step_minutes,
            prior_center_min=_hhmm_to_min(body.approx_time) if body.approx_time else None,
            prior_sigma_min=body.approx_sigma_min, permutations=body.permutations,
        )
    except EphemerisUnavailable as exc:
        raise HTTPException(status_code=503, detail={
            "code": "EPHEMERIS_UNAVAILABLE", "message": str(exc)})


@app.post("/daily")
def daily_guidance(body: DailyIn) -> dict:
    """Panchang, time windows, personal gochara, running dasha and a ≤30-day outlook."""
    from datetime import date as _date, datetime as _dt, timedelta as _td, timezone as _tz
    natal = _build_chart(body.birth)
    lat = body.lat if body.lat is not None else body.birth.lat
    lon = body.lon if body.lon is not None else body.birth.lon
    tz_offset = body.tz_offset if body.tz_offset is not None else body.birth.tz_offset
    if body.tz:
        try:
            probe = _dt.now(_tz.utc)
            tz_offset = local_to_utc(probe.year, probe.month, probe.day, 12, 0, body.tz,
                                     fold=0).utc_offset_hours
        except TimezoneError as exc:
            raise HTTPException(status_code=422, detail={
                "code": exc.code, "message": exc.message, "details": exc.details or {}})
    try:
        day = _date.fromisoformat(body.date) if body.date else \
            (_dt.now(_tz.utc) + _td(hours=tz_offset)).date()
    except ValueError:
        raise HTTPException(status_code=422, detail={
            "code": "INVALID_DATE", "message": "تاریخ نامعتبر است"})
    try:
        return build_daily(natal, day, tz_offset, lat, lon, body.days)
    except EphemerisUnavailable as exc:
        raise HTTPException(status_code=503, detail={
            "code": "EPHEMERIS_UNAVAILABLE", "message": str(exc)})
    except ValueError as exc:  # e.g. polar day/night: no sunrise
        raise HTTPException(status_code=422, detail={"code": "NO_SUNRISE", "message": str(exc)})


@app.post("/daily/calendar.ics")
def daily_calendar(body: DailyIn):
    """Download the personal outlook as an iCalendar file (best days, dasha changes, ingresses)."""
    from datetime import date as _date, datetime as _dt, timedelta as _td, timezone as _tz
    from fastapi.responses import Response
    from engine.calendar_export import build_ics
    natal = _build_chart(body.birth)
    lat = body.lat if body.lat is not None else body.birth.lat
    lon = body.lon if body.lon is not None else body.birth.lon
    tz_offset = body.tz_offset if body.tz_offset is not None else body.birth.tz_offset
    try:
        day = _date.fromisoformat(body.date) if body.date else (_dt.now(_tz.utc) + _td(hours=tz_offset)).date()
    except ValueError:
        raise HTTPException(status_code=422, detail={"code": "INVALID_DATE", "message": "تاریخ نامعتبر است"})
    ics = build_ics(natal, day, tz_offset, lat, lon, body.days)
    return Response(ics, media_type="text/calendar; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="astrobinesh.ics"'})
