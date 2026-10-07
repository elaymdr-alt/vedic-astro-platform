"""Transit relative to a natal chart â€” P08-T03 (â‰¤90-day range) and P08-T04
(adaptive search for exact contact times and sign entries).

All geometry is exposed with the natal house placement of the event so the
interpretation layer can attach meaning later (P08-T03-M2).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from . import ephemeris as eph
from .aspects import ASPECTS, find_aspect
from .chart import planet_positions
from .constants import PLANETS_FA, SIGNS_EN, SIGNS_FA

MAX_SCAN_DAYS = 90
DEFAULT_ORBS = {name: orb for name, _, orb in ASPECTS}


def jd_from_utc(dt: datetime) -> float:
    dt = dt.astimezone(timezone.utc)
    return eph.julday(dt.year, dt.month, dt.day,
                      dt.hour + dt.minute / 60.0 + dt.second / 3600.0)


def _signed_gap(lon_t: float, lon_n: float, angle: float) -> float:
    """Signed angular distance from the exact aspect (0 = exact)."""
    return ((lon_t - lon_n - angle + 180.0) % 360.0) - 180.0


def _house_of(lon: float, asc_sign: int | None) -> int | None:
    if asc_sign is None:
        return None
    return (int(lon // 30.0) - asc_sign) % 12 + 1


def transit_snapshot(
    natal: dict[str, Any], moment_utc: datetime,
    orbs: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Transiting positions at one moment + aspects to the natal planets."""
    orbs = {**DEFAULT_ORBS, **(orbs or {})}
    asc_sign = natal["ascendant"]["sign_index"] if natal.get("ascendant") else None
    bodies, _ = planet_positions(jd_from_utc(moment_utc))

    positions = []
    for b in bodies:
        positions.append({
            "name": b["name"],
            "name_fa": PLANETS_FA.get(b["name"], b["name"]),
            "longitude": b["longitude"],
            "sign_index": b["sign_index"],
            "sign": b["sign"],
            "sign_fa": b["sign_fa"],
            "degree_in_sign": b["degree_in_sign"],
            "retrograde": b["retrograde"],
            "speed": b["speed"],
            "house_in_natal": _house_of(b["longitude"], asc_sign),
        })

    contacts: list[dict[str, Any]] = []
    for t in bodies:
        for n in natal["planets"]:
            for asp in find_aspect(
                t["longitude"], n["longitude"],
                t["speed"], float(n.get("speed", 0.0)), orbs,
            ):
                contacts.append({
                    "transit": t["name"],
                    "transit_fa": PLANETS_FA.get(t["name"], t["name"]),
                    "natal": n["name"],
                    "natal_fa": PLANETS_FA.get(n["name"], n["name"]),
                    **asp,
                    "house_in_natal": _house_of(t["longitude"], asc_sign),
                })
    contacts.sort(key=lambda c: c["orb"])

    return {
        "at_utc": moment_utc.astimezone(timezone.utc).isoformat(),
        "positions": positions,
        "contacts": contacts,
        "houses_valid": asc_sign is not None,
    }


def _refine_contact(
    natal: dict[str, Any], planet: str, n_target: str, angle: float,
    dt0: datetime, dt1: datetime,
) -> datetime:
    """Bisect for the moment the signed gap crosses zero (P08-T04-M1)."""
    natal_lon = next(p["longitude"] for p in natal["planets"] if p["name"] == n_target)

    def gap_at(dt: datetime) -> float:
        lon = eph.body_longitude(planet, jd_from_utc(dt)).longitude
        return _signed_gap(lon, natal_lon, angle)

    g0, g1 = gap_at(dt0), gap_at(dt1)
    # Transit is slow relative to a 1-day window (<2°/d) — 40 bisections
    # give sub-second precision, far beyond the arcsecond engine noise.
    for _ in range(40):
        mid = dt0 + (dt1 - dt0) / 2
        gm = gap_at(mid)
        if g0 == 0.0:
            return dt0
        if g0 * gm <= 0:
            dt1, g1 = mid, gm
        else:
            dt0, g0 = mid, gm
    return dt0 + (dt1 - dt0) / 2


def _refine_ingress(planet: str, dt0: datetime, dt1: datetime,
                    sign0: int, forward: bool) -> datetime:
    """Bisect for the moment a planet crosses a sign boundary (P08-T04-M2)."""
    target = ((sign0 + 1) % 12) * 30.0 if forward else sign0 * 30.0
    lon0 = eph.body_longitude(planet, jd_from_utc(dt0)).longitude
    # displacement of the boundary relative to the starting longitude
    rel_b = ((target - lon0 + 180.0) % 360.0) - 180.0

    def rel_at(dt: datetime) -> float:
        lon = eph.body_longitude(planet, jd_from_utc(dt)).longitude
        return ((lon - lon0 + 180.0) % 360.0) - 180.0

    lo, hi = dt0, dt1
    for _ in range(40):
        mid = lo + (hi - lo) / 2
        r = rel_at(mid)
        past = r >= rel_b if forward else r <= rel_b
        if past:
            hi = mid
        else:
            lo = mid
    return lo


def transit_scan(
    natal: dict[str, Any],
    start_utc: datetime,
    days: int,
    orbs: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Daily sampling over ``days`` (â‰¤90): sign ingresses + exact aspect
    contacts, each refined by bisection. ``start_utc`` is sample 0."""
    orbs = {**DEFAULT_ORBS, **(orbs or {})}
    days = max(0, min(int(days), MAX_SCAN_DAYS))
    asc_sign = natal["ascendant"]["sign_index"] if natal.get("ascendant") else None

    samples: list[tuple[datetime, dict[str, Any]]] = []
    for i in range(days + 1):
        dt = start_utc + timedelta(days=i)
        bodies, _ = planet_positions(jd_from_utc(dt))
        samples.append((dt, {b["name"]: b for b in bodies}))

    ingresses: list[dict[str, Any]] = []
    contacts: list[dict[str, Any]] = []
    seen_pairs: set[tuple[str, str, str]] = set()

    for i in range(len(samples) - 1):
        dt0, s0 = samples[i]
        dt1, s1 = samples[i + 1]

        for name, b0 in s0.items():
            b1 = s1[name]
            if b1["sign_index"] == b0["sign_index"]:
                continue
            direction = (b1["sign_index"] - b0["sign_index"]) % 12
            if direction not in (1, 11):
                continue  # multi-sign jump in a day should not happen
            forward = direction == 1
            at = _refine_ingress(name, dt0, dt1, b0["sign_index"], forward)
            bodies_e, _ = planet_positions(jd_from_utc(at))
            lon_e = next(b["longitude"] for b in bodies_e if b["name"] == name)
            ingresses.append({
                "planet": name,
                "planet_fa": PLANETS_FA.get(name, name),
                "from_sign": SIGNS_EN[b0["sign_index"]],
                "from_sign_fa": SIGNS_FA[b0["sign_index"]],
                "to_sign": b1["sign"],
                "to_sign_fa": b1["sign_fa"],
                "direction": "forward" if forward else "backward",
                "at_utc": at.astimezone(timezone.utc).isoformat(),
                "house_in_natal": _house_of(lon_e, asc_sign),
            })

        for t_name, t0 in s0.items():
            t1 = s1[t_name]
            for n in natal["planets"]:
                n_lon = n["longitude"]
                for angle_name, angle, _default_orb in ASPECTS:
                    f0 = _signed_gap(t0["longitude"], n_lon, angle)
                    f1 = _signed_gap(t1["longitude"], n_lon, angle)
                    if not (f0 == 0.0 or (f0 * f1 < 0 and abs(f1 - f0) < 180.0)):
                        continue
                    key = (t_name, n["name"], angle_name)
                    if key in seen_pairs:
                        continue
                    seen_pairs.add(key)
                    at = _refine_contact(natal, t_name, n["name"], angle, dt0, dt1)
                    bodies_e, _ = planet_positions(jd_from_utc(at))
                    lon_e = next(b["longitude"] for b in bodies_e if b["name"] == t_name)
                    contacts.append({
                        "transit": t_name,
                        "transit_fa": PLANETS_FA.get(t_name, t_name),
                        "natal": n["name"],
                        "natal_fa": PLANETS_FA.get(n["name"], n["name"]),
                        "aspect": angle_name,
                        "at_utc": at.astimezone(timezone.utc).isoformat(),
                        "house_in_natal": _house_of(lon_e, asc_sign),
                    })

    ingresses.sort(key=lambda x: x["at_utc"])
    contacts.sort(key=lambda x: x["at_utc"])
    return {"days": days, "ingresses": ingresses, "contacts": contacts}
