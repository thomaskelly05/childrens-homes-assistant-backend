from __future__ import annotations

import pytest

from schemas.handover_drafts import HandoverDraftRequest
from services.handover_draft_service import handover_draft_service


@pytest.fixture(autouse=True)
def clear_memory():
    handover_draft_service._memory = {}


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

    completed = handover_draft_service.complete_draft(user, created.draft_id, conn=None)
    assert completed.status == "completed"
    assert any("formal" in w.lower() or "workspace" in w.lower() for w in completed.warnings)

    archived = handover_draft_service.archive_draft(user, created.draft_id, conn=None)
    assert archived.status == "archived"


def test_complete_is_not_formal_record(fake_state):
    user = fake_state["user"]
    created = handover_draft_service.create_draft(
        user, HandoverDraftRequest(title="Test"), conn=None
    )
    result = handover_draft_service.complete_draft(user, created.draft_id, conn=None)
    assert result.status == "completed"
    assert result.metadata.get("formal_record_created") is not True
    warnings_text = " ".join(result.warnings).lower()
    assert "formal" in warnings_text or "workspace" in warnings_text
