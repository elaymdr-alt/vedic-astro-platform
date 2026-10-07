"""Interpretation engine tests - P08-T05 (rules) + P08-T06 (version/trace)."""
from engine import compute_chart
from engine.interpret import (
    FORBIDDEN_PHRASES, REPORT_VERSION, RULES_VERSION, interpret_chart,
)

CHART = {
    "year": 1990, "month": 6, "day": 15,
    "hour_local": 10.5, "tz_offset": 3.5,
    "lat": 35.6892, "lon": 51.3890,
}


def natal(**kw):
    args = dict(CHART)
    args.update(kw)
    return compute_chart(**args)


def test_schema_ids_conditions_evidence_priority():
    rep = interpret_chart(natal())
    assert rep["rules_version"] and rep["report_version"]
    ids = [p["rule_id"] for p in rep["paragraphs"]]
    assert len(ids) == len(set(ids)), "rule ids must be unique per report"
    for p in rep["paragraphs"]:
        assert p["topic"] and isinstance(p["priority"], int)
        assert p["text_fa"] and p["evidence"], p["rule_id"]
        assert p["rules_version"] == RULES_VERSION


def test_conflict_resolution_one_winner_per_topic():
    rep = interpret_chart(natal())
    topics = [p["topic"] for p in rep["paragraphs"]]
    assert len(topics) == len(set(topics)), "one winner per topic"
    # sun topic: SUN_HOUSE (70) must beat SUN_SIGN_GENERAL (60)
    sun = [p for p in rep["paragraphs"] if p["topic"] == "sun"]
    assert len(sun) == 1 and sun[0]["rule_id"] == "SUN_HOUSE"
    assert any(s["rule_id"] == "SUN_SIGN_GENERAL" for s in rep["suppressed"])


def test_unknown_time_limits_rules():
    rep = interpret_chart(natal(time_precision="unknown"))
    assert rep["time_precision"] == "unknown"
    assert any(l["code"] == "TIME_SENSITIVE_RULES_SKIPPED" for l in rep["limitations"])
    assert not any(p["topic"] == "ascendant" for p in rep["paragraphs"])
    assert not any(p["topic"] == "dasha" for p in rep["paragraphs"])
    assert any(s["reason"] == "needs_time_but_unknown" for s in rep["suppressed"])


def test_no_deterministic_claims():
    rep = interpret_chart(natal())
    for p in rep["paragraphs"]:
        for phrase in FORBIDDEN_PHRASES:
            assert phrase not in p["text_fa"], (p["rule_id"], phrase)


def test_versioning_and_traceability():
    rep = interpret_chart(natal())
    assert rep["rules_version"] == RULES_VERSION
    assert rep["report_version"] == REPORT_VERSION
    assert rep["settings"]["ayanamsa"] == "lahiri"
    # every paragraph traces back to chart numbers
    chart = natal()
    moon = next(pl for pl in chart["planets"] if pl["name"] == "Moon")
    moon_p = next(p for p in rep["paragraphs"] if p["rule_id"] == "MOON_SIGN")
    assert moon_p["evidence"]["moon"]["longitude"] == moon["longitude"]


def test_report_security_no_cross_profile_leak():
    a = interpret_chart(natal())
    b = interpret_chart(natal(day=16))
    # reports are independent objects with no shared references
    assert a is not b
    assert a["paragraphs"] is not b["paragraphs"]
