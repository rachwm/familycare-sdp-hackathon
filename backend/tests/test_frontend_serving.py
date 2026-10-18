"""Smoke checks for serving the built React app from one Render HTTPS origin."""

from fastapi.testclient import TestClient

import backend.main as server


def test_render_serves_react_index_deep_links_and_static_assets(monkeypatch, tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html><title>FamilyCare</title>", encoding="utf-8")
    assets = tmp_path / "assets"
    assets.mkdir()
    (assets / "app.js").write_text("console.log('familycare');", encoding="utf-8")
    monkeypatch.setattr(server, "FRONTEND_DIST", tmp_path)

    client = TestClient(server.app)
    assert "FamilyCare" in client.get("/").text
    assert "FamilyCare" in client.get("/companion").text
    assert "FamilyCare" in client.get("/coordinator").text
    assert "FamilyCare" in client.get("/responder").text
    assert "familycare" in client.get("/assets/app.js").text

    assert client.get("/assets/missing.js").status_code == 404
    assert client.get("/api/does-not-exist").status_code == 404
    assert client.get("/health").json()["status"] == "healthy"
