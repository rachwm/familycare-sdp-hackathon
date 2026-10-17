from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_websocket_connection():
    with client.websocket_connect("/ws") as websocket:
        # Connects successfully without raising errors
        assert websocket is not None