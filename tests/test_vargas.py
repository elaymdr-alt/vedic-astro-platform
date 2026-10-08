"""Divisional charts D2/D3/D4/D7/D10/D12 — classical rule anchors."""
from engine import compute_chart
from engine.vargas import (
    d2_hora, d3_drekkana, d4_chaturthamsa, d7_saptamsa, d10_dasamsa, d12_dwadasamsa, vargas_of,
)

ARIES, TAURUS = 0.0, 30.0
LEO, CANCER, SCORPIO, CAPRICORN, TAURUS_I = 4, 3, 7, 9, 1


def test_hora_odd_and_even_signs():
    assert d2_hora(ARIES + 5) == LEO and d2_hora(ARIES + 20) == CANCER      # odd sign
    assert d2_hora(TAURUS + 5) == CANCER and d2_hora(TAURUS + 20) == LEO    # even sign


def test_drekkana_trines():
    assert [d3_drekkana(ARIES + x) for x in (1, 12, 25)] == [0, 4, 8]       # Aries, Leo, Sagittarius


def test_chaturthamsa_quadrants():
    assert [d4_chaturthamsa(ARIES + x) for x in (1, 8, 16, 25)] == [0, 3, 6, 9]


def test_saptamsa_start_depends_on_parity():
    assert d7_saptamsa(ARIES + 0.1) == 0                 # odd sign: from itself
    assert d7_saptamsa(TAURUS + 0.1) == SCORPIO          # even sign: from the 7th
    assert d7_saptamsa(ARIES + 29.9) == 6                # 7th part of Aries -> Libra


def test_dasamsa_start_depends_on_parity():
    assert d10_dasamsa(ARIES + 0.1) == 0
    assert d10_dasamsa(TAURUS + 0.1) == CAPRICORN        # even sign: from the 9th
    assert d10_dasamsa(ARIES + 3.1) == 1


def test_dwadasamsa_counts_from_own_sign():
    assert d12_dwadasamsa(ARIES + 1) == 0 and d12_dwadasamsa(ARIES + 2.6) == 1
    assert d12_dwadasamsa(ARIES + 29.9) == 11


def test_boundaries_and_wraparound_are_stable():
    for lon in (0.0, 359.9999, 360.0, 720.0, -0.0001):
        assert all(0 <= s < 12 for s in vargas_of(lon).values())


def test_chart_exposes_vargas_for_planets_and_ascendant():
    c = compute_chart(1993, 4, 17, 6.7, 3.5, 35.6892, 51.389)
    for p in c["planets"]:
        assert set(p["vargas"]) == {"D2", "D3", "D4", "D7", "D10", "D12"}
    assert set(c["ascendant"]["vargas"]) == {"D2", "D3", "D4", "D7", "D10", "D12"}
    assert c["planets"][0]["vargas"] == vargas_of(c["planets"][0]["longitude"])
