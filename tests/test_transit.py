"""Transit tests (P08-T03/T04): snapshot, ≤90-day scan, refined timings."""
from __future__ import annotations

from datetime import datetime, timezone

from engine.chart import compute_chart
from engine.transit import MAX_SCAN_DAYS, transit_scan, transit_snapshot

NATAL = compute_chart(2024, 3, 20, 12.0, 3.5, 35.6892, 51.3890)
START = datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc)


def test_snapshot_positions_and_contacts():
    snap = transit_snapshot(NATAL, START)
    assert len(snap["positions"]) == 9
    assert snap["houses_valid"] is True
    for p in snap["positions"]:
        assert 1 <= p["house_in_natal"] <= 12
        assert 0 <= p["longitude"] < 360
    # every contact references a transit planet and a natal planet
    natal_names = {p["name"] for p in NATAL["planets"]}
    for c in snap["contacts"]:
        assert c["natal"] in natal_names
        assert c["aspect"] in {"conjunction", "opposition", "trine", "square", "sextile"}


def test_scan_over_30_days():
    scan = transit_scan(NATAL, START, days=30)
    assert scan["days"] == 30
    # the Moon changes sign roughly every 2.3 days — must find ingress events
    assert len(scan["ingresses"]) >= 5
    assert len(scan["contacts"]) > 0
    # every event carries a natal house for later interpretation (T03-M2)
    for ev in scan["ingresses"] + scan["contacts"]:
        assert ev["house_in_natal"] is None or 1 <= ev["house_in_natal"] <= 12
    # events are time-ordered
    times = [e["at_utc"] for e in scan["ingresses"]]
    assert times == sorted(times)


def test_scan_clamped_to_90_days():
    scan = transit_scan(NATAL, START, days=365)
    assert scan["days"] == MAX_SCAN_DAYS


def test_scan_zero_days_is_empty_but_valid():
    scan = transit_scan(NATAL, START, days=0)
    assert scan["days"] == 0
    assert scan["ingresses"] == [] and scan["contacts"] == []


def test_ingress_time_lands_on_sign_boundary():
    scan = transit_scan(NATAL, START, days=30)
    ing = next(e for e in scan["ingresses"] if e["direction"] == "forward")
    at = datetime.fromisoformat(ing["at_utc"])
    # recompute the planet's longitude at the reported time: within 0.05° of
    # the boundary it claims to have crossed (bisection converged)
    from engine.transit import jd_from_utc
    from engine.chart import planet_positions
    bodies, _ = planet_positions(jd_from_utc(at))
    lon = next(b["longitude"] for b in bodies if b["name"] == ing["planet"])
    target = (["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
               "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius",
               "Pisces"].index(ing["to_sign"]) * 30.0) % 360.0
    dist = abs((lon - target + 180.0) % 360.0 - 180.0)
    assert dist < 0.05, f"lng {lon} vs boundary {target}"


def test_scan_works_without_birth_time():
    limited = compute_chart(2024, 3, 20, 12.0, 3.5, 35.6892, 51.3890,
                            time_precision="unknown")
    scan = transit_scan(limited, START, days=15)
    assert scan["days"] == 15
    for ev in scan["ingresses"]:
        assert ev["house_in_natal"] is None  # no ascendant -> no house
