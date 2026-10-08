"""Full chart computation: planets + Asc + Whole-Sign houses + D9 + Dasha (P06-T02..T05).

``time_precision`` (P05-T05): with "unknown" birth time the time-sensitive
outputs (ascendant, houses, dasha, moon nakshatra) are omitted per the master
document — they must not be produced without a valid time basis.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from . import ephemeris as eph
from .constants import PLANETS, SIGNS_EN, SIGNS_FA, SIGN_LORDS
from .nakshatra import nakshatra_of
from .d9 import navamsa_of
from .dasha import vimshottari
from .vargas import vargas_of

TIME_SENSITIVE_FIELDS = ["ascendant", "houses_whole_sign", "dasha", "moon_nakshatra"]


def _deg_in_sign(lon: float) -> tuple[int, float]:
    lon = float(lon) % 360.0
    return int(lon // 30), round(lon % 30.0, 4)


def planet_positions(jd_ut: float, node: str = "mean") -> tuple[list[dict[str, Any]], float]:
    """Sidereal positions of the 9 bodies at a Julian Day (UT).

    Returns ``(bodies, moon_longitude)`` — sign, D9, speed and retrograde are
    filled; ``house`` is left for the caller (depends on the ascendant).
    Reused by the transit module (P08-T03).
    """
    eph.configure()
    bodies: list[dict[str, Any]] = []
    moon_lon = 0.0
    for name in PLANETS:
        if name == "Ketu":
            continue
        pos = eph.body_longitude(name, jd_ut, node)
        if name == "Moon":
            moon_lon = pos.longitude
        sign, deg = _deg_in_sign(pos.longitude)
        d9 = navamsa_of(pos.longitude)
        d9_sign, _ = _deg_in_sign(d9["longitude"])
        bodies.append({
            "name": name, "longitude": round(pos.longitude, 4),
            "sign_index": sign, "sign": SIGNS_EN[sign], "sign_fa": SIGNS_FA[sign],
            "degree_in_sign": deg, "house": None,
            "retrograde": pos.retrograde, "speed": round(pos.speed_lon, 4),
            "d9_sign_index": d9_sign, "d9_sign": SIGNS_EN[d9_sign],
            "d9_longitude": d9["longitude"],
            "vargas": vargas_of(round(pos.longitude, 4)),
        })

    # Ketu = Rahu + 180
    rahu = next(b for b in bodies if b["name"] == "Rahu")
    ketu_lon = (rahu["longitude"] + 180.0) % 360.0
    k_sign, k_deg = _deg_in_sign(ketu_lon)
    k_d9 = navamsa_of(ketu_lon)
    kd9_sign, _ = _deg_in_sign(k_d9["longitude"])
    bodies.append({
        "name": "Ketu", "longitude": round(ketu_lon, 4),
        "sign_index": k_sign, "sign": SIGNS_EN[k_sign], "sign_fa": SIGNS_FA[k_sign],
        "degree_in_sign": k_deg, "house": None,
        "retrograde": True, "speed": round(-rahu["speed"], 4),
        "d9_sign_index": kd9_sign, "d9_sign": SIGNS_EN[kd9_sign],
        "d9_longitude": k_d9["longitude"],
        "vargas": vargas_of(ketu_lon),
    })
    return bodies, moon_lon


def compute_chart(
    year: int, month: int, day: int,
    hour_local: float, tz_offset: float,
    lat: float, lon: float,
    time_precision: str = "exact",
    node: str = "mean",
) -> dict[str, Any]:
    """Compute sidereal chart. `hour_local` in decimal hours, `tz_offset` e.g. +3.5.

    ``time_precision``: "exact" | "approximate" | "unknown" (P05-T05).
    """
    hour_ut = hour_local - tz_offset
    jd_ut = eph.julday(year, month, day, hour_ut)

    bodies, moon_lon = planet_positions(jd_ut, node)
    limited = time_precision == "unknown"

    if limited:
        # Noon reference is used for positions only; time-sensitive outputs
        # are omitted instead of being fabricated (AST-MASTER §3).
        return {
            "time_precision": time_precision,
            "time_sensitive_omitted": list(TIME_SENSITIVE_FIELDS),
            "reference_time": "noon_local",
            "ayanamsa_lahiri": round(eph.ayanamsa_value(jd_ut), 4),
            "ephemeris_flag": eph.ephemeris_flag(),
            "node": node,
            "julian_day_ut": round(jd_ut, 5),
            "ascendant": None,
            "midheaven": None,
            "planets": bodies,
            "houses_whole_sign": None,
            "moon_nakshatra": None,
            "dasha": None,
        }

    asc_lon, _cusps = eph.houses_cusps_whole_sign(jd_ut, lat, lon)
    _, mc_lon = eph.sidereal_angles(jd_ut, lat, lon)
    asc_sign, asc_deg = _deg_in_sign(asc_lon)
    asc_d9 = navamsa_of(asc_lon)

    for b in bodies:
        b["house"] = (b["sign_index"] - asc_sign) % 12 + 1

    houses = [
        {"house": i + 1, "sign_index": (asc_sign + i) % 12,
         "sign": SIGNS_EN[(asc_sign + i) % 12],
         "sign_fa": SIGNS_FA[(asc_sign + i) % 12],
         "lord": SIGN_LORDS[(asc_sign + i) % 12]}
        for i in range(12)
    ]

    moon_nk = nakshatra_of(moon_lon)
    dasha = vimshottari(moon_lon, date(year, month, day))

    return {
        "time_precision": time_precision,
        "time_sensitive_omitted": [],
        "reference_time": None,
        "ayanamsa_lahiri": round(eph.ayanamsa_value(jd_ut), 4),
        "ephemeris_flag": eph.ephemeris_flag(),
        "node": node,
        "julian_day_ut": round(jd_ut, 5),
        "ascendant": {
            "longitude": round(asc_lon, 4), "sign_index": asc_sign,
            "sign": SIGNS_EN[asc_sign], "sign_fa": SIGNS_FA[asc_sign],
            "degree_in_sign": asc_deg,
            "d9_sign_index": asc_d9["sign_index"],
            "d9_sign": SIGNS_EN[asc_d9["sign_index"]],
            "d9_longitude": asc_d9["longitude"],
            "vargas": vargas_of(round(asc_lon, 4)),
        },
        "midheaven": {"longitude": round(mc_lon, 4), "sign_index": int(mc_lon // 30)},
        "planets": bodies,
        "houses_whole_sign": houses,
        "moon_nakshatra": moon_nk,
        "dasha": dasha,
    }
