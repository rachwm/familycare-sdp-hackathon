from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_create_and_get_reminder():
    payload = {
        "id": "test-1",
        "time": "12:00",
        "message": "Take blood pressure medication",
        "type": "medication"
    }
    # Create reminder
    post_resp = client.post("/reminders", json=payload)
    assert post_resp.status_code == 200
    assert post_resp.json()["message"] == "Take blood pressure medication"
    
    # Get active reminders
    get_resp = client.get("/reminders")
    assert get_resp.status_code == 200
    assert len(get_resp.json()) > 0