"""Timezone tests (P05-T04/T06): IANA rules, DST gaps/folds, historical data.

Verified against tzdata 2026.x:
- Iran observed DST until 2022 (summer 2021 = +4:30, summer 2024 = +3:30).
- NY DST gap: 2021-03-14 02:30 does not exist.
- NY fold: 2021-11-07 01:30 occurs twice (fold 0 = -4:00, fold 1 = -5:00).
"""
from __future__ import annotations

import pytest

from engine.timezone import TimezoneError, local_to_utc


def test_tehran_winter_offset():
    r = local_to_utc(2021, 1, 1, 12, 0, "Asia/Tehran")
    assert r.utc_offset_hours == 3.5
    assert r.utc.isoformat() == "2021-01-01T08:30:00+00:00"
    assert r.ambiguous is False
    assert r.confidence == "standard"


def test_tehran_dst_summer_2021():
    r = local_to_utc(2021, 6, 1, 12, 0, "Asia/Tehran")
    assert r.utc_offset_hours == 4.5  # Iran DST active in 2021
    assert r.utc.isoformat() == "2021-06-01T07:30:00+00:00"


def test_tehran_no_dst_after_abolition():
    r = local_to_utc(2024, 6, 1, 12, 0, "Asia/Tehran")
    assert r.utc_offset_hours == 3.5  # DST abolished after 2022


def test_tehran_dst_gap_raises():
    # 2021-03-22 00:30 skipped when clocks jumped 00:00 -> 01:00
    with pytest.raises(TimezoneError) as e:
        local_to_utc(2021, 3, 22, 0, 30, "Asia/Tehran")
    assert e.value.code == "NON_EXISTENT_LOCAL_TIME"


def test_ny_dst_gap_raises():
    with pytest.raises(TimezoneError) as e:
        local_to_utc(2021, 3, 14, 2, 30, "America/New_York")
    assert e.value.code == "NON_EXISTENT_LOCAL_TIME"


def test_ny_ambiguous_requires_fold():
    with pytest.raises(TimezoneError) as e:
        local_to_utc(2021, 11, 7, 1, 30, "America/New_York")
    assert e.value.code == "AMBIGUOUS_LOCAL_TIME"
    # both candidate UTCs are offered so the UI can ask the user
    assert e.value.details["options"]["0"] == "2021-11-07T05:30:00+00:00"
    assert e.value.details["options"]["1"] == "2021-11-07T06:30:00+00:00"


def test_ny_ambiguous_fold_resolution():
    r0 = local_to_utc(2021, 11, 7, 1, 30, "America/New_York", fold=0)
    r1 = local_to_utc(2021, 11, 7, 1, 30, "America/New_York", fold=1)
    assert r0.utc_offset_hours == -4.0 and r1.utc_offset_hours == -5.0
    assert r0.ambiguous and r1.ambiguous
    assert r0.utc != r1.utc


def test_pre_1970_flagged_historical():
    r = local_to_utc(1960, 7, 1, 12, 0, "Asia/Tehran")
    assert r.confidence == "historical"
    assert r.utc.isoformat() == "1960-07-01T08:30:00+00:00"


def test_unknown_tz_code():
    with pytest.raises(TimezoneError) as e:
        local_to_utc(2000, 1, 1, 0, 0, "Mars/Olympus")
    assert e.value.code == "TZ_UNKNOWN"


def test_utc_day_boundary_rolls_back():
    # 00:00 Tehran (+3:30) on Jan 1 => Dec 31 20:30 UTC
    r = local_to_utc(2021, 1, 1, 0, 0, "Asia/Tehran")
    assert r.utc.isoformat() == "2020-12-31T20:30:00+00:00"


def test_leap_day_valid_and_invalid():
    ok = local_to_utc(2020, 2, 29, 12, 0, "Asia/Tehran")
    assert ok.utc.year == 2020
    with pytest.raises(ValueError):
        local_to_utc(2021, 2, 29, 12, 0, "Asia/Tehran")
