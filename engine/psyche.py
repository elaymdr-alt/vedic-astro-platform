"""Jungian-lens reading of a natal chart (interpretive synthesis, not doctrine).

This module maps *chart facts* (sign, house, aspects, nodes, running dasha) to
Jungian vocabulary — persona, self, inner "other", shadow candidates, complex
tensions, individuation axis — and to reflective questions. It is a tool for
self-reflection. Neither Jung nor Vedic tradition prescribes these mappings;
every output carries ``kind="interpretive"`` and hedged wording.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from .aspects import cross_aspects
from .constants import SIGNS_FA
from .daily import NatalContext, PERIOD_MEANING, PLANET_FA, dasha_levels, datetime_from_jd
from datetime import datetime, timezone

ELEMENTS_FA = ["آتش", "خاک", "هوا", "آب"]
MODALITY_FA = ["جنبشی (آغازگر)", "ثابت (پایدار)", "دوگانه (سازگار)"]

SHADOW_PLANET_FA = {
    "Saturn": "منتقد درونی، ترس از ناکافی‌بودن و مسئولیت‌های سنگین",
    "Mars": "خشم، رقابت و مرزهایی که گفتنش سخت است",
    "Rahu": "اشتیاق‌های افراطی و میل به آنچه هنوز نداریم",
    "Ketu": "جداشدن، بی‌میلی و رهاکردن‌هایی که از آن‌ها می‌ترسیم",
    "Moon": "نیازهای عاطفی که بیان‌شان شرم‌آور به نظر می‌رسد",
    "Venus": "نیاز به پذیرفته‌شدن و ارزش‌گذاری در رابطه",
    "Sun": "هویت و میل به دیده‌شدن",
    "Mercury": "حرف‌هایی که گفته نمی‌شوند",
    "Jupiter": "آرمان‌گرایی و تورم معنا",
}
HOUSE_THEME = {
    1: "خود و هویت", 2: "ارزش‌ها و منابع", 3: "ارتباط و تلاش", 4: "ریشه و آرامش درونی",
    5: "خلاقیت و دل‌بستگی", 6: "کار روزمره و چالش‌ها", 7: "رابطه نزدیک", 8: "تحول و پنهان‌ها",
    9: "معنا و مسیر", 10: "جایگاه و رسالت", 11: "جمع و آرزوها", 12: "خلوت و ناخودآگاه",
}
# life stage (Jung: first half builds the ego, second half turns toward the Self)
def _stage(age: float) -> dict[str, str]:
    if age < 35:
        return {"stage": "نیمهٔ اول زندگی",
                "focus_fa": "ساختن ایگو: هویت، استقلال، کار و رابطه؛ و آشنایی آرام با پرسونا و سایه."}
    if age < 50:
        return {"stage": "گذر میانهٔ زندگی",
                "focus_fa": "بازنگری در ارزش‌ها؛ معمولاً پرسش‌های معنا و سایه جدی‌تر می‌شوند."}
    return {"stage": "نیمهٔ دوم زندگی",
            "focus_fa": "چرخش به درون: یکپارچگی، معنا، میراث و رابطه با خود عمیق‌تر."}


QUESTIONS = {
    "persona": "کجا بیشتر نقش‌پوشم تا خودم؟ اگر کسی قضاوتم نمی‌کرد چه چیزی را متفاوت می‌گفتم؟",
    "shadow": "چه ویژگی در دیگران بیشتر از همه تحریکم می‌کند و کوچک‌ترین شکلش در خودم چیست؟",
    "anima": "چه کیفیتی را در شریک یا الگوی ایده‌آلم می‌ستایم که باید در خودم پرورش دهم؟",
    "self": "چه کاری مرا بدون نیاز به تأیید دیگران زنده و معنادار می‌کند؟",
    "individuation": "کدام عادت آشنا به من امنیت می‌دهد اما دیگر رشدم نمی‌دهد؟",
}


def _planets(natal: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {p["name"]: p for p in natal["planets"]}


def psyche_profile(natal: dict[str, Any], today: date | None = None) -> dict[str, Any]:
    pl = _planets(natal)
    asc = natal.get("ascendant")
    has_time = asc is not None
    out: dict[str, Any] = {"kind": "interpretive", "needs_birth_time": [], "disclaimer":
        "تلفیق تفسیری نماد چارت و مفاهیم یونگی برای خودشناسی؛ نه تشخیص روان‌شناختی و نه پیش‌بینی."}

    # persona: ascendant sign (needs time) — otherwise unavailable
    if has_time:
        i = asc["sign_index"]
        out["persona"] = {
            "sign_fa": SIGNS_FA[i], "element_fa": ELEMENTS_FA[i % 4], "modality_fa": MODALITY_FA[i % 3],
            "text_fa": (f"چهرهٔ نخست شما (پرسونا) با رنگ {ELEMENTS_FA[i % 4]} و سبک {MODALITY_FA[i % 3]} "
                        f"در برج {SIGNS_FA[i]} دیده می‌شود؛ ممکن است دیگران ابتدا با همین حالت شما را بشناسند."),
            "question_fa": QUESTIONS["persona"],
        }
    else:
        out["persona"] = None
        out["needs_birth_time"].append("persona")

    def where(name: str) -> dict[str, Any]:
        p = pl[name]
        row = {"planet_fa": PLANET_FA[name], "sign_fa": p["sign_fa"], "retrograde": p["retrograde"]}
        if p.get("house") is not None:
            row["house"] = p["house"]
            row["house_theme_fa"] = HOUSE_THEME[p["house"]]
        return row

    out["self"] = {**where("Sun"),
                   "text_fa": "خورشید مرکز هویت و جهت اراده است؛ ممکن است مسیر شکل‌گیری «خود» شما را نشان دهد.",
                   "question_fa": QUESTIONS["self"]}
    out["inner_world"] = {**where("Moon"),
                          "text_fa": "ماه سبک احساس‌کردن و پناهگاه عاطفی را نمایش می‌دهد (در نگاه یونگی نزدیک به لایه‌های ناخودآگاه شخصی).",
                          "question_fa": "چه چیزی مرا آرام می‌کند و کجا برای آرام‌شدن به آن وابسته‌ام؟"}
    out["inner_other"] = {
        "venus": where("Venus"), "mars": where("Mars"),
        "text_fa": "زهره و مریخ را می‌توان با شیوهٔ عشق‌ورزی و میل به «دیگری» (آنیما/آنیموس به‌عنوان استعاره) خواند.",
        "question_fa": QUESTIONS["anima"],
    }

    # shadow candidates
    shadow: list[dict[str, Any]] = []
    for name in ("Saturn", "Mars", "Rahu", "Ketu"):
        p = pl[name]
        reasons = []
        if name in ("Saturn", "Mars") and p.get("house") in (6, 8, 12):
            reasons.append(f"در خانهٔ {p['house']} (پنهان/چالشی) قرار دارد")
        sun_lon = pl["Sun"]["longitude"]
        if name != "Sun" and abs(((p["longitude"] - sun_lon + 180) % 360) - 180) < 8 and name in ("Saturn", "Mars"):
            reasons.append("نزدیک خورشید (هویت) است")
        if name in ("Rahu", "Ketu"):
            reasons.append("محور گره‌ها؛ الگوی تکرارشونده و تحول")
        if name == "Saturn":
            reasons.append("زحل معمولاً با منتقد درونی و ترس از قضاوت پیوند داده می‌شود")
        if reasons:
            shadow.append({"planet": name, "planet_fa": PLANET_FA[name], "sign_fa": p["sign_fa"],
                           "house": p.get("house"), "reasons_fa": reasons,
                           "theme_fa": SHADOW_PLANET_FA[name]})
    if has_time:
        for name, p in pl.items():
            if p.get("house") == 12 and name not in {s["planet"] for s in shadow}:
                shadow.append({"planet": name, "planet_fa": PLANET_FA[name], "sign_fa": p["sign_fa"],
                               "house": 12, "reasons_fa": ["در خانهٔ ۱۲ (خلوت/ناخودآگاه) قرار دارد"],
                               "theme_fa": SHADOW_PLANET_FA[name]})
    out["shadow"] = {"candidates": shadow, "question_fa": QUESTIONS["shadow"],
                     "text_fa": "این‌ها «کاندیداهای» سایه‌اند، نه حکم؛ سایهٔ واقعی را فقط تجربهٔ شخصی تأیید می‌کند."}

    # complex tensions: hard aspects among the personal planets
    core = [pl[n] for n in ("Sun", "Moon", "Mars", "Venus", "Saturn")]
    hard = [a for a in cross_aspects(core, core, orbs={"square": 5.0, "opposition": 6.0,
                                                          "conjunction": 6.0, "trine": 0.0, "sextile": 0.0},
                                     same_chart=True)
            if a["aspect"] in ("square", "opposition", "conjunction")]
    out["tensions"] = [{
        "pair_fa": f"{PLANET_FA[a['body_a']]} – {PLANET_FA[a['body_b']]}", "aspect_fa": a["aspect_fa"],
        "orb": a["orb"],
        "text_fa": "می‌تواند محل کشمکش درونی یا کمپلکس باشد؛ هم‌زمان منبع انرژی و خلاقیت است.",
    } for a in hard[:5]]

    # individuation axis
    rahu, ketu = pl["Rahu"], pl["Ketu"]
    out["individuation"] = {
        "toward": {"planet_fa": "راهو", "sign_fa": rahu["sign_fa"], "house": rahu.get("house"),
                   "theme_fa": HOUSE_THEME.get(rahu.get("house") or 0)},
        "from": {"planet_fa": "کیتو", "sign_fa": ketu["sign_fa"], "house": ketu.get("house"),
                 "theme_fa": HOUSE_THEME.get(ketu.get("house") or 0)},
        "text_fa": "راهو و کیتو به‌عنوان استعارهٔ کشش میان «الگوی آشنا» و «رشد ناآشنا» خوانده می‌شوند.",
        "question_fa": QUESTIONS["individuation"],
    }

    # present life chapter: dasha + age
    ctx = NatalContext(natal)
    now = datetime(*(today or date.today()).timetuple()[:3], 12, tzinfo=timezone.utc)
    lv = dasha_levels(ctx.moon_lon, ctx.birth_utc, now)
    age = (now - datetime_from_jd(natal["julian_day_ut"])).days / 365.25
    out["chapter"] = {
        "age": round(age, 1), **_stage(age),
        "dasha_lord_fa": PLANET_FA[lv[0]["lord"]], "dasha_theme_fa": PERIOD_MEANING[lv[0]["lord"]][0],
        "text_fa": (f"دورهٔ {PLANET_FA[lv[0]['lord']]} با محور «{PERIOD_MEANING[lv[0]['lord']][0]}» "
                    "را می‌توان یک «فصل درونی» دید؛ پرسش یونگی: این فصل چه چیزی را از من می‌خواهد ببینم؟"),
    }
    return out


def psyche_text(profile: dict[str, Any]) -> str:
    """Compact Persian rendering used inside LLM prompts."""
    lines = []
    if profile.get("persona"):
        lines.append("پرسونا: " + profile["persona"]["text_fa"])
    lines.append(f"خود: خورشید در {profile['self']['sign_fa']}"
                 + (f" خانهٔ {profile['self']['house']}" if profile['self'].get('house') else ""))
    lines.append(f"دنیای درون: ماه در {profile['inner_world']['sign_fa']}")
    iv = profile["inner_other"]
    lines.append(f"آنیما/آنیموس (استعاره): زهره در {iv['venus']['sign_fa']}، مریخ در {iv['mars']['sign_fa']}")
    for s in profile["shadow"]["candidates"]:
        lines.append(f"کاندیدای سایه: {s['planet_fa']} در {s['sign_fa']}"
                     + (f" خانهٔ {s['house']}" if s.get("house") else "") + " — " + "؛ ".join(s["reasons_fa"]))
    for t in profile["tensions"]:
        lines.append(f"تنش: {t['pair_fa']} ({t['aspect_fa']})")
    ind = profile["individuation"]
    lines.append(f"محور فردیت‌یابی: راهو در {ind['toward']['sign_fa']} (خانهٔ {ind['toward']['house']}) / "
                 f"کیتو در {ind['from']['sign_fa']}")
    ch = profile["chapter"]
    lines.append(f"فصل فعلی: {ch['stage']} (سن {ch['age']})، دورهٔ {ch['dasha_lord_fa']} — {ch['dasha_theme_fa']}")
    return "\n".join(lines)


# ------------------------------------------------------------ strengths (positive facts)
_EXALT = {"Sun": 0, "Moon": 1, "Mars": 9, "Mercury": 5, "Jupiter": 3, "Venus": 11, "Saturn": 6}
_STRENGTH_THEME = {
    "Sun": "اعتمادبه‌نفس و توان رهبری", "Moon": "عمق احساس و توان آرام‌کردن خود و دیگران",
    "Mars": "شجاعت و توان اقدام", "Mercury": "هوش کلامی و توان یادگیری",
    "Jupiter": "خرد، حمایت‌پذیری و نگاه امیدوار", "Venus": "مهر، ذوق زیبایی و توان پیوند",
    "Saturn": "پایداری و توان ساختن آهسته و محکم",
}


def chart_strengths(natal: dict[str, Any], today: date | None = None) -> list[str]:
    """Positive, chart-grounded resources the assistant can build on (never negative)."""
    from .constants import SIGN_LORDS
    from .daily import outlook

    pl = _planets(natal)
    out: list[str] = []
    for name, theme in _STRENGTH_THEME.items():
        p = pl[name]
        si = p["sign_index"]
        if _EXALT[name] == si:
            out.append(f"{PLANET_FA[name]} در برج {p['sign_fa']} در جایگاه اوج است: نشانه‌ای از {theme}.")
        elif SIGN_LORDS[si] == name:
            out.append(f"{PLANET_FA[name]} در برج خودش ({p['sign_fa']}) است: پایگاهی برای {theme}.")
    has_time = natal.get("ascendant") is not None
    if has_time:
        for name in ("Jupiter", "Venus", "Moon"):
            h = pl[name].get("house")
            if h in (1, 4, 5, 7, 9, 10):
                out.append(f"{PLANET_FA[name]} در خانهٔ {h} ({HOUSE_THEME[h]}) قرار دارد: منبعی از حمایت و رشد.")
    j, m = pl["Jupiter"], pl["Moon"]
    if ((j["sign_index"] - m["sign_index"]) % 12) in (0, 3, 6, 9):
        out.append("مشتری نسبت به ماه در جایگاه کندرا است (ترکیب گاجا کِساری): الگوی حمایت درونی و بینش.")
    lon = pl["Venus"]["sign_fa"]
    out.append(f"زهره در برج {lon}: سبک شخصی شما در مهر و پیوند.")
    ctx = NatalContext(natal)
    now = datetime(*(today or date.today()).timetuple()[:3], 12, tzinfo=timezone.utc)
    lv = dasha_levels(ctx.moon_lon, ctx.birth_utc, now)
    out.append(f"فصل فعلی (دورهٔ {PLANET_FA[lv[0]['lord']]}) فرصتی برای: {PERIOD_MEANING[lv[0]['lord']][0]}.")
    try:
        ol = outlook(ctx, today or date.today(), 14, 3.5, 35.69, 51.39)
        for key, label in (("love", "رابطه و عشق"), ("work", "کار"), ("mind", "ذهن و یادگیری")):
            d = ol["best_days"][key][0]["date"]
            out.append(f"از روزهای پیش‌رو، {d} برای «{label}» فضای مساعدتری دارد.")
    except Exception:  # noqa: BLE001 — optional enrichment
        pass
    return out
