from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import HTTPException

from schemas.orb_feedback import OrbFeedbackSubmitRequest
from services.orb_feedback_improvement_service import orb_feedback_improvement_service
from services.orb_feedback_service import orb_feedback_service
from services.orb_standalone_boundary import reject_standalone_os_ids

REPO_ROOT = Path(__file__).resolve().parents[1]
ROUTES = REPO_ROOT / "routers" / "orb_feedback_routes.py"
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"


@pytest.fixture(autouse=True)
def _clear_feedback_memory():
    orb_feedback_service.reset_memory_store()
    yield
    orb_feedback_service.reset_memory_store()


def test_feedback_route_registered():
    text = ROUTES.read_text(encoding="utf-8")
    assert '@router.post("/feedback")' in text
    assert "require_standalone_orb_access" in text
    assert '/feedback/summary' in text
    assert "require_admin" in text


def test_client_feedback_path():
    text = CLIENT.read_text(encoding="utf-8")
    assert "feedback: '/orb/standalone/feedback'" in text
    assert "submitStandaloneOrbFeedback" in text


def test_submit_thumbs_up():
    result = orb_feedback_service.submit(
        user_id=1,
        request=OrbFeedbackSubmitRequest(
            message_id="msg-1",
            conversation_id="conv-1",
            rating="up",
        ),
    )
    assert result.ok is True
    assert result.feedback_id


def test_submit_thumbs_down_with_reason_and_comment():
    result = orb_feedback_service.submit(
        user_id=1,
        request=OrbFeedbackSubmitRequest(
            message_id="msg-2",
            conversation_id="conv-1",
            rating="down",
            reason="missed_safeguarding",
            comment="Should have mentioned DSL escalation",
            answer_snapshot="x" * 9000,
            question_snapshot="y" * 7000,
            mode="Safeguarding Thinking",
            prompt_tier="deep",
            detected_family="restraint_physical_intervention",
            secondary_families=["safeguarding"],
            source_anchors=["Reg 12"],
            action_id="add_safeguarding_lens",
        ),
    )
    rows = orb_feedback_service.list_feedback(days=7)
    assert len(rows) == 1
    row = rows[0]
    assert row["rating"] == "down"
    assert row["reason"] == "missed_safeguarding"
    assert len(row["answer_snapshot"]) <= 6000
    assert len(row["question_snapshot"]) <= 6000
    assert row["detected_family"] == "restraint_physical_intervention"
    assert result.feedback_id == row["id"]


def test_rejects_os_ids_in_metadata():
    with pytest.raises(HTTPException) as exc:
        orb_feedback_service.submit(
            user_id=1,
            request=OrbFeedbackSubmitRequest(
                message_id="msg-3",
                rating="down",
                reason="other",
                metadata={"child_id": 99},
            ),
        )
    assert exc.value.status_code == 400


def test_reject_os_ids_helper():
    with pytest.raises(HTTPException):
        reject_standalone_os_ids({"child_id": 1})


def test_improvement_service_recurring_gaps():
    batch = []
    for index in range(4):
        batch.append(
            {
                "id": index + 1,
                "rating": "down",
                "reason": "missed_safeguarding",
                "detected_family": "restraint_physical_intervention",
            }
        )
    gaps = orb_feedback_improvement_service.identify_recurring_gaps(batch, min_count=3)
    assert gaps
    assert gaps[0]["count"] >= 3


def test_improvement_candidates_require_review():
    batch = [
        {
            "id": 1,
            "rating": "down",
            "reason": "missed_safeguarding",
            "detected_family": "peer_on_peer",
            "comment": "No DSL mention",
        }
    ]
    candidates = orb_feedback_improvement_service.generate_improvement_candidates(batch)
    assert len(candidates) == 1
    assert candidates[0].review_required is True
    assert candidates[0].proposed_change.get("auto_apply") is False


def test_feedback_summary_structure():
    for index in range(3):
        orb_feedback_service.submit(
            user_id=1,
            request=OrbFeedbackSubmitRequest(
                message_id=f"msg-{index}",
                rating="down" if index else "up",
                reason="too_generic" if index else None,
            ),
        )
    summary = orb_feedback_improvement_service.build_admin_summary(
        orb_feedback_service.list_feedback(days=7)
    )
    assert summary["total_feedback"] == 3
    assert "thumbs_up_ratio" in summary
    assert "suggested_improvement_candidates" in summary


def test_admin_routes_registered():
    admin_routes = REPO_ROOT / "routers" / "orb_admin_routes.py"
    text = admin_routes.read_text(encoding="utf-8")
    assert '/feedback/summary' in text
    assert '/feedback/candidates' in text
    assert '/billing/usage' in text
    assert "require_admin" in text


def test_feedback_submit_creates_improvement_candidate():
    from services.orb_improvement_candidate_service import orb_improvement_candidate_service

    orb_improvement_candidate_service.reset_memory()
    orb_feedback_service.submit(
        user_id=1,
        request=OrbFeedbackSubmitRequest(
            message_id="msg-candidate",
            rating="down",
            reason="missed_child_voice",
            detected_family="daily_note",
        ),
    )
    pending = orb_improvement_candidate_service.list_candidates(status="pending")
    assert len(pending) >= 1
