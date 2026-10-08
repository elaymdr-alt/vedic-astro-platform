"""Dream journal: privacy, reflection (mocked LLM), export/erasure."""
import httpx
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend import database, models  # noqa: F401
from backend.ai import openrouter
from backend.main import app


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
    yield TestClient(app)
    app.dependency_overrides.clear()


def signup(c, name):
    c.post("/auth/register", json={"username": name, "email": f"{name}@x.io", "password": "s3cretpass"})
    t = c.post("/auth/token", data={"username": name, "password": "s3cretpass"}).json()["access_token"]
    return {"Authorization": "Bearer " + t}


def test_dream_crud_and_privacy(client):
    a, b = signup(client, "ali"), signup(client, "sara")
    d = client.post("/dreams", json={"title": "دریا", "text": "در رؤیا کنار دریایی آرام بودم", "mood": "calm"}, headers=a)
    assert d.status_code == 201
    did = d.json()["id"]
    assert [x["id"] for x in client.get("/dreams", headers=a).json()] == [did]
    assert client.get("/dreams", headers=b).json() == []
    assert client.get(f"/dreams/{did}", headers=b).status_code == 404
    assert client.delete(f"/dreams/{did}", headers=b).status_code == 404
    assert client.get("/dreams").status_code == 401
    assert client.post("/dreams", json={"text": "ab"}, headers=a).status_code == 422
    assert client.delete(f"/dreams/{did}", headers=a).status_code == 204


def test_reflection_uses_jung_context_and_positive_guard(client, monkeypatch):
    calls = []

    def handler(req):
        body = json.loads(req.content)
        calls.append(body)
        return httpx.Response(200, json={"choices": [{"message": {"content":
            "این رؤیا حس آرامش را نشان می‌دهد. سرنوشت شوم است. یک پرسش تأملی: دریا برای تو چیست؟"}}]})

    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test")
    monkeypatch.setattr(openrouter, "_transport", httpx.MockTransport(handler))
    h = signup(client, "ali")
    did = client.post("/dreams", json={"text": "در رؤیا دریا و آب آرام دیدم", "mood": "calm"}, headers=h).json()["id"]
    r = client.post(f"/dreams/{did}/reflect", headers=h)
    assert r.status_code == 200
    j = r.json()
    assert "شوم" not in j["reflection"] and "پرسش تأملی" in j["reflection"] and j["reflected_at"]
    system = " ".join(m["content"] for m in calls[0]["messages"] if m["role"] == "system")
    assert "مراجع یونگی" in system and "رؤیا" in system
    assert "هیچ داده‌ای از چارت" in system  # no invented chart facts in dream reflections
    # another user cannot trigger/see reflection on this dream
    other = signup(client, "sara")
    assert client.post(f"/dreams/{did}/reflect", headers=other).status_code == 404


def test_reflect_without_key_is_clear(client, monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    h = signup(client, "ali")
    did = client.post("/dreams", json={"text": "یک رؤیا"}, headers=h).json()["id"]
    r = client.post(f"/dreams/{did}/reflect", headers=h)
    assert r.status_code == 503 and r.json()["detail"]["code"] == "AI_NOT_CONFIGURED"


def test_export_and_erasure_include_dreams(client):
    h = signup(client, "ali")
    client.post("/dreams", json={"text": "رؤیای من"}, headers=h)
    assert client.get("/me/export", headers=h).json()["dreams"][0]["text"] == "رؤیای من"
    assert client.delete("/me", headers=h).status_code == 204
    h2 = signup(client, "ali")  # name is free again, nothing of the old dreams remains
    assert client.get("/dreams", headers=h2).json() == []
