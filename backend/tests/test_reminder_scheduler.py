from datetime import datetime

import pytest

from backend.models.events import Reminder
from backend.routes.reminders import active_reminders
from backend.services import reminder_scheduler
from backend.services.incident_manager import MALAYSIA_TIMEZONE


@pytest.fixture(autouse=True)
def clean_reminders():
    active_reminders.clear()
    reminder_scheduler._delivered_occurrences.clear()
    yield
    active_reminders.clear()
    reminder_scheduler._delivered_occurrences.clear()


@pytest.mark.asyncio
async def test_due_reminder_is_broadcast_once_per_day(monkeypatch):
    active_reminders.append(
        Reminder(
            id="medicine-1",
            time="09:00",
            message="Take medication",
            type="medication",
        )
    )
    broadcasts: list[tuple[str, dict]] = []

    async def fake_broadcast(message_type: str, data: dict):
        broadcasts.append((message_type, data))

    monkeypatch.setattr(reminder_scheduler.manager, "broadcast", fake_broadcast)
    now = datetime(2026, 10, 18, 9, 0, tzinfo=MALAYSIA_TIMEZONE)

    assert await reminder_scheduler.broadcast_due_reminders(now) == ["medicine-1"]
    assert await reminder_scheduler.broadcast_due_reminders(now) == []
    assert broadcasts == [("ROUTINE_REMINDER", {
        "id": "medicine-1",
        "time": "09:00",
        "message": "Take medication",
        "type": "medication",
    })]

    next_day = datetime(2026, 10, 19, 9, 0, tzinfo=MALAYSIA_TIMEZONE)
    assert await reminder_scheduler.broadcast_due_reminders(next_day) == ["medicine-1"]
