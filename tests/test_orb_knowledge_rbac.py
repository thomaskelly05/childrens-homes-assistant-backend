from __future__ import annotations

import asyncio
import inspect
import uuid

import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.params import Depends as DependsParam
from fastapi.testclient import TestClient

import routers.orb_knowledge_routes as knowledge_routes
from auth.orb_knowledge_admin_dependency import require_orb_knowledge_admin
from auth.permissions import require_admin
from schemas.orb_knowledge import OrbKnowledgeSearchRequest
from services.orb_knowledge_library_service import (
    orb_knowledge_library_service,
    user_can_view_knowledge_source,
)
from services.orb_rag_retrieval_service import orb_rag_retrieval_service


@pytest.fixture(autouse=True)
def memory_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()
    yield


def _premium_user(user_id: int) -> dict:
    return {"user_id": user_id, "id": user_id, "role": "orb_residential"}


def _admin_user() -> dict:
    return {"user_id": 1, "id": 1, "role": "admin"}


def _private_source_with_chunk(user_id: int, unique_token: str) -> dict:
    source = orb_knowledge_library_service.create_source(
        {
            "title": f"Private policy {unique_token}",
            "source_type": "user_uploaded",
            "uploaded_by_user_id": user_id,
            "owner_user_id": user_id,
            "source_scope": "user_private",
            "status": "indexed",
        }
    )
    orb_knowledge_library_service.upsert_chunks(
        source["id"],
        [
            {
                "id": f"chunk-{uuid.uuid4().hex[:12]}",
                "source_id": source["id"],
                "chunk_index": 0,
                "title": source["title"],
                "text": f"Confidential zebra policy wording {unique_token} for residential care.",
                "section": "Policy",
                "keywords": [unique_token, "zebra", "policy"],
            }
        ],
    )
    return source


def test_builtin_visible_to_all_premium_users():
    sources_a = orb_knowledge_library_service.list_sources(viewer_user_id=10)
    sources_b = orb_knowledge_library_service.list_sources(viewer_user_id=20)
    ids_a = {s["id"] for s in sources_a}
    ids_b = {s["id"] for s in sources_b}
    assert "seed-ofsted-sccif" in ids_a
    assert "seed-ofsted-sccif" in ids_b


def test_user_private_upload_not_visible_to_other_user():
    private = orb_knowledge_library_service.create_source(
        {
            "title": "Private policy",
            "source_type": "user_uploaded",
            "uploaded_by_user_id": 55,
            "owner_user_id": 55,
            "source_scope": "user_private",
        }
    )
    assert user_can_view_knowledge_source(private, 55) is True
    assert user_can_view_knowledge_source(private, 56) is False
    listed = orb_knowledge_library_service.list_sources(viewer_user_id=56)
    assert private["id"] not in {s["id"] for s in listed}


def test_premium_user_cannot_create_source():
    with pytest.raises(HTTPException) as exc:
        require_admin(_premium_user(5))
    assert exc.value.status_code in {401, 403}


def test_admin_can_create_source():
    result = asyncio.run(
        knowledge_routes.create_source(
            payload=type(
                "P",
                (),
                {
                    "model_dump": lambda self: {
                        "title": "Admin source",
                        "source_type": "policy",
                    }
                },
            )(),
            _admin=_admin_user(),
        )
    )
    assert result["success"] is True


def test_require_orb_knowledge_admin_uses_fastapi_depends():
    sig = inspect.signature(require_orb_knowledge_admin)
    default = sig.parameters["current_user"].default
    assert isinstance(default, DependsParam)
    assert default.dependency is require_admin


def test_require_orb_knowledge_admin_invokes_require_admin_via_fastapi():
    """Fails with the old default-arg bug (require_admin passed as object, not invoked)."""
    from auth.permissions import get_current_user

    admin_calls: list[dict] = []

    def tracking_require_admin(current_user: dict = Depends(get_current_user)):
        admin_calls.append(current_user)
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin required")
        return current_user

    app = FastAPI()

    @app.get("/admin-probe")
    def admin_probe(_admin=Depends(require_orb_knowledge_admin)):
        return {"ok": True, "role": _admin.get("role")}

    app.dependency_overrides[require_admin] = tracking_require_admin

    client = TestClient(app)

    app.dependency_overrides[get_current_user] = lambda: _premium_user(5)
    resp = client.get("/admin-probe")
    assert resp.status_code == 403

    admin_calls.clear()
    app.dependency_overrides[get_current_user] = lambda: _admin_user()
    resp = client.get("/admin-probe")
    assert resp.status_code == 200
    assert admin_calls, "require_admin must be invoked when resolving require_orb_knowledge_admin"


def test_premium_user_cannot_call_admin_mutation_route():
    from auth.permissions import get_current_user

    app = FastAPI()
    app.include_router(knowledge_routes.router)
    app.dependency_overrides[get_current_user] = lambda: _premium_user(99)

    client = TestClient(app)
    resp = client.post(
        "/orb/standalone/knowledge/sources",
        json={"title": "Blocked", "source_type": "policy"},
    )
    assert resp.status_code in {401, 403}


def test_admin_can_call_admin_mutation_route_via_fastapi():
    from auth.permissions import get_current_user

    app = FastAPI()
    app.include_router(knowledge_routes.router)
    app.dependency_overrides[get_current_user] = lambda: _admin_user()

    client = TestClient(app)
    resp = client.post(
        "/orb/standalone/knowledge/sources",
        json={"title": "Admin route source", "source_type": "policy"},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_signed_out_cannot_call_admin_route_via_require_admin():
    with pytest.raises(HTTPException):
        require_admin({})


def test_user_b_cannot_get_user_a_private_source():
    token = f"secret-{uuid.uuid4().hex[:8]}"
    private = _private_source_with_chunk(101, token)
    assert (
        orb_knowledge_library_service.get_source(private["id"], viewer_user_id=102) is None
    )


def test_user_b_cannot_search_user_a_private_chunks():
    token = f"zebra-{uuid.uuid4().hex[:8]}"
    private = _private_source_with_chunk(201, token)

    owner_results = orb_rag_retrieval_service.search(
        token,
        limit=10,
        viewer_user_id=201,
    )
    other_results = orb_rag_retrieval_service.search(
        token,
        limit=10,
        viewer_user_id=202,
    )

    owner_ids = {r.get("source_id") for r in owner_results}
    other_ids = {r.get("source_id") for r in other_results}
    assert private["id"] in owner_ids
    assert private["id"] not in other_ids


def test_global_admin_approved_source_searchable_by_both_users():
    global_src = orb_knowledge_library_service.create_source(
        {
            "title": "Approved sector guidance",
            "source_type": "practice_guidance",
            "source_scope": "global_admin_approved",
            "governance_status": "approved",
            "status": "indexed",
        }
    )
    marker = f"approved-guidance-{uuid.uuid4().hex[:8]}"
    orb_knowledge_library_service.upsert_chunks(
        global_src["id"],
        [
            {
                "id": f"chunk-{uuid.uuid4().hex[:12]}",
                "source_id": global_src["id"],
                "chunk_index": 0,
                "title": global_src["title"],
                "text": f"Shared approved guidance content {marker}.",
                "keywords": [marker],
            }
        ],
    )

    for uid in (301, 302):
        results = orb_rag_retrieval_service.search(marker, limit=10, viewer_user_id=uid)
        assert global_src["id"] in {r.get("source_id") for r in results}


def test_search_route_passes_viewer_context(monkeypatch):
    captured: dict = {}

    def fake_search(*args, **kwargs):
        captured["viewer_user_id"] = kwargs.get("viewer_user_id")
        return []

    monkeypatch.setattr(knowledge_routes.orb_rag_retrieval_service, "search", fake_search)

    asyncio.run(
        knowledge_routes.search_knowledge(
            payload=OrbKnowledgeSearchRequest(query="ofsted", limit=5),
            current_user=_premium_user(77),
        )
    )
    assert captured.get("viewer_user_id") == 77


def test_builtin_source_searchable_by_multiple_users():
    results_a = orb_rag_retrieval_service.search(
        "Ofsted SCCIF child voice",
        limit=5,
        viewer_user_id=401,
    )
    results_b = orb_rag_retrieval_service.search(
        "Ofsted SCCIF child voice",
        limit=5,
        viewer_user_id=402,
    )
    assert results_a
    assert results_b
    assert "seed-ofsted-sccif" in {r.get("source_id") for r in results_a}
    assert "seed-ofsted-sccif" in {r.get("source_id") for r in results_b}
