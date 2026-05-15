from __future__ import annotations

import pytest
from fastapi import HTTPException

from services.child_workspace_context_service import ChildWorkspaceContextService


def _service(monkeypatch, child):
    monkeypatch.setattr(
        "services.child_workspace_context_service.YoungPersonService.get_young_person_by_id",
        lambda young_person_id: child if young_person_id == child["id"] else None,
    )
    monkeypatch.setattr(
        "services.child_workspace_context_service.YoungPersonService.get_dashboard_counts",
        lambda young_person_id: {"daily_notes": 0},
    )
    monkeypatch.setattr(
        "services.child_workspace_context_service.YoungPersonService.get_recent_activity",
        lambda young_person_id, limit=10: [],
    )
    monkeypatch.setattr(
        "services.child_workspace_context_service.YoungPersonService.get_active_alerts",
        lambda young_person_id: [],
    )
    return ChildWorkspaceContextService()


def test_child_workspace_allows_same_home_user(monkeypatch):
    service = _service(monkeypatch, {"id": 5, "home_id": 1, "first_name": "Asha", "last_name": "Khan"})

    context = service.resolve_context(
        young_person_id=5,
        current_user={"id": 7, "role": "support_worker", "home_id": 1},
    )

    assert context["context_ready"] is True
    assert context["scope"]["young_person_id"] == 5
    assert context["scope"]["retrieval_scope"] == "selected_child_only"
    assert context["scope"]["allow_global_search"] is False


def test_child_workspace_rejects_cross_home_user(monkeypatch):
    service = _service(monkeypatch, {"id": 5, "home_id": 2, "first_name": "Asha"})

    with pytest.raises(HTTPException) as exc:
        service.assert_child_access(
            young_person_id=5,
            current_user={"id": 7, "role": "support_worker", "home_id": 1},
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["code"] == "child_scope_denied"


def test_child_workspace_allows_provider_level_user(monkeypatch):
    service = _service(monkeypatch, {"id": 5, "home_id": 2, "first_name": "Asha"})

    child = service.assert_child_access(
        young_person_id=5,
        current_user={"id": 7, "role": "provider_admin", "home_id": 1},
    )

    assert child["id"] == 5


def test_child_workspace_requires_authenticated_user(monkeypatch):
    service = _service(monkeypatch, {"id": 5, "home_id": 1, "first_name": "Asha"})

    with pytest.raises(HTTPException) as exc:
        service.assert_child_access(young_person_id=5, current_user={})

    assert exc.value.status_code == 401
