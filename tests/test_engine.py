"""Engine tests (TEST-engine): whole-sign, nakshatra borders, dasha, navamsa."""
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date

from engine.chart import compute_chart
from engine.d9 import navamsa_of
from engine.dasha import vimshottari
from engine.ephemeris import ephemeris_flag, configure
from engine.nakshatra import nakshatra_of


def test_ephemeris_flag_recorded():
    assert ephemeris_flag() in ("swiss", "moshier")


def test_nakshatra_borders():
    # 0° Aries -> Ashwini Pada 1
    n0 = nakshatra_of(0.0)
    assert (n0["name"], n0["pada"]) == ("Ashwini", 1)
    # 13°20' = 13.3333° -> Bharani Pada 1
    n1 = nakshatra_of(13.3334)
    assert n1["name"] == "Bharani" and n1["pada"] == 1
    # just below border stays Ashwini Pada 4
    n2 = nakshatra_of(13.3332)
    assert n2["name"] == "Ashwini" and n2["pada"] == 4


def test_navamsa_chara_start():
    # Aries 0° (movable) -> D9 Aries
    assert navamsa_of(0.5)["sign_index"] == 0
    # Taurus 0° (fixed) -> starts from Capricorn (9th)
    assert navamsa_of(30.5)["sign_index"] == 9


def test_dasha_balance_sums():
    d = vimshottari(0.0, date(2000, 1, 1))  # Ashwini => Ketu 7y full balance
    assert d["balance_years"] == 7.0
    assert d["mahadashas"][0]["lord"] == "Ketu"


def test_chart_whole_sign_houses():
    c = compute_chart(2024, 3, 20, 12.0, 3.5, 35.6892, 51.3890)
    assert len(c["planets"]) == 9
    asc_sign = c["ascendant"]["sign_index"]
    for i, h in enumerate(c["houses_whole_sign"]):
        assert h["sign_index"] == (asc_sign + i) % 12
    # house of each planet consistent with whole-sign rule
    for p in c["planets"]:
        assert p["house"] == (p["sign_index"] - asc_sign) % 12 + 1
    # Ketu opposite Rahu
    rahu = next(p for p in c["planets"] if p["name"] == "Rahu")
    ketu = next(p for p in c["planets"] if p["name"] == "Ketu")
    assert abs(((rahu["longitude"] + 180.0) % 360.0) - ketu["longitude"]) < 1e-6


def test_concurrent_chart_computations():
    """P06-T06: parallel chart requests must not corrupt global ephemeris state."""
    configure()  # reset global once

    results = []
    errors = []

    def compute(i: int):
        try:
            c = compute_chart(2024, 3, 20, 12.0 + i * 0.1, 3.5, 35.6892, 51.3890)
            results.append(c)
        except Exception as exc:
            errors.append(str(exc))

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(compute, i) for i in range(20)]
        for f in as_completed(futures):
            f.result()  # propagate any exception

    assert not errors, f"concurrent failures: {errors}"
    assert len(results) == 20
    # Every result must have consistent flag (no half-configured state)
    flags = {r["ephemeris_flag"] for r in results}
    assert len(flags) == 1, f"mixed ephemeris_flag across concurrent runs: {flags}"
    # All ascendants must be valid (no None due to race condition)
    assert all(r["ascendant"] is not None for r in results)


def test_midheaven_present_and_omitted_when_time_unknown():
    c = compute_chart(2024, 3, 20, 12.0, 3.5, 35.6892, 51.3890)
    mc = c["midheaven"]
    assert 0.0 <= mc["longitude"] < 360.0 and mc["sign_index"] == int(mc["longitude"] // 30)
    u = compute_chart(2024, 3, 20, 12.0, 3.5, 35.6892, 51.3890, time_precision="unknown")
    assert u["midheaven"] is None


def test_antardasha_of_balance_mahadasha_uses_full_dasha():
    # Moon at 199.4706° (Swati, Rahu mahadasha, 96% elapsed): birth lies in the
    # LAST sub-period of Rahu (Mars), not a rescaled Rahu-Rahu.
    d = vimshottari(199.4706, date(2000, 1, 1))
    first = d["mahadashas"][0]
    assert [a["lord"] for a in first["antardashas"]] == ["Mars"]
    assert first["antardashas"][0]["start"] == "2000-01-01"
    assert first["antardashas"][0]["end"] == first["end"]
    # later mahadashas carry the full 9 sub-periods starting with their own lord
    nxt = d["mahadashas"][1]
    assert len(nxt["antardashas"]) == 9 and nxt["antardashas"][0]["lord"] == nxt["lord"]
    assert nxt["antardashas"][-1]["end"] == nxt["end"]


# ---- P06 hardening: real flags, strict mode, node type, independent reference ----
import pytest  # noqa: E402

from engine import ephemeris as eph  # noqa: E402


def test_flag_reflects_what_the_library_returned():
    eph.configure(strict=False)
    eph.body_longitude("Sun", eph.julday(2000, 1, 1, 12.0))
    # No EPHE_PATH in the test env: the library really used Moshier.
    assert eph.ephemeris_flag() == "moshier"


def test_strict_mode_refuses_silent_fallback():
    try:
        eph.configure(strict=True)
        with pytest.raises(eph.EphemerisUnavailable):
            eph.body_longitude("Moon", eph.julday(2000, 1, 1, 12.0))
    finally:
        eph.configure(strict=False)


def test_true_node_differs_from_mean_node_within_two_degrees():
    jd = eph.julday(2000, 1, 1, 12.0)
    mean = eph.body_longitude("Rahu", jd, "mean").longitude
    true = eph.body_longitude("Rahu", jd, "true").longitude
    assert mean != true and abs(((mean - true + 180) % 360) - 180) < 2.0
    assert compute_chart(2000, 1, 1, 12.0, 0.0, 51.5, 0.0, node="true")["node"] == "true"


# Independent reference: standard J2000.0 (2000-01-01 12:00 TT) geocentric
# tropical longitudes from published almanac/Meeus values, converted to Lahiri
# sidereal with the ayanamsa. Tolerance covers TT-UT (64 s: Moon ≈ 0.03°).
J2000_TROPICAL = {"Sun": 280.3689, "Moon": 223.3238, "Mars": 327.9633,
                  "Jupiter": 25.2531, "Saturn": 40.3957}


@pytest.mark.parametrize("name,tropical", J2000_TROPICAL.items())
def test_j2000_positions_match_published_reference(name, tropical):
    jd = eph.julday(2000, 1, 1, 12.0)
    expected = (tropical - eph.ayanamsa_value(jd)) % 360.0
    got = eph.body_longitude(name, jd).longitude
    assert abs(((got - expected + 180) % 360) - 180) < 0.05, (name, got, expected)


def test_lahiri_ayanamsa_at_j2000():
    assert abs(eph.ayanamsa_value(eph.julday(2000, 1, 1, 12.0)) - 23.857) < 0.01
