"""iCalendar export and process-isolated rectification."""
import asyncio
from datetime import date

from fastapi.testclient import TestClient

from backend.main import app
from backend.workers import run_isolated, shutdown
from engine import compute_chart
from engine.calendar_export import _fold, build_events, build_ics

BIRTH = dict(calendar="gregorian", year=1993, month=4, day=17, hour=6, minute=42,
             tz_offset=3.5, lat=35.6892, lon=51.389)


def natal():
    return compute_chart(1993, 4, 17, 6.7, 3.5, 35.6892, 51.389)


def test_events_cover_best_days_dasha_and_ingress():
    ev = build_events(natal(), date(2026, 10, 8), 3.5, 35.69, 51.39, 30)
    kinds = {e["kind"].split("-")[0] for e in ev}
    assert {"best", "pratyantar", "ingress"} <= kinds
    assert [e["date"] for e in ev] == sorted(e["date"] for e in ev)


def test_ics_is_rfc_shaped_and_folds_long_utf8_lines():
    ics = build_ics(natal(), date(2026, 10, 8), 3.5, 35.69, 51.39, 14)
    assert ics.startswith("BEGIN:VCALENDAR\r\n") and ics.rstrip().endswith("END:VCALENDAR")
    assert ics.count("BEGIN:VEVENT") == ics.count("END:VEVENT") >= 3
    for line in ics.split("\r\n"):
        assert len(line.encode("utf-8")) <= 75, line
    # folded lines start with one space and unfold back to valid UTF-8
    assert "\r\n " in _fold("SUMMARY:" + "آ" * 80)
    assert _fold("SUMMARY:" + "آ" * 80).replace("\r\n ", "") == "SUMMARY:" + "آ" * 80


def test_calendar_endpoint_downloads_ics():
    r = TestClient(app).post("/daily/calendar.ics", json={"birth": BIRTH, "date": "2026-10-08", "days": 14})
    assert r.status_code == 200 and r.headers["content-type"].startswith("text/calendar")
    assert "attachment" in r.headers["content-disposition"] and "BEGIN:VEVENT" in r.text


def _square(x):
    return x * x


def test_isolated_worker_runs_in_another_process_and_rectify_matches_inline(monkeypatch):
    import os
    monkeypatch.setenv("ISOLATED_WORKERS", "1")
    assert asyncio.run(run_isolated(_square, 7)) == 49
    assert asyncio.run(run_isolated(os.getpid)) != os.getpid()
    body = dict(calendar="gregorian", year=1990, month=6, day=15, tz_offset=3.5, lat=35.69, lon=51.39,
                step_minutes=15, permutations=0,
                events=[dict(type="marriage", calendar="gregorian", year=2015, month=5, day=1)])
    c = TestClient(app)
    iso = c.post("/rectify", json=body).json()
    monkeypatch.setenv("ISOLATED_WORKERS", "0")
    inline = c.post("/rectify", json=body).json()
    assert iso == inline
    shutdown()
