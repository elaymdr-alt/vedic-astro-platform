"""Small city dataset (Iran) + search — P05-T01 subset (PostGIS stub later)."""
from __future__ import annotations

CITIES = [
    {"name_fa": "تهران", "name_en": "Tehran", "lat": 35.6892, "lon": 51.3890, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "مشهد", "name_en": "Mashhad", "lat": 36.2605, "lon": 59.6168, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "اصفهان", "name_en": "Isfahan", "lat": 32.6546, "lon": 51.6680, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "شیراز", "name_en": "Shiraz", "lat": 29.5918, "lon": 52.5837, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "تبریز", "name_en": "Tabriz", "lat": 38.0962, "lon": 46.2738, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "کرج", "name_en": "Karaj", "lat": 35.8400, "lon": 50.9391, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "قم", "name_en": "Qom", "lat": 34.6399, "lon": 50.8759, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "اهواز", "name_en": "Ahvaz", "lat": 31.3204, "lon": 48.6693, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "یزد", "name_en": "Yazd", "lat": 31.8974, "lon": 54.3569, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "کرمان", "name_en": "Kerman", "lat": 30.2839, "lon": 57.0679, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "رشت", "name_en": "Rasht", "lat": 37.2808, "lon": 49.5832, "tz": "Asia/Tehran", "tz_offset": 3.5},
    {"name_fa": "ساری", "name_en": "Sari", "lat": 36.5633, "lon": 53.0601, "tz": "Asia/Tehran", "tz_offset": 3.5},
]


def search_cities(q: str, limit: int = 8) -> list[dict]:
    q = (q or "").strip().lower()
    if not q:
        return CITIES[:limit]
    out = [c for c in CITIES if q in c["name_fa"] or q in c["name_en"].lower()]
    return out[:limit]
