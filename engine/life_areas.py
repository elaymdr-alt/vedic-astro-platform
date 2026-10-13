"""Life-area interpretation agents — plain-language, everyday-use reports.

Six small deterministic "agents" (work, money, love, health, family, mind), each
reading the *same* computed chart from its own viewpoint:

* structure   — the houses that govern the area, their lords and occupants;
* strength    — dignity of the natural significators (karakas);
* timing      — whether the running dasha period activates the area.

Nothing here computes positions; it only reads a ``compute_chart`` dict, so it
works without any LLM key. Wording follows the product rules: practical,
hedged ("نشان می‌دهد", "می‌تواند"), never fatalistic, no invented data.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from .constants import SIGN_LORDS
from .daily import NatalContext, dasha_now

VERSION = "1.0.0"

_EXALT = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3, "Venus": 11, "Saturn": 6}
_DEBIL = {"Sun": 6, "Moon": 7, "Mars": 3, "Mercury": 11, "Jupiter": 9, "Venus": 5, "Saturn": 0}
_BENEFIC = {"Jupiter", "Venus", "Mercury", "Moon"}
_STRONG_HOUSES = {1, 4, 5, 7, 9, 10}
_HARD_HOUSES = {6, 8, 12}

HOUSE_FA = {
    1: "خود و شخصیت", 2: "درآمد و ارزش‌ها", 3: "تلاش و ارتباط", 4: "خانه و آرامش",
    5: "خلاقیت و یادگیری", 6: "کار روزمره و سلامت", 7: "شراکت و رابطه", 8: "تحول و منابع مشترک",
    9: "مسیر و باورها", 10: "کار و جایگاه", 11: "درآمد و شبکه", 12: "خلوت و هزینه‌ها",
}

# key: (title, houses, karakas, viewpoint agent)
AREAS: dict[str, dict[str, Any]] = {
    "work": {"title": "کار و مسیر شغلی", "houses": (10, 6), "karakas": ("Sun", "Saturn"),
             "agent": "مشاور کار و مسیر شغلی"},
    "money": {"title": "پول و امنیت مالی", "houses": (2, 11), "karakas": ("Jupiter", "Venus"),
              "agent": "مشاور مالی روزمره"},
    "love": {"title": "رابطه و عشق", "houses": (7, 5), "karakas": ("Venus", "Moon"),
             "agent": "مشاور روابط"},
    "health": {"title": "سلامت و انرژی", "houses": (1, 6), "karakas": ("Sun", "Mars"),
               "agent": "راهنمای انرژی و سلامت عمومی"},
    "family": {"title": "خانه و خانواده", "houses": (4,), "karakas": ("Moon", "Jupiter"),
               "agent": "راهنمای خانه و خانواده"},
    "mind": {"title": "ذهن، یادگیری و رشد", "houses": (5, 9), "karakas": ("Mercury", "Jupiter"),
             "agent": "راهنمای یادگیری و رشد"},
}

# level -> (headline, daily-life meaning, two small actions) per area
TEXTS: dict[str, dict[str, tuple[str, str, tuple[str, str]]]] = {
    "work": {
        "high": ("زمینهٔ شغلی چارتت پرانرژی است.",
                 "در محل کار معمولاً دیده می‌شوی و می‌توانی مسئولیت بیشتری بپذیری.",
                 ("یک هدف شغلی سه‌ماهه بنویس و اولین قدمش را همین هفته بردار.",
                  "از یک همکار یا مدیر دربارهٔ مسیر رشدت بازخورد بگیر.")),
        "mid": ("زمینهٔ شغلی متعادل است؛ با برنامه جلو می‌روی.",
                "پیشرفت بیشتر از نظم و ثبات می‌آید تا جهش ناگهانی.",
                ("کارهای هفته را هر صبح در سه اولویت خلاصه کن.",
                 "یک مهارت مرتبط با کارت را ۲۰ دقیقه در روز تمرین کن.")),
        "support": ("این حوزه کمی توجه و صبر می‌خواهد.",
                    "نتیجه دیرتر می‌رسد، اما با تکرار و برنامهٔ کوچک ساخته می‌شود.",
                    ("به‌جای هدف بزرگ، یک کار کوچک و قابل‌انجام امروز را تمام کن.",
                     "اگر خسته‌ای، پیش از تصمیم شغلی مهم دو روز صبر کن.")),
    },
    "money": {
        "high": ("چارتت پشتوانهٔ خوبی برای امور مالی نشان می‌دهد.",
                 "فرصت پس‌انداز و رشد درآمد وجود دارد، به‌شرطی که برنامه داشته باشی.",
                 ("هر ماه درصدی ثابت از درآمد را بلافاصله کنار بگذار.",
                  "قبل از هر خرید بزرگ ۲۴ ساعت صبر کن.")),
        "mid": ("وضعیت مالی متعادل است.",
                "با ثبت خرج‌ها و هدف روشن، ثبات مالی ساخته می‌شود.",
                ("خرج‌های این هفته را یادداشت کن تا الگویشان را ببینی.",
                 "یک صندوق اضطراری کوچک شروع کن، حتی با مبلغ کم.")),
        "support": ("امور مالی به برنامه‌ریزی محتاطانه نیاز دارد.",
                    "تصمیم‌های عجولانه کمتر به نفعت است؛ پایداری از تدریج می‌آید.",
                    ("سه خرج غیرضروری ماه را شناسایی و یکی را حذف کن.",
                     "برای تصمیم مالی بزرگ با یک متخصص مشورت کن.")),
    },
    "love": {
        "high": ("چارتت زمینهٔ گرم و پیوندساز برای رابطه دارد.",
                 "در گفت‌وگوی صمیمانه و ابراز محبت راحتی و جذابیت طبیعی داری.",
                 ("امروز یک پیام صمیمانه و بی‌دلیل برای عزیزی بفرست.",
                  "برای وقت باکیفیت با نزدیکانت یک برنامهٔ ثابت بگذار.")),
        "mid": ("زمینهٔ رابطه متعادل است.",
                "رابطه با صراحت و گوش‌دادن عمیق‌تر می‌شود.",
                ("در گفت‌وگوی بعدی ده دقیقه فقط گوش بده.",
                 "یک نیاز خودت را روشن و مهربان بیان کن.")),
        "support": ("رابطه‌ها به صبر و مراقبت از خودت نیاز دارند.",
                    "شناخت نیاز خودت پیش از پیوند تازه کمک می‌کند.",
                    ("امروز یک کار مهربانانه برای خودت انجام بده.",
                     "پیش از قضاوت دربارهٔ یک رابطه، احساست را بنویس.")),
    },
    "health": {
        "high": ("انرژی پایه‌ات در چارت قوی است.",
                 "بدنت معمولاً با حرکت و روتین منظم خوب پاسخ می‌دهد.",
                 ("هر روز ۳۰ دقیقه پیاده‌روی را در برنامه بگذار.",
                  "ساعت خواب و بیداری‌ات را ثابت نگه دار.")),
        "mid": ("انرژی متعادل است.",
                "نظم در خواب و تغذیه بیشترین اثر را دارد.",
                ("امشب نیم‌ساعت زودتر بخواب.",
                 "هر روز یک لیوان آب بیشتر بنوش.")),
        "support": ("بدن و ذهنت به استراحت و مراقبت بیشتری نیاز دارند.",
                    "فشار کاری را با مکث‌های کوتاه تقسیم کن.",
                    ("هر دو ساعت یک مکث پنج‌دقیقه‌ای بگذار.",
                     "اگر نگرانی جسمی داری، حتماً به پزشک مراجعه کن.")),
    },
    "family": {
        "high": ("حس تعلق و آرامش خانه در چارتت پررنگ است.",
                 "خانه می‌تواند پناهگاه و منبع انرژی‌ات باشد.",
                 ("یک وعدهٔ غذایی را این هفته با خانواده بدون موبایل بخور.",
                  "گوشه‌ای از خانه را برای آرامش خودت بچین.")),
        "mid": ("ارتباط با خانه و ریشه‌ها متعادل است.",
                "گفت‌وگوهای کوتاه و منظم فاصله‌ها را کم می‌کند.",
                ("امروز با یک عضو خانواده تماس بگیر.",
                 "یک قرار کوچک خانوادگی برای آخر هفته بگذار.")),
        "support": ("آرامش خانه به توجه آگاهانه نیاز دارد.",
                    "مرزهای مهربان و گفت‌وگوی آرام کمک می‌کند.",
                    ("هنگام اختلاف، پیش از جواب یک نفس عمیق بکش.",
                     "برای خودت یک ساعت خلوت روزانه تعریف کن.")),
    },
    "mind": {
        "high": ("ذهن و یادگیری از نقاط قوت چارتت است.",
                 "یادگیری، نوشتن و گفت‌وگوی عمیق به تو انرژی می‌دهد.",
                 ("موضوعی که کنجکاوت کرده را ۳۰ دقیقه امروز بخوان.",
                  "ایده‌هایت را در یک دفتر مشخص جمع کن.")),
        "mid": ("ذهنت متعادل و قابل‌پرورش است.",
                "با تمرین منظم تمرکز و یادگیری بهتر می‌شود.",
                ("کارهای عمیق را در بهترین ساعت روزت بگذار.",
                 "یک عادت یادگیری ۱۵ دقیقه‌ای شروع کن.")),
        "support": ("ذهن به نظم و آرامش بیشتری نیاز دارد.",
                    "تقسیم کار به مراحل کوچک فشار ذهنی را کم می‌کند.",
                    ("نگرانی‌هایت را بنویس و یکی را انتخاب کن.",
                     "قبل از خواب ده دقیقه صفحه‌نمایش را کنار بگذار.")),
    },
}

PLANETS_FA = {"Sun": "خورشید", "Moon": "ماه", "Mars": "مریخ", "Mercury": "عطارد", "Jupiter": "مشتری",
              "Venus": "زهره", "Saturn": "زحل", "Rahu": "راهو", "Ketu": "کیتو"}
_FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(n: int | str) -> str:
    return str(n).translate(_FA_DIGITS)


LEVEL_FA = {"high": "پررنگ", "mid": "متعادل", "support": "نیازمند توجه"}


def _house_of(ctx: NatalContext, lagna: int, name: str) -> int:
    return (ctx.planets[name]["sign_index"] - lagna) % 12 + 1


def _dignity(name: str, sign_index: int) -> str | None:
    if _EXALT.get(name) == sign_index:
        return "اوج"
    if SIGN_LORDS[sign_index] == name:
        return "برج خود"
    if _DEBIL.get(name) == sign_index:
        return "ضعف"
    return None


def _timing(area: dict[str, Any], levels: list[dict[str, Any]], key_lords: set[str]) -> str | None:
    """Does the running mahadasha/antardasha touch this area?"""
    for lv in levels[:2]:
        lord = lv["lord"]
        ruled = set(lv.get("houses_ruled", []))
        sits = lv.get("house_sits")
        if lord in key_lords or ruled & set(area["houses"]) or sits in area["houses"]:
            lord_fa = PLANETS_FA[lord]
            if lv is levels[0]:
                return (f"در دورهٔ بزرگ {lord_fa} هستی که این حوزه را فعال نگه می‌دارد؛ "
                        "قدم‌های کوچک و پیوسته در همین زمینه نتیجه می‌دهد.")
            return (f"زیردورهٔ {lord_fa} (تا {lv['to']}) این حوزه را پررنگ می‌کند؛ "
                    "فرصت خوبی برای قدم‌های آگاهانه در همین زمینه است.")
    return None


def _area_report(key: str, ctx: NatalContext, lagna: int, levels: list[dict[str, Any]]) -> dict[str, Any]:
    area = AREAS[key]
    score = 0.0
    evidence: list[str] = []
    key_lords: set[str] = set()

    for h in area["houses"]:
        lord = SIGN_LORDS[(lagna + h - 1) % 12]
        key_lords.add(lord)
        lord_house = _house_of(ctx, lagna, lord)
        where = f"خانهٔ {fa(h)} ({HOUSE_FA[h]}) را {PLANETS_FA[lord]} اداره می‌کند و در خانهٔ {fa(lord_house)} نشسته است"
        if lord_house in _STRONG_HOUSES:
            score += 1
            where += " — جایگاهی حمایتگر."
        elif lord_house in _HARD_HOUSES:
            score -= 0.5
            where += " — این بخش با تلاش آگاهانه بهتر می‌شود."
        else:
            where += "."
        evidence.append(where)
        for name, p in ctx.planets.items():
            if _house_of(ctx, lagna, name) == h:
                if name in _BENEFIC:
                    score += 1.5
                    evidence.append(f"{PLANETS_FA[name]} در خانهٔ {fa(h)} است: منبعی از حمایت و رشد.")
                elif name in ("Saturn", "Mars"):
                    score += 0.25
                    evidence.append(f"{PLANETS_FA[name]} در خانهٔ {fa(h)} است: انرژی جدی؛ با نظم به نیرو تبدیل می‌شود.")
                else:
                    evidence.append(f"{PLANETS_FA[name]} در خانهٔ {fa(h)} است: میل به تجربه‌های تازه در این حوزه.")

    for name in area["karakas"]:
        p = ctx.planets[name]
        d = _dignity(name, p["sign_index"])
        if d == "اوج":
            score += 2
            evidence.append(f"{PLANETS_FA[name]} (نمایندهٔ طبیعی این حوزه) در اوج است: نقطهٔ قوت.")
        elif d == "برج خود":
            score += 1.5
            evidence.append(f"{PLANETS_FA[name]} در برج خودش است: پایگاهی پایدار.")
        elif d == "ضعف":
            score -= 0.75
            evidence.append(f"{PLANETS_FA[name]} در برج ضعف است: این بخش با تمرین آگاهانه و صبر قوی می‌شود.")

    level = "high" if score >= 3 else "mid" if score >= 1 else "support"
    headline, daily, actions = TEXTS[key][level]
    timing = _timing(area, levels, key_lords | set(area["karakas"]))
    return {"key": key, "title": area["title"], "agent": area["agent"],
            "level": level, "level_fa": LEVEL_FA[level], "score": round(score, 2),
            "headline": headline, "daily": daily, "actions": list(actions),
            "timing": timing, "evidence": evidence[:6]}


def life_area_reports(natal: dict[str, Any], today: date, tz_offset: float = 3.5) -> dict[str, Any]:
    """All six area reports + a one-glance overview for the given chart."""
    ctx = NatalContext(natal)
    has_time = ctx.lagna is not None
    lagna = ctx.lagna if has_time else ctx.moon_sign  # unknown time -> Chandra lagna
    now = datetime(today.year, today.month, today.day, 12, tzinfo=timezone.utc) - timedelta(hours=tz_offset)
    d = dasha_now(ctx, now, tz_offset)
    areas = [_area_report(k, ctx, lagna, d["levels"]) for k in AREAS]

    ranked = sorted(areas, key=lambda a: -a["score"])
    best, care = ranked[0], ranked[-1]
    active = [a["title"] for a in areas if a["timing"]]
    overview = {
        "strongest": best["title"],
        "needs_care": care["title"],
        "period": d["summary_fa"],
        "active_now": active,
        "week_focus": (f"این هفته روی «{active[0]}» تمرکز کن؛ دورهٔ جاری آن را فعال کرده است."
                       if active else f"این هفته از نقطهٔ قوتت، «{best['title']}»، برای شروع کار کمک بگیر."),
    }
    return {
        "version": VERSION,
        "has_birth_time": has_time,
        "note": (None if has_time else
                 "ساعت تولد نامعلوم است؛ خانه‌ها از روی ماه (چاندرا لگنا) سنجیده شده‌اند و دقت کمتری دارند."),
        "overview": overview,
        "areas": areas,
        "disclaimer": "این گزارش‌ها عمومی و آموزشی‌اند و جایگزین مشورت پزشکی، حقوقی یا مالی نیستند.",
    }
