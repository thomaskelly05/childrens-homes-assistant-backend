from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock

from routers.orb_document_routes import OrbDocumentAnalysisRequest, document_compare
from services import orb_ai_abuse_guard_service as guard


def _user() -> dict:
    return {"user_id": 1, "id": 1, "role": "orb_residential"}


def test_document_compare_limit_returns_safe_error(monkeypatch):
    monkeypatch.setattr(guard, "MAX_COMPARISON_TEXT_CHARS", 100)
    payload = OrbDocumentAnalysisRequest(mode="policy_comparison", text="x" * 150)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(document_compare(payload, current_user=_user()))
    assert exc.value.status_code == 400
    detail = exc.value.detail
    assert detail["code"] == "comparison_too_long"
    assert "message" in detail


def test_compare_route_requires_premium_module():
    import routers.orb_document_routes as routes
    from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access

    assert routes.require_standalone_orb_access is require_rich_orb_premium_access
