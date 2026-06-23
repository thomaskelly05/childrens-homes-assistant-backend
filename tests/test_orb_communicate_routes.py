"""ORB Communicate backend convergence route."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_communicate_routes import router


def test_communicate_converge_returns_orchestrator_metadata():
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_orb_residential_auth] = lambda: {"user_id": 1}
    client = TestClient(app)
    response = client.post(
        "/orb/communicate/converge",
        json={"text": "Easy read about CAMHS and child voice.", "workflow": "easy_read"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    convergence = data["brain_convergence"]
    assert convergence.get("active_final_domains")
    assert isinstance(data["public_source_chips"], list)
