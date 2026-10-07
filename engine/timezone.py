"""IANA timezone conversion with historical rules — P05-T04/T05/T06.

Contract:
- Local wall time is converted with the zoneinfo/tzdb rules (DST, folds, gaps).
- Non-existent local time (DST gap)  -> TimecodeError NON_EXISTENT_LOCAL_TIME.
- Ambiguous local time (repeated hour) -> requires an explicit ``fold``
  (0 = first occurrence / DST, 1 = second occurrence); otherwise
  AMBIGUOUS_LOCAL_TIME so an unresolved time never reaches the engine
  (P05 acceptance criterion).
- Dates before 1970 are returned with confidence="historical" (tzdb coverage
  is limited before 1970 — see https://ftp.iana.org/tz/theory.html).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class TimezoneError(Exception):
    """Structured timezone error (code + Persian message)."""

    def __init__(self, code: str, message: str, details: dict | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


@dataclass
class LocalTimeConversion:
    tz: str
    local: datetime          # wall time as entered (naive)
    utc: datetime            # timezone-aware UTC
    fold: int                # 0 or 1 — which occurrence was used
    utc_offset_hours: float  # offset applied (e.g. 3.5 or 4.5)
    ambiguous: bool          # wall time existed twice
    confidence: str          # "standard" (>=1970) | "historical" (<1970)


def resolve_timezone(tz: str) -> ZoneInfo:
    try:
        return ZoneInfo(tz)
    except (ZoneInfoNotFoundError, ValueError, KeyError, OSError) as exc:
        raise TimezoneError(
            "TZ_UNKNOWN",
            f"منطقه زمانی ناشناخته: {tz}",
            {"tz": tz},
        ) from exc


def _roundtrip(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).astimezone(dt.tzinfo).replace(tzinfo=None)


def local_to_utc(
    year: int, month: int, day: int, hour: int, minute: int,
    tz: str, fold: int | None = None,
) -> LocalTimeConversion:
    """Convert naive local wall time in ``tz`` to UTC using tzdb rules.

    Raises TimecodeError NON_EXISTENT_LOCAL_TIME / AMBIGUOUS_LOCAL_TIME.
    ``fold`` must be given by the caller to resolve an ambiguous wall time.
    """
    zone = resolve_timezone(tz)
    naive = datetime(year, month, day, hour, minute)

    d0 = naive.replace(tzinfo=zone, fold=0)
    d1 = naive.replace(tzinfo=zone, fold=1)
    utc0 = d0.astimezone(timezone.utc)
    utc1 = d1.astimezone(timezone.utc)

    back0 = _roundtrip(d0)
    back1 = _roundtrip(d1)
    if back0 != naive and back1 != naive:
        # DST gap: the wall time never happened (P05-T04-M3).
        raise TimezoneError(
            "NON_EXISTENT_LOCAL_TIME",
            "این ساعت در این تاریخ وجود ندارد (جابه‌جایی ساعت رسمی). ساعت دیگری انتخاب کنید.",
            {
                "tz": tz,
                "local": naive.isoformat(),
                "candidates": [
                    (naive.replace(hour=(naive.hour + 1) % 24)).isoformat(),
                ],
            },
        )

    ambiguous = utc0 != utc1
    if ambiguous and fold is None:
        # Repeated hour without a chosen fold must not reach the engine (P05-T04-M2).
        raise TimezoneError(
            "AMBIGUOUS_LOCAL_TIME",
            "این ساعت در این تاریخ دو بار تکرار می‌شود؛ fold (۰ یا ۱) را مشخص کنید.",
            {
                "tz": tz,
                "local": naive.isoformat(),
                "options": {
                    "0": utc0.isoformat(),
                    "1": utc1.isoformat(),
                },
            },
        )

    chosen_fold = (1 if fold else 0) if ambiguous else int(fold or 0)
    utc = utc1 if chosen_fold else utc0
    aware = naive.replace(tzinfo=zone, fold=chosen_fold)
    offset_hours = aware.utcoffset().total_seconds() / 3600.0  # type: ignore[union-attr]

    return LocalTimeConversion(
        tz=tz,
        local=naive,
        utc=utc,
        fold=chosen_fold,
        utc_offset_hours=offset_hours,
        ambiguous=ambiguous,
        confidence="standard" if year >= 1970 else "historical",
    )


def offset_hours_at(year: int, month: int, day: int, hour: int, minute: int,
                    tz: str) -> float:
    """UTC offset in hours for a local wall time (unambiguous contexts only)."""
    zone = resolve_timezone(tz)
    naive = datetime(year, month, day, hour, minute)
    off = naive.replace(tzinfo=zone).utcoffset()
    if off is None:  # pragma: no cover — zoneinfo always returns an offset
        raise TimezoneError("TZ_UNKNOWN", "منطقه زمانی قابل استفاده نیست", {"tz": tz})
    return off.total_seconds() / 3600.0
