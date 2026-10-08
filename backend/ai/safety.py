"""Crisis detection for the psychology-flavoured chat.

A deterministic pre-check (no LLM) runs before anything else. When a message
signals self-harm or suicide, the bot answers with a fixed, supportive,
non-judgemental message and emergency resources instead of improvising.
"""
from __future__ import annotations

import re

from .textutil import normalize

_PATTERNS = [
    r"خودکشی", r"خود کشی", r"خودم را بکشم", r"خودمو بکشم", r"بمیرم", r"نمی ?خواهم زنده باشم",
    r"نمی ?خوام زنده باشم", r"زندگی ام را تمام", r"به زندگیم پایان", r"آسیب زدن به خودم",
    r"آسیب به خودم", r"خودزنی", r"دوست دارم بمیرم", r"بهتره نباشم",
    r"suicid", r"kill myself", r"end my life", r"want to die", r"self[- ]harm", r"hurt myself",
]
_RE = re.compile("|".join(_PATTERNS))

CRISIS_REPLY = (
    "متأسفم که این‌قدر سخت می‌گذرد؛ از اینکه این را گفتی ممنونم و جدی‌اش می‌گیرم.\n\n"
    "اگر همین حالا در خطر هستی یا فکر می‌کنی ممکن است به خودت آسیب بزنی، لطفاً **همین الان** با اورژانس "
    "**۱۱۵** یا اورژانس اجتماعی **۱۲۳** تماس بگیر، یا به نزدیک‌ترین بیمارستان برو و یک نفر قابل‌اعتماد را "
    "کنار خودت بیاور.\n\n"
    "تو لازم نیست این را تنها تحمل کنی. با یک روان‌شناس یا روان‌پزشک حرف بزن؛ و اگر دوست داری، همین‌جا هم "
    "می‌توانی بگویی چه اتفاقی افتاده. من تفسیر چارت یا تمرین‌های یونگی را فعلاً کنار می‌گذارم تا اول "
    "از امنیت تو مطمئن شویم."
)


def is_crisis(text: str) -> bool:
    return bool(_RE.search(normalize(text)))
