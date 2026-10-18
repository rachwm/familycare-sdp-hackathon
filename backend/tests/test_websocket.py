from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_websocket_connection():
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text("ping")
        assert websocket is not None


def test_anomaly_creation_is_broadcast_to_live_clients():
    payload = {
        "timestamp": "2026-10-18T09:00:00+08:00",
        "power_kw": 0.1,
        "water_lpm": 0,
        "inactivity_mins": 180,
        "door_transitions_15m": 0,
        "resident_state": "HOME",
        "simulation": True,
        "anomaly_kind": "inactivity",
    }
    with client.websocket_connect("/ws") as websocket:
        response = client.post("/utility-anomaly", json=payload)
        assert response.status_code == 200
        message = websocket.receive_json()
        assert message["type"] == "INCIDENT_CREATED"
        assert message["data"]["event_type"] == "unusual_activity"
