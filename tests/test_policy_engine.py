from __future__ import annotations

from core.policy_engine import policy_engine, permissions_for_context


def test_policy_engine_grants_canonical_permissions_by_role():
    user = {"id": 1, "role": "manager", "home_id": 10, "provider_id": 99}

    permissions = permissions_for_context(user)

    assert "records:read" in permissions
    assert "chronology:write" in permissions
    assert "inspection:review" in permissions
    assert "provider:oversight" not in permissions


def test_policy_engine_denies_cross_home_even_when_permission_exists():
    user = {"id": 1, "role": "support_worker", "home_id": 10, "provider_id": 99}

    decision = policy_engine.evaluate(user, "records:read", home_id=11)

    assert decision.allowed is False


def test_policy_engine_allows_explicit_provider_oversight_permission():
    user = {
        "id": 1,
        "role": "manager",
        "provider_id": 99,
        "permissions": ["provider:oversight", "records:read"],
    }

    assert policy_engine.has_permission(user, "provider:oversight", provider_id=99) is True
    assert policy_engine.has_permission(user, "provider:oversight", provider_id=100) is False
