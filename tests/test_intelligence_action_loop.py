from __future__ import annotations

from schemas.indicare_intelligence import IntelligenceRequest
from schemas.intelligence_actions import IntelligenceActionCreate, IntelligenceActionDecision
from services.indicare_intelligence_spine_service import indicare_intelligence_spine_service
from services.intelligence_action_service import (
    intelligence_action_service,
    propose_missing_episode_without_rhi,
    propose_safeguarding_without_manager_review,
)


def test_safeguarding_without_manager_review_creates_urgent_action():
    action = propose_safeguarding_without_manager_review(
        [
            {
                "id": "sg-1",
                "record_type": "safeguarding_concern",
                "summary": "Concern logged; manager review not yet visible.",
                "manager_review_completed": False,
            }
        ]
    )
    assert action is not None
    assert action.action_type == "safeguarding_review"
    assert action.priority == "urgent"
    assert "not a safeguarding decision" in (action.suggested_next_step or "").lower() or "human" in (
        action.suggested_next_step or ""
    ).lower()


def test_missing_episode_without_rhi_creates_missing_follow_up():
    action = propose_missing_episode_without_rhi(
        [
            {"id": "m-1", "record_type": "missing_episode", "summary": "Missing from placement."},
            {"id": "ra-1", "record_type": "risk_assessment", "summary": "Risk update pending."},
        ]
    )
    assert action is not None
    assert action.action_type == "missing_follow_up"
    assert action.priority == "urgent"


def test_spine_proposes_actions_without_persisting_by_default():
    before = len(intelligence_action_service.list_actions())
    response = indicare_intelligence_spine_service.build_response(
        IntelligenceRequest(
            mode="manager_daily_brief",
            records=[
                {
                    "id": "sg-1",
                    "record_type": "safeguarding_concern",
                    "summary": "Concern logged; manager review not yet visible.",
                    "manager_review_completed": False,
                },
                {"id": "m-1", "record_type": "missing_episode", "summary": "Missing from placement."},
            ],
            include_live_records=False,
            use_snapshot_cache=False,
            create_actions=False,
        )
    )
    after = len(intelligence_action_service.list_actions())
    assert response.proposed_actions
    assert response.action_summary
    assert "proposed" in response.action_notice.lower()
    assert after == before


def test_action_decision_updates_audit_trail():
    created = intelligence_action_service.create_action(
        IntelligenceActionCreate(
            action_type="manager_signoff",
            title="Manager sign-off review recommended",
            summary="Test action for audit trail.",
            priority="high",
            reason="review recommended",
        ),
        current_user={"id": "manager-1"},
    )
    updated = intelligence_action_service.decide_action(
        created.id,
        IntelligenceActionDecision(decision="accept", reason="accepted for follow-up"),
        current_user={"id": "manager-1"},
    )
    assert updated is not None
    assert updated.status == "accepted"
    assert len(updated.audit_trail) >= 2
    events = [entry.get("event") if isinstance(entry, dict) else getattr(entry, "event", None) for entry in updated.audit_trail]
    assert "created" in events or "proposed" in events
    assert any("decision" in str(e) for e in events if e)


def test_action_summary_groups_by_status_and_priority():
    intelligence_action_service.create_action(
        IntelligenceActionCreate(
            action_type="record_quality_review",
            title="Record quality A",
            priority="medium",
        )
    )
    intelligence_action_service.create_action(
        IntelligenceActionCreate(
            action_type="evidence_gap_review",
            title="Evidence gap B",
            priority="urgent",
        )
    )
    summary = intelligence_action_service.build_action_summary()
    assert summary.total >= 2
    assert summary.by_priority.get("urgent", 0) >= 1
    assert summary.by_status.get("proposed", 0) >= 1
    assert summary.by_type.get("record_quality_review", 0) >= 1


def test_existing_intelligence_spine_tests_still_importable():
    import tests.test_indicare_intelligence_spine as spine_tests

    assert hasattr(spine_tests, "test_spine_response_includes_decision_support_notice")
