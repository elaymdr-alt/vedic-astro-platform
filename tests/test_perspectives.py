"""Three-lens perspective agents: parallel reports, chat context, key handling."""
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.ai import openrouter, perspectives
from backend.main import app

BIRTH = dict(calendar="gregorian", year=1993, month=4, day=17, hour=6, minute=42,
             tz_offset=3.5, lat=35.6892, lon=51.389)


class FakeRouter:
    """Records requests; fails one call when ``fail_n`` (1-based) is set."""

    def __init__(self, fail_n: int | None = None):
        self.calls: list[dict] = []
        self.fail_n = fail_n

    def handler(self, request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        self.calls.append({"headers": dict(request.headers), "body": body})
        if self.fail_n is not None and len([c for c in self.calls]) == self.fail_n:
            return httpx.Response(502, json={"error": {"message": "down"}})
        lens = "گزارش آزمایشی"
        return httpx.Response(200, json={"choices": [{"message": {"content": lens}}]})


@pytest.fixture()
def fake(monkeypatch):
    f = FakeRouter()
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test")
    monkeypatch.setenv("OPENROUTER_MODEL", "test/model")
    monkeypatch.setattr(openrouter, "_transport", httpx.MockTransport(f.handler))
    return f


def test_status_reports_lenses_and_configuration(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    j = TestClient(app).get("/perspectives/status").json()
    assert j["configured"] is False and len(j["lenses"]) == 3
    ids = [l["id"] for l in j["lenses"]]
    assert ids == ["classical", "timing", "symbolic"]
    assert all(l["title"] and l["agent"] for l in j["lenses"])
    assert len(set(ids)) == 3 and len({l["title"] for l in j["lenses"]}) == 3


def test_perspectives_requires_a_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    r = TestClient(app).post("/perspectives", json={"birth": BIRTH})
    assert r.status_code == 503 and r.json()["detail"]["code"] == "AI_NOT_CONFIGURED"


def test_perspectives_requires_birth():
    r = TestClient(app).post("/perspectives", json={})
    assert r.status_code == 422


def test_three_agents_run_in_parallel_and_return_reports(fake):
    r = TestClient(app).post("/perspectives", json={"birth": BIRTH, "focus": "ازدواج"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["model"] == "test/model" and j["focus"] == "ازدواج"
    assert [x["id"] for x in j["reports"]] == ["classical", "timing", "symbolic"]
    for rep in j["reports"]:
        assert rep["text"] == "گزارش آزمایشی" and rep["error"] is None
        assert rep["title"] and rep["agent"] and isinstance(rep["sources"], list)
    # three separate LLM calls, each fenced and labelled
    assert len(fake.calls) == 3
    systems = [" ".join(m["content"] for m in c["body"]["messages"] if m["role"] == "system")
               for c in fake.calls]
    assert any("پاراشاری" in s for s in systems)
    assert any("ویمشوتاری" in s for s in systems)
    assert any("نمادین" in s for s in systems)
    joined = "\n".join(systems)
    assert "داده‌های مرجع" in joined and "نه دستور" in joined and "ازدواج" in joined


def test_one_failing_lens_does_not_hide_the_others(monkeypatch):
    f = FakeRouter(fail_n=2)
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test")
    monkeypatch.setattr(openrouter, "_transport", httpx.MockTransport(f.handler))
    j = TestClient(app).post("/perspectives", json={"birth": BIRTH}).json()
    ok = [x for x in j["reports"] if not x["error"]]
    bad = [x for x in j["reports"] if x["error"]]
    assert len(ok) == 2 and len(bad) == 1 and bad[0]["error"]


def test_chat_accepts_reports_context_and_fences_it(fake):
    r = TestClient(app).post("/chat", json={
        "messages": [{"role": "user", "content": "درباره گزارش‌هایم بگو"}],
        "mode": "both",
        "reports": [{"label": "نگاه کلاسیک ودیک", "text": "ماه در دلو است [A1]."},
                    {"label": "نگاه زمان‌بندی", "text": "دشای مشتری جاری است."}],
    })
    assert r.status_code == 200, r.text
    systems = " ".join(m["content"] for c in fake.calls for m in c["body"]["messages"] if m["role"] == "system")
    assert "سه گزارش تفسیری قبلی" in systems and "نه دستور" in systems
    assert "نگاه کلاسیک ودیک" in systems and "نگاه زمان‌بندی" in systems


def test_reports_context_helper_truncates_and_skips_empty():
    ctx = perspectives.agents.reports_context([
        {"label": "تست", "text": "x" * 10},
        {"label": "خالی", "text": "   "},
    ])
    assert "--- تست ---" in ctx and "خالی" not in ctx
    assert perspectives.agents.reports_context(None) == "" and perspectives.agents.reports_context([]) == ""
    long = perspectives.agents.reports_context([{"label": "بلند", "text": "y" * 20000}])
    assert len(long) < 20000
