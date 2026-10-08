"""Daily-life layer: panchang correctness anchors, gochara/vedha rules, dasha, API."""
from datetime import date, datetime, timezone

from fastapi.testclient import TestClient

from backend.main import app
from engine import compute_chart
from engine.ashtakavarga import bhinnashtakavarga, sarvashtakavarga
from engine.daily import (
    NatalContext, build_daily, dasha_levels, day_reading, gochara_rows, panchang,
)

TEHRAN = dict(tz_offset=3.5, lat=35.6892, lon=51.389)


def natal():
    return compute_chart(1993, 4, 17, 6.7, 3.5, 35.6892, 51.389)


def test_ashtakavarga_totals_match_classical_337():
    signs = [0, 3, 6, 9, 2, 5, 8, 1]
    assert sum(sarvashtakavarga(signs)) == 337
    totals = {p: sum(v) for p, v in bhinnashtakavarga(signs).items()}
    assert totals == {"Sun": 48, "Moon": 49, "Mars": 39, "Mercury": 54,
                      "Jupiter": 56, "Venus": 52, "Saturn": 39}


def test_panchang_anchors_known_date():
    # Thursday 2026-10-08, Tehran: Rahu Kala is the 6th eighth of the day,
    # Yamaganda the 1st (= starts at sunrise); sunrise is early morning.
    p = panchang(date(2026, 10, 8), **TEHRAN)
    assert p["weekday"] == "پنجشنبه" and p["vara_lord"] == "Jupiter"
    assert p["avoid"]["yamaganda"]["from"] == p["sunrise"]
    assert "05:50" <= p["sunrise"] <= "06:20" and "17:15" <= p["sunset"] <= "18:00"
    assert 1 <= p["tithi"]["number"] <= 15 and p["abhijit_muhurta"]["from"] < p["abhijit_muhurta"]["to"]
    assert p["avoid"]["rahu_kala"]["from"] > p["avoid"]["gulika"]["to"]


def test_new_moon_tithi_names():
    # 2026-10-10 is (close to) a new moon -> amavasya/chaturdashi; full moon 2026-10-26
    names = {panchang(date(2026, 10, d), **TEHRAN)["tithi"]["name"] for d in (9, 10, 11)}
    assert names & {"آماواسیا", "چاتوردشی", "پراتیپادا"}
    full = {panchang(date(2026, 10, d), **TEHRAN)["tithi"]["name"] for d in (25, 26, 27)}
    assert full & {"پورنیما", "چاتوردشی", "پراتیپادا"}


def test_gochara_vedha_block_and_relief():
    # natal Moon in Aries (sign 0). Sun in Gemini (house 3, good) with Mars?? vedha
    # house for Sun@3 is 9 (Sagittarius): a blocker there cancels the benefit.
    lon = {g: 0.0 for g in ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu")}
    lon.update({"Sun": 65.0, "Moon": 10.0, "Mars": 250.0, "Mercury": 100.0, "Jupiter": 130.0,
                "Venus": 200.0, "Saturn": 300.0, "Rahu": 330.0, "Ketu": 150.0})
    rows = {r["planet"]: r for r in gochara_rows(lon, 0)}
    assert rows["Sun"]["house"] == 3 and rows["Sun"]["verdict"] == "blocked" and rows["Sun"]["by"] == "Mars"
    lon["Mars"] = 20.0  # remove the blocker
    assert {r["planet"]: r for r in gochara_rows(lon, 0)}["Sun"]["verdict"] == "good"


def test_day_reading_is_deterministic_and_bounded():
    ctx = NatalContext(natal())
    a = day_reading(ctx, date(2026, 10, 8), **TEHRAN)
    assert a == day_reading(ctx, date(2026, 10, 8), **TEHRAN)
    assert 28 <= a["score"] <= 94 and all(28 <= x["score"] <= 94 for x in a["areas"])
    assert a["level"] in {"green", "amber", "red"} and len(a["gochara"]) == 9


def test_dasha_levels_nest_and_cover_instant():
    n = natal()
    ctx = NatalContext(n)
    at = datetime(2026, 10, 8, 12, tzinfo=timezone.utc)
    maha, antar, prat = dasha_levels(ctx.moon_lon, ctx.birth_utc, at)
    for lv in (maha, antar, prat):
        assert lv["start"] <= at < lv["end"]
    assert maha["start"] <= antar["start"] and antar["end"] <= maha["end"]
    assert antar["start"] <= prat["start"] and prat["end"] <= antar["end"]


def test_unknown_time_is_limited_but_works():
    n = compute_chart(1993, 4, 17, 12.0, 3.5, 35.69, 51.389, time_precision="unknown")
    r = build_daily(n, date(2026, 10, 8), 3.5, 35.69, 51.389, 3)
    assert r["limited"] is True and r["personal"]["areas"]
    assert "focus_areas_fa" not in r["dasha"]["levels"][0]  # house focus needs a lagna


def test_daily_api():
    c = TestClient(app)
    body = dict(birth=dict(calendar="gregorian", year=1993, month=4, day=17, hour=6, minute=42,
                           tz_offset=3.5, lat=35.6892, lon=51.389),
                date="2026-10-08", days=7)
    r = c.post("/daily", json=body)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["panchang"]["weekday"] == "پنجشنبه" and len(j["hora"]) == 24
    assert len(j["outlook"]["days"]) == 7 and j["dasha"]["levels"][0]["level"] == "maha"
    assert c.post("/daily", json={**body, "date": "2026-13-45"}).status_code == 422
