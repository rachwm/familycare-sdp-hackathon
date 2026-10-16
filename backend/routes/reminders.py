from fastapi import APIRouter
from models.events import Reminder
from typing import List
import uuid

router = APIRouter()

# In-memory store for the hackathon prototype
active_reminders = []

@router.post("/reminders", response_model=Reminder)
async def create_reminder(reminder: Reminder):
    reminder.id = str(uuid.uuid4())
    active_reminders.append(reminder)
    return reminder

@router.get("/reminders", response_model=List[Reminder])
async def get_reminders():
    return active_reminders