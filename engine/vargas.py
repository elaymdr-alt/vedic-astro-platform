"""Parashari divisional charts D2, D3, D4, D7, D10, D12 (AST-P06-T04 extension).

Each function maps a sidereal longitude to the 0-based sign of the divisional
chart. D9 lives in ``engine.d9``. Rules follow Brihat Parashara Hora Shastra.
"""
from __future__ import annotations

from typing import Callable


def _split(longitude: float) -> tuple[int, float]:
    lon = float(longitude) % 360.0
    sign = int(lon // 30)
    return sign, lon - sign * 30.0


def d2_hora(lon: float) -> int:
    """Odd signs: 1st half Leo (Sun), 2nd Cancer (Moon); even signs reversed."""
    sign, within = _split(lon)
    first_half = within < 15.0
    odd = sign % 2 == 0  # Aries (index 0) is the 1st = odd sign
    return (4 if first_half else 3) if odd else (3 if first_half else 4)


def d3_drekkana(lon: float) -> int:
    """Each 10°: same sign, 5th from it, 9th from it."""
    sign, within = _split(lon)
    return (sign + 4 * int(within // 10.0)) % 12


def d4_chaturthamsa(lon: float) -> int:
    """Each 7.5°: same sign, 4th, 7th, 10th."""
    sign, within = _split(lon)
    return (sign + 3 * int(within // 7.5)) % 12


def d7_saptamsa(lon: float) -> int:
    """Each 30/7°: odd signs start from the sign itself, even signs from the 7th."""
    sign, within = _split(lon)
    part = int(within // (30.0 / 7.0))
    start = sign if sign % 2 == 0 else (sign + 6) % 12
    return (start + part) % 12


def d10_dasamsa(lon: float) -> int:
    """Each 3°: odd signs start from the sign itself, even signs from the 9th."""
    sign, within = _split(lon)
    part = int(within // 3.0)
    start = sign if sign % 2 == 0 else (sign + 8) % 12
    return (start + part) % 12


def d12_dwadasamsa(lon: float) -> int:
    """Each 2.5°, counted from the sign itself."""
    sign, within = _split(lon)
    return (sign + int(within // 2.5)) % 12


VARGAS: dict[str, Callable[[float], int]] = {
    "D2": d2_hora, "D3": d3_drekkana, "D4": d4_chaturthamsa,
    "D7": d7_saptamsa, "D10": d10_dasamsa, "D12": d12_dwadasamsa,
}


def vargas_of(longitude: float) -> dict[str, int]:
    return {code: fn(longitude) for code, fn in VARGAS.items()}
