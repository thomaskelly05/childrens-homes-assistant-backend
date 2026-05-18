from __future__ import annotations

from pathlib import Path


def test_governance_routes_are_registered():
    import app as app_module

    route_paths = {getattr(route, "path", "") for route in app_module.app.routes}

    assert "/api/governance-os/command-centre" in route_paths
    assert "/api/governance-os/evidence-matrix" in route_paths
    assert "/api/governance-os/reg44" in route_paths
    assert "/api/governance-os/reg45" in route_paths
    assert "/api/governance-os/orb-context" in route_paths
    assert "/api/governance-os/inspection-forecast" in route_paths


def test_governance_audit_documents_consolidation_decisions():
    from services.governance_intelligence_service import GovernanceIntelligenceService

    audit = GovernanceIntelligenceService().audit_summary()

    assert audit["ok"] is True
    assert "WorkspaceOrchestratorService" in " ".join(audit["existing_systems_reused"])
    assert any("calculated once" in item for item in audit["consolidation_decisions"])
    assert audit["feature_flags"]["governance_os"] is True


def test_sccif_evidence_matrix_links_quality_standards_regulations_and_sources():
    from services.governance_intelligence_service import GovernanceIntelligenceService

    service = GovernanceIntelligenceService()
    evidence = service.evidence_index_from_payloads(
        records=[
            {
                "id": 1,
                "record_type": "incident",
                "summary": "Safeguarding concern, missing episode and Reg 12 protection evidence.",
            },
            {
                "id": 2,
                "record_type": "training_record",
                "summary": "Staff training and supervision evidence for leadership and workforce stability.",
            },
            {
                "id": 3,
                "record_type": "task",
                "summary": "Manager action tracker for Reg 44 and Reg 45 quality assurance.",
            },
        ]
    )

    matrix = service.build_evidence_matrix(evidence_index=evidence)
    node_types = {entry["node_type"] for entry in matrix["entries"]}
    covered = [entry for entry in matrix["entries"] if entry["evidence_count"]]

    assert {"sccif_area", "quality_standard", "regulation"} <= node_types
    assert covered
    assert any(entry["node_id"] == "reg_12" for entry in covered)
    assert matrix["summary"]["evidence_sources"] == 3


def test_governance_risk_engine_reuses_existing_signal_outputs():
    from services.governance_intelligence_service import score_governance_risk

    risk = score_governance_risk(
        {
            "manager_risk": "high",
            "evidence_gap_count": 5,
            "unresolved_action_count": 4,
            "reg44_open_action_count": 2,
            "child_instability_count": 3,
            "safeguarding_signal_count": 2,
            "workforce_alert_count": 2,
            "workforce_health_score": 70,
        }
    )

    assert risk["score"] >= 80
    assert risk["level"] == "critical"
    assert "manager_risk" in risk["drivers"]


def test_reg44_lifecycle_allows_ordered_visit_transitions():
    from services.governance_intelligence_service import REG44_LIFECYCLE, validate_reg44_transition

    assert REG44_LIFECYCLE == ("scheduled", "in_progress", "completed", "reviewed", "actioned", "closed")
    assert validate_reg44_transition("scheduled", "in_progress") is True
    assert validate_reg44_transition("reviewed", "closed") is False


def test_reg45_generation_uses_evidence_assisted_builder():
    from services.governance_intelligence_service import GovernanceIntelligenceService

    service = GovernanceIntelligenceService()
    reg45 = service.build_reg45_review(
        evidence_index=service.evidence_index_from_payloads(
            records=[
                {"id": 1, "record_type": "daily_note", "summary": "Young person said they felt safer in routine."},
                {"id": 2, "record_type": "incident", "summary": "Missing episode with safeguarding follow-up."},
                {"id": 3, "record_type": "task", "summary": "Manager review action completed."},
            ]
        )
    )

    assert reg45["required_sections"]
    assert "strengths" in reg45
    assert "weaknesses" in reg45
    assert "trends" in reg45
    assert "action_plans" in reg45
    assert "No final judgement is generated." in reg45["guardrails"]


def test_orb_retrieval_receives_governance_evidence_context(monkeypatch):
    from services.assistant_context_service import build_shared_assistant_context
    from services.assistant_retrieval_service import AssistantRetrievalService

    monkeypatch.setattr("services.assistant_retrieval_service.list_chronology", lambda **_kwargs: {"items": []})
    monkeypatch.setattr("services.assistant_retrieval_service.list_evidence", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.list_actions", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.list_documents", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.assistant_retrieval_service.list_reports", lambda *_args, **_kwargs: [])

    class _GovernanceIntelligence:
        def build_command_centre(self, *_args, **_kwargs):
            return {
                "orb_governance_summary": {
                    "governance_summary": {"risk_level": "high", "evidence_gaps": 2},
                    "evidence_sources": [
                        {
                            "id": "gov:1",
                            "source_id": "1",
                            "title": "Inspection readiness gap",
                            "summary": "SCCIF leadership evidence gap with Reg 44 action.",
                            "regulation_links": ["reg_44"],
                            "sccif_links": ["sccif_effectiveness_of_leaders"],
                        }
                    ],
                }
            }

    monkeypatch.setattr("services.assistant_retrieval_service.GovernanceIntelligenceService", _GovernanceIntelligence)

    context = build_shared_assistant_context(
        current_user={"id": 2, "role": "manager", "home_id": 7, "allowed_home_ids": [7]},
        requested_context={"current_route": "/governance/command-centre"},
        mode="regulatory_readiness",
    )
    result = AssistantRetrievalService().retrieve(
        object(),
        message="What are our governance inspection readiness gaps?",
        context=context,
        current_user={"id": 2, "role": "manager", "home_id": 7, "allowed_home_ids": [7]},
    )

    source_types = {source["source_type"] for source in result.sources}
    assert "governance_evidence" in source_types
    assert "governance_intelligence" in source_types
    assert any(link["label"] == "reg_44" for link in result.regulatory_links)


def test_governance_command_centre_frontend_smoke_contracts():
    root = Path("frontend-next")
    adapter = (root / "lib/os-api/governance.ts").read_text()
    page = (root / "app/governance/command-centre/page.tsx").read_text()
    shell = (root / "components/indicare/app-shell.tsx").read_text()

    assert "/api/governance-os/command-centre" in adapter
    assert "getGovernanceCommandCentre" in page
    assert "SCCIF evidence matrix" in page
    assert "Reg 44 lifecycle" in page
    assert "/governance/command-centre" in shell
