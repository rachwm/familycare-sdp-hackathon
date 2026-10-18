from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_websocket_connection():
    with client.websocket_connect("/ws") as websocket:
        websocket.send_text("ping")
        assert websocket is not None