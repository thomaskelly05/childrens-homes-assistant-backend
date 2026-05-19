from __future__ import annotations

from services.intelligence.chronology_engine import chronology_engine
from services.intelligence.document_operational_engine import document_operational_engine
from services.intelligence.event_bus import OperationalEvent, operational_event_bus
from services.intelligence.operational_graph import operational_graph_engine
from services.intelligence.orb_context_engine import orb_context_engine
from services.realtime_event_bus import realtime_event_bus


def test_chronology_engine_builds_domain_propagation_plan():
    plan = chronology_engine.propagation_plan(
        domain="academy",
        entity_type="training_completion",
        entity_id="tc-1",
        transition_type="completed",
    )

    assert plan.should_write_chronology is True
    assert plan.should_refresh_orb is True
    assert plan.should_publish_realtime is True
    assert "governance" in plan.targets
    assert any("Academy has no Next.js primary route" in gap for gap in plan.known_gaps)


def test_orb_context_engine_normalises_role_aware_explainable_context():
    result = orb_context_engine.build_context(
        current_user={"id": 7, "role": "manager", "home_id": 10, "provider_id": 99},
        requested_context={
            "current_route": "/staff/training-matrix",
            "visible_chronology_ids": ["chr-1"],
            "visible_evidence_ids": ["ev-1"],
        },
        mode="embedded",
    )

    assert result["ok"] is True
    assert result["domain"] == "workforce"
    assert result["orb_contract"]["role_aware"] is True
    assert result["explainability"]["references"]["chronology_ids"] == ["chr-1"]
    assert "audit_safe_reasoning" in result["explainability"]["must_include"]


def test_document_operational_engine_promotes_templates_to_operational_entities():
    contract = document_operational_engine.template_contract("daily_note")

    assert contract.template_id == "daily_note"
    assert contract.chronology_linkage is True
    assert contract.evidence_linkage is True
    assert contract.signoff_required is True
    assert contract.versioning_required is True
    assert "approve_or_sign_off" in contract.lifecycle


def test_operational_event_bus_maps_propagation_targets_to_realtime_events():
    event = OperationalEvent(
        domain="safeguarding",
        entity_type="safeguarding",
        entity_id="sg-1",
        transition_type="escalated",
        home_id=10,
        actor={"id": 7, "role": "manager", "home_id": 10, "provider_id": 99},
        payload={"severity": "high"},
    )

    plan = operational_event_bus.propagation_plan(event)

    assert "chronology.update" in plan["realtime_event_types"]
    assert "assistant.context_refresh" in plan["realtime_event_types"]
    assert "management.alert" in plan["realtime_event_types"]


def test_operational_event_bus_publishes_through_existing_realtime_bus():
    realtime_event_bus.reset_for_tests()
    actor = {"id": 7, "role": "manager", "home_id": 10, "provider_id": 99}
    event = OperationalEvent(
        domain="children",
        entity_type="daily_note",
        entity_id="dn-1",
        transition_type="approved",
        home_id=10,
        actor=actor,
        payload={"workflow_status": "approved"},
    )

    result = operational_event_bus.publish(event)
    replay = realtime_event_bus.replay_for_user(current_user=actor, home_id=10)

    assert result["ok"] is True
    assert any(item["published"] for item in result["results"])
    assert replay["ok"] is True
    assert {item["type"] for item in replay["events"]} >= {"chronology.update", "assistant.context_refresh"}


def test_operational_graph_link_contract_explains_relationship_without_graph_database():
    link = operational_graph_engine.link_contract(
        source_type="child",
        source_id=12,
        target_type="document",
        target_id="doc-1",
        relationship="evidenced_by",
        evidence_references=["ev-1"],
        chronology_references=["chr-1"],
    )

    assert link.source_id == "12"
    assert link.evidence_references == ("ev-1",)
    assert "audit source of truth" in link.rationale

