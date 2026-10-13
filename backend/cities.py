"""World city search (GeoNames cities15000, ~34k cities, Persian names where available).

Each result carries the IANA zone (``tz``); the real historical UTC offset is
derived from it by the chart endpoints. ``tz_offset`` here is only today's
offset, for display.
"""
from __future__ import annotations

import gzip
import json
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

from engine.timezone import resolve_timezone  # noqa: F401  (validates tz names at build time)

from backend.ai.textutil import normalize

DATA = Path(__file__).resolve().parents[1] / "knowledge" / "cities" / "cities.json.gz"


@lru_cache(maxsize=1)
def _load() -> list[dict]:
    with gzip.open(DATA, "rt", encoding="utf-8") as fh:
        rows = json.load(fh)
    for r in rows:
        r["_en"] = r["n"].lower()
        r["_fa"] = [normalize(x) for x in r["f"]]
    return rows


def _offset_now(tz: str) -> float:
    try:
        return datetime.now(timezone.utc).astimezone(ZoneInfo(tz)).utcoffset().total_seconds() / 3600.0
    except Exception:  # noqa: BLE001 — unknown zone: caller still gets coordinates
        return 0.0


_FIX = str.maketrans({"ي": "ی", "ك": "ک", "أ": "ا", "إ": "ا", "ٱ": "ا", "ة": "ه", "ۀ": "ه"})
_PERSIAN = set("اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیئءؤ ‌")


def _display_fa(r: dict, nq: str = "") -> str:
    """GeoNames lists Arabic/Urdu/Kurdish variants in no useful order, so pick the
    shortest clean Persian spelling (preferring one the user actually typed)."""
    clean = []
    for raw in r["f"]:
        t = raw.translate(_FIX).strip()
        if t and all(ch in _PERSIAN for ch in t):
            clean.append(t)
    if not clean:
        return r["f"][0] if r["f"] else r["n"]
    if nq:
        hit = [t for t in clean if normalize(t).startswith(nq)]
        if hit:
            clean = hit
    return min(clean, key=len)  # stable: ties keep GeoNames order


def _view(r: dict, nq: str = "") -> dict:
    return {"name_fa": _display_fa(r, nq), "name_en": r["n"], "country": r["c"],
            "lat": r["lat"], "lon": r["lon"], "tz": r["tz"], "tz_offset": _offset_now(r["tz"]),
            "population": r["p"]}


def search_cities(q: str, limit: int = 8) -> list[dict]:
    rows = _load()
    q = (q or "").strip()
    if not q:  # default suggestions: the biggest Iranian cities
        top = sorted((r for r in rows if r["c"] == "IR"), key=lambda r: -r["p"])[:limit]
        return [_view(r) for r in top]
    nq = normalize(q)
    scored: list[tuple[float, dict]] = []
    for r in rows:
        names = [r["_en"], *r["_fa"]]
        best = 0
        for n in names:
            if n == nq:
                best = max(best, 3)
            elif n.startswith(nq):
                best = max(best, 2)
            elif len(nq) >= 3 and nq in n:
                best = max(best, 1)
        if best:
            scored.append((best * 1e9 + r["p"] + (5e7 if r["c"] == "IR" else 0), r))
    scored.sort(key=lambda x: -x[0])
    return [_view(r, nq) for _, r in scored[:limit]]
