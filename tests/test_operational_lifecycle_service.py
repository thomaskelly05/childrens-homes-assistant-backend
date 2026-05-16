from __future__ import annotations

from services.operational_lifecycle_service import operational_lifecycle_service


def test_lifecycle_transition_context_carries_resolution_evidence_and_governance():
    context = operational_lifecycle_service.build_transition_context(
        entity_type="safeguarding",
        entity_id="42",
        transition="resolve",
        status="resolved",
        payload={
            "resolution_reason": "Manager reviewed chronology and evidence links.",
            "review_notes": "No further action required today; keep monitoring plan visible.",
            "evidence_ids": ["ev-1", "ev-2"],
            "chronology_ids": ["chr-1"],
            "governance_id": "gov-1",
        },
        current_user={"id": 7, "email": "manager@example.test", "role": "manager"},
    )

    assert context["current_state"] == "resolved"
    assert context["resolution"]["resolved_by"] == "7"
    assert context["resolution"]["resolution_reason"].startswith("Manager reviewed")
    assert context["history"][0]["evidence_ids"] == ["ev-1", "ev-2"]
    assert context["history"][0]["chronology_ids"] == ["chr-1"]
    assert context["history"][0]["governance_ids"] == ["gov-1"]
    assert context["audit_timeline"][0]["operational_relevance"] == "lifecycle_transition"
    assert context["audit_timeline"][0]["safeguarding_relevance"] == "relevant"
    assert context["evidence_edges"][0]["relationship"] == "supports_resolution"
    assert context["durability"]["save_state"] == "transition_recorded"


def test_lifecycle_status_mapping_preserves_existing_domain_statuses():
    assert operational_lifecycle_service.status_for_transition("reopen") == "reopened"
    assert operational_lifecycle_service.normalise_lifecycle_status("submitted") == "in_review"
    assert operational_lifecycle_service.normalise_lifecycle_status("approved") == "resolved"
    assert operational_lifecycle_service.normalise_lifecycle_status("overdue") == "escalated"
    assert operational_lifecycle_service.is_open_lifecycle("review_required") is True
    assert operational_lifecycle_service.is_open_lifecycle("closed") is False


def test_lifecycle_snapshot_from_record_uses_history_and_audit_rows():
    snapshot = operational_lifecycle_service.snapshot_from_record(
        entity_type="document",
        entity_id="doc-9",
        record={"id": "doc-9", "status": "review_required", "metadata": {}},
        history_rows=[
            {
                "id": "wf-1",
                "event_type": "review",
                "status": "in_review",
                "created_by": 5,
                "notes": "Evidence check requested.",
                "metadata": {"evidence_ids": ["ev-9"]},
            }
        ],
        audit_rows=[
            {
                "id": "audit-1",
                "actor_user_id": 5,
                "action": "document.review",
                "reason": "Review requested",
            }
        ],
    )

    payload = snapshot.model_dump(mode="json")
    assert payload["current_state"] == "in_review"
    assert payload["history"][0]["transition"] == "review"
    assert payload["history"][0]["evidence_ids"] == ["ev-9"]
    assert payload["audit_timeline"][0]["change_summary"] == "Review requested"
