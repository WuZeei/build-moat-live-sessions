"""MCP server for the task scheduler.

Run as a stdio MCP server:
    python -m app.mcp_server

Or test with the inspector:
    npx @modelcontextprotocol/inspector python -m app.mcp_server
"""

import asyncio
import json
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Job
from .scheduler import find_conflicts, get_time_bucket, local_to_utc, start_scheduler

DEFAULT_TIMEZONE = "UTC"
DEFAULT_DURATION_MINUTES = 60


# ===================================================================
# Tool registration — decorator records handlers into _HANDLERS
# ===================================================================

ToolHandler = Callable[..., dict]
_HANDLERS: dict[str, ToolHandler] = {}


def tool(name: str) -> Callable[[ToolHandler], ToolHandler]:
    """Register `fn` as the handler for MCP tool `name`."""
    def decorator(fn: ToolHandler) -> ToolHandler:
        if name in _HANDLERS:
            raise ValueError(f"Tool {name!r} already registered")
        _HANDLERS[name] = fn
        return fn
    return decorator


# ===================================================================
# Timezone helpers — DB stores (naive local, tz id); watcher converts to UTC
# ===================================================================


def _resolve_zone(tz_name: str) -> ZoneInfo:
    """Resolve an IANA timezone name (e.g. 'Asia/Taipei'). Raises ValueError on unknown."""
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Unknown timezone: {tz_name}") from exc


def parse_local(time_str: str, user_tz: str) -> tuple[datetime, str]:
    """Parse ISO 8601 input → (naive local datetime, tz id).

    If the input carries an offset, rebase the wall-clock to user_tz so the
    stored value is consistent with the recorded tz id. Naive inputs are
    assumed to already be in user_tz.
    """
    zone = _resolve_zone(user_tz)
    dt = datetime.fromisoformat(time_str)
    if dt.tzinfo is not None:
        dt = dt.astimezone(zone)
    return dt.replace(tzinfo=None), user_tz


def format_local_in_tz(local_dt: datetime | None, stored_tz: str, view_tz: str) -> str | None:
    """Render a stored (naive local, stored_tz) value as ISO 8601 in view_tz."""
    if local_dt is None:
        return None
    aware = local_dt.replace(tzinfo=_resolve_zone(stored_tz))
    return aware.astimezone(_resolve_zone(view_tz)).isoformat()


def format_utc_in_tz(utc_dt: datetime | None, view_tz: str) -> str | None:
    """Render a naive UTC system timestamp in view_tz."""
    if utc_dt is None:
        return None
    return utc_dt.replace(tzinfo=UTC).astimezone(_resolve_zone(view_tz)).isoformat()


def _serialize_job(job: Job, view_tz: str) -> dict:
    end_local = (
        job.scheduled_at + timedelta(minutes=job.duration_minutes)
        if job.scheduled_at is not None
        else None
    )
    return {
        "job_id": job.id,
        "description": job.description,
        "status": job.status,
        "duration_minutes": job.duration_minutes,
        "scheduled_at": format_local_in_tz(job.scheduled_at, job.timezone, view_tz),
        "scheduled_end": format_local_in_tz(end_local, job.timezone, view_tz),
        "scheduled_at_source": {
            "local": job.scheduled_at.isoformat() if job.scheduled_at else None,
            "timezone": job.timezone,
        },
        "created_at": format_utc_in_tz(job.created_at, view_tz),
        "updated_at": format_utc_in_tz(job.updated_at, view_tz),
        "result": job.result,
    }


def _all_jobs(db: Session, view_tz: str) -> list[dict]:
    jobs = db.query(Job).order_by(Job.scheduled_at.desc()).all()
    return [_serialize_job(j, view_tz) for j in jobs]


# ===================================================================
# Tool handlers — pure business logic, sync, take a DB Session
# ===================================================================


@tool("task_create")
def handle_create_task(
    db: Session,
    *,
    description: str,
    scheduled_at: str,
    timezone: str = DEFAULT_TIMEZONE,
    duration_minutes: int = DEFAULT_DURATION_MINUTES,
) -> dict:
    """Create a new scheduled job; reject if it overlaps an active job.

    Stores (local time, tz id). Conflict check runs BEFORE insert: if any
    active job's UTC interval overlaps [start, start+duration), nothing is
    written and the response contains `error` + the conflicting jobs.
    """
    if duration_minutes <= 0:
        return {"error": "duration_minutes must be a positive integer"}
    local_dt, tz_id = parse_local(scheduled_at, timezone)
    utc_start = local_to_utc(local_dt, tz_id)
    utc_end = utc_start + timedelta(minutes=duration_minutes)

    conflicts = find_conflicts(db, utc_start, utc_end)
    if conflicts:
        descriptions = ", ".join(f"#{c.id} ({c.description})" for c in conflicts)
        return {
            "error": f"Time conflict with {len(conflicts)} existing job(s): {descriptions}. Nothing was scheduled.",
            "view_timezone": timezone,
            "conflicts": [_serialize_job(c, timezone) for c in conflicts],
            "jobs": _all_jobs(db, timezone),
        }

    job = Job(
        description=description,
        scheduled_at=local_dt,
        timezone=tz_id,
        duration_minutes=duration_minutes,
        time_bucket=get_time_bucket(local_dt, tz_id),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {
        "view_timezone": timezone,
        "created": _serialize_job(job, timezone),
        "jobs": _all_jobs(db, timezone),
        "conflicts": [],
    }


@tool("task_status")
def handle_get_status(
    db: Session,
    *,
    job_id: int,
    timezone: str = DEFAULT_TIMEZONE,
) -> dict:
    """Get the status of a scheduled job, with times formatted in `timezone`."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        return {"error": f"Job {job_id} not found"}
    return {"view_timezone": timezone, **_serialize_job(job, timezone)}


@tool("task_list")
def handle_list_tasks(db: Session, *, timezone: str = DEFAULT_TIMEZONE) -> dict:
    """List all scheduled jobs, with times formatted in `timezone`."""
    return {"view_timezone": timezone, "jobs": _all_jobs(db, timezone)}


@tool("task_cancel")
def handle_cancel_task(
    db: Session,
    *,
    job_id: int,
    timezone: str = DEFAULT_TIMEZONE,
) -> dict:
    """Cancel a scheduled job."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None:
        return {"error": f"Job {job_id} not found"}
    if job.status in ("completed", "failed"):
        return {"error": f"Cannot cancel job in '{job.status}' state"}
    job.status = "cancelled"
    db.commit()
    db.refresh(job)
    return {"view_timezone": timezone, **_serialize_job(job, timezone)}


# ===================================================================
# Tool definitions — what Claude / MCP client sees
# (pre-filled — boilerplate for MCP discovery, not the focus)
# ===================================================================

_TIMEZONE_PROP = {
    "type": "string",
    "description": (
        "IANA timezone name used to interpret naive inputs and to format outputs "
        "(e.g. 'Asia/Taipei', 'America/Los_Angeles'). Defaults to 'UTC'."
    ),
    "default": DEFAULT_TIMEZONE,
}

TOOL_DEFINITIONS: list[Tool] = [
    Tool(
        name="task_create",
        description=(
            "Schedule a new task. Stores (local time, timezone id) and returns the "
            "created job, the full job list, plus any conflicting active jobs whose "
            "[start, start+duration) UTC interval overlaps this one."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "description": {
                    "type": "string",
                    "description": "What the task should do",
                },
                "scheduled_at": {
                    "type": "string",
                    "format": "date-time",
                    "description": (
                        "When to run, ISO 8601. If it carries an offset "
                        "(e.g. 2026-05-03T10:00:00+08:00) the wall-clock will be "
                        "rebased to `timezone`; otherwise the value is interpreted "
                        "as wall-clock time in `timezone` directly."
                    ),
                },
                "timezone": _TIMEZONE_PROP,
                "duration_minutes": {
                    "type": "integer",
                    "minimum": 1,
                    "default": DEFAULT_DURATION_MINUTES,
                    "description": (
                        "Length of the task in minutes (default 60). Used for "
                        "conflict detection against other active jobs."
                    ),
                },
            },
            "required": ["description", "scheduled_at"],
        },
    ),
    Tool(
        name="task_list",
        description="List all scheduled tasks with times formatted in `timezone`.",
        inputSchema={
            "type": "object",
            "properties": {"timezone": _TIMEZONE_PROP},
        },
    ),
    Tool(
        name="task_status",
        description="Get the status of a scheduled task by job_id, formatted in `timezone`.",
        inputSchema={
            "type": "object",
            "properties": {
                "job_id": {"type": "integer", "description": "The job ID returned by task_create"},
                "timezone": _TIMEZONE_PROP,
            },
            "required": ["job_id"],
        },
    ),
    Tool(
        name="task_cancel",
        description="Cancel a scheduled task that hasn't completed yet.",
        inputSchema={
            "type": "object",
            "properties": {
                "job_id": {"type": "integer", "description": "The job ID to cancel"},
                "timezone": _TIMEZONE_PROP,
            },
            "required": ["job_id"],
        },
    ),
]


# ===================================================================
# Dispatch — look up handler registered via @tool(...)
# ===================================================================


def route_tool_call(tool_name: str, arguments: dict, db: Session) -> dict:
    """Single dispatch point — look up handler in _HANDLERS and call it.

    Handlers register themselves via the @tool(name) decorator at definition
    time, so adding a new tool is a one-line change (the decorator) and no
    central registry needs editing.
    """
    handler = _HANDLERS.get(tool_name)
    if handler is None:
        return {"error": f"Unknown tool: {tool_name}"}
    return handler(db, **arguments)


# ===================================================================
# MCP server wiring — boilerplate, do not modify
# ===================================================================

server: Server = Server("task-scheduler")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return TOOL_DEFINITIONS


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Async wrapper — runs the sync handler in a thread to avoid blocking the event loop."""
    db = SessionLocal()
    try:
        result = await asyncio.to_thread(route_tool_call, name, arguments or {}, db)
    finally:
        db.close()
    return [TextContent(type="text", text=json.dumps(result, default=str, ensure_ascii=False))]


# ===================================================================
# Entry point — `python -m app.mcp_server`
# ===================================================================


async def main() -> None:
    Base.metadata.create_all(bind=engine)
    start_scheduler()

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
