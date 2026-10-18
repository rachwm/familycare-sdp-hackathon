import json
import os
import uuid
from pathlib import Path
from typing import List
from warnings import warn

from fastapi import APIRouter

from backend.models.events import Reminder


router = APIRouter()

REMINDER_STORE = (
    Path(os.getenv("FAMILYCARE_DATA_DIR", str(Path(__file__).resolve().parents[2] / "data" / "runtime")))
    / "reminders.json"
)


def _load_reminders() -> list[Reminder]:
    if not REMINDER_STORE.exists():
        return []
    try:
        saved = json.loads(REMINDER_STORE.read_text(encoding="utf-8"))
        if not isinstance(saved, list):
            raise ValueError("The reminder store must contain a list.")
        return [Reminder(**item) for item in saved]
    except (OSError, ValueError, TypeError) as error:
        warn(
            f"FamilyCare could not load its saved reminders: {error}",
            RuntimeWarning,
            stacklevel=2,
        )
        return []


def _save_reminders() -> None:
    if "PYTEST_CURRENT_TEST" in os.environ:
        return
    REMINDER_STORE.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = REMINDER_STORE.with_suffix(".tmp")
    payload = [
        reminder.model_dump()
        if hasattr(reminder, "model_dump")
        else reminder.dict()
        for reminder in active_reminders
    ]
    temporary_path.write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8",
    )
    temporary_path.replace(REMINDER_STORE)


active_reminders: list[Reminder] = _load_reminders()


def clear_reminders() -> int:
    """Remove all saved prototype reminders and return the number cleared."""

    cleared = len(active_reminders)
    active_reminders.clear()
    _save_reminders()
    return cleared


@router.post("/reminders", response_model=Reminder)
async def create_reminder(reminder: Reminder) -> Reminder:
    reminder.id = str(uuid.uuid4())
    active_reminders.append(reminder)
    _save_reminders()
    return reminder


@router.get("/reminders", response_model=List[Reminder])
async def get_reminders() -> list[Reminder]:
    return active_reminders
