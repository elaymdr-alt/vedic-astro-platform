"""API tests (TEST-api) via FastAPI TestClient."""
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_cities_search():
    r = client.get("/cities", params={"q": "تهران"})
    assert r.status_code == 200
    assert any("تهران" in c["name_fa"] for c in r.json()["items"])


def test_calendar_convert():
    r = client.post("/calendar/convert", json={
        "direction": "jalali_to_gregorian", "year": 1403, "month": 1, "day": 1})
    assert r.status_code == 200
    assert r.json() == {"year": 2024, "month": 3, "day": 20}


def test_calendar_invalid_jalali():
    r = client.post("/calendar/convert", json={
        "direction": "jalali_to_gregorian", "year": 1402, "month": 12, "day": 30})
    assert r.status_code == 422


def test_chart_compute_jalali():
    r = client.post("/chart/compute", json={
        "calendar": "jalali", "year": 1375, "month": 5, "day": 12,
        "hour": 10, "minute": 30, "tz_offset": 3.5,
        "lat": 35.6892, "lon": 51.3890})
    assert r.status_code == 200
    body = r.json()
    assert len(body["chart"]["planets"]) == 9
    assert "ephemeris_flag" in body["chart"]
