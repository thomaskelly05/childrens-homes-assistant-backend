from __future__ import annotations

import pytest

from core.provider_context import ProviderContextError, resolve_provider_context


def test_provider_context_fails_closed_without_home_scope():
    context = resolve_provider_context({"id": 7, "role": "support_worker"})

    assert context.tenancy_scope == "none"
    assert context.home_ids == ()
    assert context.can_access_home(10) is False


def test_provider_context_normalises_allowed_homes_and_permissions():
    context = resolve_provider_context(
        {
            "id": 7,
            "role": "registered_manager",
            "home_id": "10",
            "allowed_home_ids": ["10", "11", "bad"],
            "provider_id": "99",
        }
    )

    assert context.user_id == 7
    assert context.role == "manager"
    assert context.home_ids == (10, 11)
    assert context.primary_home_id == 10
    assert context.can_access_home(11) is True
    assert context.can_access_home(12) is False
    assert context.governance_access is True


def test_provider_context_rejects_cross_home_request():
    with pytest.raises(ProviderContextError):
        resolve_provider_context(
            {"id": 7, "role": "support_worker", "home_id": 10, "provider_id": 99},
            requested_home_id=12,
        )


def test_provider_context_allows_platform_scope_without_implicit_provider_leak():
    context = resolve_provider_context({"id": 1, "role": "admin"})

    assert context.tenancy_scope == "platform"
    assert context.can_access_home(999) is True
    assert context.can_access_provider(999) is True
