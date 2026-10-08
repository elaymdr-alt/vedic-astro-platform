"""Report jobs: queued -> running -> succeeded/failed, idempotent, quota-limited, shareable links.

Jobs run in-process via FastAPI ``BackgroundTasks`` (a durable queue such as a
Redis worker can replace ``run_job`` without changing the API). Each job is
retried a bounded number of times; a repeated request with the same
``Idempotency-Key`` returns the existing report instead of creating another.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from backend import auth, database
from backend.auth import get_current_user, get_profile_for_user
from backend.database import get_db
from backend.models import BirthProfile, Report, User
from backend.schemas import BirthInput
from engine.interpret import interpret_chart
from engine.psyche import psyche_profile

router = APIRouter(tags=["reports"])

MAX_ATTEMPTS = 2
DAILY_QUOTA = 20
SHARE_MAX_HOURS = 24 * 14
REPORT_TYPES = {"full"}


def _birth_input(p: BirthProfile) -> BirthInput:
    return BirthInput(calendar=p.calendar, year=p.year, month=p.month, day=p.day, hour=p.hour,
                      minute=p.minute, tz_offset=p.tz_offset, lat=p.lat, lon=p.lon,
                      time_precision=p.time_precision or "exact")


def build_report(p: BirthProfile) -> dict[str, Any]:
    from backend.main import _build_chart  # late import: main includes this router
    chart = _build_chart(_birth_input(p))
    return {
        "profile": {"name": p.display_name},
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "chart": chart,
        "interpretation": interpret_chart(chart),
        "psyche": psyche_profile(chart),
    }


def run_job(report_id: int) -> None:
    """Background worker body (own DB session; bounded retries)."""
    db = database.SessionLocal() if _session_factory is None else _session_factory()
    try:
        rep = db.get(Report, report_id)
        if rep is None:
            return
        rep.status = "running"
        db.commit()
        last_err = ""
        for attempt in range(1, MAX_ATTEMPTS + 1):
            rep.attempts = attempt
            try:
                rep.result_json = json.dumps(build_report(rep.profile), ensure_ascii=False)
                rep.status, rep.error_message = "succeeded", None
                break
            except Exception as exc:  # noqa: BLE001 — recorded on the report
                last_err = f"{exc.__class__.__name__}: {exc}"
        else:
            rep.status, rep.error_message = "failed", last_err
        rep.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()


# tests point background jobs at their in-memory database
_session_factory = None


def _own_report(db: Session, report_id: int, user: User) -> Report:
    rep = db.get(Report, report_id)
    if rep is None:
        raise HTTPException(status_code=404, detail="Report not found")
    get_profile_for_user(db, rep.profile_id, user)  # 404 for foreign profiles
    return rep


def _out(rep: Report, with_result: bool = False) -> dict[str, Any]:
    d = {"id": rep.id, "profile_id": rep.profile_id, "report_type": rep.report_type,
         "status": rep.status, "attempts": rep.attempts, "error": rep.error_message,
         "created_at": rep.created_at.isoformat() if rep.created_at else None,
         "completed_at": rep.completed_at.isoformat() if rep.completed_at else None}
    if with_result and rep.result_json:
        d["result"] = json.loads(rep.result_json)
    return d


@router.post("/profiles/{profile_id}/reports", status_code=202)
def create_report(profile_id: int, tasks: BackgroundTasks, report_type: str = Query("full"),
                  idempotency_key: str | None = Header(None, max_length=120),
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if report_type not in REPORT_TYPES:
        raise HTTPException(status_code=422, detail="Unknown report type")
    get_profile_for_user(db, profile_id, user, write=True)
    if idempotency_key:
        existing = db.query(Report).filter(Report.profile_id == profile_id,
                                           Report.idempotency_key == idempotency_key).first()
        if existing:  # repeated request: no extra report, no extra quota
            return _out(existing)
    since = datetime.utcnow() - timedelta(days=1)
    used = (db.query(Report).join(BirthProfile, Report.profile_id == BirthProfile.id)
            .filter(BirthProfile.owner_id == user.id, Report.created_at >= since).count())
    if used >= DAILY_QUOTA:
        raise HTTPException(status_code=429, detail="Daily report quota reached")
    rep = Report(profile_id=profile_id, report_type=report_type, status="queued",
                 job_id=uuid.uuid4().hex, idempotency_key=idempotency_key)
    db.add(rep)
    db.commit()
    db.refresh(rep)
    tasks.add_task(run_job, rep.id)
    return _out(rep)


@router.get("/profiles/{profile_id}/reports")
def list_reports(profile_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_profile_for_user(db, profile_id, user)
    rows = db.query(Report).filter(Report.profile_id == profile_id).order_by(Report.id.desc()).all()
    return [_out(r) for r in rows]


@router.get("/reports/{report_id}")
def read_report(report_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _out(_own_report(db, report_id, user), with_result=True)


@router.delete("/reports/{report_id}", status_code=204)
def delete_report(report_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rep = _own_report(db, report_id, user)
    db.delete(rep)
    db.commit()


@router.post("/reports/{report_id}/share")
def share_report(report_id: int, hours: int = Query(48, ge=1, le=SHARE_MAX_HOURS),
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Expiring read-only link token (signed; no account needed to open it)."""
    rep = _own_report(db, report_id, user)
    if rep.status != "succeeded":
        raise HTTPException(status_code=409, detail="Report is not ready")
    exp = datetime.now(timezone.utc) + timedelta(hours=hours)
    token = jwt.encode({"rid": rep.id, "kind": "report-share", "exp": exp}, auth.SECRET_KEY,
                       algorithm=auth.ALGORITHM)
    return {"token": token, "path": f"/shared/{token}", "expires_at": exp.isoformat()}


@router.get("/shared/{token}")
def open_shared(token: str, db: Session = Depends(get_db)):
    try:
        data = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=410, detail="This link has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=404, detail="Link not found")
    if data.get("kind") != "report-share":
        raise HTTPException(status_code=404, detail="Link not found")
    rep = db.get(Report, data.get("rid"))
    if rep is None or rep.status != "succeeded":
        raise HTTPException(status_code=404, detail="Link not found")
    return _out(rep, with_result=True)


# ---------------------------------------------------------- data export / erasure
@router.get("/me/export")
def export_my_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profiles = db.query(BirthProfile).filter(BirthProfile.owner_id == user.id).all()
    return {
        "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role},
        "profiles": [{"id": p.id, "name": p.display_name, "calendar": p.calendar, "year": p.year,
                      "month": p.month, "day": p.day, "hour": p.hour, "minute": p.minute,
                      "tz_offset": p.tz_offset, "lat": p.lat, "lon": p.lon,
                      "reports": [_out(r, with_result=True) for r in p.reports]} for p in profiles],
    }


@router.delete("/me", status_code=204)
def delete_my_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Erases the account with its profiles, calculations and reports (cascade)."""
    db.delete(db.get(User, user.id))
    db.commit()
