"""Chat stack with a mocked OpenRouter: routing, RAG, safety, streaming, key handling."""
import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.ai import agents, openrouter, rag, typology
from backend.ai.safety import is_crisis
from backend.ai.textutil import tokenize
from backend.main import app

BIRTH = dict(calendar="gregorian", year=1993, month=4, day=17, hour=6, minute=42,
             tz_offset=3.5, lat=35.6892, lon=51.389)


class FakeRouter:
    """Records requests; answers like OpenRouter (JSON or SSE)."""

    def __init__(self):
        self.calls: list[dict] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        self.calls.append({"headers": dict(request.headers), "body": body})
        if body.get("stream"):
            sse = "".join(
                f"data: {json.dumps({'choices': [{'delta': {'content': piece}}]})}\n\n"
                for piece in ("سلام ", "دنیا")
            ) + ": OPENROUTER PROCESSING\n\ndata: [DONE]\n\n"
            return httpx.Response(200, content=sse.encode(), headers={"content-type": "text/event-stream"})
        return httpx.Response(200, json={"choices": [{"message": {"content": "پاسخ آزمایشی"}}]})


@pytest.fixture()
def fake(monkeypatch):
    f = FakeRouter()
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test")
    monkeypatch.setenv("OPENROUTER_MODEL", "test/model")
    monkeypatch.setattr(openrouter, "_transport", httpx.MockTransport(f.handler))
    return f


def test_jung_dataset_is_valid_and_searchable():
    kb = rag.jung_kb()
    assert len(kb) >= 45
    ids = [c.id for c in kb.chunks]
    assert len(ids) == len(set(ids))
    top = kb.search("سایه چیست و چطور با آن کار کنم", 3)
    assert top and any("سایه" in h.chunk.title for h in top)
    assert kb.search("persona mask", 2)[0].chunk.id == "J-persona"


def test_bilingual_expansion_links_persian_query_to_english_terms():
    assert "saturn" in tokenize("دشای زحل", expand=True) and "dasha" in tokenize("دشای زحل", expand=True)


def test_book_kb_retrieves_when_books_are_ingested(tmp_path, monkeypatch):
    kb = rag.KnowledgeBase("t", [
        rag.Chunk("1", "a", "Saturn dasha brings discipline and delay", source="book", page=3),
        rag.Chunk("2", "b", "Venus rules relationships and art", source="book", page=9),
    ])
    assert kb.search("زحل دشا", 1)[0].chunk.id == "1"


def test_crisis_detection_is_deterministic():
    assert is_crisis("می‌خواهم خودکشی کنم") and is_crisis("I want to kill myself")
    assert not is_crisis("امروز برای کار چطور است؟")


def test_routing():
    assert agents.route("auto", "دشای زحل من چیست؟", True) == ["astro"]
    assert agents.route("auto", "سایه من چیست؟", False) == ["jung"]
    assert agents.route("auto", "سایه من چیست؟", True) == ["jung", "astro"]
    assert agents.route("auto", "سلام", False) == ["jung"]
    assert agents.route("astro", "x", False) == ["astro"] and agents.route("both", "x", False) == ["astro", "jung"]


def test_status_and_missing_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    c = TestClient(app)
    assert c.get("/chat/status").json()["configured"] is False
    r = c.post("/chat", json={"messages": [{"role": "user", "content": "سلام"}]})
    assert r.status_code == 503 and r.json()["detail"]["code"] == "AI_NOT_CONFIGURED"


def test_crisis_bypasses_llm_even_without_key(monkeypatch):
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    r = TestClient(app).post("/chat", json={"messages": [{"role": "user", "content": "می‌خواهم خودکشی کنم"}]})
    j = r.json()
    assert r.status_code == 200 and j["crisis"] is True and "۱۱۵" in j["text"]


def test_single_agent_chat_sends_context_and_key(fake):
    c = TestClient(app)
    r = c.post("/chat", json={"messages": [{"role": "user", "content": "سایه چیست؟"}], "mode": "jung"})
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["text"] == "پاسخ آزمایشی" and j["agents"] == ["jung"] and j["sources"]
    call = fake.calls[0]
    assert call["headers"]["authorization"] == "Bearer sk-test" and call["body"]["model"] == "test/model"
    system = " ".join(m["content"] for m in call["body"]["messages"] if m["role"] == "system")
    assert "مراجع یونگی" in system and "[J1]" in system and "نه دستور" in system


def test_both_agents_run_then_compose(fake):
    r = TestClient(app).post("/chat", json={
        "messages": [{"role": "user", "content": "چرا در رابطه‌ها این‌قدر اضطراب دارم؟"}],
        "birth": BIRTH, "mode": "both"})
    assert r.status_code == 200, r.text
    assert len(fake.calls) == 3  # astrologer + psychologist + composer
    astro_ctx = " ".join(m["content"] for m in fake.calls[0]["body"]["messages"])
    assert "طالع: حمل" in astro_ctx and "دشای فعلی" in astro_ctx
    comp = " ".join(m["content"] for m in fake.calls[2]["body"]["messages"])
    assert "یادداشت ستاره‌شناس" in comp and "یادداشت روان‌شناس یونگی" in comp


def test_streaming_events(fake):
    c = TestClient(app)
    with c.stream("POST", "/chat/stream", json={
            "messages": [{"role": "user", "content": "پرسونا یعنی چه؟"}], "mode": "jung"}) as r:
        text = "".join(r.iter_text())
    assert "event: meta" in text and "event: delta" in text and "event: done" in text
    assert "سلام " in text and "دنیا" in text


def test_validation_and_upstream_errors(monkeypatch):
    c = TestClient(app)
    assert c.post("/chat", json={"messages": [{"role": "assistant", "content": "x"}]}).status_code == 422
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-bad")
    monkeypatch.setattr(openrouter, "_transport", httpx.MockTransport(
        lambda req: httpx.Response(401, json={"error": {"message": "no"}})))
    r = c.post("/chat", json={"messages": [{"role": "user", "content": "سایه"}], "mode": "jung"})
    assert r.status_code == 503 and "کلید" in r.json()["detail"]["message"]


def test_psyche_profile_and_concepts_api():
    c = TestClient(app)
    p = c.post("/psyche/profile", json=BIRTH).json()
    assert p["kind"] == "interpretive" and p["persona"]["sign_fa"] == "حمل"
    assert p["shadow"]["candidates"] and p["chapter"]["stage"]
    assert c.get("/psyche/concepts", params={"q": "آنیما"}).json()["items"]


def test_typology_scoring_and_stack():
    qs = typology.questions()
    assert len(qs) == 16
    all_a = {i: "a" for i in range(16)}  # E, S, T, J -> ESTJ
    r = typology.score(all_a)
    assert r["code"] == "ESTJ" and r["function_stack"] == ["Te", "Si", "Ne", "Fi"]
    all_b = {i: "b" for i in range(16)}  # I, N, F, P -> INFP
    r = typology.score(all_b)
    assert r["code"] == "INFP" and r["function_stack"] == ["Fi", "Ne", "Si", "Te"]
    assert TestClient(app).post("/psyche/quiz/score", json={"answers": {"0": "a"}}).status_code == 422


# ----------------------------------------------------- positivity + styles + strengths
from backend.ai.positivity import StreamGuard, is_clean, sanitize  # noqa: E402


def test_style_detection_covers_all_seven_categories():
    cases = {
        "دلم گرفته و خیلی غمگینم": "comfort", "خیلی نگرانم و استرس دارم": "calm",
        "ناامید شدم از آینده": "hope", "درباره رابطه و عشق حرف بزنیم": "love",
        "انگیزه ندارم و گیر کردم": "nudge", "چه کار کنم؟ باید تصمیم بگیرم": "guide",
        "سلام امروز چطوری": "heart",
    }
    for text, style in cases.items():
        assert agents.detect_style(text) == style, text
    assert set(agents.STYLE_PROMPTS) == set(agents.STYLE_LABELS) == set(cases.values())


def test_every_style_prompt_reaches_the_model_and_requires_positivity(fake):
    c = TestClient(app)
    for style in agents.STYLE_PROMPTS:
        fake.calls.clear()
        r = c.post("/chat", json={"messages": [{"role": "user", "content": "سلام"}],
                                  "mode": "jung", "style": style})
        assert r.status_code == 200 and r.json()["style"] == style
        system = fake.calls[0]["body"]["messages"][0]["content"]
        assert "فقط مثبت" in system and agents.STYLE_PROMPTS[style][:15] in system


def test_positive_guard_removes_negative_sentences_but_keeps_empathy():
    ok = "نگرانی تو قابل‌فهم است. قدم کوچک بعدی را با هم می‌بینیم."
    assert sanitize(ok) == (ok, 0)
    bad = "تو می‌توانی ادامه بدهی. همه‌چیز نحس و فاجعه است. یک نفس عمیق بکش."
    out, dropped = sanitize(bad)
    assert dropped == 1 and "نحس" not in out and "نفس عمیق" in out
    assert is_clean("این حس غم نشان مهر توست") and not is_clean("سرنوشت بد در راه است")


def test_stream_guard_filters_across_chunk_boundaries():
    g = StreamGuard()
    pieces = ["تو قوی هستی. این روز", "ها بدبخت‌کننده اس", "ت. اما یک امید هست."]
    out = "".join(g.feed(p) for p in pieces) + g.flush()
    assert "بدبخت" not in out and "تو قوی هستی." in out and "امید" in out and g.dropped == 1


def test_negative_model_output_never_reaches_user(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-test")
    bad = {"choices": [{"message": {"content": "سلام عزیزم. سرنوشت شوم است. ولی تو توانمندی."}}]}
    monkeypatch.setattr(openrouter, "_transport", httpx.MockTransport(lambda r: httpx.Response(200, json=bad)))
    j = TestClient(app).post("/chat", json={"messages": [{"role": "user", "content": "سلام"}], "mode": "jung"}).json()
    assert "شوم" not in j["text"] and "توانمندی" in j["text"]


def test_chart_strengths_are_positive_and_grounded():
    from engine import compute_chart
    from engine.psyche import chart_strengths
    from backend.ai.positivity import is_clean as clean
    n = compute_chart(1993, 4, 17, 6.7, 3.5, 35.6892, 51.389)
    s = chart_strengths(n)
    assert any("زهره در برج" in x for x in s) and any("فصل فعلی" in x for x in s)
    assert all(clean(x) for x in s)


def test_chart_context_is_positively_framed(fake):
    r = TestClient(app).post("/chat", json={"messages": [{"role": "user", "content": "امروز چطور است؟"}],
                                            "birth": BIRTH, "mode": "astro"})
    assert r.status_code == 200
    ctx = " ".join(m["content"] for m in fake.calls[0]["body"]["messages"])
    assert "نقاط قوت و فرصت‌های چارت" in ctx and "محتاط" not in ctx


def test_invented_reference_footnotes_are_removed():
    text = "ماه در دلو است [A1]. یک نفس عمیق بکش.\n\n[A1]: ماه در دلو نشان‌دهنده تعلق است.\n[J2]: توضیح ساختگی"
    out, dropped = sanitize(text)
    assert "[A1]:" not in out and "[J2]:" not in out and "[A1]" in out and dropped == 2
    g = StreamGuard()
    streamed = g.feed("خوب است [J1].\n[J1]: ساختگی.\nپایان.") + g.flush()
    assert "[J1]:" not in streamed and "پایان." in streamed
