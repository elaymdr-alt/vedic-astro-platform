"""Report jobs, idempotency, quota, expiring share links, export/erasure (P07-T04/T05/T06)."""
import time
from datetime import timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend import auth, database, models, reports  # noqa: F401
from backend.main import app

PROFILE = dict(display_name="من", calendar="gregorian", year=1993, month=4, day=17,
               hour=6, minute=42, tz_offset=3.5, lat=35.69, lon=51.39)


@pytest.fixture()
def client():
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    database.Base.metadata.create_all(eng)
    Session = sessionmaker(bind=eng, autoflush=False, autocommit=False)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[database.get_db] = override
    reports._session_factory = Session
    yield TestClient(app)
    reports._session_factory = None
    app.dependency_overrides.clear()


def signup(c, name):
    assert c.post("/auth/register", json={"username": name, "email": f"{name}@x.io",
                                          "password": "s3cretpass"}).status_code == 201
    t = c.post("/auth/token", data={"username": name, "password": "s3cretpass"}).json()["access_token"]
    return {"Authorization": "Bearer " + t}


def make_profile(c, h):
    return c.post("/profiles", json=PROFILE, headers=h).json()["id"]


def test_report_job_runs_and_returns_traceable_result(client):
    h = signup(client, "ali")
    pid = make_profile(client, h)
    r = client.post(f"/profiles/{pid}/reports", headers=h)
    assert r.status_code == 202 and r.json()["status"] in {"queued", "running", "succeeded"}
    rid = r.json()["id"]
    done = client.get(f"/reports/{rid}", headers=h).json()  # background task ran after the response
    assert done["status"] == "succeeded" and done["attempts"] == 1
    res = done["result"]
    assert res["chart"]["ascendant"]["sign_fa"] == "حمل"
    assert res["interpretation"]["paragraphs"] and res["psyche"]["kind"] == "interpretive"


def test_idempotency_key_prevents_duplicate_reports(client):
    h = signup(client, "ali")
    pid = make_profile(client, h)
    a = client.post(f"/profiles/{pid}/reports", headers={**h, "Idempotency-Key": "k1"}).json()
    b = client.post(f"/profiles/{pid}/reports", headers={**h, "Idempotency-Key": "k1"}).json()
    assert a["id"] == b["id"]
    assert len(client.get(f"/profiles/{pid}/reports", headers=h).json()) == 1
    c = client.post(f"/profiles/{pid}/reports", headers={**h, "Idempotency-Key": "k2"}).json()
    assert c["id"] != a["id"]


def test_failed_job_is_bounded_and_reported(client, monkeypatch):
    h = signup(client, "ali")
    pid = make_profile(client, h)
    monkeypatch.setattr(reports, "build_report", lambda p: (_ for _ in ()).throw(RuntimeError("boom")))
    rid = client.post(f"/profiles/{pid}/reports", headers=h).json()["id"]
    rep = client.get(f"/reports/{rid}", headers=h).json()
    assert rep["status"] == "failed" and rep["attempts"] == reports.MAX_ATTEMPTS and "boom" in rep["error"]


def test_quota_limit(client, monkeypatch):
    h = signup(client, "ali")
    pid = make_profile(client, h)
    monkeypatch.setattr(reports, "DAILY_QUOTA", 2)
    codes = [client.post(f"/profiles/{pid}/reports", headers=h).status_code for _ in range(3)]
    assert codes == [202, 202, 429]


def test_other_user_cannot_touch_reports_or_profile_reports(client):
    a, b = signup(client, "ali"), signup(client, "sara")
    pid = make_profile(client, a)
    rid = client.post(f"/profiles/{pid}/reports", headers=a).json()["id"]
    assert client.post(f"/profiles/{pid}/reports", headers=b).status_code == 404
    assert client.get(f"/profiles/{pid}/reports", headers=b).status_code == 404
    assert client.get(f"/reports/{rid}", headers=b).status_code == 404
    assert client.post(f"/reports/{rid}/share", headers=b).status_code == 404
    assert client.delete(f"/reports/{rid}", headers=b).status_code == 404
    assert client.get(f"/reports/{rid}").status_code == 401


def test_share_link_opens_without_login_and_expires(client):
    h = signup(client, "ali")
    pid = make_profile(client, h)
    rid = client.post(f"/profiles/{pid}/reports", headers=h).json()["id"]
    link = client.post(f"/reports/{rid}/share", params={"hours": 1}, headers=h).json()
    opened = client.get(link["path"])
    assert opened.status_code == 200 and opened.json()["result"]["chart"]
    expired = jwt.encode({"rid": rid, "kind": "report-share",
                          "exp": auth.datetime.now(auth.timezone.utc) - timedelta(seconds=5)},
                         auth.SECRET_KEY, algorithm=auth.ALGORITHM)
    assert client.get(f"/shared/{expired}").status_code == 410
    assert client.get("/shared/garbage").status_code == 404
    # a normal login token must not work as a share token
    login = client.post("/auth/token", data={"username": "ali", "password": "s3cretpass"}).json()["access_token"]
    assert client.get(f"/shared/{login}").status_code == 404
    # deleting the report kills the link
    assert client.delete(f"/reports/{rid}", headers=h).status_code == 204
    assert client.get(link["path"]).status_code == 404


def test_export_and_account_erasure(client):
    h = signup(client, "ali")
    pid = make_profile(client, h)
    client.post(f"/profiles/{pid}/reports", headers=h)
    exp = client.get("/me/export", headers=h).json()
    assert exp["user"]["username"] == "ali" and exp["profiles"][0]["reports"]
    assert "hashed_password" not in str(exp)
    assert client.delete("/me", headers=h).status_code == 204
    assert client.get("/auth/me", headers=h).status_code == 401  # token no longer maps to a user
    assert client.post("/auth/token", data={"username": "ali", "password": "s3cretpass"}).status_code == 401
