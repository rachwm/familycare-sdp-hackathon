from typing import List
import uuid

from fastapi import APIRouter

from backend.models.events import Reminder


router = APIRouter()

# In-memory storage for the hackathon prototype.
active_reminders: list[Reminder] = []


@router.post("/reminders", response_model=Reminder)
async def create_reminder(reminder: Reminder) -> Reminder:
    reminder.id = str(uuid.uuid4())
    active_reminders.append(reminder)
    return reminder


@router.get("/reminders", response_model=List[Reminder])
async def get_reminders() -> list[Reminder]:
    return active_reminders