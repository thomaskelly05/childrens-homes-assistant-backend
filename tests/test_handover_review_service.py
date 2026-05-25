from __future__ import annotations

import pytest

from schemas.handover_drafts import HandoverDraftRequest, HandoverReviewActionRequest
from services.handover_draft_service import handover_draft_service
from services.handover_review_detection import detect_review_requirements
from services.handover_review_service import handover_review_service


@pytest.fixture(autouse=True)
def clear_state():
    handover_draft_service._memory = {}
    handover_review_service._memory_events = []


def test_detect_review_from_source_context():
    detected = detect_review_requirements(
        {
            "manager_review_required": True,
            "safeguarding_review_required": True,
            "counts": {"urgent": 2},
        }
    )
    assert detected["manager_review_required"] is True
    assert detected["safeguarding_review_required"] is True


def test_queue_lists_awaiting_review(fake_state):
    user = {**fake_state["user"], "role": "manager"}
    created = handover_draft_service.create_draft(
        user,
        HandoverDraftRequest(
            title="Review queue test",
            body="Safe summary body for shift.",
            source_context={"manager_review_required": True},
        ),
        conn=None,
    )
    handover_draft_service.mark_ready_for_review(user, created.draft_id, conn=None)
    queue = handover_review_service.list_review_queue(user, conn=None)
    assert queue.total >= 1
    item = queue.items[0]
    assert item.draft_id == created.draft_id
    assert "RAW ISN" not in item.safe_summary.upper()


def test_approve_and_complete(fake_state):
    manager = {**fake_state["user"], "role": "manager"}
    staff = {**fake_state["user"], "role": "staff", "id": "staff-1"}
    created = handover_draft_service.create_draft(
        staff,
        HandoverDraftRequest(title="Approve flow", body="Shift notes"),
        conn=None,
    )
    handover_draft_service.mark_ready_for_review(staff, created.draft_id, conn=None)
    approved = handover_review_service.apply_review_action(
        created.draft_id,
        HandoverReviewActionRequest(action="approve", comments="Looks clear"),
        manager,
        conn=None,
    )
    assert approved.review_status == "approved"
    completed = handover_review_service.apply_review_action(
        created.draft_id,
        HandoverReviewActionRequest(action="complete_after_approval"),
        manager,
        conn=None,
    )
    assert completed.status == "completed"
    assert len(handover_review_service._memory_events) >= 2


def test_request_changes(fake_state):
    manager = {**fake_state["user"], "role": "manager"}
    created = handover_draft_service.create_draft(
        manager, HandoverDraftRequest(title="Changes", body="Body"), conn=None
    )
    handover_draft_service.mark_ready_for_review(manager, created.draft_id, conn=None)
    result = handover_review_service.apply_review_action(
        created.draft_id,
        HandoverReviewActionRequest(action="request_changes", comments="Add actions"),
        manager,
        conn=None,
    )
    assert result.review_status == "changes_requested"


def test_safeguarding_review_required(fake_state):
    manager = {**fake_state["user"], "role": "manager"}
    created = handover_draft_service.create_draft(
        manager,
        HandoverDraftRequest(
            title="SG",
            body="Body",
            source_context={"safeguarding_review_required": True},
        ),
        conn=None,
    )
    handover_draft_service.mark_ready_for_review(manager, created.draft_id, conn=None)
    result = handover_review_service.apply_review_action(
        created.draft_id,
        HandoverReviewActionRequest(action="mark_safeguarding_review_required"),
        manager,
        conn=None,
    )
    assert result.review_status == "safeguarding_review_required"


def test_no_raw_body_in_queue(fake_state):
    manager = {**fake_state["user"], "role": "manager"}
    secret = "RAW SAFEGUARDING NARRATIVE MUST NOT APPEAR"
    created = handover_draft_service.create_draft(
        manager,
        HandoverDraftRequest(title="Secret", body=secret),
        conn=None,
    )
    handover_draft_service.mark_ready_for_review(manager, created.draft_id, conn=None)
    queue = handover_review_service.list_review_queue(manager, conn=None)
    dumped = queue.model_dump_json()
    assert secret not in dumped
