"""Auth + profile ownership (P07-T01/T02/T06): two users must not reach each other's data."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend import database, models  # noqa: F401  (register tables)
from backend.main import app

PROFILE = dict(display_name="من", calendar="gregorian", year=1993, month=4, day=17,
               hour=6, minute=42, tz_offset=3.5, lat=35.69, lon=51.39)


@pytest.fixture()
def client():
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False},
                        poolclass=StaticPool)
    database.Base.metadata.create_all(eng)
    Session = sessionmaker(bind=eng, autoflush=False, autocommit=False)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[database.get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def signup(c, name):
    r = c.post("/auth/register", json={"username": name, "email": f"{name}@x.io",
                                       "password": "s3cretpass"})
    assert r.status_code == 201, r.text
    t = c.post("/auth/token", data={"username": name, "password": "s3cretpass"})
    assert t.status_code == 200
    return {"Authorization": "Bearer " + t.json()["access_token"]}


def test_register_login_me_and_duplicate(client):
    h = signup(client, "ali")
    assert client.get("/auth/me", headers=h).json()["username"] == "ali"
    dup = client.post("/auth/register", json={"username": "ali", "email": "z@x.io",
                                              "password": "s3cretpass"})
    assert dup.status_code == 409
    assert "hashed_password" not in client.get("/auth/me", headers=h).text


def test_bad_credentials_and_tokens_are_401(client):
    signup(client, "ali")
    assert client.post("/auth/token", data={"username": "ali", "password": "nope"}).status_code == 401
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_profile_crud_and_cross_user_isolation(client):
    a, b = signup(client, "ali"), signup(client, "sara")
    pid = client.post("/profiles", json=PROFILE, headers=a).json()["id"]
    assert [p["id"] for p in client.get("/profiles", headers=a).json()] == [pid]
    assert client.get("/profiles", headers=b).json() == []
    # other user cannot read, update or delete -> 404 (ids are not probeable)
    assert client.get(f"/profiles/{pid}", headers=b).status_code == 404
    assert client.put(f"/profiles/{pid}", json=PROFILE, headers=b).status_code == 404
    assert client.delete(f"/profiles/{pid}", headers=b).status_code == 404
    # owner can update and delete
    assert client.put(f"/profiles/{pid}", json={**PROFILE, "hour": 7}, headers=a).json()["hour"] == 7
    assert client.delete(f"/profiles/{pid}", headers=a).status_code == 204
    assert client.get(f"/profiles/{pid}", headers=a).status_code == 404


def test_profiles_require_auth(client):
    assert client.get("/profiles").status_code == 401
    assert client.post("/profiles", json=PROFILE).status_code == 401


def test_login_with_email_or_username(client):
    signup(client, "ali")
    by_email = client.post("/auth/token", data={"username": "ali@x.io", "password": "s3cretpass"})
    assert by_email.status_code == 200 and by_email.json()["access_token"]
