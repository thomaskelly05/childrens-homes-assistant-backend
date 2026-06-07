"""ORB Residential launch smoke-test contract checks (mocked / static)."""

from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
from fastapi import HTTPException

import routers.orb_agent_routes as agent_routes
import routers.orb_document_routes as document_routes
import routers.orb_saved_output_routes as output_routes
import routers.orb_voice_residential_routes as voice_routes
from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access
from routers.orb_standalone_routes import standalone_orb_config
from schemas.orb_agents import OrbAgentRunRequest, OrbDeepResearchRequest
from schemas.orb_documents import OrbDocumentAnalysisRequest
from schemas.orb_saved_outputs import OrbSavedOutputCreate


REPO_ROOT = Path(__file__).resolve().parents[1]
PERF_AUDIT_DOC = REPO_ROOT / "docs" / "orb-performance-audit.md"
SMOKE_TEST_DOC = REPO_ROOT / "docs" / "orb-residential-launch-smoke-test.md"

FORBIDDEN_ID_FIELDS = (
    "child_id",
    "young_person_id",
    "staff_id",
    "home_id",
    "record_id",
    "chronology_id",
)


def test_performance_audit_doc_exists():
    assert PERF_AUDIT_DOC.is_file()
    text = PERF_AUDIT_DOC.read_text(encoding="utf-8")
    assert "Executive summary" in text
    assert "Route timing map" in text


def test_smoke_test_doc_exists():
    assert SMOKE_TEST_DOC.is_file()
    text = SMOKE_TEST_DOC.read_text(encoding="utf-8")
    assert "Pass / fail summary" in text
    assert "Final launch readiness rating" in text


def test_unauthenticated_config_returns_not_authenticated():
    with pytest.raises(HTTPException) as exc:
        require_orb_product_bootstrap_access(conn=None, current_user={})
    assert exc.value.status_code == 401
    detail = exc.value.detail
    assert detail.get("error") == "not_authenticated"


def test_config_boundary_contract(fake_state):
    payload = asyncio.run(standalone_orb_config(current_user=fake_state["user"]))
    data = payload["data"]
    assert data.get("standalone") is True
    assert data.get("os_linked") is False
    assert data.get("care_record_access") is False
    assert data.get("young_person_record_access") is False
    assert data.get("chronology_access") is False
    assert data.get("direct_writes") is False


@pytest.mark.parametrize("field_name", FORBIDDEN_ID_FIELDS)
def test_agent_run_rejects_os_identifiers(fake_state, field_name):
    payload = {"prompt": "Research safeguarding themes", field_name: 42}
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(
            agent_routes.run_agent(
                OrbAgentRunRequest(**payload),
                current_user=fake_state["user"],
            )
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_deep_research_live_web_note(fake_state, monkeypatch):
    from schemas.orb_agents import OrbAgentOutput, OrbDeepResearchResponse

    async def stub_deep(_request):
        return OrbDeepResearchResponse(
            query="test",
            depth="standard",
            output=OrbAgentOutput(title="Research", body="Briefing", format="briefing"),
            live_web_note="Live web retrieval is not enabled",
            context_used={"standalone_only": True, "os_linked": False},
        )

    monkeypatch.setattr(agent_routes.orb_deep_research_service, "run_deep_research", stub_deep)

    response = await agent_routes.deep_research(
        OrbDeepResearchRequest(query="research Ofsted missing from care"),
        current_user=fake_state["user"],
    )
    assert response["success"] is True
    assert "live web" in response["data"]["live_web_note"].lower()


@pytest.mark.asyncio
async def test_document_analysis_standalone_boundary(fake_state, monkeypatch):
    from schemas.orb_documents import OrbDocumentUnderstanding

    async def stub_analyse(_request):
        return OrbDocumentUnderstanding(
            title="Sample incident note",
            plain_english_summary="Sample analysis.",
            key_points=[],
            risks=[],
            actions=[],
            sources=[],
            citations=[],
            safety_notice="Standalone only.",
            context_used={
                "standalone_only": True,
                "os_linked": False,
                "care_record_access": False,
            },
            evaluation={"passed": True, "score": 0.8},
        )

    monkeypatch.setattr(
        document_routes.orb_document_understanding_service,
        "analyse_document",
        stub_analyse,
    )

    response = await document_routes.analyse_document(
        OrbDocumentAnalysisRequest(
            mode="manager_briefing",
            text="Sample incident note for review.",
            include_evaluation=True,
        ),
        current_user=fake_state["user"],
    )
    understanding = response["data"].get("understanding") or {}
    assert understanding.get("standalone_only") is True
    assert understanding.get("care_record_access") is False
    assert understanding.get("evaluation")


def test_saved_outputs_smoke_flow(fake_state):
    from services.orb_saved_output_service import orb_saved_output_service

    orb_saved_output_service._memory = {}
    orb_saved_output_service._storage_mode = "memory"

    created = asyncio.run(
        output_routes.create_output(
            OrbSavedOutputCreate(
                title="Evidence map draft",
                type="ofsted_evidence_map",
                summary="Ofsted missing-from-care map",
                content_markdown="# Evidence map\n\nDraft.",
            ),
            current_user=fake_state["user"],
        )
    )
    output_id = created["data"]["id"]

    summary = asyncio.run(output_routes.outputs_summary(current_user=fake_state["user"]))
    assert summary["success"] is True

    reopened = asyncio.run(output_routes.get_output(output_id, current_user=fake_state["user"]))
    assert reopened["data"]["title"] == "Evidence map draft"


def test_voice_session_status_returns_payload(fake_state):
    response = asyncio.run(voice_routes.orb_voice_session_status(_current_user=fake_state["user"]))
    assert "realtime_enabled" in response or response.get("ok") is not False
