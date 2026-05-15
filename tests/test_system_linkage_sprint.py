from __future__ import annotations

from schemas.orb import OrbContext
from services.orb_voice_session_service import _operational_recovery_answer
from services.plan_flow_service import plan_flow_service
from services.risk_intelligence_language import contains_unsafe_language


def test_record_save_flow_links_chronology_actions_documents_handover_and_reports():
    record = {
        "id": "missing-1",
        "young_person_id": "yp-1",
        "home_id": "home-1",
        "record_type": "missing_episode",
        "summary": "Missing episode after family contact. Follow-up action due next shift.",
        "location": "Riverside Park",
    }

    result = plan_flow_service.after_record_saved(
        record=record,
        visible_records=[],
        young_person_id="yp-1",
        home_id="home-1",
    )

    assert result["draft_suggestions_only"] is True
    assert result["auto_finalised"] is False
    assert result["chronology_metadata"]["themes"]
    assert result["suggested_action_links"]
    assert result["suggested_document_updates"]
    assert result["handover_relevance"]["relevant"] is True
    assert "safeguarding chronology" in result["report_evidence_relevance"]["possible_reports"]
    assert contains_unsafe_language(result) == []


def test_orb_handover_recovery_uses_active_child_only_and_safe_language():
    answer = _operational_recovery_answer(
        message="Give me a handover for Jamie",
        related_records=[
            {
                "id": "r1",
                "young_person_id": 1,
                "summary": "Jamie returned from missing episode and needs follow-up review.",
                "status": "open",
            },
            {
                "id": "r2",
                "young_person_id": 2,
                "summary": "Other child record should not appear.",
                "status": "open",
            },
        ],
        context=OrbContext(
            selected_young_person_id=1,
            home_id=10,
            current_child={"id": 1, "preferred_name": "Jamie"},
        ),
        memory_context=None,
    )

    assert answer is not None
    assert "Records indicate Jamie" in answer
    assert "next shift" in answer.lower()
    assert "Other child" not in answer
    assert "definitely" not in answer.lower()
