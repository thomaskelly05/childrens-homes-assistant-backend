from __future__ import annotations

import pytest

from schemas.handover_drafts import HandoverDraftRequest
from services.handover_draft_service import handover_draft_service
from services.handover_review_service import handover_review_service
from schemas.handover_drafts import HandoverReviewActionRequest


@pytest.fixture(autouse=True)
def clear_memory():
    handover_draft_service._memory = {}
    handover_review_service._memory_events = []


def test_create_update_list(fake_state):
    user = fake_state["user"]
    created = handover_draft_service.create_draft(
        user,
        HandoverDraftRequest(title="Night handover", body="Shift summary", scope="home"),
        conn=None,
    )
    assert created.draft_id
    assert created.status == "draft"
    assert any("formal" in w.lower() or "workspace" in w.lower() for w in created.warnings)

    listed = handover_draft_service.list_drafts(user, conn=None)
    assert listed.total >= 1

    ready = handover_draft_service.mark_ready_for_review(user, created.draft_id, conn=None)
    assert ready.status == "ready_for_review"
    assert ready.review_status == "awaiting_review"

    completed = handover_draft_service.complete_draft(user, created.draft_id, conn=None)
    assert completed.status == "completed"
    assert any("formal" in w.lower() or "workspace" in w.lower() for w in completed.warnings)


def test_complete_is_not_formal_record(fake_state):
    user = fake_state["user"]
    created = handover_draft_service.create_draft(
        user, HandoverDraftRequest(title="Test"), conn=None
    )
    result = handover_draft_service.complete_draft(user, created.draft_id, conn=None)
    assert result.status == "completed"
    assert result.formal_record_created is False


def test_review_required_blocks_complete(fake_state):
    user = fake_state["user"]
    created = handover_draft_service.create_draft(
        user,
        HandoverDraftRequest(
            title="Blocked",
            body="Body",
            source_context={"manager_review_required": True},
        ),
        conn=None,
    )
    handover_draft_service.mark_ready_for_review(user, created.draft_id, conn=None)
    blocked = handover_draft_service.complete_draft(user, created.draft_id, conn=None)
    assert blocked.success is False
    assert "review" in " ".join(blocked.warnings).lower()


def test_approved_allows_complete(fake_state):
    manager = {**fake_state["user"], "role": "manager"}
    created = handover_draft_service.create_draft(
        manager,
        HandoverDraftRequest(
            title="Approved flow",
            body="Body",
            source_context={"manager_review_required": True},
        ),
        conn=None,
    )
    handover_draft_service.mark_ready_for_review(manager, created.draft_id, conn=None)
    handover_review_service.apply_review_action(
        created.draft_id,
        HandoverReviewActionRequest(action="approve"),
        manager,
        conn=None,
    )
    result = handover_draft_service.complete_draft(manager, created.draft_id, conn=None)
    assert result.status == "completed"
    assert result.formal_record_created is False
