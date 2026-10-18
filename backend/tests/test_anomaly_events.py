from fastapi.testclient import TestClient
import pytest

from backend.main import app  # Assuming Member 1 sets up the main FastAPI app
from backend.services.incident_manager import incident_manager

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_incidents():
    incident_manager._events.clear()
    yield
    incident_manager._events.clear()

def test_normal_utility_event():
    payload = {
        "timestamp": "2026-10-16 08:30:00",
        "power_kw": 1.2,
        "water_lpm": 4.5,
        "inactivity_mins": 5,
        "door_transitions_15m": 6,
        "resident_state": "HOME"
    }
    response = client.post("/utility-anomaly", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_anomaly"] is False
    assert data["reason"] == "Normal activity"
    assert client.get("/api/incidents").json() == []


def test_inactivity_anomaly_creates_connected_check_in():
    payload = {
        "timestamp": "2026-10-18T09:00:00+08:00",
        "power_kw": 0.1,
        "water_lpm": 0,
        "inactivity_mins": 180,
        "door_transitions_15m": 0,
        "resident_state": "HOME",
        "resident_id": "resident-01",
        "location": "living_room",
        "simulation": True,
        "anomaly_kind": "inactivity",
    }

    detection = client.post("/utility-anomaly", json=payload)
    assert detection.status_code == 200
    result = detection.json()
    assert result["is_anomaly"] is True

    incident_id = result["incident_id"]
    incident = client.get(f"/api/incidents/{incident_id}").json()
    assert incident["event_type"] == "unusual_activity"
    assert incident["anomaly_kind"] == "inactivity"
    assert incident["status"] == "awaiting_resident_response"
    assert incident["simulation"] is True

    response = client.post(
        f"/api/incidents/{incident_id}/response",
        json={"response": "resident_okay"},
    )
    assert response.status_code == 200
    assert response.json()["event"]["status"] == "resolved"
