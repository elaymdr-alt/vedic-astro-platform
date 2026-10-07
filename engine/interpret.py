"""Interpretation engine - P08-T05 (rules) + P08-T06 (version/trace).

Geometry/Vedic opinion separation: this module NEVER computes positions;
it only reads an already-computed compute_chart dict.
"""
from __future__ import annotations

from typing import Any, Callable

RULES_VERSION = "1.0.0"
REPORT_VERSION = "1.0.0"

EFFECTIVE_SETTINGS = {
    "zodiac": "sidereal",
    "ayanamsa": "lahiri",
    "houses": "whole_sign",
}

FORBIDDEN_PHRASES = ["حتما", "قطعا", "تضمینی", "صددرصد", "صد در صد"]


def _planet(chart: dict[str, Any], name: str) -> dict[str, Any] | None:
    for p in chart.get("planets", []):
        if p.get("name") == name:
            return p
    return None


def _ev_house(planet: dict[str, Any]) -> dict[str, Any]:
    return {
        "planet": planet["name"],
        "longitude": planet["longitude"],
        "sign": planet["sign"],
        "sign_fa": planet.get("sign_fa"),
        "house": planet.get("house"),
    }


class Rule:
    def __init__(self, rule_id, topic, priority, needs_time, applies, render):
        self.id = rule_id
        self.topic = topic
        self.priority = priority
        self.needs_time = needs_time
        self.applies = applies
        self.render = render


def _has_asc(chart: dict[str, Any]) -> bool:
    return bool(chart.get("ascendant"))

def _rules() -> list:
    def asc_render(c):
        a = c["ascendant"]
        return (
            "طالع در برج " + a["sign_fa"] + " قرار دارد؛ این placement می‌تواند با رویکرد کلی فرد به شروع کارها مرتبط دانسته شود.",
            {"ascendant": {"longitude": a["longitude"], "sign": a["sign"], "sign_fa": a["sign_fa"]}},
        )

    def moon_render(c):
        m = _planet(c, "Moon")
        return (
            "قمر در برج " + m["sign_fa"] + " است؛ در خوانش ودیک این placement گاهی با الگوهای هیجانی و عادت‌های روزمره مرتبط دانسته می‌شود.",
            {"moon": _ev_house(m)},
        )

    def moon_nk_render(c):
        nk = c["moon_nakshatra"]
        return (
            "ناکشاترای قمر " + nk["name"] + " پادا " + str(nk["pada"]) + " است (حاکم: " + nk["lord"] + ")؛ این نشان می‌تواند زمینه شروع دوره ویمشوتاری را توضیح دهد.",
            {"moon_nakshatra": nk},
        )

    def sun_house_render(c):
        s = _planet(c, "Sun")
        return (
            "شمس در خانه " + str(s["house"]) + " قرار دارد؛ این placement ممکن است با حوزه‌ای از زندگی که توجه و تمرکز بیشتری می‌گیرد مرتبط باشد.",
            {"sun": _ev_house(s)},
        )

    def sun_sign_render(c):
        s = _planet(c, "Sun")
        return (
            "شمس در برج " + s["sign_fa"] + " است؛ این placement کلی بر شخصیت و رفتار تأثیر می‌گذارد.",
            {"sun": _ev_house(s)},
        )

    def dasha_render(c):
        d = c["dasha"]
        first = d["mahadashas"][0]
        return (
            "نخستین ماهاداشا " + first["lord"] + " است (از " + first["start"] + " تا " + first["end"] + ")؛ دوره‌ها چارچوب زمانی خوانش را نشان می‌دهند، نه رخداد قطعی.",
            {"mahadasha_lord": first["lord"], "start": first["start"], "end": first["end"]},
        )

    def retro_render(c):
        names = [p["name"] for p in c["planets"] if p.get("retrograde") and p["name"] not in ("Rahu", "Ketu")]
        ev = {n: _ev_house(_planet(c, n)) for n in names}
        return (
            "سیاره‌های رجعی (" + "، ".join(names) + ") در چارت دیده می‌شوند؛ در برخی خوانش‌ها این وضعیت با بازبینی و کندی در حوزه مرتبط آن سیاره همراه دانسته می‌شود.",
            {"retrograde": ev},
        )

    def saturn_render(c):
        s = _planet(c, "Saturn")
        return (
            "زحل در خانه " + str(s["house"]) + " قرار دارد؛ این placement گاهی با درس‌های تدریجی و نیاز به پیوستگی در آن حوزه مرتبط دانسته می‌شود.",
            {"saturn": _ev_house(s)},
        )

    return [
        Rule("ASC_SIGN", "ascendant", 100, True, lambda c: _has_asc(c) or c.get("time_precision") == "unknown", asc_render),
        Rule("MOON_SIGN", "moon", 90, False, lambda c: _planet(c, "Moon") is not None, moon_render),
        Rule("MOON_NAKSHATRA", "moon", 80, True, lambda c: bool(c.get("moon_nakshatra")) or c.get("time_precision") == "unknown", moon_nk_render),
        Rule("SUN_HOUSE", "sun", 70, True, lambda c: (_planet(c, "Sun") or {}).get("house") is not None, sun_house_render),
        Rule("SUN_SIGN_GENERAL", "sun", 60, False, lambda c: _planet(c, "Sun") is not None, sun_sign_render),
        Rule("DASHA_OPENING", "dasha", 65, True, lambda c: bool(c.get("dasha")), dasha_render),
        Rule("RETROGRADE_NOTE", "retrograde", 40, False, lambda c: any(p.get("retrograde") and p["name"] not in ("Rahu", "Ketu") for p in c.get("planets", [])), retro_render),
        Rule("SATURN_HOUSE", "saturn", 50, True, lambda c: (_planet(c, "Saturn") or {}).get("house") is not None, saturn_render),
    ]

def interpret_chart(chart: dict[str, Any]) -> dict[str, Any]:
    """Build a traceable Persian report from a computed chart dict."""
    paragraphs: list = []
    suppressed: list = []
    limitations: list = []
    by_topic: dict = {}

    unknown = chart.get("time_precision") == "unknown"
    if unknown:
        limitations.append({
            "code": "TIME_SENSITIVE_RULES_SKIPPED",
            "message": "ساعت تولد نامعلوم است؛ قواعد وابسته به زمان (طالع، خانه‌ها، داشا) اعمال نشدند.",
        })

    for rule in _rules():
        if not rule.applies(chart):
            continue
        if unknown and rule.needs_time:
            suppressed.append({"rule_id": rule.id, "reason": "needs_time_but_unknown"})
            continue
        by_topic.setdefault(rule.topic, []).append(rule)

    for topic, contenders in by_topic.items():
        contenders.sort(key=lambda r: r.priority, reverse=True)
        winner = contenders[0]
        text, evidence = winner.render(chart)
        paragraphs.append({
            "rule_id": winner.id,
            "topic": topic,
            "priority": winner.priority,
            "text_fa": text,
            "evidence": evidence,
            "rules_version": RULES_VERSION,
        })
        for loser in contenders[1:]:
            suppressed.append({"rule_id": loser.id, "reason": "superseded_by_" + winner.id})

    paragraphs.sort(key=lambda p: p["priority"], reverse=True)

    return {
        "rules_version": RULES_VERSION,
        "report_version": REPORT_VERSION,
        "settings": dict(EFFECTIVE_SETTINGS),
        "time_precision": chart.get("time_precision", "exact"),
        "paragraphs": paragraphs,
        "suppressed": suppressed,
        "limitations": limitations,
    }


