"""Retrieval-augmented knowledge bases (BM25, optional embedding rerank).

Sources are JSONL files, one chunk per line::

    {"id": "...", "title": "...", "text": "...", "tags": [...], "source": "...", "page": 12}

* ``knowledge/jung/*.jsonl``  — the project's own Jungian dataset (committed).
* ``knowledge/books/*.jsonl`` — chunks of the user's astrology books, produced
  locally by ``python -m backend.ai.ingest`` (git-ignored, never redistributed).

Retrieved text is *reference material*, never instructions (prompt-injection
safe: it is fenced and labelled as untrusted in the prompts).
"""
from __future__ import annotations

import json
import math
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

from .textutil import tokenize

ROOT = Path(__file__).resolve().parents[2]
KNOWLEDGE_DIR = ROOT / "knowledge"


@dataclass
class Chunk:
    id: str
    title: str
    text: str
    source: str = ""
    page: int | None = None
    tags: list[str] = field(default_factory=list)
    lang: str = "fa"


@dataclass
class Hit:
    chunk: Chunk
    score: float


class KnowledgeBase:
    """Small in-memory BM25 index (k1=1.4, b=0.75) with tag/title boosting."""

    def __init__(self, name: str, chunks: Iterable[Chunk] = ()):
        self.name = name
        self.chunks: list[Chunk] = []
        self._tf: list[Counter] = []
        self._df: Counter = Counter()
        self._len: list[int] = []
        for c in chunks:
            self.add(c)

    # --------------------------------------------------------------- building
    def add(self, chunk: Chunk) -> None:
        # title and tags are repeated so exact concept hits outrank passing mentions
        toks = tokenize(chunk.text) + tokenize(chunk.title) * 3 + \
            [t for tag in chunk.tags for t in tokenize(tag)] * 2
        tf = Counter(toks)
        self.chunks.append(chunk)
        self._tf.append(tf)
        self._len.append(len(toks))
        for t in tf:
            self._df[t] += 1

    def __len__(self) -> int:
        return len(self.chunks)

    @classmethod
    def from_jsonl(cls, name: str, paths: Iterable[Path]) -> "KnowledgeBase":
        kb = cls(name)
        for p in paths:
            with open(p, encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    d = json.loads(line)
                    kb.add(Chunk(
                        id=d["id"], title=d.get("title", ""), text=d["text"],
                        source=d.get("source", p.stem), page=d.get("page"),
                        tags=d.get("tags", []), lang=d.get("lang", "fa"),
                    ))
        return kb

    # ---------------------------------------------------------------- search
    def search(self, query: str, k: int = 5, min_score: float = 0.0) -> list[Hit]:
        q = tokenize(query, expand=True)
        if not q or not self.chunks:
            return []
        n = len(self.chunks)
        avg = sum(self._len) / n
        k1, b = 1.4, 0.75
        scores: list[tuple[float, int]] = []
        for i, tf in enumerate(self._tf):
            s = 0.0
            for term in set(q):
                f = tf.get(term)
                if not f:
                    continue
                idf = math.log(1 + (n - self._df[term] + 0.5) / (self._df[term] + 0.5))
                s += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * self._len[i] / avg))
            if s > min_score:
                scores.append((s, i))
        scores.sort(reverse=True)
        return [Hit(self.chunks[i], s) for s, i in scores[:k]]


def _jsonl(dirname: str) -> list[Path]:
    d = KNOWLEDGE_DIR / dirname
    return sorted(d.glob("*.jsonl")) if d.is_dir() else []


_cache: dict[str, KnowledgeBase] = {}


def jung_kb() -> KnowledgeBase:
    if "jung" not in _cache:
        _cache["jung"] = KnowledgeBase.from_jsonl("jung", _jsonl("jung"))
    return _cache["jung"]


def books_kb() -> KnowledgeBase:
    if "books" not in _cache:
        _cache["books"] = KnowledgeBase.from_jsonl("books", _jsonl("books"))
    return _cache["books"]


def reset_cache() -> None:
    _cache.clear()
