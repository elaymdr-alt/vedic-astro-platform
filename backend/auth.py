"""Authentication and authorization utilities."""
from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import BirthProfile, ProfileShare, User

# Set JWT_SECRET_KEY in production. Without it a random per-process key is used
# (safe, but every restart invalidates existing tokens).
SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or secrets.token_urlsafe(48)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])  # PyJWT requires a string subject
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def require_role(*roles: str):
    def decorator(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return decorator


def get_profile_for_user(db: Session, profile_id: int, user: User, write: bool = False) -> BirthProfile:
    """Return the profile if ``user`` owns it (or holds a sufficient share).

    Missing and forbidden both raise 404 so profile ids cannot be probed.
    """
    not_found = HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    profile = db.query(BirthProfile).filter(BirthProfile.id == profile_id).first()
    if not profile:
        raise not_found
    if profile.owner_id == user.id:
        return profile
    share = db.query(ProfileShare).filter(
        ProfileShare.profile_id == profile_id,
        ProfileShare.shared_with_user_id == user.id,
    ).first()
    allowed = ("edit", "admin") if write else ("view", "edit", "admin")
    if share is None or share.permission not in allowed:
        raise not_found
    return profile
