from fastapi.testclient import TestClient
from main import app  # Assuming Member 1 sets up the main FastAPI app

client = TestClient(app)

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