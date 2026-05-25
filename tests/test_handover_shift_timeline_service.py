from __future__ import annotations

from schemas.handover_drafts import HandoverDraftRecord
from services.handover_shift_timeline_service import handover_shift_timeline_service


def _draft(**kwargs) -> HandoverDraftRecord:
    base = {
        "id": "d1",
        "title": "Test",
        "body": "Body",
        "sections": [],
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }
    base.update(kwargs)
    return HandoverDraftRecord(**base)


def test_no_fake_timeline_without_formal():
    draft = _draft(child_id=1)
    link = handover_shift_timeline_service.create_or_prepare_link(
        draft, {"formal_record_created": False}, {"role": "manager"}, conn=None
    )
    assert link["timeline_linked"] is False
    assert link["linked_timeline_id"] is None


def test_timeline_unsupported_without_child():
    draft = _draft(child_id=None)
    assert (
        handover_shift_timeline_service.timeline_supported(
            draft, {"formal_record_created": True, "formal_record_id": "99"}
        )
        is False
    )


def test_route_hint_for_child():
    draft = _draft(child_id=7)
    assert handover_shift_timeline_service.route_hint(draft) == "/young-people/7/journey"
