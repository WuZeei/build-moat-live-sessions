from datetime import UTC, datetime

from sqlalchemy import DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _utcnow() -> datetime:
    """Naive UTC datetime — used for system-clock timestamps (created_at/updated_at)."""
    return datetime.now(UTC).replace(tzinfo=None)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # Hourly partition key computed in UTC so the watcher (which polls in UTC)
    # can find due jobs without scanning the whole table.
    time_bucket: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # scheduled_at is wall-clock time in `timezone` (naive). Combine with
    # `timezone` to produce an aware datetime. This keeps schedules DST-safe:
    # "every 9:00 in NYC" stays 9:00 across spring-forward / fall-back.
    scheduled_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False)
    # Length of the task in minutes, used for conflict detection.
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, queued, running, completed, failed, cancelled
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, onupdate=_utcnow
    )

    __table_args__ = (
        Index("idx_bucket_status", "time_bucket", "status"),
    )
