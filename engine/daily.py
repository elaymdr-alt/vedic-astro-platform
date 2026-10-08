"""Practical daily-life layer: panchang, time windows, personal gochara, dasha.

Everything here is derived from the same Swiss-Ephemeris positions as the
natal chart (no tables of "today's luck"). Personal scores follow the
classical Parashari reading relative to the natal Moon (Gochara with Vedha,
Chandra Bala, Tara Bala) blended with Ashtakavarga bindus.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

import swisseph as swe

from . import ephemeris as eph
from .ashtakavarga import bhinnashtakavarga
from .chart import planet_positions
from .constants import DASHA_SEQUENCE, DASHA_YEARS, NAKSHATRAS, NAKSHATRA_SPAN, SIGNS_FA, SIGN_LORDS
from .nakshatra import nakshatra_of

YEAR_DAYS = 365.25
VARA_LORDS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
VARA_FA = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"]
PLANET_FA = {
    "Sun": "شمس", "Moon": "قمر", "Mars": "مریخ", "Mercury": "عطارد", "Jupiter": "مشتری",
    "Venus": "زهره", "Saturn": "زحل", "Rahu": "راهو", "Ketu": "کیتو",
}
TITHI_FA = ["پراتیپادا", "دویتیا", "تریتیا", "چاتورتی", "پانچامی", "شاشتی", "ساپتامی", "اشتامی",
            "ناوامی", "داشامی", "اکاداشی", "دوادشی", "تریودشی", "چاتوردشی"]
YOGA_NAMES = ["Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma",
              "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
              "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva", "Siddha", "Sadhya", "Shubha",
              "Shukla", "Brahma", "Indra", "Vaidhriti"]
HARSH_YOGAS = {"Vishkambha", "Atiganda", "Shula", "Ganda", "Vyaghata", "Vajra", "Vyatipata",
               "Parigha", "Vaidhriti"}
KARANA_REPEAT = ["Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"]
# 1-based eighth of the daytime (sunrise..sunset) for each weekday, Sunday first
RAHU_SLOT = [8, 2, 7, 5, 6, 4, 3]
YAMA_SLOT = [5, 4, 3, 2, 1, 7, 6]
GULIKA_SLOT = [7, 6, 5, 4, 3, 2, 1]
# Chaldean order used for planetary hours
HORA_ORDER = ["Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon"]
HORA_USE = {
    "Sun": "کارهای اداری، دیدار با مقام‌ها، تصمیم‌های مهم و شروع‌های رسمی",
    "Moon": "کارهای خانوادگی، مراقبت از خود، سفرهای کوتاه و گفت‌وگوهای صمیمی",
    "Mars": "کارهای فیزیکی، ورزش و کارهایی که انرژی و قاطعیت می‌خواهند",
    "Mercury": "نوشتن، مذاکره، یادگیری، حساب‌وکتاب و قراردادهای ساده",
    "Jupiter": "مشاوره، آموزش، کارهای مالی و حقوقی و شروع‌های مهم",
    "Venus": "دیدار عاطفی، خرید لوازم زیبایی، هنر و مهمانی",
    "Saturn": "کارهای طولانی و منظم؛ برای شروع‌های تازه کم‌مناسب‌تر است",
}
HORA_GOOD = {"Jupiter", "Venus", "Mercury", "Moon", "Sun"}

GOCHARA_GOOD = {
    "Sun": [3, 6, 10, 11], "Moon": [1, 3, 6, 7, 10, 11], "Mars": [3, 6, 11],
    "Mercury": [2, 4, 6, 8, 10, 11], "Jupiter": [2, 5, 7, 9, 11],
    "Venus": [1, 2, 3, 4, 5, 8, 9, 11, 12], "Saturn": [3, 6, 11],
    "Rahu": [3, 6, 10, 11], "Ketu": [3, 6, 11],
}
VEDHA_PAIRS = {
    "Sun": [(3, 9), (6, 12), (10, 4), (11, 5)],
    "Moon": [(1, 5), (3, 9), (6, 12), (7, 2), (10, 4), (11, 8)],
    "Mars": [(3, 12), (6, 9), (11, 5)],
    "Mercury": [(2, 5), (4, 3), (6, 9), (8, 1), (10, 7), (11, 12)],
    "Jupiter": [(2, 12), (5, 4), (7, 3), (9, 10), (11, 8)],
    "Venus": [(1, 8), (2, 7), (3, 1), (4, 10), (5, 9), (8, 5), (9, 11), (11, 6), (12, 3)],
    "Saturn": [(3, 12), (6, 9), (11, 5)],
    "Rahu": [(3, 9), (6, 12), (10, 4), (11, 5)],
    "Ketu": [(3, 12), (6, 9), (11, 5)],
}
VEDHA_EXEMPT = {("Sun", "Saturn"), ("Saturn", "Sun"), ("Moon", "Mercury"), ("Mercury", "Moon")}
BLOCKERS = {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"}
GOCHARA_ALL = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
VERDICT_VALUE = {"good": 1.0, "blocked": 0.0, "relieved": 0.5, "bad": 0.0}
VERDICT_FA = {"good": "مطلوب", "blocked": "با مانع (ودِه)", "relieved": "کاهش سختی", "bad": "دشوار"}
TARA_NAMES = ["", "جنما", "سمپت", "ویپت", "کشِما", "پراتیاری", "ساداکا", "وَدها", "میترا", "آتی‌میترا"]
TARA_GOOD = {2, 4, 6, 8, 9}

AREAS = [
    ("work", "کار و درآمد", ("Sun", "Saturn")),
    ("money", "پول و سرمایه", ("Jupiter", "Venus")),
    ("love", "رابطه و عشق", ("Venus", "Moon")),
    ("health", "سلامت و انرژی", ("Sun", "Mars")),
    ("family", "خانواده و ریشه", ("Moon", "Jupiter")),
    ("mind", "ذهن و یادگیری", ("Mercury", "Moon")),
]

# practical meaning of running a planet's period (hedged, non-fatalistic)
PERIOD_MEANING = {
    "Sun": ("اعتمادبه‌نفس، جایگاه و مسئولیت",
            "وقت مناسبی برای دیده‌شدن، پیگیری هدف شغلی و گرفتن مسئولیت است؛ مراقب غرور و تقابل با مقام‌ها باشید."),
    "Moon": ("احساسات، خانه و روابط نزدیک",
             "حال دل و آرامش خانه اهمیت بیشتری پیدا می‌کند؛ برای تصمیم‌های مهم از احساس زودگذر فاصله بگیرید."),
    "Mars": ("انرژی، رقابت و اقدام",
             "انرژی برای اقدام بالاست؛ پروژه‌های عملی را جلو ببرید و جلوی عجله و تندی را بگیرید."),
    "Mercury": ("ارتباط، یادگیری و تجارت",
                "برای یادگیری، مذاکره، نوشتن و کار با اطلاعات مناسب است؛ قراردادها را با دقت بخوانید."),
    "Jupiter": ("رشد، آموزش و حمایت",
                "فرصت رشد، آموزش و گسترش شبکه وجود دارد؛ از زیاده‌روی و وعده‌های بیش از توان بپرهیزید."),
    "Venus": ("روابط، لذت و هنر",
              "روابط، زیبایی و هنر پررنگ می‌شود؛ بودجه لذت‌ها را مدیریت کنید و در رابطه شفاف بمانید."),
    "Saturn": ("انضباط، ساختار و صبر",
               "نتیجه از نظم و تداوم می‌آید؛ کارهای بلندمدت را بسازید و برای نتیجه سریع فشار نیاورید."),
    "Rahu": ("جاه‌طلبی، تغییر و تجربه‌های تازه",
             "میل به تغییر و مسیرهای غیرمعمول بیشتر می‌شود؛ قبل از تصمیم بزرگ واقعیت‌ها را دوباره بسنجید."),
    "Ketu": ("جدایی، تمرکز درونی و پژوهش",
             "کم‌شدن علاقه به ظاهر‌ها و گرایش به تمرکز، پژوهش و ساده‌سازی؛ تنهایی را با ارتباط متعادل کنید."),
}
HOUSE_AREA_FA = {
    1: "خود و سلامت", 2: "مالی و خانواده", 3: "تلاش و ارتباطات", 4: "خانه و آرامش",
    5: "خلاقیت و آموزش", 6: "کار روزمره و سلامت", 7: "شراکت و رابطه", 8: "تحول و منابع مشترک",
    9: "مسیر و آموزش عالی", 10: "کار و جایگاه", 11: "درآمد و شبکه اجتماعی", 12: "خلوت و هزینه‌ها",
}


# ---------------------------------------------------------------- time helpers
def datetime_from_jd(jd: float) -> datetime:
    return datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(days=jd - 2440587.5)


def _jd(dt: datetime) -> float:
    dt = dt.astimezone(timezone.utc)
    return eph.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute / 60 + dt.second / 3600)


def _local(dt: datetime, tz_offset: float) -> datetime:
    return dt.astimezone(timezone(timedelta(hours=tz_offset)))


def _fmt(dt: datetime, tz_offset: float) -> str:
    return _local(dt, tz_offset).strftime("%H:%M")


def sun_times(day: date, tz_offset: float, lat: float, lon: float) -> tuple[datetime, datetime]:
    """Local sunrise and sunset (UTC datetimes) for the civil day ``day``."""
    midnight = datetime(day.year, day.month, day.day, tzinfo=timezone.utc) - timedelta(hours=tz_offset)
    jd0 = _jd(midnight)
    out = []
    with eph._lock:  # swisseph global state
        eph.configure() if not eph._configured else None
        for flag in (swe.CALC_RISE, swe.CALC_SET):
            res, tret = swe.rise_trans(jd0, swe.SUN, flag | swe.BIT_DISC_CENTER, (lon, lat, 0.0))
            if res < 0:
                raise ValueError("no sunrise/sunset at this latitude and date")
            out.append(datetime_from_jd(tret[0]))
    return out[0], out[1]


def _elong(jd: float) -> float:
    sun = eph.body_longitude("Sun", jd).longitude
    moon = eph.body_longitude("Moon", jd).longitude
    return (moon - sun) % 360.0


def _next_crossing(fn, jd0: float, width: float, max_days: float = 3.0) -> float:
    """First JD after ``jd0`` where floor(fn/width) increases (bisection)."""
    cur = int(fn(jd0) // width)
    lo, hi, step = jd0, jd0, 0.05
    while hi - jd0 < max_days:
        hi += step
        if int(fn(hi) // width) != cur:
            break
        lo = hi
    for _ in range(30):
        mid = (lo + hi) / 2
        if int(fn(mid) // width) == cur:
            lo = mid
        else:
            hi = mid
    return hi


def panchang(day: date, tz_offset: float, lat: float, lon: float) -> dict[str, Any]:
    """Five limbs prevailing at local sunrise, plus end times and bad-time windows."""
    rise, sset = sun_times(day, tz_offset, lat, lon)
    jd = _jd(rise)
    sun = eph.body_longitude("Sun", jd).longitude
    moon = eph.body_longitude("Moon", jd).longitude
    el = (moon - sun) % 360.0

    t_idx = int(el // 12)                      # 0..29
    paksha = "شکلا (روشن)" if t_idx < 15 else "کریشنا (تاریک)"
    t_name = ("پورنیما" if t_idx == 14 else "آماواسیا" if t_idx == 29 else TITHI_FA[t_idx % 15])
    nk = nakshatra_of(moon)
    y_idx = int(((sun + moon) % 360.0) // NAKSHATRA_SPAN)
    k_idx = int(el // 6)
    if k_idx == 0:
        karana = "Kimstughna"
    elif k_idx <= 56:
        karana = KARANA_REPEAT[(k_idx - 1) % 7]
    else:
        karana = ["Shakuni", "Chatushpada", "Naga"][k_idx - 57]

    tithi_end = datetime_from_jd(_next_crossing(_elong, jd, 12.0))
    nak_end = datetime_from_jd(_next_crossing(lambda j: eph.body_longitude("Moon", j).longitude, jd,
                                              NAKSHATRA_SPAN))
    wd = (day.weekday() + 1) % 7              # Sunday = 0
    dayspan = (sset - rise) / 8
    slot = lambda n: (rise + dayspan * (n - 1), rise + dayspan * n)  # noqa: E731
    rahu, yama, gul = slot(RAHU_SLOT[wd]), slot(YAMA_SLOT[wd]), slot(GULIKA_SLOT[wd])
    noon = rise + (sset - rise) / 2
    abhijit = (noon - (sset - rise) / 30, noon + (sset - rise) / 30)
    win = lambda p: {"from": _fmt(p[0], tz_offset), "to": _fmt(p[1], tz_offset)}  # noqa: E731

    return {
        "date": day.isoformat(),
        "weekday": VARA_FA[wd], "vara_lord": VARA_LORDS[wd], "vara_lord_fa": PLANET_FA[VARA_LORDS[wd]],
        "sunrise": _fmt(rise, tz_offset), "sunset": _fmt(sset, tz_offset),
        "tithi": {"name": t_name, "number": t_idx % 15 + 1, "paksha": paksha,
                  "ends": _fmt(tithi_end, tz_offset)},
        "nakshatra": {"name": nk["name"], "pada": nk["pada"], "lord": nk["lord"],
                      "ends": _fmt(nak_end, tz_offset)},
        "yoga": {"name": YOGA_NAMES[y_idx], "harsh": YOGA_NAMES[y_idx] in HARSH_YOGAS},
        "karana": {"name": karana, "harsh": karana == "Vishti"},
        "avoid": {"rahu_kala": win(rahu), "yamaganda": win(yama), "gulika": win(gul)},
        "abhijit_muhurta": win(abhijit),
        "moon_sign_fa": SIGNS_FA[int(moon // 30)],
        "_rise": rise, "_set": sset,
    }


def hora_table(day: date, tz_offset: float, lat: float, lon: float) -> list[dict[str, Any]]:
    """24 planetary hours (12 day + 12 night) with a plain-language use."""
    rise, sset = sun_times(day, tz_offset, lat, lon)
    next_rise, _ = sun_times(day + timedelta(days=1), tz_offset, lat, lon)
    wd = (day.weekday() + 1) % 7
    first = HORA_ORDER.index(VARA_LORDS[wd])
    out = []
    for i in range(24):
        if i < 12:
            a = rise + (sset - rise) / 12 * i
            b = rise + (sset - rise) / 12 * (i + 1)
        else:
            a = sset + (next_rise - sset) / 12 * (i - 12)
            b = sset + (next_rise - sset) / 12 * (i - 11)
        lord = HORA_ORDER[(first + i) % 7]
        out.append({"from": _fmt(a, tz_offset), "to": _fmt(b, tz_offset), "lord": lord,
                    "lord_fa": PLANET_FA[lord], "night": i >= 12, "favourable": lord in HORA_GOOD,
                    "use_fa": HORA_USE[lord]})
    return out


# ------------------------------------------------------------ personal gochara
def _house_from(lon: float, moon_sign: int) -> int:
    return (int(lon // 30) - moon_sign) % 12 + 1


def gochara_rows(transit_lon: dict[str, float], moon_sign: int) -> list[dict[str, Any]]:
    house_of = {g: _house_from(transit_lon[g], moon_sign) for g in GOCHARA_ALL}
    by_house: dict[int, list[str]] = {}
    for g, h in house_of.items():
        by_house.setdefault(h, []).append(g)

    def can_block(g: str, b: str) -> bool:
        return b in BLOCKERS and b != g and (g, b) not in VEDHA_EXEMPT

    rows = []
    for g in GOCHARA_ALL:
        h = house_of[g]
        row: dict[str, Any] = {"planet": g, "planet_fa": PLANET_FA[g], "house": h}
        if h in GOCHARA_GOOD[g]:
            blocker = next((b for good, blk in VEDHA_PAIRS[g] if good == h
                            for b in by_house.get(blk, []) if can_block(g, b)), None)
            row["verdict"] = "blocked" if blocker else "good"
        else:
            blocker = next((b for good, blk in VEDHA_PAIRS[g] if blk == h
                            for b in by_house.get(good, []) if can_block(g, b)), None)
            row["verdict"] = "relieved" if blocker else "bad"
        if blocker:
            row["by"] = blocker
        row["verdict_fa"] = VERDICT_FA[row["verdict"]]
        rows.append(row)
    return rows


def _level(score: int) -> str:
    return "green" if score >= 70 else "amber" if score >= 45 else "red"


LEVEL_FA = {"green": "مطلوب", "amber": "خنثی", "red": "محتاط"}


class NatalContext:
    """Natal inputs for the daily layer, computed once per person."""

    def __init__(self, natal: dict[str, Any]):
        self.natal = natal
        planets = {p["name"]: p for p in natal["planets"]}
        self.moon_lon = planets["Moon"]["longitude"]
        self.moon_sign = int(self.moon_lon // 30)
        asc = natal.get("ascendant")
        self.lagna = asc["sign_index"] if asc else None
        signs = [planets[n]["sign_index"] for n in
                 ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn")]
        # unknown birth time -> Chandra lagna (Moon sign) as the 8th contributor
        self.bav = bhinnashtakavarga(signs + [self.lagna if self.lagna is not None else self.moon_sign])
        self.planets = planets
        self.birth_utc = datetime_from_jd(natal["julian_day_ut"])


def day_reading(ctx: NatalContext, day: date, tz_offset: float, lat: float, lon: float
                ) -> dict[str, Any]:
    """Personal reading for one civil day, evaluated at local noon."""
    noon_utc = datetime(day.year, day.month, day.day, 12, tzinfo=timezone.utc) \
        - timedelta(hours=tz_offset)
    bodies, _ = planet_positions(_jd(noon_utc))
    tl = {b["name"]: b["longitude"] for b in bodies}
    rows = gochara_rows(tl, ctx.moon_sign)
    good = {r["planet"]: VERDICT_VALUE[r["verdict"]] for r in rows}

    natal_nk = int(ctx.moon_lon // NAKSHATRA_SPAN)
    tara = ((int(tl["Moon"] // NAKSHATRA_SPAN) - natal_nk) % 27) % 9 + 1
    tara_score = 1.0 if tara in TARA_GOOD else 0.5 if tara == 1 else 0.0
    chandra = good["Moon"]

    others = ["Sun", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"]
    bav_frac = sum(ctx.bav[g][int(tl[g] // 30)] / 8 for g in others if g in ctx.bav) / 6
    frac = 0.3 * chandra + 0.2 * tara_score + 0.3 * (sum(good[g] for g in others) / 7) + 0.2 * bav_frac
    score = round(28 + 66 * frac)

    areas = []
    for key, label, gs in AREAS:
        f = 0.5 * (sum(good[g] for g in gs) / len(gs)) + 0.25 * chandra + 0.25 * tara_score
        s = round(28 + 66 * f)
        areas.append({"key": key, "label_fa": label, "score": s, "level": _level(s),
                      "level_fa": LEVEL_FA[_level(s)]})
    return {
        "date": day.isoformat(), "score": score, "level": _level(score),
        "level_fa": LEVEL_FA[_level(score)],
        "chandra_bala": {"house_from_moon": rows[1]["house"], "good": chandra >= 1.0},
        "tara_bala": {"number": tara, "name_fa": TARA_NAMES[tara], "good": tara in TARA_GOOD},
        "gochara": rows, "areas": areas,
    }


# ----------------------------------------------------------------------- dasha
def dasha_levels(moon_lon: float, birth_utc: datetime, at: datetime) -> list[dict[str, Any]]:
    """Running Maha / Antar / Pratyantar periods with start/end datetimes."""
    lon = moon_lon % 360.0
    idx = int(lon // NAKSHATRA_SPAN) % 27
    elapsed = (lon - idx * NAKSHATRA_SPAN) / NAKSHATRA_SPAN
    first = DASHA_SEQUENCE[idx % 9]
    start = birth_utc - timedelta(days=elapsed * DASHA_YEARS[first] * YEAR_DAYS)
    pos = DASHA_SEQUENCE.index(first)

    levels: list[dict[str, Any]] = []
    cursor, lord_pos, span_days = start, pos, None
    # mahadasha
    while True:
        lord = DASHA_SEQUENCE[lord_pos % 9]
        d = DASHA_YEARS[lord] * YEAR_DAYS
        if cursor + timedelta(days=d) > at:
            break
        cursor += timedelta(days=d)
        lord_pos += 1
    levels.append({"level": "maha", "lord": lord, "start": cursor, "end": cursor + timedelta(days=d)})
    for name in ("antar", "pratyantar"):
        parent = levels[-1]
        total = (parent["end"] - parent["start"]).total_seconds() / 86400.0
        p = DASHA_SEQUENCE.index(parent["lord"])
        cur = parent["start"]
        for j in range(9):
            lord = DASHA_SEQUENCE[(p + j) % 9]
            span = total * DASHA_YEARS[lord] / 120.0
            nxt = cur + timedelta(days=span)
            if nxt > at or j == 8:
                levels.append({"level": name, "lord": lord, "start": cur, "end": nxt})
                break
            cur = nxt
    return levels


def dasha_now(ctx: NatalContext, at: datetime, tz_offset: float) -> dict[str, Any]:
    levels = dasha_levels(ctx.moon_lon, ctx.birth_utc, at)
    out_levels = []
    for lv in levels:
        theme, advice = PERIOD_MEANING[lv["lord"]]
        row = {"level": lv["level"], "lord": lv["lord"], "lord_fa": PLANET_FA[lv["lord"]],
               "from": _local(lv["start"], tz_offset).date().isoformat(),
               "to": _local(lv["end"], tz_offset).date().isoformat(),
               "theme_fa": theme, "advice_fa": advice}
        if ctx.lagna is not None and lv["lord"] in ctx.planets and lv["lord"] not in ("Rahu", "Ketu"):
            ruled = [h for h in range(1, 13) if SIGN_LORDS[(ctx.lagna + h - 1) % 12] == lv["lord"]]
            sits = (ctx.planets[lv["lord"]]["sign_index"] - ctx.lagna) % 12 + 1
            row["houses_ruled"] = ruled
            row["house_sits"] = sits
            row["focus_areas_fa"] = sorted({HOUSE_AREA_FA[h] for h in ruled + [sits]})
        out_levels.append(row)
    pr = levels[-1]
    return {"levels": out_levels,
            "summary_fa": (f"دوره {PLANET_FA[levels[0]['lord']]}، زیردوره {PLANET_FA[levels[1]['lord']]} و "
                           f"ریزدوره {PLANET_FA[pr['lord']]}؛ محور اصلی: {PERIOD_MEANING[levels[0]['lord']][0]}.")}


# --------------------------------------------------------------------- outlook
def outlook(ctx: NatalContext, start: date, days: int, tz_offset: float, lat: float, lon: float
            ) -> dict[str, Any]:
    days = max(1, min(days, 30))
    rows = [day_reading(ctx, start + timedelta(days=i), tz_offset, lat, lon) for i in range(days)]
    best: dict[str, list[dict[str, Any]]] = {}
    for key, label, _ in AREAS:
        ranked = sorted(rows, key=lambda r: -next(a["score"] for a in r["areas"] if a["key"] == key))
        best[key] = [{"date": r["date"], "score": next(a["score"] for a in r["areas"] if a["key"] == key)}
                     for r in ranked[:3]]
    return {
        "days": [{"date": r["date"], "score": r["score"], "level": r["level"],
                  "level_fa": r["level_fa"]} for r in rows],
        "best_days": best,
        "caution_days": [{"date": r["date"], "score": r["score"]}
                         for r in sorted(rows, key=lambda r: r["score"])[:3] if r["level"] == "red"],
    }


def build_daily(natal: dict[str, Any], day: date, tz_offset: float, lat: float, lon: float,
                days: int = 14) -> dict[str, Any]:
    ctx = NatalContext(natal)
    pj = panchang(day, tz_offset, lat, lon)
    pj.pop("_rise"), pj.pop("_set")
    today = day_reading(ctx, day, tz_offset, lat, lon)
    now = datetime(day.year, day.month, day.day, 12, tzinfo=timezone.utc) - timedelta(hours=tz_offset)
    horas = hora_table(day, tz_offset, lat, lon)
    best_horas = [h for h in horas if h["favourable"] and not h["night"]][:4]
    return {
        "date": day.isoformat(),
        "limited": natal.get("ascendant") is None,
        "panchang": pj,
        "personal": today,
        "dasha": dasha_now(ctx, now, tz_offset),
        "hora": horas,
        "best_horas": best_horas,
        "outlook": outlook(ctx, day, days, tz_offset, lat, lon),
        "notes": ["بر پایه گذر سیارات نسبت به ماه تولد (گوچارا با ودِه)، چاندرا بالا، تارا بالا و اشتاکاورگا؛"
                  " راهنمای برنامه‌ریزی است، نه پیش‌بینی قطعی."],
    }
