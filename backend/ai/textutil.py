"""Persian/English text normalisation and tokenisation for retrieval."""
from __future__ import annotations

import re
import unicodedata

_AR_TO_FA = str.maketrans({"ي": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه", "أ": "ا", "إ": "ا", "ؤ": "و"})
_DIACRITICS = re.compile(r"[ً-ٰٟۖ-ۭـ]")
_TOKEN = re.compile(r"[\w]+", re.UNICODE)
_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")

STOP_FA = set("""
و در به از که این آن را با برای است هست بود شد می‌شود می شود یا اما تا هر همه یک
هم نیز بر ها های ای کرد کند کنید شده شود باید بیشتر خود من تو او ما شما آنها
""".split())
STOP_EN = set("""
the a an and or of to in on for with is are was were be been it this that as at by from
which their his her its not but also can may will has have had they them these those
""".split())

# Persian query terms -> English keywords found in the English astrology book.
# Lets a Persian question hit the original (English) text without an LLM call.
BILINGUAL = {
    "دشا": "dasha", "داشا": "dasha", "ویمشوتاری": "vimshottari", "طالع": "ascendant lagna rising",
    "لگنا": "lagna ascendant", "خانه": "house bhava", "خانه‌ها": "houses bhava",
    "سیاره": "planet graha", "سیارات": "planets graha", "خورشید": "sun surya", "شمس": "sun surya",
    "ماه": "moon chandra", "قمر": "moon chandra", "مریخ": "mars mangal", "عطارد": "mercury budha",
    "مشتری": "jupiter guru", "زهره": "venus shukra", "زحل": "saturn shani", "راهو": "rahu",
    "کیتو": "ketu", "ناکشاترا": "nakshatra", "نکشاترا": "nakshatra", "برج": "sign rashi",
    "ازدواج": "marriage spouse seventh", "رابطه": "relationship partner seventh",
    "شغل": "career profession tenth", "کار": "career profession tenth", "پول": "wealth money second eleventh",
    "ثروت": "wealth dhana", "سلامت": "health sixth", "بیماری": "disease health sixth",
    "فرزند": "children fifth putra", "ترانزیت": "transit gochara", "گوچارا": "gochara transit",
    "یوگا": "yoga combination", "دوشا": "dosha affliction", "اشتاکاورگا": "ashtakavarga",
    "پنچانگ": "panchang tithi", "تیتی": "tithi", "ناوامشا": "navamsa", "نوامشا": "navamsa",
    "تفسیر": "interpretation", "آیانامشا": "ayanamsa", "سایه": "shadow", "هنر": "art",
    "تحصیل": "education fourth fifth", "سفر": "travel journey ninth", "مهاجرت": "foreign twelfth",
    "خشم": "anger mars", "عشق": "love venus", "ذهن": "mind moon mercury", "کارما": "karma",
}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.translate(_AR_TO_FA).translate(_DIGITS)
    text = _DIACRITICS.sub("", text).replace("‌", " ").replace("‏", " ").replace("‎", " ")
    return text.lower()


def tokenize(text: str, expand: bool = False) -> list[str]:
    norm = normalize(text)
    toks = [t for t in _TOKEN.findall(norm) if len(t) > 1 and t not in STOP_FA and t not in STOP_EN]
    if expand:
        extra: list[str] = []
        raw = normalize(text)
        for fa, en in BILINGUAL.items():
            if normalize(fa) in raw:
                extra.extend(en.split())
        toks += extra
    return toks
