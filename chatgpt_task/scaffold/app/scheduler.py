import queue
import threading
import time
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import Job

# Jobs in these states still occupy time and can conflict with new ones.
ACTIVE_STATUSES = ("pending", "queued", "running")

# In-memory queue (simulates SQS for prototype)
job_queue: queue.Queue[int] = queue.Queue()


def local_to_utc(local_dt: datetime, tz_name: str) -> datetime:
    """Combine a naive wall-clock datetime with an IANA tz to get aware UTC."""
    return local_dt.replace(tzinfo=ZoneInfo(tz_name)).astimezone(UTC)


def get_time_bucket(local_dt: datetime, tz_name: str) -> str:
    """Hourly partition key, computed in UTC.

    The watcher polls in UTC, so the bucket must align with the UTC instant
    the job represents — not its wall-clock hour in the user's timezone.
    """
    return local_to_utc(local_dt, tz_name).strftime("%Y%m%d%H")


def job_utc_range(job: Job) -> tuple[datetime, datetime]:
    """Return the (start, end) UTC interval a job occupies."""
    start = local_to_utc(job.scheduled_at, job.timezone)
    return start, start + timedelta(minutes=job.duration_minutes)


def find_conflicts(
    db: Session,
    utc_start: datetime,
    utc_end: datetime,
    exclude_id: int | None = None,
) -> list[Job]:
    """Return active jobs whose UTC interval overlaps [utc_start, utc_end)."""
    active = db.query(Job).filter(Job.status.in_(ACTIVE_STATUSES)).all()
    out: list[Job] = []
    for j in active:
        if j.id == exclude_id:
            continue
        j_start, j_end = job_utc_range(j)
        if j_start < utc_end and utc_start < j_end:
            out.append(j)
    return out


def find_due_jobs(current_time_utc: datetime, db: Session) -> list[Job]:
    """Find pending jobs in the current UTC hour bucket whose local-time + tz is due."""
    bucket = current_time_utc.strftime("%Y%m%d%H")
    candidates = (
        db.query(Job)
        .filter(Job.time_bucket == bucket, Job.status == "pending")
        .all()
    )
    return [
        j for j in candidates
        if local_to_utc(j.scheduled_at, j.timezone) <= current_time_utc
    ]


def watcher_loop(interval: int = 10):
    """Watcher scans DB for due jobs and pushes them to the queue."""
    while True:
        db = SessionLocal()
        try:
            now = datetime.now(UTC)
            due_jobs = find_due_jobs(now, db)
            for job in due_jobs:
                job.status = "queued"
                db.commit()
                job_queue.put(job.id)
        finally:
            db.close()
        time.sleep(interval)


def worker_loop():
    """Worker pulls jobs from queue and executes them."""
    while True:
        job_id = job_queue.get()
        db = SessionLocal()
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job is None or job.status == "cancelled":
                continue

            job.status = "running"
            db.commit()

            # Simulate execution — in production this would call LLM
            job.result = f"Executed: {job.description}"
            job.status = "completed"
            db.commit()
        except Exception as e:
            job.status = "failed"
            job.result = str(e)
            db.commit()
        finally:
            db.close()
            job_queue.task_done()


def start_scheduler():
    """Start watcher and worker threads."""
    watcher = threading.Thread(target=watcher_loop, daemon=True)
    worker = threading.Thread(target=worker_loop, daemon=True)
    watcher.start()
    worker.start()
