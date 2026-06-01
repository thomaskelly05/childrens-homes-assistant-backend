from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from db.connection import get_db
from routers.orb_usage_routes import SAFE_USAGE_SUMMARY, router


@pytest.fixture
def usage_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {
            "id": 42,
            "user_id": 42,
            "role": "orb_residential",
            "email": "orb@test",
            "subscription": {"active": False},
        }

    class FakeConn:
        def commit(self):
            return None

        def rollback(self):
            return None

    def fake_db():
        yield FakeConn()

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    from auth.orb_residential_auth_loader import get_orb_residential_user

    app.dependency_overrides[get_orb_residential_user] = fake_auth
    app.dependency_overrides[get_db] = fake_db
    client = TestClient(app, follow_redirects=False)
    yield client
    app.dependency_overrides.clear()


def test_get_orb_usage_returns_safe_summary_on_meter_failure():
    from routers.orb_usage_routes import get_orb_usage

    conn = MagicMock()
    current_user = {"user_id": 42, "email": "u@test.com", "role": "orb_residential"}
    import asyncio

    with patch("routers.orb_usage_routes._usage_summary", side_effect=RuntimeError("meter unavailable")):
        result = asyncio.run(get_orb_usage(conn=conn, current_user=current_user))

    assert result == SAFE_USAGE_SUMMARY


def test_get_orb_usage_strips_meter_payload():
    from routers.orb_usage_routes import get_orb_usage

    conn = MagicMock()
    current_user = {"user_id": 7, "email": "u@test.com", "role": "orb_residential"}
    import asyncio

    with patch(
        "routers.orb_usage_routes._usage_summary",
        return_value={"messages_this_period": 3, "meter": {"total_requests": 3}},
    ):
        result = asyncio.run(get_orb_usage(conn=conn, current_user=current_user))

    assert result["messages_this_period"] == 3
    assert "meter" not in result


def test_get_orb_usage_requires_authentication():
    with pytest.raises(HTTPException) as exc:
        require_orb_residential_auth({"user_id": None})

    assert exc.value.status_code == 403


def test_get_orb_usage_without_trailing_slash_returns_200(usage_client, monkeypatch):
    inactive_summary = dict(SAFE_USAGE_SUMMARY)

    monkeypatch.setattr(
        "routers.orb_usage_routes._usage_summary",
        lambda *_a, **_k: {**inactive_summary, "meter": {}},
    )
    response = usage_client.get("/orb/usage")
    assert response.status_code == 200
    assert response.json() == inactive_summary


def test_get_orb_usage_inactive_subscription_safe_payload(usage_client, monkeypatch):
    monkeypatch.setattr(
        "routers.orb_usage_routes._usage_summary",
        lambda *_a, **_k: {
            **SAFE_USAGE_SUMMARY,
            "meter": {"total_requests": 0},
        },
    )
    response = usage_client.get("/orb/usage/")
    assert response.status_code == 200
    body = response.json()
    assert body["messages_this_period"] == 0
    assert body["included_messages"] is None
    assert body["extra_usage_pence"] == 0
    assert body["credits_balance"] == 0


def test_get_orb_usage_unauthenticated_returns_401():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app, follow_redirects=False)
    response = client.get("/orb/usage")
    assert response.status_code == 401
    body = response.json()
    assert body["detail"]["code"] == "not_authenticated"
