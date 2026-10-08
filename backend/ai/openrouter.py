"""Minimal OpenRouter client (OpenAI-compatible chat completions, SSE streaming).

Configuration (environment only — keys are never stored in the repo):

* ``OPENROUTER_API_KEY``  required
* ``OPENROUTER_MODEL``    default ``anthropic/claude-sonnet-4.5`` (any OpenRouter model id)
* ``OPENROUTER_BASE_URL`` default ``https://openrouter.ai/api/v1``
* ``OPENROUTER_REFERER`` / ``OPENROUTER_TITLE`` optional attribution headers
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncIterator

import httpx

DEFAULT_MODEL = "anthropic/claude-sonnet-4.5"
DEFAULT_BASE = "https://openrouter.ai/api/v1"

# tests inject an httpx.MockTransport here
_transport: httpx.AsyncBaseTransport | None = None


class OpenRouterError(RuntimeError):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


@dataclass
class Settings:
    api_key: str
    model: str
    base_url: str
    referer: str
    title: str


def _load_dotenv() -> None:
    """Load KEY=VALUE pairs from the project-root ``.env`` (git-ignored); real env wins."""
    path = Path(__file__).resolve().parents[2] / ".env"
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except OSError:
        pass


_load_dotenv()


def settings() -> Settings:
    return Settings(
        api_key=os.environ.get("OPENROUTER_API_KEY", "").strip(),
        model=os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL),
        base_url=os.environ.get("OPENROUTER_BASE_URL", DEFAULT_BASE).rstrip("/"),
        referer=os.environ.get("OPENROUTER_REFERER", "https://astrobinesh.local"),
        title=os.environ.get("OPENROUTER_TITLE", "AstroBinesh"),
    )


def configured() -> bool:
    return bool(settings().api_key)


def _headers(s: Settings) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {s.api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": s.referer,
        "X-Title": s.title,
    }


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0), transport=_transport)


def _payload(messages: list[dict], model: str | None, temperature: float, max_tokens: int,
             stream: bool) -> dict:
    s = settings()
    return {"model": model or s.model, "messages": messages, "temperature": temperature,
            "max_tokens": max_tokens, "stream": stream}


def _raise_for(resp: httpx.Response) -> None:
    if resp.status_code < 400:
        return
    try:
        detail = resp.json().get("error", {}).get("message") or resp.text[:200]
    except Exception:  # noqa: BLE001 — body is not JSON
        detail = resp.text[:200]
    if resp.status_code == 401:
        raise OpenRouterError("کلید OpenRouter نامعتبر است.", 503)
    if resp.status_code == 402:
        raise OpenRouterError("اعتبار حساب OpenRouter کافی نیست.", 503)
    if resp.status_code == 429:
        raise OpenRouterError("درخواست‌ها به OpenRouter زیاد است؛ کمی بعد دوباره تلاش کنید.", 429)
    raise OpenRouterError(f"خطای OpenRouter ({resp.status_code}): {detail}", 502)


async def complete(messages: list[dict], *, model: str | None = None, temperature: float = 0.6,
                   max_tokens: int = 900) -> str:
    s = settings()
    if not s.api_key:
        raise OpenRouterError("OPENROUTER_API_KEY تنظیم نشده است.", 503)
    async with _client() as c:
        try:
            r = await c.post(f"{s.base_url}/chat/completions", headers=_headers(s),
                             json=_payload(messages, model, temperature, max_tokens, False))
        except httpx.HTTPError as exc:
            raise OpenRouterError(f"ارتباط با OpenRouter برقرار نشد: {exc.__class__.__name__}", 502)
        _raise_for(r)
        try:
            return r.json()["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, ValueError):
            raise OpenRouterError("پاسخ نامعتبر از OpenRouter.", 502)


async def stream(messages: list[dict], *, model: str | None = None, temperature: float = 0.6,
                 max_tokens: int = 1200) -> AsyncIterator[str]:
    s = settings()
    if not s.api_key:
        raise OpenRouterError("OPENROUTER_API_KEY تنظیم نشده است.", 503)
    async with _client() as c:
        try:
            async with c.stream("POST", f"{s.base_url}/chat/completions", headers=_headers(s),
                                json=_payload(messages, model, temperature, max_tokens, True)) as r:
                if r.status_code >= 400:
                    await r.aread()
                    _raise_for(r)
                async for line in r.aiter_lines():
                    if not line.startswith("data:"):
                        continue  # SSE comments / keep-alives (": OPENROUTER PROCESSING")
                    data = line[5:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        delta = json.loads(data)["choices"][0]["delta"].get("content")
                    except (KeyError, IndexError, ValueError):
                        continue
                    if delta:
                        yield delta
        except httpx.HTTPError as exc:
            raise OpenRouterError(f"ارتباط با OpenRouter قطع شد: {exc.__class__.__name__}", 502)
