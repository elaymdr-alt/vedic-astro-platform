"""Aspects tests (P08-T01): geometry, orbs, applying/separating."""
from __future__ import annotations

from engine.aspects import angular_separation, cross_aspects, find_aspect


def test_angular_separation_symmetry():
    assert angular_separation(10.0, 350.0) == 20.0
    assert angular_separation(0.0, 180.0) == 180.0


def test_exact_aspects_detected():
    for lon, name in [(0.0, "conjunction"), (60.0, "sextile"), (90.0, "square"),
                      (120.0, "trine"), (180.0, "opposition")]:
        got = find_aspect(0.0, lon)
        assert any(a["aspect"] == name and a["orb"] == 0.0 for a in got), name


def test_no_aspect_at_45():
    assert find_aspect(0.0, 45.0) == []


def test_motion_applying_vs_separating():
    # closing in on the conjunction from +5°: A moves toward B
    app = find_aspect(15.0, 10.0, speed_a=-1.0, speed_b=0.0)[0]
    assert app["motion"] == "applying"
    # moving away
    sep = find_aspect(15.0, 10.0, speed_a=1.0, speed_b=0.0)[0]
    assert sep["motion"] == "separating"


def test_motion_exact_when_zero_gap():
    a = find_aspect(90.0, 90.0)[0]
    assert a["motion"] == "exact"


def test_orb_policy_defaults_and_override():
    # trine default orb 6: 115° (gap 5) hits, 113° (gap 7) misses
    assert any(a["aspect"] == "trine" for a in find_aspect(0.0, 115.0))
    assert not any(a["aspect"] == "trine" for a in find_aspect(0.0, 113.0))
    # tightening the orb to 4 excludes gap 5
    assert not any(a["aspect"] == "trine" for a in find_aspect(0.0, 115.0, orbs={"trine": 4.0}))


def test_cross_aspects_pairing():
    a = [{"name": "Sun", "longitude": 10.0, "speed": 1.0},
         {"name": "Moon", "longitude": 100.0, "speed": 13.0}]
    b = [{"name": "Venus", "longitude": 12.0, "speed": 1.2},
         {"name": "Saturn", "longitude": 280.0, "speed": -0.1}]
    out = cross_aspects(a, b)
    pairs = {(x["body_a"], x["body_b"]) for x in out}
    assert ("Sun", "Venus") in pairs          # 2° conjunction
    assert ("Moon", "Saturn") in pairs        # 180° opposition
    # same-chart pairs evaluated once when requested
    same = cross_aspects(a, a, same_chart=True)
    assert all(x["body_a"] != x["body_b"] for x in same)
