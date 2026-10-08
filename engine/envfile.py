"""Tiny ``.env`` loader (project root, git-ignored). Real environment variables win."""
from __future__ import annotations

import os
from pathlib import Path

_done = False


def load_dotenv() -> None:
    global _done
    if _done:
        return
    _done = True
    path = Path(__file__).resolve().parents[1] / ".env"
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    except OSError:
        pass
