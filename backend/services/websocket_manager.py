import json
from typing import List

from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message_type: str, data: dict):
        """Broadcasts real-time events to all connected frontend dashboards."""
        payload = json.dumps({"type": message_type, "data": data})
        dropped_connections: list[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                dropped_connections.append(connection)
        for connection in dropped_connections:
            self.disconnect(connection)

# Global instance to be imported by your routes
manager = ConnectionManager()
