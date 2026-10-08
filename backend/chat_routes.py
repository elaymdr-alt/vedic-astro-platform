"""Chat (astrologer + Jungian psychologist), psyche profile, typology quiz."""
from __future__ import annotations

import json
import time
from datetime import date as _date
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.ai import agents, openrouter, rag, typology
from backend.schemas import BirthInput
from engine.psyche import psyche_profile

router = APIRouter(tags=["chat"])

_RATE_WINDOW, _RATE_MAX = 60.0, 30
_hits: dict[str, list[float]] = {}


def _limited(key: str) -> bool:
    now = time.monotonic()
    hits = [t for t in _hits.get(key, []) if now - t < _RATE_WINDOW]
    if len(hits) >= _RATE_MAX:
        _hits[key] = hits
        return True
    hits.append(now)
    _hits[key] = hits
    if len(_hits) > 5000:
        _hits.clear()
    return False


def _guard(request: Request) -> None:
    ip = (request.headers.get("x-forwarded-for", "").split(",")[0].strip()
          or (request.client.host if request.client else "local"))
    if _limited(ip):
        raise HTTPException(status_code=429, detail={
            "code": "RATE_LIMITED", "message": "تعداد درخواست‌ها زیاد است؛ یک دقیقه بعد دوباره تلاش کنید."})


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=4000)


class ChatIn(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=40)
    birth: BirthInput | None = None
    mode: Literal["auto", "astro", "jung", "both"] = "auto"
    style: Literal["auto", "hope", "love", "nudge", "guide", "calm", "comfort", "heart"] = "auto"
    date: str | None = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")


def _turn(body: ChatIn) -> agents.Turn:
    if body.messages[-1].role != "user":
        raise HTTPException(status_code=422, detail={
            "code": "LAST_MESSAGE_MUST_BE_USER", "message": "آخرین پیام باید از کاربر باشد."})
    natal = None
    tz_offset, lat, lon = 3.5, 35.69, 51.39
    if body.birth:
        from backend.main import _build_chart  # late import: main includes this router
        natal = _build_chart(body.birth)
        tz_offset, lat, lon = body.birth.tz_offset, body.birth.lat, body.birth.lon
    try:
        day = _date.fromisoformat(body.date) if body.date else _date.today()
    except ValueError:
        raise HTTPException(status_code=422, detail={"code": "INVALID_DATE", "message": "تاریخ نامعتبر"})
    return agents.Turn(messages=[m.model_dump() for m in body.messages], natal=natal, mode=body.mode, style=body.style,
                       today=day, tz_offset=tz_offset, lat=lat, lon=lon)


def _no_key_http() -> HTTPException:
    return HTTPException(status_code=503, detail={
        "code": "AI_NOT_CONFIGURED",
        "message": "دستیار هوشمند هنوز فعال نشده است: متغیر محیطی OPENROUTER_API_KEY را تنظیم کنید."})


@router.get("/chat/status")
def chat_status() -> dict:
    s = openrouter.settings()
    return {"configured": bool(s.api_key), "model": s.model,
            "knowledge": {"astrology_book_chunks": len(rag.books_kb()), "jung_concepts": len(rag.jung_kb())}}


@router.post("/chat")
async def chat(body: ChatIn, request: Request) -> dict:
    _guard(request)
    turn = _turn(body)
    if not openrouter.configured() and not agents.prepare(turn).crisis:
        raise _no_key_http()
    try:
        return await agents.run(turn)
    except openrouter.OpenRouterError as exc:
        raise HTTPException(status_code=exc.status, detail={"code": "AI_FAILED", "message": str(exc)})


@router.post("/chat/stream")
async def chat_stream(body: ChatIn, request: Request) -> StreamingResponse:
    _guard(request)
    turn = _turn(body)
    if not openrouter.configured() and not agents.prepare(turn).crisis:
        raise _no_key_http()

    async def gen():
        try:
            async for ev in agents.run_stream(turn):
                name = ev.pop("event")
                yield f"event: {name}\ndata: {json.dumps(ev, ensure_ascii=False)}\n\n"
        except openrouter.OpenRouterError as exc:
            yield f"event: error\ndata: {json.dumps({'message': str(exc)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ------------------------------------------------------------------- psyche
@router.post("/psyche/profile")
def psyche_profile_endpoint(body: BirthInput) -> dict:
    from backend.main import _build_chart
    return psyche_profile(_build_chart(body))


@router.get("/psyche/concepts")
def psyche_concepts(q: str = "", limit: int = 6) -> dict:
    kb = rag.jung_kb()
    limit = max(1, min(limit, 20))
    if not q.strip():
        return {"items": [{"id": c.id, "title": c.title, "text": c.text, "tags": c.tags}
                          for c in kb.chunks[:limit]], "total": len(kb)}
    return {"items": [{"id": h.chunk.id, "title": h.chunk.title, "text": h.chunk.text,
                       "tags": h.chunk.tags, "score": round(h.score, 2)} for h in kb.search(q, limit)],
            "total": len(kb)}


class QuizIn(BaseModel):
    answers: dict[int, Literal["a", "b"]] = Field(..., min_length=8)


@router.get("/psyche/quiz")
def quiz_questions() -> dict:
    return {"items": typology.questions()}


@router.post("/psyche/quiz/score")
def quiz_score(body: QuizIn) -> dict:
    try:
        return typology.score(body.answers)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail={"code": "INVALID_ANSWERS", "message": str(exc)})
