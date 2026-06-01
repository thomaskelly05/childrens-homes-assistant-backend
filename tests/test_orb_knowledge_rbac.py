from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.orb_knowledge_routes as knowledge_routes
from services.orb_knowledge_library_service import (
    orb_knowledge_library_service,
    user_can_view_knowledge_source,
)


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
    from auth.permissions import require_admin

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
