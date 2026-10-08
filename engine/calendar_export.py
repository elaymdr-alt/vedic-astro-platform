"""iCalendar (.ics) export of the personal outlook: favourable days, dasha changes, ingresses.

All-day events, RFC 5545 escaping and 75-octet line folding, UTF-8.
"""
from __future__ import annotations

import hashlib
from datetime import date, datetime, timedelta, timezone
from typing import Any

from .daily import (
    AREAS, PERIOD_MEANING, PLANET_FA, NatalContext, dasha_levels, outlook,
)
from .transit import transit_scan

AREA_LABEL = {k: label for k, label, _ in AREAS}


def _esc(text: str) -> str:
    return (text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n"))


def _fold(line: str) -> str:
    raw = line.encode("utf-8")
    if len(raw) <= 75:
        return line
    out, cur = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        if len(cur) + len(b) > 75 - (1 if out else 0):
            out.append(cur.decode("utf-8"))
            cur = b
        else:
            cur += b
    out.append(cur.decode("utf-8"))
    return "\r\n ".join(out)


def _event(uid_seed: str, day: date, summary: str, description: str, now: str) -> list[str]:
    uid = hashlib.sha1(uid_seed.encode("utf-8")).hexdigest()[:20] + "@astrobinesh"
    return [
        "BEGIN:VEVENT", f"UID:{uid}", f"DTSTAMP:{now}",
        f"DTSTART;VALUE=DATE:{day.strftime('%Y%m%d')}",
        f"DTEND;VALUE=DATE:{(day + timedelta(days=1)).strftime('%Y%m%d')}",
        f"SUMMARY:{_esc(summary)}", f"DESCRIPTION:{_esc(description)}",
        "TRANSP:TRANSPARENT", "END:VEVENT",
    ]


def build_events(natal: dict[str, Any], start: date, tz_offset: float, lat: float, lon: float,
                 days: int = 30) -> list[dict[str, Any]]:
    """Plain event list (also used by tests/UI): date, title, description."""
    ctx = NatalContext(natal)
    events: list[dict[str, Any]] = []

    ol = outlook(ctx, start, days, tz_offset, lat, lon)
    for key, ranked in ol["best_days"].items():
        d = ranked[0]
        events.append({"date": date.fromisoformat(d["date"]), "kind": f"best-{key}",
                       "title": f"روز مساعد برای {AREA_LABEL[key]}",
                       "text": f"بر پایه گوچارا و ماه تولد شما، این روز برای «{AREA_LABEL[key]}» فضای مساعدتری دارد."})

    # dasha boundaries within the next ~13 months (antar + pratyantar levels)
    at = datetime(start.year, start.month, start.day, 12, tzinfo=timezone.utc)
    seen: set[tuple[str, str, date]] = set()
    for step in range(0, 400, 10):
        lv = dasha_levels(ctx.moon_lon, ctx.birth_utc, at + timedelta(days=step))
        for idx, label in ((1, "زیردوره"), (2, "ریزدوره")):
            level = lv[idx]
            d = level["start"].date()
            key = (label, level["lord"], d)
            if start <= d <= start + timedelta(days=400) and key not in seen:
                seen.add(key)
                events.append({"date": d, "kind": "antardasha" if idx == 1 else "pratyantar",
                               "title": f"آغاز {label} {PLANET_FA[level['lord']]}",
                               "text": f"محور این فصل: {PERIOD_MEANING[level['lord']][0]}. {PERIOD_MEANING[level['lord']][1]}"})

    # slow-planet ingresses in the next 90 days
    scan = transit_scan(natal, datetime(start.year, start.month, start.day, tzinfo=timezone.utc), 90)
    for ev in scan["ingresses"]:
        if ev["planet"] in ("Jupiter", "Saturn", "Rahu", "Ketu", "Mars"):
            events.append({"date": datetime.fromisoformat(ev["at_utc"]).date(), "kind": "ingress",
                           "title": f"ورود {ev['planet_fa']} به برج {ev['to_sign_fa']}",
                           "text": "تغییر برج سیاره؛ فرصتی برای مرور برنامه‌ها."
                                   + (f" (خانه {ev['house_in_natal']} چارت شما)" if ev.get("house_in_natal") else "")})
    events.sort(key=lambda e: (e["date"], e["kind"]))
    return events


def build_ics(natal: dict[str, Any], start: date, tz_offset: float, lat: float, lon: float,
              days: int = 30) -> str:
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AstroBinesh//Personal Outlook//FA",
             "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:AstroBinesh",
             "X-WR-CALDESC:روزهای مساعد، تغییر دوره‌ها و ورود سیارات"]
    for e in build_events(natal, start, tz_offset, lat, lon, days):
        lines += _event(f"{e['kind']}|{e['date']}|{e['title']}", e["date"], e["title"], e["text"], now)
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"
