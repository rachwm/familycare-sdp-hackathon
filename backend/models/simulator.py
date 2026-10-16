"""Request and response models for hardware-free demo scenarios."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from backend.models.events import FallEvent


FallSimulationScenario = Literal[
    "fall",
    "false_positive",
    "sitting",
    "lying_down",
    "exercise",
]


class FallSimulationRequest(BaseModel):
    """Scenario selected in the React Sensor Simulator."""

    scenario: FallSimulationScenario
    resident_id: str = Field(
        default="resident-01",
        min_length=1,
        max_length=100,
    )
    location: str = Field(
        default="living_room",
        min_length=1,
        max_length=100,
    )


class FallSimulationResponse(BaseModel):
    """Result returned to the React Sensor Simulator."""

    scenario: FallSimulationScenario
    event_created: bool
    message: str
    event: FallEvent | None = None
    detection: dict[str, Any] | None = None
