from datetime import date

from engine.chart import compute_chart
from engine.life_areas import AREAS, life_area_reports

BIRTH = dict(year=1996, month=8, day=2, tz_offset=3.5, lat=35.69, lon=51.39)


def _report(hour=10.5, precision="exact"):
    return life_area_reports(compute_chart(hour_local=hour, time_precision=precision, **BIRTH), date(2026, 10, 13))


def test_six_areas_with_practical_content():
    r = _report()
    assert [a["key"] for a in r["areas"]] == list(AREAS)
    for a in r["areas"]:
        assert a["level"] in ("high", "mid", "support")
        assert len(a["actions"]) == 2 and a["headline"] and a["daily"] and a["evidence"]
    assert r["has_birth_time"] and r["note"] is None


def test_unknown_time_is_flagged_and_still_works():
    r = _report(precision="unknown")
    assert not r["has_birth_time"] and r["note"]
    assert len(r["areas"]) == 6


def test_no_forbidden_certainty_words():
    text = str(_report())
    for w in ("حتماً", "قطعاً", "تضمینی"):
        assert w not in text
