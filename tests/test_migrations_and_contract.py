"""Alembic migration runs from scratch; OpenAPI contract lists the public API (P07-T06)."""
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

from backend.main import app

ROOT = Path(__file__).resolve().parents[1]


def test_alembic_upgrade_creates_every_table(tmp_path):
    db = tmp_path / "m.db"
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db.as_posix()}"}
    r = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=ROOT, env=env,
                       capture_output=True, text=True)
    assert r.returncode == 0, r.stderr[-800:]
    names = {row[0] for row in sqlite3.connect(db).execute("select name from sqlite_master where type='table'")}
    assert {"users", "birth_profiles", "profile_shares", "calculations", "reports", "dream_entries"} <= names
    cols = {row[1] for row in sqlite3.connect(db).execute("pragma table_info(reports)")}
    assert {"result_json", "idempotency_key", "attempts"} <= cols


def test_openapi_contract_lists_public_api():
    spec = TestClient(app).get("/openapi.json").json()
    paths = set(spec["paths"])
    required = {
        "/health", "/cities", "/calendar/convert", "/time/convert", "/chart/compute", "/chart/interpret",
        "/chart/synastry", "/transit/scan", "/rectify", "/daily", "/auth/register", "/auth/token", "/auth/me",
        "/profiles", "/profiles/{profile_id}", "/profiles/{profile_id}/reports", "/reports/{report_id}",
        "/reports/{report_id}/share", "/shared/{token}", "/me/export", "/me", "/chat", "/chat/stream",
        "/psyche/profile", "/psyche/quiz", "/psyche/quiz/score",
    }
    assert required <= paths, sorted(required - paths)
    ids = [op["operationId"] for p in spec["paths"].values() for op in p.values()]
    assert len(ids) == len(set(ids)), "operationIds must be unique"
    # protected routes advertise the bearer scheme
    assert spec["paths"]["/profiles"]["get"]["security"]
