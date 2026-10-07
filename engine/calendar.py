"""Sidereal calendar helpers — Jalali/Gregorian via jdatetime (P05-T02 subset)."""
from __future__ import annotations

import jdatetime


def jalali_to_gregorian(jy: int, jm: int, jd: int) -> tuple[int, int, int]:
    g = jdatetime.date(jy, jm, jd).togregorian()
    return g.year, g.month, g.day


def gregorian_to_jalali(gy: int, gm: int, gd: int) -> tuple[int, int, int]:
    j = jdatetime.date.fromgregorian(year=gy, month=gm, day=gd)
    return j.year, j.month, j.day


def is_valid_jalali(jy: int, jm: int, jd: int) -> bool:
    try:
        jdatetime.date(jy, jm, jd)
        return True
    except ValueError:
        return False
