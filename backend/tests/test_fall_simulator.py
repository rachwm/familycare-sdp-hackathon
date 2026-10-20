from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.routes.reminders import active_reminders
from backend.models.events import Reminder
from backend.services.incident_manager import incident_manager


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_incidents():
    """Give every test an empty incident store."""

    incident_manager._events.clear()
    yield
    incident_manager._events.clear()


def test_simulated_fall_creates_incident():
    response = client.post(
        "/api/simulator/fall",
        json={
            "scenario": "fall",
            "resident_id": "resident-01",
            "location": "living_room",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["event_created"] is True
    assert body["event"]["event_type"] == "possible_fall"
    assert body["event"]["simulation"] is True
    assert (
        body["event"]["status"]
        == "awaiting_resident_response"
    )
    assert len(incident_manager.list_events()) == 1


def test_false_positive_creates_check_in_incident():
    response = client.post(
        "/api/simulator/fall",
        json={"scenario": "false_positive"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["event_created"] is True
    assert body["event"]["simulation"] is True
    assert (
        body["event"]["details"]["source_file"]
        == "simulated_false_positive.json"
    )
    assert (
        body["event"]["details"]["evidence"]
        ["simulated_ground_truth"]
        == 0
    )


@pytest.mark.parametrize(
    "scenario",
    ["sitting", "lying_down", "exercise"],
)
def test_normal_activity_does_not_create_incident(
    scenario: str,
):
    response = client.post(
        "/api/simulator/fall",
        json={"scenario": scenario},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["event_created"] is False
    assert body["event"] is None
    assert body["detection"]["prediction"] == "not_fall"
    assert incident_manager.list_events() == []


def test_invalid_simulator_scenario_is_rejected():
    response = client.post(
        "/api/simulator/fall",
        json={"scenario": "jumping"},
    )

    assert response.status_code == 422


def test_demo_reset_clears_incidents_and_reminders():
    incident = client.post(
        "/api/simulator/fall",
        json={"scenario": "fall"},
    )
    assert incident.status_code == 200
    active_reminders.clear()
    active_reminders.append(
        Reminder(
            id="demo-reminder",
            time="12:00",
            message="Demo medication reminder",
            type="medication",
        )
    )

    response = client.post("/api/simulator/reset", json={})

    assert response.status_code == 200
    assert response.json() == {
        "status": "reset",
        "incidents_cleared": 1,
        "reminders_cleared": 1,
    }
    assert incident_manager.list_events() == []
    assert active_reminders == []


def test_activity_simulator_creates_connected_check_in():
    """Swagger demo route must create a fresh, actionable inactivity event."""
    response = client.post("/api/simulator/activity", json={})
    assert response.status_code == 200
    result = response.json()
    assert result["is_anomaly"] is True
    event_id = result["incident_id"]

    saved = client.get(f"/api/incidents/{event_id}")
    assert saved.status_code == 200
    incident = saved.json()
    assert incident["event_type"] == "unusual_activity"
    assert incident["anomaly_kind"] == "inactivity"
    assert incident["resident_id"] == "resident-01"
    assert incident["simulation"] is True
    assert incident["status"] == "awaiting_resident_response"
    assert incident["timestamp"] == result["timestamp"]

    decision = client.post(
        f"/api/incidents/{event_id}/response",
        json={"response": "resident_needs_help"},
    )
    assert decision.status_code == 200
    assert decision.json()["event"]["status"] == "resident_needs_help"
    assert decision.json()["event"]["requires_responder"] is True
