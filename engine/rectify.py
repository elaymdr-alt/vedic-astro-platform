"""Birth-time estimation from life events (rectification) — honest, set-valued.

Research reality (see audit notes): minute-level birth time is NOT recoverable
from life events; the chart→life map is many-to-one. So this module never
returns "the" birth time. It returns

* a posterior over candidate times inside the user's window,
* probabilities per ascendant sign (the most defensible output),
* a credible time window and the single most likely candidate inside it,
* a permutation test: how often does the best candidate score as well on
  *shuffled* (chart-misaligned) life events? A high p-value means the events
  carry no usable information and the result must not be trusted.

Scoring is the classical Parashari event-timing heuristic: at the event date
the running Vimshottari Mahadasha / Antardasha / Pratyantardasha lords should
signify the event's houses (rule, occupy, aspect) or its natural karakas, and
slow transits (Jupiter + Saturn) should activate those houses ("double
transit"). Weights are heuristics, documented, and unit-tested for
determinism — not claims of astronomical truth.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any

from . import ephemeris as eph
from .chart import planet_positions
from .constants import (
    DASHA_SEQUENCE, DASHA_YEARS, NAKSHATRA_SPAN, SIGNS_EN, SIGNS_FA, SIGN_LORDS,
)
from .nakshatra import nakshatra_of

YEAR_DAYS = 365.25

# event type -> (houses counted from the ascendant, natural karakas, Persian label)
EVENT_TYPES: dict[str, tuple[set[int], set[str], str]] = {
    "marriage": ({7, 2, 11}, {"Venus", "Jupiter"}, "ازدواج / شروع زندگی مشترک"),
    "child_birth": ({5, 2, 9}, {"Jupiter"}, "تولد فرزند"),
    "job_start": ({10, 6, 11}, {"Sun", "Saturn"}, "شروع کار / استخدام"),
    "career_success": ({10, 11, 9}, {"Sun", "Jupiter"}, "ارتقا یا موفقیت شغلی مهم"),
    "education": ({4, 5, 9}, {"Mercury", "Jupiter"}, "شروع یا پایان تحصیل مهم"),
    "move_abroad": ({12, 9, 3}, {"Rahu"}, "مهاجرت / سفر طولانی خارج"),
    "property": ({4, 11}, {"Mars", "Venus"}, "خرید خانه یا خودرو"),
    "father_loss": ({9, 8}, {"Sun", "Saturn"}, "از دست دادن پدر"),
    "mother_loss": ({4, 8}, {"Moon", "Saturn"}, "از دست دادن مادر"),
    "illness_accident": ({6, 8, 12}, {"Mars", "Saturn"}, "بیماری جدی یا حادثه"),
    "breakup": ({7, 6, 8, 12}, {"Venus", "Rahu"}, "جدایی یا پایان رابطه"),
    "financial_gain": ({2, 11, 9}, {"Jupiter", "Venus"}, "افزایش مالی مهم"),
    "financial_loss": ({8, 12, 6}, {"Saturn", "Rahu"}, "زیان مالی مهم"),
}

# Parashari full-aspect houses counted from the planet's own house (7th for all)
ASPECT_OFFSETS = {
    "Sun": (7,), "Moon": (7,), "Mercury": (7,), "Venus": (7,),
    "Mars": (4, 7, 8), "Jupiter": (5, 7, 9), "Saturn": (3, 7, 10),
    "Rahu": (5, 7, 9), "Ketu": (5, 7, 9),
}

PRECISION_WEIGHT = {"day": 1.0, "month": 0.8, "year": 0.5}
PRECISION_SAMPLES = {"day": 1, "month": 5, "year": 9}


@dataclass
class Event:
    type: str
    on: date
    precision: str = "day"  # day | month | year


@dataclass
class Candidate:
    local_minute: int          # minutes after local midnight
    utc: datetime
    jd: float
    asc_sign: int
    moon_lon: float
    planet_sign: dict[str, int]


# --------------------------------------------------------------------- dasha
def dasha_at(moon_lon: float, birth_utc: datetime, at: datetime) -> tuple[str, str, str]:
    """(Mahadasha, Antardasha, Pratyantardasha) lords running at ``at``.

    Second-level precision; year basis 365.25 days (Julian), the same basis as
    ``engine.dasha``.
    """
    lon = moon_lon % 360.0
    idx = int(lon // NAKSHATRA_SPAN) % 27
    elapsed_frac = (lon - idx * NAKSHATRA_SPAN) / NAKSHATRA_SPAN
    first = DASHA_SEQUENCE[idx % 9]
    seq0 = DASHA_SEQUENCE.index(first)
    start = birth_utc - timedelta(days=elapsed_frac * DASHA_YEARS[first] * YEAR_DAYS)
    t = (at - start).total_seconds() / 86400.0  # days since (virtual) MD start
    if t < 0:  # event before birth: clamp to the birth moment
        t = (birth_utc - start).total_seconds() / 86400.0

    k = 0
    while True:
        md = DASHA_SEQUENCE[(seq0 + k) % 9]
        span = DASHA_YEARS[md] * YEAR_DAYS
        if t < span or k > 40:
            break
        t -= span
        k += 1
    ad = pd = md
    pos = DASHA_SEQUENCE.index(md)
    for j in range(9):
        lord = DASHA_SEQUENCE[(pos + j) % 9]
        sub = span * DASHA_YEARS[lord] / 120.0
        if t < sub or j == 8:
            ad = lord
            break
        t -= sub
    span_ad = span * DASHA_YEARS[ad] / 120.0
    pos = DASHA_SEQUENCE.index(ad)
    for j in range(9):
        lord = DASHA_SEQUENCE[(pos + j) % 9]
        sub = span_ad * DASHA_YEARS[lord] / 120.0
        if t < sub or j == 8:
            pd = lord
            break
        t -= sub
    return md, ad, pd


# ------------------------------------------------------------ house relations
def _relation(planet: str, cand: Candidate, houses: set[int], karakas: set[str]) -> float:
    """How strongly ``planet`` signifies the event (0..4)."""
    lagna = cand.asc_sign
    score = 0.0
    for h in houses:  # rulership
        if SIGN_LORDS[(lagna + h - 1) % 12] == planet:
            score += 2.0
            break
    psign = cand.planet_sign[planet]
    house_of_planet = (psign - lagna) % 12 + 1
    if house_of_planet in houses:  # occupation
        score += 2.0
    for off in ASPECT_OFFSETS[planet]:  # aspect onto an event house
        if ((house_of_planet + off - 2) % 12) + 1 in houses:
            score += 1.0
            break
    if planet in karakas:
        score += 1.5
    return min(score, 4.0)


def _transit_activation(lagna: int, sign: int, offsets: tuple[int, ...], houses: set[int]) -> float:
    h = (sign - lagna) % 12 + 1
    if h in houses:
        return 1.0
    for off in offsets:
        if ((h + off - 2) % 12) + 1 in houses:
            return 0.6
    return 0.0


def _sample_dates(ev: Event) -> list[date]:
    n = PRECISION_SAMPLES[ev.precision]
    if n == 1:
        return [ev.on]
    span = 30 if ev.precision == "month" else 365
    start = ev.on if ev.precision == "month" else date(ev.on.year, 1, 1)
    return [start + timedelta(days=int(i * span / (n - 1))) for i in range(n)]


def _slow_signs(d: date) -> tuple[int, int]:
    jd = eph.julday(d.year, d.month, d.day, 12.0)
    return (int(eph.body_longitude("Jupiter", jd).longitude // 30),
            int(eph.body_longitude("Saturn", jd).longitude // 30))


def _score_candidate(cand: Candidate, events: list[Event],
                     samples: list[list[tuple[datetime, int, int]]]) -> tuple[float, list[float]]:
    per_event: list[float] = []
    for ev, smp in zip(events, samples):
        houses, karakas, _ = EVENT_TYPES[ev.type]
        best = 0.0
        for at, jup, sat in smp:
            md, ad, pd = dasha_at(cand.moon_lon, cand.utc, at)
            dasha = (1.0 * _relation(md, cand, houses, karakas)
                     + 2.0 * _relation(ad, cand, houses, karakas)
                     + 2.5 * _relation(pd, cand, houses, karakas)) / (5.5 * 4.0)
            tj = _transit_activation(cand.asc_sign, jup, (5, 7, 9), houses)
            ts = _transit_activation(cand.asc_sign, sat, (3, 7, 10), houses)
            transit = (tj + ts) / 2.0 + (0.25 if tj and ts else 0.0)  # double-transit bonus
            best = max(best, 0.7 * dasha + 0.3 * min(transit, 1.0))
        per_event.append(best * PRECISION_WEIGHT[ev.precision])
    return sum(per_event) / max(len(per_event), 1), per_event


def _prepare_samples(events: list[Event]) -> list[list[tuple[datetime, int, int]]]:
    out = []
    for ev in events:
        smp = []
        for d in _sample_dates(ev):
            jup, sat = _slow_signs(d)
            smp.append((datetime(d.year, d.month, d.day, 12, tzinfo=timezone.utc), jup, sat))
        out.append(smp)
    return out


def _shift_events(events: list[Event], days: int) -> list[Event]:
    return [Event(e.type, e.on + timedelta(days=days), e.precision) for e in events]


# ------------------------------------------------------------------ candidates
def build_candidates(year: int, month: int, day: int, tz_offset: float, lat: float, lon: float,
                     start_min: int, end_min: int, step_min: int) -> list[Candidate]:
    cands: list[Candidate] = []
    for m in range(start_min, end_min + 1, step_min):
        utc = datetime(year, month, day, tzinfo=timezone.utc) + timedelta(minutes=m) \
            - timedelta(hours=tz_offset)
        jd = eph.julday(utc.year, utc.month, utc.day,
                        utc.hour + utc.minute / 60.0 + utc.second / 3600.0)
        bodies, moon = planet_positions(jd)
        asc, _mc = eph.sidereal_angles(jd, lat, lon)
        cands.append(Candidate(
            local_minute=m, utc=utc, jd=jd, asc_sign=int(asc // 30), moon_lon=moon,
            planet_sign={b["name"]: b["sign_index"] for b in bodies},
        ))
    return cands


def _hhmm(minute: int) -> str:
    minute = max(0, min(minute, 24 * 60 - 1))
    return f"{minute // 60:02d}:{minute % 60:02d}"


# ----------------------------------------------------------------------- main
def rectify(
    year: int, month: int, day: int, tz_offset: float, lat: float, lon: float,
    events: list[Event],
    window: tuple[int, int] = (0, 24 * 60 - 1),
    step_min: int = 4,
    prior_center_min: int | None = None,
    prior_sigma_min: int = 90,
    permutations: int = 60,
    seed: int = 7,
) -> dict[str, Any]:
    """Estimate the birth-time distribution from life events (Gregorian date)."""
    if not events:
        raise ValueError("at least one life event is required")
    for e in events:
        if e.type not in EVENT_TYPES:
            raise ValueError(f"unknown event type: {e.type}")
        if e.precision not in PRECISION_WEIGHT:
            raise ValueError(f"unknown precision: {e.precision}")
    start_min, end_min = window
    if not (0 <= start_min <= end_min <= 24 * 60 - 1):
        raise ValueError("window must lie within one day")
    step_min = max(1, step_min)

    cands = build_candidates(year, month, day, tz_offset, lat, lon, start_min, end_min, step_min)
    samples = _prepare_samples(events)
    scored = [_score_candidate(c, events, samples) for c in cands]
    scores = [s for s, _ in scored]

    # posterior = softmax(z-score) * prior; flat scores -> flat posterior
    mean = sum(scores) / len(scores)
    std = math.sqrt(sum((s - mean) ** 2 for s in scores) / len(scores))
    z = [(s - mean) / std if std > 1e-9 else 0.0 for s in scores]
    logp = [1.5 * zi for zi in z]
    if prior_center_min is not None:
        logp = [lp - 0.5 * ((c.local_minute - prior_center_min) / prior_sigma_min) ** 2
                for lp, c in zip(logp, cands)]
    mx = max(logp)
    w = [math.exp(lp - mx) for lp in logp]
    tot = sum(w)
    post = [x / tot for x in w]

    # ---- permutation test: same machinery on chart-misaligned (shifted) events
    rng = random.Random(seed)
    stride = max(1, len(cands) // 90)
    sub = cands[::stride]
    observed_best = max(scores[::stride])  # same candidate subset as the null runs
    ge = 0
    runs = max(0, permutations)
    for _ in range(runs):
        shift = rng.choice([-1, 1]) * rng.randint(400, 4500)  # ~1–12 years
        shifted = _shift_events(events, shift)
        sm = _prepare_samples(shifted)
        null_best = max(_score_candidate(c, shifted, sm)[0] for c in sub)
        if null_best >= observed_best:
            ge += 1
    p_value = (ge + 1) / (runs + 1) if runs else None

    # ---- ascendant-sign probabilities
    by_sign: dict[int, list[int]] = {}
    for i, c in enumerate(cands):
        by_sign.setdefault(c.asc_sign, []).append(i)
    lagna_rows = []
    for sign, idxs in by_sign.items():
        mass = sum(post[i] for i in idxs)
        top = max(idxs, key=lambda i: post[i])
        lagna_rows.append({
            "sign_index": sign, "sign": SIGNS_EN[sign], "sign_fa": SIGNS_FA[sign],
            "probability": round(mass, 4),
            "best_time": _hhmm(cands[top].local_minute),
            "window": [_hhmm(cands[idxs[0]].local_minute), _hhmm(cands[idxs[-1]].local_minute)],
        })
    lagna_rows.sort(key=lambda r: -r["probability"])

    # ---- credible window (80%): highest-posterior candidates, grouped by time
    order = sorted(range(len(cands)), key=lambda i: -post[i])
    acc, chosen = 0.0, []
    for i in order:
        chosen.append(i)
        acc += post[i]
        if acc >= 0.8:
            break
    chosen.sort()
    runs_: list[list[int]] = []
    for i in chosen:
        if runs_ and i - runs_[-1][-1] == 1:
            runs_[-1].append(i)
        else:
            runs_.append([i])
    credible_ranges = sorted(
        ({"from": _hhmm(cands[r[0]].local_minute), "to": _hhmm(cands[r[-1]].local_minute),
          "mass": round(sum(post[i] for i in r), 3)} for r in runs_),
        key=lambda x: -x["mass"],
    )
    best_i = order[0]
    best = cands[best_i]
    best_events = _explain(best, events, samples)

    informative = bool(std > 1e-9 and len(events) >= 3 and (p_value is None or p_value <= 0.2))
    warnings: list[str] = []
    if len(events) < 3:
        warnings.append("برای نتیجه قابل اتکا حداقل ۳ رویداد با تاریخ دقیق لازم است.")
    if p_value is not None and p_value > 0.2:
        warnings.append("رویدادهای واردشده از الگوی تصادفی قابل تفکیک نیستند؛ این برآورد را معتبر نگیرید.")
    if prior_center_min is None and (end_min - start_min) > 360:
        warnings.append("بازه زمانی خیلی وسیع است؛ تقریب مادر/شناسنامه دقت را بسیار بالا می‌برد.")
    warnings.append("دقت در حد دقیقه با این روش ممکن نیست؛ خروجی یک بازه محتمل است، نه ساعت قطعی.")

    step = max(1, len(cands) // 144)
    curve = [{"time": _hhmm(cands[i].local_minute), "score": round(scores[i], 4),
              "posterior": round(post[i], 5)} for i in range(0, len(cands), step)]

    return {
        "method": "vimshottari-events+double-transit/v1",
        "candidates_evaluated": len(cands),
        "step_minutes": step_min,
        "events_used": len(events),
        "lagna_probabilities": lagna_rows,
        "best": {
            "time": _hhmm(best.local_minute),
            "lagna": SIGNS_EN[best.asc_sign], "lagna_fa": SIGNS_FA[best.asc_sign],
            "moon_nakshatra": nakshatra_of(best.moon_lon)["name"],
            "posterior": round(post[best_i], 5),
            "score": round(scores[best_i], 4),
        },
        "credible_window": {**credible_ranges[0], "total_mass": round(acc, 3)},
        "credible_ranges": credible_ranges,
        "significance": {
            "p_value": None if p_value is None else round(p_value, 4),
            "permutations": runs,
            "informative": informative,
        },
        "explanation": best_events,
        "curve": curve,
        "warnings": warnings,
        "disclaimer": "برآورد آماری بر پایه قواعد کلاسیک؛ جایگزین سند رسمی تولد نیست.",
    }


def _explain(cand: Candidate, events: list[Event],
             samples: list[list[tuple[datetime, int, int]]]) -> list[dict[str, Any]]:
    out = []
    for ev, smp in zip(events, samples):
        houses, karakas, label = EVENT_TYPES[ev.type]
        best_row, best_val = None, -1.0
        for at, jup, sat in smp:
            md, ad, pd = dasha_at(cand.moon_lon, cand.utc, at)
            val = sum(_relation(x, cand, houses, karakas) for x in (md, ad, pd))
            if val > best_val:
                best_val, best_row = val, (at, md, ad, pd, jup, sat)
        at, md, ad, pd, jup, sat = best_row  # type: ignore[misc]
        out.append({
            "type": ev.type, "label_fa": label, "date": ev.on.isoformat(),
            "precision": ev.precision, "event_houses": sorted(houses),
            "dasha": {"mahadasha": md, "antardasha": ad, "pratyantar": pd},
            "supports": round(best_val / 12.0, 3),
            "jupiter_house": (jup - cand.asc_sign) % 12 + 1,
            "saturn_house": (sat - cand.asc_sign) % 12 + 1,
        })
    return out
