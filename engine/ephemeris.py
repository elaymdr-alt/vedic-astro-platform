"""Swiss Ephemeris adapter — Lahiri sidereal, Whole Sign compatible (P06-T01).

Contract:
- Swiss ephemeris files are used when ``EPHE_PATH`` points at a directory with
  ``se*`` files. Otherwise the library silently falls back to the built-in
  Moshier theory; this adapter therefore reads the flag the library actually
  returned (``SEFLG_*`` in ``retflag``) and reports it as ``ephemeris_flag`` —
  never an assumption.
- ``EPHE_STRICT=1`` (or ``configure(strict=True)``) forbids that fallback:
  a computation without Swiss files raises ``EphemerisUnavailable`` instead of
  quietly switching engine (AST-P06-T06).
- Swiss Ephemeris keeps process-global state (sidereal mode, ephemeris path,
  topocentric position). Every call that sets or relies on it runs under one
  re-entrant lock, so concurrent requests cannot corrupt each other.
"""
from __future__ import annotations

import os
import threading
from dataclasses import dataclass

import swisseph as swe

from .envfile import load_dotenv

load_dotenv()  # EPHE_PATH / EPHE_STRICT may live in the git-ignored .env

AYANAMSA = swe.SIDM_LAHIRI
FLAGS = swe.FLG_SIDEREAL | swe.FLG_SWIEPH | swe.FLG_SPEED

PLANET_IDS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS,
    "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER, "Venus": swe.VENUS,
    "Saturn": swe.SATURN,
}
NODE_IDS = {"mean": swe.MEAN_NODE, "true": swe.TRUE_NODE}

_lock = threading.RLock()
_configured = False
_active_ephe_path: str | None = None
_strict = False
_last_used_flag = "unknown"


class EphemerisUnavailable(RuntimeError):
    """Raised in strict mode when Swiss ephemeris files are not available."""


def configure(ephe_path: str | None = None, strict: bool | None = None) -> str | None:
    """Set ephemeris path once. Returns active path or None (Moshier)."""
    global _configured, _active_ephe_path, _strict
    with _lock:
        _strict = (os.environ.get("EPHE_STRICT") == "1") if strict is None else strict
        path = ephe_path or os.environ.get("EPHE_PATH")
        if path and os.path.isdir(path):
            files = [f for f in os.listdir(path) if f.lower().startswith("se")]
            if files:
                swe.set_ephe_path(path)
                _active_ephe_path = path
                _configured = True
                return path
        swe.set_ephe_path(None)
        _active_ephe_path = None
        _configured = True
        return None


def ephemeris_flag() -> str:
    """'swiss' / 'moshier' as actually returned by the last computation.

    Before any computation it reports what the configuration will use.
    """
    with _lock:
        if not _configured:
            configure()
        if _last_used_flag != "unknown":
            return _last_used_flag
        return "swiss" if _active_ephe_path else "moshier"


def _record(retflag: int) -> None:
    """Translate the library's returned flag; enforce strict mode."""
    global _last_used_flag
    used = "moshier" if retflag & swe.FLG_MOSEPH else "swiss"
    _last_used_flag = used
    if _strict and used != "swiss":
        raise EphemerisUnavailable(
            "Swiss ephemeris files not found (EPHE_PATH) and EPHE_STRICT is on; "
            "refusing to fall back to Moshier silently."
        )


@dataclass
class BodyPos:
    name: str
    longitude: float  # sidereal degrees 0..360
    latitude: float
    speed_lon: float  # deg/day (negative => retrograde)
    retrograde: bool


def julday(year: int, month: int, day: int, hour_ut: float) -> float:
    return swe.julday(year, month, day, hour_ut)


def body_longitude(planet: str, jd_ut: float, node: str = "mean") -> BodyPos:
    """Sidereal position. ``planet`` may be a classical planet or ``Rahu``
    (``node``: "mean" | "true")."""
    if planet == "Rahu":
        if node not in NODE_IDS:
            raise ValueError(f"unknown node type: {node}")
        body_id = NODE_IDS[node]
    elif planet in PLANET_IDS:
        body_id = PLANET_IDS[planet]
    else:
        raise ValueError(f"unknown planet: {planet}")
    with _lock:
        if not _configured:
            configure()
        swe.set_sid_mode(AYANAMSA)
        res, retflag = swe.calc_ut(jd_ut, body_id, FLAGS)
        _record(retflag)
    lon, lat, _, speed_lon, *_ = list(res) + [0.0] * 6
    return BodyPos(
        name=planet, longitude=float(lon) % 360.0, latitude=float(lat),
        speed_lon=float(speed_lon), retrograde=float(speed_lon) < 0,
    )


def houses_cusps_whole_sign(jd_ut: float, lat: float, lon: float) -> tuple[float, list[float]]:
    """Ascendant longitude + 12 Whole-Sign cusp longitudes (P06-T04)."""
    asc, _mc = sidereal_angles(jd_ut, lat, lon)
    asc_sign = int(asc // 30)
    whole = [((asc_sign + i) % 12) * 30.0 for i in range(12)]
    return asc, whole


def sidereal_angles(jd_ut: float, lat: float, lon: float) -> tuple[float, float]:
    """Sidereal (Ascendant, MC) longitudes in degrees (P06-T03)."""
    with _lock:
        if not _configured:
            configure()
        swe.set_sid_mode(AYANAMSA)
        _cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b"W", FLAGS)
    return float(ascmc[0]) % 360.0, float(ascmc[1]) % 360.0


def ayanamsa_value(jd_ut: float) -> float:
    with _lock:
        swe.set_sid_mode(AYANAMSA)
        return float(swe.get_ayanamsa_ut(jd_ut))
