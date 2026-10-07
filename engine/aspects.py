"""Geometric aspects with orbs — P08-T01.

Pure angular geometry only; Vedic interpretation opinions are kept separate
in the interpretation layer (P08 acceptance: geometry and opinion must not be
mixed). Applying/Separating is derived numerically from planetary speeds:
the aspect is *applying* when the exactness gap shrinks within one day.
"""
from __future__ import annotations

from typing import Any

# name, exact angle, default orb (degrees)
ASPECTS: list[tuple[str, float, float]] = [
    ("conjunction", 0.0, 8.0),
    ("opposition", 180.0, 8.0),
    ("trine", 120.0, 6.0),
    ("square", 90.0, 6.0),
    ("sextile", 60.0, 4.0),
]

ASPECT_FA = {
    "conjunction": "هم‌دستی",
    "opposition": "مقابل",
    "trine": "ثلث",
    "square": "مربع",
    "sextile": "سدس",
}


def angular_separation(lon_a: float, lon_b: float) -> float:
    """Shortest unsigned angular distance between two longitudes (0..180)."""
    d = abs((float(lon_a) - float(lon_b)) % 360.0)
    return d if d <= 180.0 else 360.0 - d


def _gap_to_aspect(sep: float, angle: float) -> float:
    """Distance from the exact aspect angle, folded into 0..angle-range.

    For any separation, the nearest exact instance of the aspect is at
    ``angle ± k*360`` folded — use symmetric distance to the aspect family.
    """
    # distance to nearest multiple: aspect angles are symmetric under 360
    diff = abs(sep - angle)
    return min(diff, 360.0 - diff)


def find_aspect(
    lon_a: float, lon_b: float,
    speed_a: float = 0.0, speed_b: float = 0.0,
    orbs: dict[str, float] | None = None,
) -> list[dict[str, Any]]:
    """All aspects between two longitudes within orb (geometric only).

    ``speed_*`` are daily speeds (deg/day); they only decide
    applying/separating, never whether an aspect exists.
    """
    sep = angular_separation(lon_a, lon_b)
    out: list[dict[str, Any]] = []
    for name, angle, default_orb in ASPECTS:
        orb_limit = (orbs or {}).get(name, default_orb)
        gap = _gap_to_aspect(sep, angle)
        if gap > orb_limit:
            continue
        # applying? compare gap now vs gap one day later (numeric, robust)
        sep_next = angular_separation(lon_a + speed_a, lon_b + speed_b)
        gap_next = _gap_to_aspect(sep_next, angle)
        if gap <= 0.01:
            motion = "exact"
        elif gap_next < gap - 1e-9:
            motion = "applying"
        elif gap_next > gap + 1e-9:
            motion = "separating"
        else:
            motion = "indeterminate"  # zero speeds supplied — cannot decide
        out.append({
            "aspect": name,
            "aspect_fa": ASPECT_FA[name],
            "angle": angle,
            "orb": round(gap, 4),
            "motion": motion,
        })
    out.sort(key=lambda a: a["orb"])
    return out


def cross_aspects(
    bodies_a: list[dict[str, Any]],
    bodies_b: list[dict[str, Any]],
    orbs: dict[str, float] | None = None,
    same_chart: bool = False,
) -> list[dict[str, Any]]:
    """Aspects between two planet lists.

    With ``same_chart=True`` each unordered pair is evaluated once.
    Bodies need ``name``, ``longitude`` and (optionally) ``speed``.
    """
    out: list[dict[str, Any]] = []
    for i, a in enumerate(bodies_a):
        for j, b in enumerate(bodies_b):
            if same_chart and j <= i:
                continue
            for asp in find_aspect(
                a["longitude"], b["longitude"],
                float(a.get("speed", 0.0)), float(b.get("speed", 0.0)),
                orbs,
            ):
                out.append({
                    "body_a": a["name"], "body_b": b["name"], **asp,
                })
    out.sort(key=lambda x: x["orb"])
    return out
