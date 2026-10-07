"""Full chart computation: planets + Asc + Whole-Sign houses + D9 + Dasha (P06-T02..T05)."""
from __future__ import annotations

from datetime import date
from typing import Any

from . import ephemeris as eph
from .constants import PLANETS, SIGNS_EN, SIGNS_FA, SIGN_LORDS
from .nakshatra import nakshatra_of
from .d9 import navamsa_of
from .dasha import vimshottari


def _deg_in_sign(lon: float) -> tuple[int, float]:
    lon = float(lon) % 360.0
    return int(lon // 30), round(lon % 30.0, 4)


def compute_chart(
    year: int, month: int, day: int,
    hour_local: float, tz_offset: float,
    lat: float, lon: float,
) -> dict[str, Any]:
    """Compute sidereal chart. `hour_local` in decimal hours, `tz_offset` e.g. +3.5."""
    eph.configure()
    hour_ut = hour_local - tz_offset
    jd_ut = eph.julday(year, month, day, hour_ut)

    asc_lon, _cusps = eph.houses_cusps_whole_sign(jd_ut, lat, lon)
    asc_sign, asc_deg = _deg_in_sign(asc_lon)

    bodies: list[dict[str, Any]] = []
    moon_lon = 0.0
    for name in PLANETS:
        if name == "Ketu":
            continue
        pos = eph.body_longitude(name, jd_ut)
        if name == "Moon":
            moon_lon = pos.longitude
        sign, deg = _deg_in_sign(pos.longitude)
        house = (sign - asc_sign) % 12 + 1
        d9 = navamsa_of(pos.longitude)
        d9_sign, d9_deg = _deg_in_sign(d9["longitude"])
        bodies.append({
            "name": name, "longitude": round(pos.longitude, 4),
            "sign_index": sign, "sign": SIGNS_EN[sign], "sign_fa": SIGNS_FA[sign],
            "degree_in_sign": deg, "house": house,
            "retrograde": pos.retrograde, "speed": round(pos.speed_lon, 4),
            "d9_sign_index": d9_sign, "d9_sign": SIGNS_EN[d9_sign],
            "d9_longitude": d9["longitude"],
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
        "degree_in_sign": k_deg, "house": (k_sign - asc_sign) % 12 + 1,
        "retrograde": True, "speed": round(-rahu["speed"], 4),
        "d9_sign_index": kd9_sign, "d9_sign": SIGNS_EN[kd9_sign],
        "d9_longitude": k_d9["longitude"],
    })

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
        "ayanamsa_lahiri": round(eph.ayanamsa_value(jd_ut), 4),
        "ephemeris_flag": eph.ephemeris_flag(),
        "julian_day_ut": round(jd_ut, 5),
        "ascendant": {
            "longitude": round(asc_lon, 4), "sign_index": asc_sign,
            "sign": SIGNS_EN[asc_sign], "sign_fa": SIGNS_FA[asc_sign],
            "degree_in_sign": asc_deg,
        },
        "planets": bodies,
        "houses_whole_sign": houses,
        "moon_nakshatra": moon_nk,
        "dasha": dasha,
    }
