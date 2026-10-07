"""Synastry — compare two natal charts (P08-T02).

Direction convention: `natal_a` is the reference chart (houses come from A's
ascendant); each body of B is placed in A's Whole-Sign house. Cross aspects
are symmetric (A×B). Rules that depend on a valid birth time are skipped and
reported in ``limitations`` when either chart has unknown time (P08-T02
"محدودسازی قواعد وابسته به ساعت نامعلوم").
"""
from __future__ import annotations

from typing import Any

from .aspects import cross_aspects
from .constants import PLANETS_FA, SIGNS_FA


def _has_asc(chart: dict[str, Any]) -> bool:
    return bool(chart.get("ascendant"))


def bodies_in_reference_houses(
    reference: dict[str, Any], other: dict[str, Any],
) -> list[dict[str, Any]]:
    """Place each body of ``other`` in the Whole-Sign houses of ``reference``."""
    asc_sign = reference["ascendant"]["sign_index"]
    out = []
    for p in other["planets"]:
        house = (p["sign_index"] - asc_sign) % 12 + 1
        out.append({
            "name": p["name"],
            "name_fa": PLANETS_FA.get(p["name"], p["name"]),
            "sign_index": p["sign_index"],
            "sign": p["sign"],
            "sign_fa": SIGNS_FA[p["sign_index"]],
            "degree_in_sign": p["degree_in_sign"],
            "longitude": p["longitude"],
            "house_in_reference": house,
            "retrograde": p["retrograde"],
        })
    return out


def synastry(
    natal_a: dict[str, Any],
    natal_b: dict[str, Any],
    orbs: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Synastry of ``b`` against reference chart ``a``."""
    limitations: list[dict[str, str]] = []
    houses_valid = _has_asc(natal_a) and _has_asc(natal_b)

    b_in_a: list[dict[str, Any]] = []
    if houses_valid:
        b_in_a = bodies_in_reference_houses(natal_a, natal_b)
    else:
        limitations.append({
            "code": "HOUSES_SKIPPED_UNKNOWN_TIME",
            "message": "خانه‌های سیناستری بدون ساعت تولد معتبر محاسبه نمی‌شوند.",
        })

    aspects = cross_aspects(natal_a["planets"], natal_b["planets"], orbs)

    # A's planets in B's houses (reverse direction, only when both have asc)
    a_in_b: list[dict[str, Any]] = []
    if houses_valid:
        a_in_b = bodies_in_reference_houses(natal_b, natal_a)

    summary = {
        "aspects_total": len(aspects),
        "conjunctions": sum(1 for x in aspects if x["aspect"] == "conjunction"),
        "oppositions": sum(1 for x in aspects if x["aspect"] == "opposition"),
        "trines": sum(1 for x in aspects if x["aspect"] == "trine"),
        "squares": sum(1 for x in aspects if x["aspect"] == "square"),
        "sextiles": sum(1 for x in aspects if x["aspect"] == "sextile"),
    }

    return {
        "reference": "a",
        "houses_valid": houses_valid,
        "b_in_a_houses": b_in_a,
        "a_in_b_houses": a_in_b,
        "aspects": aspects,
        "summary": summary,
        "limitations": limitations,
    }
