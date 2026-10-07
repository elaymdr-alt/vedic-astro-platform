"""Engine tests (TEST-engine): whole-sign, nakshatra borders, dasha, navamsa."""
from datetime import date

from engine.chart import compute_chart
from engine.d9 import navamsa_of
from engine.dasha import vimshottari
from engine.ephemeris import ephemeris_flag
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
