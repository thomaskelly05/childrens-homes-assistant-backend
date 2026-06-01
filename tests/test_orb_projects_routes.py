from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from db.connection import get_db
from routers.orb_projects_routes import router


@pytest.fixture
def projects_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 42, "user_id": 42, "role": "orb_residential", "email": "orb@test"}

    class FakeConn:
        def commit(self):
            return None

        def rollback(self):
            return None

    def fake_db():
        yield FakeConn()

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    app.dependency_overrides[get_db] = fake_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_list_projects_returns_empty_array_when_db_unavailable(projects_client, monkeypatch):
    def boom(*_args, **_kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr("routers.orb_projects_routes.list_orb_projects", boom)
    response = projects_client.get("/orb/projects")
    assert response.status_code == 200
    assert response.json() == []


def test_get_project_returns_404_when_missing(projects_client, monkeypatch):
    monkeypatch.setattr("routers.orb_projects_routes.get_orb_project", lambda *_a, **_k: None)
    response = projects_client.get("/orb/projects/user-project-1")
    assert response.status_code == 404
    body = response.json()
    assert body["detail"]["code"] == "project_not_found"


def test_get_project_returns_project(projects_client, monkeypatch):
    sample = {
        "id": "user-project-1",
        "title": "My project",
        "description": None,
        "memory": None,
        "chat_ids": [],
        "created_at": None,
        "updated_at": None,
    }
    monkeypatch.setattr("routers.orb_projects_routes.get_orb_project", lambda *_a, **_k: sample)
    response = projects_client.get("/orb/projects/user-project-1")
    assert response.status_code == 200
    assert response.json()["id"] == "user-project-1"


def test_get_project_chat_returns_404_for_stale_chat(projects_client, monkeypatch):
    project = {
        "id": "user-project-1",
        "title": "My project",
        "description": None,
        "memory": None,
        "chat_ids": [],
        "created_at": None,
        "updated_at": None,
    }
    monkeypatch.setattr("routers.orb_projects_routes.get_orb_project", lambda *_a, **_k: project)
    monkeypatch.setattr("routers.orb_projects_routes.get_orb_project_chat_link", lambda *_a, **_k: False)
    response = projects_client.get("/orb/projects/user-project-1/chats/stale-chat-id")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "chat_not_found"


def test_patch_project_returns_404_for_unknown(projects_client, monkeypatch):
    monkeypatch.setattr("routers.orb_projects_routes.update_orb_project", lambda *_a, **_k: None)
    response = projects_client.patch(
        "/orb/projects/project-general",
        json={"title": "General"},
    )
    assert response.status_code == 404
