from __future__ import annotations

import pytest

from schemas.orb_operational import (
    OrbOperationalContextSummary,
    OrbOperationalPermissionSummary,
    OrbOperationalRequest,
    OrbOperationalResponse,
    OrbOperationalSafetyBoundary,
)
from schemas.orb_operational_outputs import (
    OrbOperationalOutputCreate,
    OrbOperationalOutputListRequest,
    OrbOperationalOutputReviewRequest,
    OrbOperationalOutputUpdate,
)
from services.orb_operational_output_service import orb_operational_output_service


@pytest.fixture(autouse=True)
def memory_outputs(monkeypatch):
    svc = orb_operational_output_service
    svc._memory = {}
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def _user(role: str = "admin", user_id: int = 5, home_id: int = 1) -> dict:
    return {"id": user_id, "role": role, "home_id": home_id, "first_name": "Test", "last_name": "User"}


def test_create_list_filter():
    record = orb_operational_output_service.create_output(
        OrbOperationalOutputCreate(
            title="Manager briefing today",
            type="manager_briefing",
            home_id=1,
            tags=["briefing", "manager"],
            summary="Summary",
            content_markdown="# Briefing",
        ),
        _user(),
    )
    assert record.os_linked is True
    assert record.standalone_only is False
    assert record.created_by_user_id == "5"

    listed = orb_operational_output_service.list_outputs(
        _user(),
        OrbOperationalOutputListRequest(output_type="manager_briefing"),
    )
    assert listed.total == 1
    assert listed.items[0].title == "Manager briefing today"

    by_review = orb_operational_output_service.list_outputs(
        _user(),
        OrbOperationalOutputListRequest(review_status="review_required"),
    )
    assert by_review.total == 1


def test_get_update_archive_delete():
    record = orb_operational_output_service.create_output(
        OrbOperationalOutputCreate(title="Action plan", type="action_priority_plan"),
        _user(),
    )
    fetched = orb_operational_output_service.get_output(record.id, _user())
    assert fetched is not None

    updated = orb_operational_output_service.update_output(
        record.id,
        OrbOperationalOutputUpdate(title="Updated plan"),
        _user(),
    )
    assert updated is not None
    assert updated.title == "Updated plan"

    archived = orb_operational_output_service.archive_output(record.id, _user())
    assert archived is not None
    assert archived.status == "archived"

    assert orb_operational_output_service.delete_output(record.id, _user()) is True


def test_export_mark_review_link_actions():
    record = orb_operational_output_service.create_output(
        OrbOperationalOutputCreate(
            title="Safeguarding themes",
            type="safeguarding_theme_review",
            content_markdown="## Themes\n\nEmerging pattern",
        ),
        _user(),
    )
    assert record.review_status == "review_required"

    exported = orb_operational_output_service.export_output(record.id, "markdown", _user())
    assert exported is not None
    assert "Safeguarding" in exported["content"]
    assert "OS-linked" in exported["content"]

    reviewed, warning = orb_operational_output_service.mark_for_review(
        record.id,
        OrbOperationalOutputReviewRequest(visibility="manager_review"),
        _user(),
    )
    assert reviewed is not None
    assert reviewed.review_status == "awaiting_review"

    linked = orb_operational_output_service.link_actions(record.id, ["act-1", "act-2"], _user())
    assert linked is not None
    assert "act-1" in linked.linked_action_ids


def test_save_from_operational_response():
    response = OrbOperationalResponse(
        answer="Prioritise safeguarding follow-up.",
        context_summary=OrbOperationalContextSummary(headline="Brief"),
        permissions=OrbOperationalPermissionSummary(role="manager", care_record_access=True),
        boundaries=OrbOperationalSafetyBoundary(),
        briefing={
            "title": "Manager briefing",
            "summary": "Today summary",
            "key_points": ["Point 1"],
        },
        draft_actions=[{"title": "Review board", "description": "Check actions"}],
        os_linked=True,
        care_record_access=True,
    )
    request = OrbOperationalRequest(message="Manager briefing", mode="manager_daily_brief")
    saved = orb_operational_output_service.save_from_operational_response(
        response, request, _user()
    )
    assert saved.type == "manager_briefing"
    assert saved.os_linked is True


def test_access_enforcement():
    creator = _user(role="staff", user_id=10, home_id=2)
    other = _user(role="staff", user_id=11, home_id=3)
    record = orb_operational_output_service.create_output(
        OrbOperationalOutputCreate(title="Private note", type="operational_note", home_id=2),
        creator,
    )
    assert orb_operational_output_service.get_output(record.id, creator) is not None
    assert orb_operational_output_service.get_output(record.id, other) is None

    manager = _user(role="manager", user_id=20, home_id=2)
    assert orb_operational_output_service.get_output(record.id, manager) is not None


def test_db_unavailable_uses_memory(monkeypatch):
    monkeypatch.setattr(orb_operational_output_service, "_use_db", lambda: False)
    health = orb_operational_output_service.health()
    assert health.storage_mode == "memory"
