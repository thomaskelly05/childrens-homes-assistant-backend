from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access
from db.connection import get_db
from routers.orb_projects_routes import require_orb_projects_bootstrap, router


@pytest.fixture
def projects_bootstrap_client():
    app = FastAPI()
    app.include_router(router)

    class FakeConn:
        def commit(self):
            return None

        def rollback(self):
            return None

    def fake_db():
        yield FakeConn()

    app.dependency_overrides[get_db] = fake_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_unauthenticated_projects_returns_401(projects_bootstrap_client):
    async def deny():
        raise HTTPException(status_code=401, detail={"error": "not_authenticated"})

    projects_bootstrap_client.app.dependency_overrides[require_orb_projects_bootstrap] = deny
    response = projects_bootstrap_client.get("/orb/projects")
    assert response.status_code == 401


def test_inactive_projects_returns_402(projects_bootstrap_client):
    async def inactive():
        raise HTTPException(status_code=402, detail={"error": "premium_required"})

    projects_bootstrap_client.app.dependency_overrides[require_orb_projects_bootstrap] = inactive
    response = projects_bootstrap_client.get("/orb/projects")
    assert response.status_code == 402
    assert response.json()["detail"]["error"] == "premium_required"


def test_active_projects_returns_200(projects_bootstrap_client, monkeypatch):
    async def active():
        return {"user_id": 42, "id": 42}

    projects_bootstrap_client.app.dependency_overrides[require_orb_projects_bootstrap] = active
    monkeypatch.setattr("routers.orb_projects_routes.list_orb_projects", lambda *_a, **_k: [{"id": "p1"}])
    response = projects_bootstrap_client.get("/orb/projects")
    assert response.status_code == 200
    assert response.json()[0]["id"] == "p1"
