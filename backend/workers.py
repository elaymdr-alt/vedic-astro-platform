"""Process-isolated execution for heavy engine jobs.

Swiss Ephemeris keeps process-global state. Running heavy computations
(rectification scans hundreds of charts) in a separate *process* gives each
job its own copy of that state and keeps the API event loop responsive.
The pool is created lazily and reused; ``ISOLATED_WORKERS=0`` runs inline
(used by tests that monkeypatch engine functions).
"""
from __future__ import annotations

import asyncio
import os
from concurrent.futures import ProcessPoolExecutor
from typing import Any, Callable

_pool: ProcessPoolExecutor | None = None
JOB_TIMEOUT_S = 180.0


def _get_pool() -> ProcessPoolExecutor:
    global _pool
    if _pool is None:
        _pool = ProcessPoolExecutor(max_workers=max(1, min(2, (os.cpu_count() or 2) - 1)))
    return _pool


async def run_isolated(fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    if os.environ.get("ISOLATED_WORKERS", "1") == "0":
        return fn(*args, **kwargs)
    loop = asyncio.get_running_loop()
    fut = loop.run_in_executor(_get_pool(), _call, fn, args, kwargs)
    return await asyncio.wait_for(fut, JOB_TIMEOUT_S)


def _call(fn: Callable[..., Any], args: tuple, kwargs: dict) -> Any:
    return fn(*args, **kwargs)


def shutdown() -> None:
    global _pool
    if _pool is not None:
        _pool.shutdown(wait=False, cancel_futures=True)
        _pool = None
