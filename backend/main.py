from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.services.websocket_manager import manager
from backend.config import settings
from backend.routes.anomaly_events import router as anomaly_events_router
from backend.routes.fall_events import router as fall_events_router
from backend.routes.incidents import router as incidents_router
from backend.routes.reminders import router as reminders_router
from backend.routes.simulator import router as simulator_router


app = FastAPI(
    title=settings.app_name,
    description=settings.app_description,
    version=settings.app_version,
)


# Allow the local React application to access the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register all FamilyCare API routes.
app.include_router(fall_events_router)
app.include_router(incidents_router)
app.include_router(simulator_router)
app.include_router(anomaly_events_router)
app.include_router(reminders_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "status": "running",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "healthy",
        "version": settings.app_version,
        "environment": settings.environment,
        "timezone": settings.timezone,
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keeps connection open waiting for incoming messages/pings
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)