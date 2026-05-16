from __future__ import annotations

from schemas.operational_state import OperationalSearchRequest
from services.operational_state_service import operational_state_service


def test_operational_state_snapshot_links_states_queues_evidence_and_search():
    snapshot = operational_state_service.build_snapshot(
        current_user={"id": 1, "role": "manager", "home_id": 7},
        chronology=[
            {
                "id": "incident:201",
                "source_type": "incident",
                "source_id": "201",
                "title": "Safeguarding incident",
                "summary": "Disclosure recorded. Manager informed.",
                "young_person_id": "42",
                "home_id": "7",
                "date_time": "2026-05-15T10:00:00Z",
                "evidence_ids": ["evidence:1"],
            }
        ],
        actions=[
            {
                "id": "task:9",
                "source_type": "inspection_improvement_action",
                "source_id": "9",
                "title": "Reg 44 evidence follow-up",
                "status": "overdue",
                "priority": "high",
                "home_id": "7",
                "evidence_required": ["manager response"],
            }
        ],
        evidence=[
            {
                "id": "evidence:1",
                "source_type": "incident",
                "source_id": "201",
                "title": "Incident evidence",
                "quality": "review_required",
                "linked_regulation": "Reg 12",
                "home_id": "7",
            }
        ],
        documents=[
            {
                "id": "document:44",
                "source_type": "document",
                "source_id": "44",
                "title": "Reg 44 report",
                "document_type": "reg44_report",
                "status": "review_required",
                "home_id": "7",
                "regulation": "Reg 44",
            }
        ],
        workforce=[],
        scope={"home_id": 7},
        search=OperationalSearchRequest(query="Reg 44", unresolved_only=True),
    )

    assert snapshot.states
    assert snapshot.queues
    assert any(state.state_type == "safeguarding_follow_up" for state in snapshot.states)
    assert any(queue.queue_type == "inspection_actions" for queue in snapshot.queues)
    assert any(item.used_in_inspection_readiness for item in snapshot.evidence_relationships)
    assert any(result.title for result in snapshot.search_results)
    assert snapshot.assistant_context is not None
    assert snapshot.assistant_context.highest_priority_states
    assert snapshot.refresh["chronology_aware"] is True
