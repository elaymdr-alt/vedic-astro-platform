"""Parashari Bhinnashtakavarga / Sarvashtakavarga (port of the verified TS tables).

Each row lists, for one of the 8 contributors (Sun..Saturn, Lagna), the houses
counted from that contributor that receive a bindu. Row totals per planet:
48, 49, 39, 54, 56, 52, 39 = 337.
"""
from __future__ import annotations

BAV: dict[str, list[list[int]]] = {
    "Sun": [[1,2,4,7,8,9,10,11],[3,6,10,11],[1,2,4,7,8,9,10,11],[3,5,6,9,10,11,12],[5,6,9,11],[6,7,12],[1,2,4,7,8,9,10,11],[3,4,6,10,11,12]],
    "Moon": [[3,6,7,8,10,11],[1,3,6,7,10,11],[2,3,5,6,9,10,11],[1,3,4,5,7,8,10,11],[1,4,7,8,10,11,12],[3,4,5,7,9,10,11],[3,5,6,11],[3,6,10,11]],
    "Mars": [[3,5,6,10,11],[3,6,11],[1,2,4,7,8,10,11],[3,5,6,11],[6,10,11,12],[6,8,11,12],[1,4,7,8,9,10,11],[1,3,6,10,11]],
    "Mercury": [[5,6,9,11,12],[2,4,6,8,10,11],[1,2,4,7,8,9,10,11],[1,3,5,6,9,10,11,12],[6,8,11,12],[1,2,3,4,5,8,9,11],[1,2,4,7,8,9,10,11],[1,2,4,6,8,10,11]],
    "Jupiter": [[1,2,3,4,7,8,9,10,11],[2,5,7,9,11],[1,2,4,7,8,10,11],[1,2,4,5,6,9,10,11],[1,2,3,4,7,8,10,11],[2,5,6,9,10,11],[3,5,6,12],[1,2,4,5,6,7,9,10,11]],
    "Venus": [[8,11,12],[1,2,3,4,5,8,9,11,12],[3,5,6,9,11,12],[3,5,6,9,11],[5,8,9,10,11],[1,2,3,4,5,8,9,10,11],[3,4,5,8,9,10,11],[1,2,3,4,5,8,9,11]],
    "Saturn": [[1,2,4,7,8,10,11],[3,6,11],[3,5,6,10,11,12],[6,8,9,10,11,12],[5,6,11,12],[6,11,12],[3,5,6,11],[1,3,4,6,10,11]],
}
CONTRIBUTORS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]


def bhinnashtakavarga(signs: list[int]) -> dict[str, list[int]]:
    """Bindus per *sign* (0=Aries) for each planet.

    ``signs``: 0-based sign of [Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Lagna].
    """
    out: dict[str, list[int]] = {}
    for planet, rows in BAV.items():
        by_sign = [0] * 12
        for c, houses in enumerate(rows):
            for h in houses:
                by_sign[(signs[c] + h - 1) % 12] += 1
        out[planet] = by_sign
    return out


def sarvashtakavarga(signs: list[int]) -> list[int]:
    """Total bindus per house (house 1 = lagna sign). Sums to 337."""
    total = [0] * 12
    for by_sign in bhinnashtakavarga(signs).values():
        for i, v in enumerate(by_sign):
            total[i] += v
    return [total[(signs[7] + i) % 12] for i in range(12)]
