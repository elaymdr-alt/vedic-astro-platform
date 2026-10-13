"""Auth + birth-profile routes (P07-T01/T02). Ownership is enforced per request."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Request
import time
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend import crud
from backend.auth import create_access_token, get_current_user, get_profile_for_user
from backend.database import get_db
from backend.models import BirthProfile, User
from backend.schemas import ProfileIn, ProfileOut, TokenOut, UserCreate, UserOut

_RATE_WINDOW, _RATE_MAX = 60.0, 5
_hits: dict[str, list[float]] = {}


def _limited(key: str) -> bool:
    now = time.monotonic()
    hits = [t for t in _hits.get(key, []) if now - t < _RATE_WINDOW]
    if len(hits) >= _RATE_MAX:
        _hits[key] = hits
        return True
    hits.append(now)
    _hits[key] = hits
    if len(_hits) > 5000:
        _hits.clear()
    return False


def _guard(request: Request) -> None:
    ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
          or (request.client.host if request.client else "local"))
    if _limited(ip):
        raise HTTPException(status_code=429, detail={
            "code": "RATE_LIMITED", "message": "تعداد درخواست‌ها زیاد است؛ یک دقیقه بعد دوباره تلاش کنید."})



router = APIRouter()


@router.post("/auth/register", response_model=UserOut, status_code=201, tags=["auth"])
def register(body: UserCreate, request: Request, db: Session = Depends(get_db)):
    _guard(request)
    try:
        return crud.create_user(db, body.username, body.email, body.password)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username or email already registered")


@router.post("/auth/token", response_model=TokenOut, tags=["auth"])
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    _guard(request)
    user = crud.authenticate_user(db, form.username, form.password)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenOut(access_token=create_access_token({"sub": user.id}))


@router.get("/auth/me", response_model=UserOut, tags=["auth"])
def me(user: User = Depends(get_current_user)):
    return user


@router.get("/profiles", response_model=list[ProfileOut], tags=["profiles"])
def list_profiles(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(BirthProfile).filter(BirthProfile.owner_id == user.id).all()


@router.post("/profiles", response_model=ProfileOut, status_code=201, tags=["profiles"])
def create_profile(body: ProfileIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    try:
        return crud.create_birth_profile(db, owner_id=user.id, **body.model_dump())
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A profile with this name already exists")


@router.get("/profiles/{profile_id}", response_model=ProfileOut, tags=["profiles"])
def read_profile(profile_id: int, user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    return get_profile_for_user(db, profile_id, user)


@router.put("/profiles/{profile_id}", response_model=ProfileOut, tags=["profiles"])
def update_profile(profile_id: int, body: ProfileIn, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    get_profile_for_user(db, profile_id, user, write=True)
    return crud.update_birth_profile(db, profile_id, **body.model_dump())


@router.delete("/profiles/{profile_id}", status_code=204, tags=["profiles"])
def delete_profile(profile_id: int, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    profile = get_profile_for_user(db, profile_id, user, write=True)
    if profile.owner_id != user.id:  # shared editors may not delete
        raise HTTPException(status_code=404, detail="Profile not found")
    crud.delete_birth_profile(db, profile_id)
