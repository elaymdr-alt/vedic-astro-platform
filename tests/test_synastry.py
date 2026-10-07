"""Synastry tests (P08-T02): direction, houses, unknown-time limiting."""
from __future__ import annotations

from engine.chart import compute_chart
from engine.synastry import synastry

# reference: 20 Mar 2024 12:00 Tehran; partner: 15 Jan 2026 08:00 Tehran
NATAL_A = compute_chart(2024, 3, 20, 12.0, 3.5, 35.6892, 51.3890)
NATAL_B = compute_chart(2026, 1, 15, 8.0, 3.5, 35.6892, 51.3890)


def test_direction_a_is_reference():
    s = synastry(NATAL_A, NATAL_B)
    assert s["reference"] == "a"
    assert s["houses_valid"] is True
    assert s["limitations"] == []
    assert len(s["b_in_a_houses"]) == len(NATAL_B["planets"])
    # B's planets sit in A's Whole-Sign houses derived from A's ascendant
    asc_a = NATAL_A["ascendant"]["sign_index"]
    for item in s["b_in_a_houses"]:
        expected = (item["sign_index"] - asc_a) % 12 + 1
        assert item["house_in_reference"] == expected
    assert len(s["a_in_b_houses"]) == len(NATAL_A["planets"])


def test_cross_aspects_symmetric_pairs():
    s = synastry(NATAL_A, NATAL_B)
    a_names = {p["name"] for p in NATAL_A["planets"]}
    b_names = {p["name"] for p in NATAL_B["planets"]}
    for asp in s["aspects"]:
        assert asp["body_a"] in a_names
        assert asp["body_b"] in b_names
    assert s["summary"]["aspects_total"] == len(s["aspects"])


def test_unknown_time_skips_house_rules():
    limited = compute_chart(2026, 1, 15, 8.0, 3.5, 35.6892, 51.3890,
                            time_precision="unknown")
    assert limited["ascendant"] is None
    s = synastry(NATAL_A, limited)
    assert s["houses_valid"] is False
    assert s["b_in_a_houses"] == [] and s["a_in_b_houses"] == []
    assert any(l["code"] == "HOUSES_SKIPPED_UNKNOWN_TIME" for l in s["limitations"])
    # planet-to-planet aspects still work without a time basis
    assert len(s["aspects"]) > 0
