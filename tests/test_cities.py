from fastapi.testclient import TestClient

from backend.cities import search_cities
from backend.main import app


def test_persian_and_english_queries_find_the_right_zone():
    t = search_cities("تهران")[0]
    assert t["tz"] == "Asia/Tehran" and t["country"] == "IR" and abs(t["tz_offset"] - 3.5) < 1e-9
    assert search_cities("london")[0]["tz"] == "Europe/London"
    assert search_cities("New York")[0]["tz"] == "America/New_York"
    assert search_cities("مشهد")[0]["name_en"].lower().startswith("mash")


def test_arabic_letters_in_query_are_normalised():
    assert search_cities("اصفهان")[0]["tz"] == "Asia/Tehran"
    assert search_cities("اصفهان")[0] == search_cities("اصفهان".replace("ک", "ك"))[0]


def test_default_suggestions_and_limits_and_unknown():
    d = search_cities("", 5)
    assert len(d) == 5 and all(c["country"] == "IR" for c in d)
    assert len(search_cities("san", 3)) <= 3
    assert search_cities("zzzzqqqq") == []


def test_cities_endpoint_and_chart_with_foreign_city_uses_its_tzdb_offset():
    c = TestClient(app)
    ny = c.get("/cities", params={"q": "new york", "limit": 1}).json()["items"][0]
    base = dict(calendar="gregorian", year=1990, month=7, day=1, hour=12, minute=0, tz_offset=0,
                lat=ny["lat"], lon=ny["lon"])
    summer = c.post("/chart/compute", json={**base, "tz": ny["tz"]}).json()["chart"]["julian_day_ut"]
    naive = c.post("/chart/compute", json={**base, "tz_offset": -5}).json()["chart"]["julian_day_ut"]
    # New York was on EDT (UTC-4) on 1990-07-01, so tz-derived instant is 1h earlier than a fixed -5.
    assert abs((naive - summer) - 1 / 24) < 1e-4
