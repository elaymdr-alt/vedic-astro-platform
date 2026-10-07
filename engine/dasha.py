"""Vimshottari Dasha from Moon longitude (P06-T03 / P08 boundary).

Balance at birth = remaining fraction of birth nakshatra lord's period,
proportional to untraversed arc of the nakshatra.
"""
from __future__ import annotations

from datetime import date, timedelta

from .constants import DASHA_SEQUENCE, DASHA_YEARS, NAKSHATRA_SPAN
from .nakshatra import nakshatra_of


def _add_years(d: date, years: float) -> date:
    return d + timedelta(days=round(years * 365.25))


def vimshottari(moon_lon: float, birth_date: date, years_ahead: int = 120) -> dict:
    nk = nakshatra_of(moon_lon)
    lon = float(moon_lon) % 360.0
    idx = int(lon // NAKSHATRA_SPAN)
    within = lon - idx * NAKSHATRA_SPAN
    remaining_frac = 1.0 - within / NAKSHATRA_SPAN

    start_lord = nk["lord"]
    start_pos = DASHA_SEQUENCE.index(start_lord)
    balance_years = round(remaining_frac * DASHA_YEARS[start_lord], 3)

    mahadashas: list[dict] = []
    cursor = birth_date
    # First (balance) MD
    mahadashas.append({
        "lord": start_lord, "start": cursor.isoformat(),
        "end": _add_years(cursor, balance_years).isoformat(),
        "years": balance_years, "balance": True,
    })
    cursor = _add_years(cursor, balance_years)

    i = (start_pos + 1) % 9
    end_limit = date(birth_date.year + years_ahead, birth_date.month, birth_date.day) \
        if birth_date.month != 2 or birth_date.day != 29 else birth_date + timedelta(days=int(years_ahead * 365.25))
    guard = 0
    while cursor < end_limit and guard < 30:
        lord = DASHA_SEQUENCE[i % 9]
        yrs = DASHA_YEARS[lord]
        nxt = _add_years(cursor, yrs)
        mahadashas.append({
            "lord": lord, "start": cursor.isoformat(),
            "end": nxt.isoformat(), "years": float(yrs), "balance": False,
        })
        cursor = nxt
        i += 1
        guard += 1

    antars = _antardashas(mahadashas[0]["lord"], date.fromisoformat(mahadashas[0]["start"]),
                          date.fromisoformat(mahadashas[0]["end"]))
    return {
        "birth_nakshatra": nk,
        "balance_years": balance_years,
        "mahadashas": mahadashas,
        "antardashas_of_first": antars,
    }


def _antardashas(md_lord: str, start: date, end: date) -> list[dict]:
    total_days = (end - start).days or 1
    md_years = DASHA_YEARS[md_lord]
    out: list[dict] = []
    cursor = start
    pos = DASHA_SEQUENCE.index(md_lord)
    for k in range(9):
        lord = DASHA_SEQUENCE[(pos + k) % 9]
        frac = DASHA_YEARS[lord] / 120.0
        days = round(total_days * frac)
        nxt = cursor + timedelta(days=days)
        out.append({"lord": lord, "start": cursor.isoformat(), "end": nxt.isoformat()})
        cursor = nxt
    # fix rounding drift on last
    out[-1]["end"] = end.isoformat()
    return out
