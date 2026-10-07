"""Navamsa (D9) — standard Parashari mapping (P06-T05).

Each sign (30°) is divided into 9 navamsa of 3°20'.
Movable signs start from the same sign, fixed from the 9th, dual from the 5th.
"""
from __future__ import annotations

NINTH = 360.0 / 108.0  # 3.333°


def navamsa_of(longitude: float) -> dict:
    lon = float(longitude) % 360.0
    sign = int(lon // 30)
    within = lon - sign * 30.0
    pada = int(within // NINTH)  # 0..8
    kind = sign % 3  # 0 movable (chara), 1 fixed (sthira), 2 dual (dvisva)
    if kind == 0:      # chara: from same sign
        start = sign
    elif kind == 1:    # sthira: from 9th from sign
        start = (sign + 8) % 12
    else:              # dvisva: from 5th from sign
        start = (sign + 4) % 12
    d9_sign = (start + pada) % 12
    d9_lon = d9_sign * 30.0 + (within % NINTH) / NINTH * 30.0
    return {"sign_index": d9_sign, "longitude": round(d9_lon % 360.0, 4), "pada": pada + 1}
