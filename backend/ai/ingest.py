"""Turn the user's astrology PDFs into local RAG chunks.

    python -m backend.ai.ingest "D:/book_en.pdf" "D:/book_fa.pdf" [--lang en|fa]

Output: ``knowledge/books/<slug>.jsonl`` (git-ignored — copyrighted text stays
local). Chunks are ~170 words with ~30 words of overlap, split on paragraphs,
and keep their page number so answers can cite pages.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

from .rag import KNOWLEDGE_DIR

CHUNK_WORDS = 170
OVERLAP_WORDS = 30
_FA = re.compile(r"[\u0600-\u06FF]")


def _slug(path: Path) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", path.stem).strip("-").lower()[:40]
    digest = hashlib.sha1(path.stem.encode("utf-8")).hexdigest()[:6]
    return f"{s}-{digest}" if s else f"book-{digest}"


def detect_lang(sample: str) -> str:
    fa = len(_FA.findall(sample))
    return "fa" if fa > len(sample) * 0.12 else "en"


def clean_page(text: str) -> str:
    text = re.sub(r"\.{4,}", " ", text)          # table-of-contents leaders
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


def chunk_pages(pages: list[tuple[int, str]], source: str, lang: str, slug: str) -> list[dict]:
    chunks: list[dict] = []
    buf: list[str] = []
    buf_pages: list[int] = []

    def flush():
        if not buf:
            return
        words = " ".join(buf).split()
        text = " ".join(words)
        if len(words) >= 25:  # drop page-number-only / header crumbs
            chunks.append({
                "id": f"{slug}-{len(chunks):05d}", "title": f"{source} — ص {buf_pages[0]}",
                "text": text, "source": source, "page": buf_pages[0], "lang": lang, "tags": [],
            })

    for page_no, text in pages:
        for para in re.split(r"\n\s*\n", clean_page(text)):
            words = para.split()
            if not words:
                continue
            buf.append(" ".join(words))
            buf_pages.append(page_no)
            if sum(len(b.split()) for b in buf) >= CHUNK_WORDS:
                flush()
                tail = " ".join(" ".join(buf).split()[-OVERLAP_WORDS:])
                buf[:] = [tail]
                buf_pages[:] = [page_no]
    flush()
    return chunks


def ingest_pdf(path: Path, lang: str | None = None) -> Path:
    import pymupdf  # imported lazily: only needed for ingestion

    doc = pymupdf.open(str(path))
    pages = [(i + 1, doc[i].get_text()) for i in range(len(doc))]
    sample = " ".join(t for _, t in pages)[:60000]
    lang = lang or detect_lang(sample)
    slug = _slug(path) + f"-{lang}"
    chunks = chunk_pages(pages, source=path.stem[:60], lang=lang, slug=slug)
    out = KNOWLEDGE_DIR / "books" / f"{slug}.jsonl"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        for c in chunks:
            fh.write(json.dumps(c, ensure_ascii=False) + "\n")
    print(f"{path.name}: {len(pages)} pages -> {len(chunks)} chunks ({lang}) -> {out}")
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pdfs", nargs="+")
    ap.add_argument("--lang", choices=["en", "fa"])
    args = ap.parse_args(argv)
    for p in args.pdfs:
        ingest_pdf(Path(p), args.lang)
    return 0


if __name__ == "__main__":
    sys.exit(main())
