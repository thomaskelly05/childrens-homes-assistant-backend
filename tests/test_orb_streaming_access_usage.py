from __future__ import annotations

import json

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access
from routers.orb_standalone_routes import router as standalone_router


@pytest.fixture
def stream_client(monkeypatch):
    app = FastAPI()
    app.include_router(standalone_router)

    async def premium_user():
        return {"user_id": 7, "id": 7, "role": "orb_residential"}

    app.dependency_overrides[require_rich_orb_premium_access] = premium_user

    class _Runtime:
        async def stream_answer(self, *args, **kwargs):
            if False:
                yield ""
            return

    monkeypatch.setattr(
        "routers.orb_standalone_routes._select_assistant_runtime",
        lambda: _Runtime(),
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes._build_standalone_request_context",
        lambda payload: {
            "mode": "Ask ORB",
            "detail": "standard",
            "history": [],
            "image_urls": [],
            "retrieval_bundle": {},
            "prompt_tier": "standard",
            "grounding_context": "",
            "retrieval_preview": [],
            "shared_cognition": {},
            "standalone_brain": {},
            "framed_message": payload.message,
            "profile_context": "",
        },
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes._enforce_plan_limits",
        lambda **kwargs: {
            "answer": "Usage limit reached for this billing period.",
            "confidence": "medium",
            "context_used": {"usage_limit": "hard", "hard_limit_reached": True},
        },
    )
    return TestClient(app)


def test_hard_limit_blocks_stream_before_model(stream_client):
    response = stream_client.post(
        "/orb/standalone/conversation/stream",
        json={"message": "Hello ORB"},
    )
    assert response.status_code == 200
    body = response.text
    assert "error" in body or "usage_limit" in body
