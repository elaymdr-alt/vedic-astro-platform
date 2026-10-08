"""Database configuration and session factory.

``DATABASE_URL`` selects the database (use a sync driver, e.g.
``postgresql+psycopg://user:pass@host/db``). Without it a local SQLite file is
used so development and tests need no server.
"""
from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./vedic_astro.db")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, future=True, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    """Dependency: yield a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables (use Alembic migrations in production)."""
    from backend import models  # noqa: F401  (register tables on Base)
    Base.metadata.create_all(bind=engine)
