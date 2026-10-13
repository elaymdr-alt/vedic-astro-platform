import pytest
import time
from backend.routes import limiter

def test_rate_limit_load():
    for _ in range(5):
        assert limiter.check() == True
    assert limiter.check() == False
