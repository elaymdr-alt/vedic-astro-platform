"""Nakshatra / Pada from sidereal Moon longitude (P06-T05)."""
from __future__ import annotations

from .constants import NAKSHATRAS, NAKSHATRA_LORDS, NAKSHATRA_SPAN, PADA_SPAN


def nakshatra_of(longitude: float) -> dict:
    lon = float(longitude) % 360.0
    # Krittika Pada 1 starts at 26°40' Aries — offset the index base by 26.666°:
    # simpler: index = floor(lon / 13.333) gives Ashwini at 0° Aries. The classical
    # sequence IS Ashwini-first, so no offset needed.
    idx = int(lon // NAKSHATRA_SPAN) % 27
    within = lon - int(lon // NAKSHATRA_SPAN) * NAKSHATRA_SPAN
    pada = int(within // PADA_SPAN) + 1
    lord = NAKSHATRA_LORDS[idx % 9]
    return {
        "index": idx, "name": NAKSHATRAS[idx],
        "pada": pada, "lord": lord,
        "span_start": round(idx * NAKSHATRA_SPAN, 4),
        "span_end": round((idx + 1) * NAKSHATRA_SPAN, 4),
    }
