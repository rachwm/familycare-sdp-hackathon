import asyncio
from datetime import datetime
from services.websocket_manager import manager
from routes.reminders import active_reminders

async def start_reminder_scheduler():
    """Background task that checks the clock and broadcasts reminders."""
    while True:
        now = datetime.now().strftime("%H:%M")
        
        for reminder in active_reminders:
            # If the scheduled time matches current HH:MM
            if reminder.time == now:
                await manager.broadcast(
                    message_type="ROUTINE_REMINDER",
                    data=reminder.dict()
                )
                
        # Wait 60 seconds before checking again
        await asyncio.sleep(60)