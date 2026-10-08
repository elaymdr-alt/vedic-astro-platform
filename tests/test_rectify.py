"""Rectification: machinery, determinism, honesty (not astronomical truth)."""
from datetime import date, datetime, timedelta, timezone

from fastapi.testclient import TestClient

from backend.main import app
from engine import rectify as R

Y, M, D, TZ, LAT, LON = 1990, 6, 15, 3.5, 35.6892, 51.389
TRUE_MIN = 10 * 60 + 30


def _synthetic_events():
    """Events placed where the TRUE chart signifies them most (sanity fixture)."""
    true = R.build_candidates(Y, M, D, TZ, LAT, LON, TRUE_MIN, TRUE_MIN, 1)[0]
    evs = []
    for t in ["marriage", "child_birth", "job_start", "education", "property", "move_abroad"]:
        best = (-1.0, None)
        d = date(1998, 1, 1)
        while d < date(2022, 1, 1):
            ev = R.Event(t, d)
            sc = R._score_candidate(true, [ev], R._prepare_samples([ev]))[0]
            if sc > best[0]:
                best = (sc, d)
            d += timedelta(days=45)
        evs.append(R.Event(t, best[1], "month"))
    return evs, true


def _span(r):
    return sum(
        (int(x["to"][:2]) * 60 + int(x["to"][3:])) - (int(x["from"][:2]) * 60 + int(x["from"][3:]))
        for x in r["credible_ranges"]
    )


def test_dasha_at_matches_vimshottari_balance_logic():
    birth = datetime(2000, 1, 1, tzinfo=timezone.utc)
    # Moon 199.4706 deg: Rahu MD, last sub-period Mars (see engine.dasha test)
    assert R.dasha_at(199.4706, birth, birth)[:2] == ("Rahu", "Mars")
    # a year later the next mahadasha (Jupiter) has begun
    md, _ad, _pd = R.dasha_at(199.4706, birth, birth.replace(year=2001))
    assert md == "Jupiter"


def test_true_lagna_dominates_on_consistent_events_and_is_deterministic():
    evs, true = _synthetic_events()
    a = R.rectify(Y, M, D, TZ, LAT, LON, evs, step_min=6, permutations=30)
    b = R.rectify(Y, M, D, TZ, LAT, LON, evs, step_min=6, permutations=30)
    assert a == b
    assert a["lagna_probabilities"][0]["sign_index"] == true.asc_sign
    assert abs(sum(r["probability"] for r in a["lagna_probabilities"]) - 1.0) < 1e-2
    assert a["significance"]["p_value"] < 0.2 and a["significance"]["informative"]
    assert any("دقیقه" in w for w in a["warnings"])  # honesty notice always present


def test_prior_narrows_credible_window():
    evs, _ = _synthetic_events()
    free = R.rectify(Y, M, D, TZ, LAT, LON, evs, step_min=6, permutations=0)
    primed = R.rectify(Y, M, D, TZ, LAT, LON, evs, step_min=6, permutations=0,
                       prior_center_min=TRUE_MIN, prior_sigma_min=60)
    assert _span(primed) < _span(free)


def test_uninformative_with_too_few_events_is_flagged():
    r = R.rectify(Y, M, D, TZ, LAT, LON, [R.Event("marriage", date(2015, 5, 1))],
                  step_min=10, permutations=10)
    assert r["significance"]["informative"] is False
    assert any("۳ رویداد" in w for w in r["warnings"])


def test_api_validation_and_happy_path():
    c = TestClient(app)
    assert any(i["type"] == "marriage" for i in c.get("/rectify/event-types").json()["items"])
    base = dict(calendar="gregorian", year=Y, month=M, day=D, tz_offset=TZ, lat=LAT, lon=LON,
                step_minutes=15, permutations=5,
                events=[dict(type="marriage", calendar="gregorian", year=2015, month=5, day=1)])
    ok = c.post("/rectify", json=base)
    assert ok.status_code == 200 and ok.json()["lagna_probabilities"]
    bad = c.post("/rectify", json={**base, "events": [dict(type="nope", year=2000)]})
    assert bad.status_code == 422
    inv = c.post("/rectify", json={**base, "window_from": "20:00", "window_to": "10:00"})
    assert inv.status_code == 422
