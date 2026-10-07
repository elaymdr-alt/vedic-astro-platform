"""Swiss Ephemeris adapter — Lahiri sidereal, Whole Sign compatible (P06-T01).

Contract (per execution plan P06-T01-M4):
- Prefer Swiss ephemeris files if `EPHE_PATH` is set and contains se* files.
- Otherwise fall back to Moshier and record the real flag used in
  `ephemeris_flag` so callers/tests can assert it.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import swisseph as swe

AYANAMSA = swe.SIDM_LAHIRI
FLAGS = swe.FLG_SIDEREAL | swe.FLG_SWIEPH | swe.FLG_MOSEPH | swe.FLG_SPEED

PLANET_IDS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS,
    "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER, "Venus": swe.VENUS,
    "Saturn": swe.SATURN, "Rahu": swe.MEAN_NODE,
}

_configured = False
_active_ephe_path: str | None = None


def configure(ephe_path: str | None = None) -> str | None:
    """Set ephemeris path once. Returns active path or None (Moshier)."""
    global _configured, _active_ephe_path
    path = ephe_path or os.environ.get("EPHE_PATH")
    if path and os.path.isdir(path):
        files = [f for f in os.listdir(path) if f.lower().startswith("se")]
        if files:
            swe.set_ephe_path(path)
            _active_ephe_path = path
            _configured = True
            return path
    swe.set_ephe_path(None)  # built-in Moshier fallback
    _active_ephe_path = None
    _configured = True
    return None


def ephemeris_flag() -> str:
    """'swiss' when ephemeris files are active, else 'moshier' (P06-T01-M4)."""
    if not _configured:
        configure()
    return "swiss" if _active_ephe_path else "moshier"


@dataclass
class BodyPos:
    name: str
    longitude: float  # sidereal degrees 0..360
    latitude: float
    speed_lon: float  # deg/day (negative => retrograde)
    retrograde: bool


def julday(year: int, month: int, day: int, hour_ut: float) -> float:
    return swe.julday(year, month, day, hour_ut)


def body_longitude(planet: str, jd_ut: float) -> BodyPos:
    if planet not in PLANET_IDS:
        raise ValueError(f"unknown planet: {planet}")
    if not _configured:
        configure()
    swe.set_sid_mode(AYANAMSA)
    res, _ = swe.calc_ut(jd_ut, PLANET_IDS[planet], FLAGS)
    lon, lat, _, speed_lon, *_ = list(res) + [0.0] * 6
    return BodyPos(
        name=planet, longitude=float(lon) % 360.0, latitude=float(lat),
        speed_lon=float(speed_lon), retrograde=float(speed_lon) < 0,
    )


def houses_cusps_whole_sign(jd_ut: float, lat: float, lon: float) -> tuple[float, list[float]]:
    """Ascendant longitude + 12 Whole-Sign cusp longitudes (P06-T04)."""
    if not _configured:
        configure()
    swe.set_sid_mode(AYANAMSA)
    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b"W", FLAGS)
    asc = float(ascmc[0]) % 360.0
    asc_sign = int(asc // 30)
    whole = [((asc_sign + i) % 12) * 30.0 for i in range(12)]
    return asc, whole


def ayanamsa_value(jd_ut: float) -> float:
    swe.set_sid_mode(AYANAMSA)
    return float(swe.get_ayanamsa_ut(jd_ut))
