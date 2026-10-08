"""Positive-only output guard.

The assistant must never emit negative judgements, fatalistic predictions or
labels. The prompts ask for a strengths-based, hopeful voice; this module is
the deterministic safety net: any *sentence* containing a banned expression is
removed before it reaches the user (streaming and non-streaming alike).

It deliberately targets the assistant's own judgement words — not feelings the
user names ("نگران", "غمگین") which the assistant must be free to acknowledge.
The fixed crisis message bypasses this guard on purpose.
"""
from __future__ import annotations

import re

from .textutil import normalize

BANNED = [
    "بدبخت", "نحس", "شوم", "بداقبال", "بدشانس", "فاجعه", "مصیبت", "بی‌ارزش", "بی ارزش", "بی‌فایده",
    "بی فایده", "ناامیدکننده", "ناامید کننده", "هیچ امیدی", "هیچ‌وقت درست نمی‌شود", "هیچ وقت درست نمی‌شود",
    "هرگز درست نمی‌شود", "شکست می‌خور", "شکست می خور", "شکست خواهی خورد", "محکوم", "لعنت", "احمق",
    "بدترین", "خطرناک است", "تقصیر خودت", "تقصیر توست", "بی‌عرضه", "بی عرضه", "ضعیفی",
    "حتماً بد", "حتما بد", "اتفاق بدی", "اتفاقات بد", "روزهای بد", "دوران بد", "سرنوشت بد", "طلاق می‌گیر",
    "جدا می‌شوید", "از دست می‌دهی", "خراب می‌شود", "نابود", "بدبیاری", "اشتباه کرده‌ای",
    "اشتباه کردی", "غیرممکن است", "امکان ندارد", "هیچ شانسی", "بی‌امید", "بی امید",
    "terrible", "doomed", "hopeless", "worthless", "your fault", "bad luck", "disaster",
]
_NORM = [normalize(b) for b in BANNED]
_SPLIT = re.compile(r"(?<=[\.\!\?؟؛\n])")
# models sometimes append an invented "[A1]: ..." reference list; sources are shown by the UI instead
_FOOTNOTE = re.compile(r"^\s*\[[AJ]\d+\]\s*[:：]")


def is_clean(sentence: str) -> bool:
    if _FOOTNOTE.match(sentence):
        return False
    s = normalize(sentence)
    return not any(b in s for b in _NORM)


def sanitize(text: str) -> tuple[str, int]:
    """Drop every sentence holding a banned expression. Returns (text, dropped_count)."""
    parts = _SPLIT.split(text)
    kept = [p for p in parts if is_clean(p)]
    return "".join(kept).strip(), len(parts) - len(kept)


class StreamGuard:
    """Sentence-buffered filter for streaming deltas."""

    def __init__(self) -> None:
        self._buf = ""
        self.dropped = 0

    def feed(self, delta: str) -> str:
        self._buf += delta
        out = []
        # emit every complete sentence; keep the unfinished tail buffered
        while True:
            m = re.search(r"[\.\!\?؟؛\n]", self._buf)
            if not m:
                break
            sent, self._buf = self._buf[: m.end()], self._buf[m.end():]
            if is_clean(sent):
                out.append(sent)
            else:
                self.dropped += 1
        return "".join(out)

    def flush(self) -> str:
        tail, self._buf = self._buf, ""
        if tail and not is_clean(tail):
            self.dropped += 1
            return ""
        return tail
