import pytest

from backend import routes


@pytest.fixture(autouse=True)
def _fresh_rate_limiter():
    """The per-IP limiter is module state; without a reset, many tests that sign up
    from the same fake client trip it (429) and fail for unrelated reasons."""
    routes._hits.clear()
    yield
    routes._hits.clear()
