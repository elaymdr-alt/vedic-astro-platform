from backend import routes


def test_rate_limit_blocks_after_max_hits():
    routes._hits.clear()
    for _ in range(routes._RATE_MAX):
        assert routes._limited("1.2.3.4") is False
    assert routes._limited("1.2.3.4") is True
    assert routes._limited("5.6.7.8") is False  # another client is unaffected
