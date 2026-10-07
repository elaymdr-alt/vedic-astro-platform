"""Calendar tests (TEST-calendar): Jalali edges incl. Esfand 30 leap/non-leap."""
from engine.calendar import (
    gregorian_to_jalali, is_valid_jalali, jalali_to_gregorian,
)


def test_jalali_known_anchor():
    # 1 Farvardin 1403 == 20 Mar 2024
    assert jalali_to_gregorian(1403, 1, 1) == (2024, 3, 20)


def test_roundtrip():
    g = jalali_to_gregorian(1375, 5, 12)
    assert gregorian_to_jalali(*g) == (1375, 5, 12)


def test_esfand_30_nonleap_invalid():
    # 1403 is leap (Esfand 30 valid); 1402 is not
    assert is_valid_jalali(1403, 12, 30) is True
    assert is_valid_jalali(1402, 12, 30) is False


def test_gregorian_known_anchor():
    assert gregorian_to_jalali(2024, 3, 20) == (1403, 1, 1)
