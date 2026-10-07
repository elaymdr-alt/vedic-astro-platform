"""Database CRUD operations for the Vedic Astro platform."""
from __future__ import annotations

from typing import List, Optional

import bcrypt
from sqlalchemy.orm import Session

from models import User, BirthProfile, ProfileShare, Calculation, Report


def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, username: str, email: str, password: str, role: str = "user") -> User:
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.username == username).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.hashed_password.encode("utf-8")):
        return None
    return user


def get_birth_profile(db: Session, profile_id: int) -> Optional[BirthProfile]:
    return db.query(BirthProfile).filter(BirthProfile.id == profile_id).first()


def create_birth_profile(
    db: Session,
    owner_id: int,
    display_name: str,
    calendar: str,
    year: int,
    month: int,
    day: int,
    hour: int = 0,
    minute: int = 0,
    tz_offset: float = 0.0,
    lat: float = 0.0,
    lon: float = 0.0,
    time_precision: str = "exact",
) -> BirthProfile:
    profile = BirthProfile(
        owner_id=owner_id,
        display_name=display_name,
        calendar=calendar,
        year=year,
        month=month,
        day=day,
        hour=hour,
        minute=minute,
        tz_offset=tz_offset,
        lat=lat,
        lon=lon,
        time_precision=time_precision,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_birth_profile(
    db: Session,
    profile_id: int,
    **kwargs,
) -> Optional[BirthProfile]:
    profile = db.query(BirthProfile).filter(BirthProfile.id == profile_id).first()
    if not profile:
        return None
    for key, value in kwargs.items():
        if hasattr(profile, key):
            setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile


def delete_birth_profile(db: Session, profile_id: int) -> Optional[BirthProfile]:
    profile = db.query(BirthProfile).filter(BirthProfile.id == profile_id).first()
    if not profile:
        return None
    db.delete(profile)
    db.commit()
    return profile


def get_profile_shares(db: Session, profile_id: int) -> List[ProfileShare]:
    return db.query(ProfileShare).filter(ProfileShare.profile_id == profile_id).all()


def create_profile_share(
    db: Session,
    profile_id: int,
    shared_with_user_id: int,
    permission: str = "view",
) -> ProfileShare:
    share = ProfileShare(
        profile_id=profile_id,
        shared_with_user_id=shared_with_user_id,
        permission=permission,
    )
    db.add(share)
    db.commit()
    db.refresh(share)
    return share


def get_calculations(db: Session, profile_id: int) -> List[Calculation]:
    return db.query(Calculation).filter(Calculation.profile_id == profile_id).all()


def create_calculation(
    db: Session,
    profile_id: int,
    chart_type: str = "D1",
    result_json: str,
    engine_version: str = "swisseph",
) -> Calculation:
    calc = Calculation(
        profile_id=profile_id,
        chart_type=chart_type,
        result_json=result_json,
        engine_version=engine_version,
    )
    db.add(calc)
    db.commit()
    db.refresh(calc)
    return calc


def create_report(
    db: Session,
    profile_id: int,
    report_type: str = "full",
    status: str = "queued",
    result_url: Optional[str] = None,
    error_message: Optional[str] = None,
    job_id: Optional[str] = None,
) -> Report:
    report = Report(
        profile_id=profile_id,
        report_type=report_type,
        status=status,
        result_url=result_url,
        error_message=error_message,
        job_id=job_id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def update_report_status(
    db: Session,
    profile_id: int,
    job_id: str,
    status: str,
    result_url: Optional[str] = None,
    error_message: Optional[str] = None,
) -> Optional[Report]:
    report = db.query(Report).filter(Report.profile_id == profile_id, Report.job_id == job_id).first()
    if not report:
        return None
    report.status = status
    report.result_url = result_url
    report.error_message = error_message
    db.commit()
    db.refresh(report)
    return report


def get_reports(db: Session, profile_id: int) -> List[Report]:
    return db.query(Report).filter(Report.profile_id == profile_id).all()


def get_user_shared_profiles(db: Session, user_id: int) -> List[BirthProfile]:
    return db.query(BirthProfile).filter(
        BirthProfile.id.in_(
            db.query(ProfileShare.profile_id).filter(ProfileShare.shared_with_user_id == user_id).subquery()
        )
    ).all()