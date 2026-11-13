import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

import server

@pytest.fixture
def client():
    return TestClient(server.app)

def test_api_root(client):
    response = client.get("/api/")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "online"

def test_api_config(client):
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert data.get("version") == "2.0.0"
    assert data.get("auth_enabled") is True
    assert "pose-tracking" in data.get("features", [])

def test_auth_signin_default_user(client):
    response = client.post("/api/auth/signin", json={
        "email": "alex.rivera@athletic.io",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["email"] == "alex.rivera@athletic.io"

def test_auth_signin_invalid_credentials(client):
    response = client.post("/api/auth/signin", json={
        "email": "alex.rivera@athletic.io",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_auth_signup_and_me(client):
    import uuid
    random_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    signup_res = client.post("/api/auth/signup", json={
        "email": random_email,
        "password": "securepassword123",
        "name": "Athletic Runner"
    })
    assert signup_res.status_code == 200
    signup_data = signup_res.json()
    token = signup_data["token"]
    assert signup_data["user"]["name"] == "Athletic Runner"

    # Test auth me with valid token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == random_email

    # Test auth me with invalid token
    invalid_res = client.get("/api/auth/me", headers={"Authorization": "Bearer fake-token-999"})
    assert invalid_res.status_code == 401

def test_sessions_create_and_get(client):
    session_data = {
        "exercise_id": "workout-1",
        "name": "Bodyweight Squats",
        "category": "Home Workout",
        "duration_seconds": 180,
        "reps": 20,
        "calories": 25,
        "accuracy": 95
    }
    post_res = client.post("/api/sessions", json=session_data)
    assert post_res.status_code == 200
    created = post_res.json()
    assert created["exercise_id"] == "workout-1"
    assert created["reps"] == 20

    get_res = client.get("/api/sessions?limit=10")
    assert get_res.status_code == 200
    sessions = get_res.json()
    assert len(sessions) >= 1
    assert any(s["exercise_id"] == "workout-1" for s in sessions)

def test_status_checks(client):
    post_res = client.post("/api/status", json={"client_name": "pytest-runner"})
    assert post_res.status_code == 200
    get_res = client.get("/api/status?limit=5")
    assert get_res.status_code == 200
    assert len(get_res.json()) >= 1

def test_assistant_endpoint(client):
    res = client.post("/api/assistant", json={"message": "Tell me about squats"})
    assert res.status_code == 200
    assert "text/event-stream" in res.headers.get("content-type", "")
    assert "data:" in res.text

