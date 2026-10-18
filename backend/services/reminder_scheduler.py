import asyncio
from datetime import datetime

from backend.routes.reminders import active_reminders
from backend.services.incident_manager import MALAYSIA_TIMEZONE
from backend.services.websocket_manager import manager


_delivered_occurrences: set[tuple[str, str, str]] = set()


async def broadcast_due_reminders(
    now: datetime | None = None,
) -> list[str]:
    """Broadcast each reminder at most once for its scheduled minute."""
    current = now or datetime.now(MALAYSIA_TIMEZONE)
    current_time = current.strftime("%H:%M")
    current_date = current.date().isoformat()
    delivered_ids: list[str] = []

    for reminder in active_reminders:
        occurrence = (reminder.id, current_date, reminder.time)
        if reminder.time != current_time or occurrence in _delivered_occurrences:
            continue

        data = (
            reminder.model_dump()
            if hasattr(reminder, "model_dump")
            else reminder.dict()
        )
        await manager.broadcast(
            message_type="ROUTINE_REMINDER",
            data=data,
        )
        _delivered_occurrences.add(occurrence)
        delivered_ids.append(reminder.id)

    return delivered_ids


async def start_reminder_scheduler(
    interval_seconds: float = 15.0,
) -> None:
    """Background task that checks the clock and broadcasts reminders."""
    while True:
        await broadcast_due_reminders()
        await asyncio.sleep(interval_seconds)
