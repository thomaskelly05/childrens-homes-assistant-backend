from __future__ import annotations

from schemas.handover_drafts import HandoverDraftRecord
from services.handover_formal_mapping_service import (
    FORMAL_NOT_WIRED_WARNING,
    handover_formal_mapping_service,
)


def _draft(**kwargs) -> HandoverDraftRecord:
    base = {
        "id": "d1",
        "title": "Test",
        "body": "Workspace narrative only.",
        "sections": [],
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    base.update(kwargs)
    return HandoverDraftRecord(**base)


def test_not_wired_without_child():
    draft = _draft(scope="home", child_id=None)
    target = handover_formal_mapping_service.get_target(draft)
    assert target.can_create_formal_record is False
    assert FORMAL_NOT_WIRED_WARNING in " ".join(target.warnings)


def test_supported_with_child():
    draft = _draft(child_id=42, scope="child")
    assert handover_formal_mapping_service.can_create_formal_record(draft) is True


def test_create_without_db_returns_not_wired(fake_state):
    draft = _draft(child_id=42, scope="child")
    result = handover_formal_mapping_service.create_formal_record(
        draft, fake_state["user"], conn=None
    )
    assert result["formal_record_created"] is False
    assert result["formal_status"] in ("not_wired", "not_attempted")


def test_normalise_never_fakes_success():
    result = handover_formal_mapping_service.normalise_formal_response(
        {"formal_record_created": False, "formal_status": "not_wired"}
    )
    assert result["formal_record_created"] is False
