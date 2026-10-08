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


def test_chart_compute_unknown_time_is_limited():
    r = client.post("/chart/compute", json={
        "calendar": "gregorian", "year": 2000, "month": 6, "day": 1,
        "hour": 12, "minute": 0, "tz_offset": 3.5,
        "lat": 35.6892, "lon": 51.3890, "time_precision": "unknown"})
    assert r.status_code == 200
    chart = r.json()["chart"]
    assert chart["ascendant"] is None
    assert chart["dasha"] is None
    assert "ascendant" in chart["time_sensitive_omitted"]
    assert len(chart["planets"]) == 9  # date-level positions still returned


def test_time_convert_normal():
    r = client.post("/time/convert", json={
        "year": 2021, "month": 6, "day": 1, "hour": 12, "minute": 0,
        "tz": "Asia/Tehran"})
    assert r.status_code == 200
    body = r.json()
    assert body["utc"] == "2021-06-01T07:30:00+00:00"
    assert body["utc_offset_hours"] == 4.5
    assert body["ambiguous"] is False


def test_time_convert_gap_is_structured_error():
    r = client.post("/time/convert", json={
        "year": 2021, "month": 3, "day": 22, "hour": 0, "minute": 30,
        "tz": "Asia/Tehran"})
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "NON_EXISTENT_LOCAL_TIME"


def test_time_convert_ambiguous_needs_fold():
    payload = {"year": 2021, "month": 11, "day": 7, "hour": 1, "minute": 30,
               "tz": "America/New_York"}
    r = client.post("/time/convert", json=payload)
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "AMBIGUOUS_LOCAL_TIME"
    payload["fold"] = 1
    r = client.post("/time/convert", json=payload)
    assert r.status_code == 200
    assert r.json()["utc"] == "2021-11-07T06:30:00+00:00"


def test_time_convert_unknown_tz():
    r = client.post("/time/convert", json={
        "year": 2021, "month": 1, "day": 1, "hour": 0, "minute": 0,
        "tz": "Nowhere/Nothing"})
    assert r.status_code == 422
    assert r.json()["detail"]["code"] == "TZ_UNKNOWN"


def _birth(year, month, day, hour=10, minute=30):
    return {"calendar": "gregorian", "year": year, "month": month, "day": day,
            "hour": hour, "minute": minute, "tz_offset": 3.5,
            "lat": 35.6892, "lon": 51.3890}


def test_synastry_endpoint():
    r = client.post("/chart/synastry", json={
        "a": _birth(2024, 3, 20), "b": _birth(2026, 1, 15, 8, 0)})
    assert r.status_code == 200
    s = r.json()["synastry"]
    assert s["reference"] == "a"
    assert s["houses_valid"] is True
    assert len(s["b_in_a_houses"]) == 9
    assert s["summary"]["aspects_total"] == len(s["aspects"])


def test_synastry_endpoint_unknown_time_limitation():
    b = _birth(2026, 1, 15, 8, 0)
    b["time_precision"] = "unknown"
    r = client.post("/chart/synastry", json={"a": _birth(2024, 3, 20), "b": b})
    assert r.status_code == 200
    s = r.json()["synastry"]
    assert s["houses_valid"] is False
    assert any(l["code"] == "HOUSES_SKIPPED_UNKNOWN_TIME" for l in s["limitations"])


def test_transit_scan_endpoint():
    r = client.post("/transit/scan", json={
        "natal": _birth(2024, 3, 20),
        "start_utc": "2026-04-01T12:00:00+00:00", "days": 30})
    assert r.status_code == 200
    scan = r.json()["scan"]
    assert scan["days"] == 30
    assert len(scan["ingresses"]) >= 5
    assert len(scan["contacts"]) > 0


def test_transit_scan_rejects_over_90_days():
    r = client.post("/transit/scan", json={
        "natal": _birth(2024, 3, 20),
        "start_utc": "2026-04-01T12:00:00+00:00", "days": 91})
    assert r.status_code == 422  # pydantic-level: invalid request


def test_interpret_endpoint():
    r = client.post("/chart/interpret", json=_birth(1990, 6, 15))
    assert r.status_code == 200
    rep = r.json()["report"]
    assert rep["rules_version"] == "1.1.0"
    assert rep["report_version"] == "1.1.0"
    assert rep["settings"]["ayanamsa"] == "lahiri"
    assert len(rep["paragraphs"]) > 0
    assert all(p["evidence"] and p["rules_version"] for p in rep["paragraphs"])


def test_interpret_endpoint_unknown_time():
    b = _birth(1990, 6, 15)
    b["time_precision"] = "unknown"
    r = client.post("/chart/interpret", json=b)
    assert r.status_code == 200
    rep = r.json()["report"]
    assert rep["time_precision"] == "unknown"
    assert any(l["code"] == "TIME_SENSITIVE_RULES_SKIPPED" for l in rep["limitations"])



def test_chart_uses_tzdb_offset_when_tz_given():
    from fastapi.testclient import TestClient
    from backend.main import app
    c = TestClient(app)
    base = dict(calendar="gregorian", year=1993, month=7, day=1, hour=12, minute=0,
                tz_offset=3.5, lat=35.69, lon=51.39)
    legacy = c.post("/chart/compute", json=base).json()["chart"]["julian_day_ut"]
    tzd = c.post("/chart/compute", json={**base, "tz": "Asia/Tehran"})
    assert tzd.status_code == 200
    # Tehran observed DST (+4:30) on 1993-07-01, so the instant is 1h earlier.
    assert abs((legacy - tzd.json()["chart"]["julian_day_ut"]) - 1 / 24) < 1e-4


def test_chart_rejects_nonexistent_local_time():
    from fastapi.testclient import TestClient
    from backend.main import app
    r = TestClient(app).post("/chart/compute", json=dict(
        calendar="gregorian", year=2023, month=3, day=12, hour=2, minute=30,
        tz_offset=-5, lat=40.7, lon=-74.0, tz="America/New_York"))
    assert r.status_code == 422 and r.json()["detail"]["code"] == "NON_EXISTENT_LOCAL_TIME"
