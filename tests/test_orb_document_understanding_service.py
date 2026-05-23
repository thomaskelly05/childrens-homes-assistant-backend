from __future__ import annotations

import asyncio

import pytest

from schemas.orb_documents import OrbDocumentAnalysisRequest
from services.orb_document_understanding_service import (
    OFSTED_LENS_NOTICE,
    SAFEGUARDING_LENS_NOTICE,
    orb_document_understanding_service,
)
from services.orb_knowledge_library_service import orb_knowledge_library_service


@pytest.fixture(autouse=True)
def memory_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()


SAMPLE_TEXT = (
    "Daily notes should be factual, child-centred and should include the child's voice where possible. "
    "Staff should describe what happened, how adults responded, and what support was offered. "
    "Avoid judgemental phrases such as attention seeking or bad behaviour."
)


def test_explain_mode_raw_text():
    request = OrbDocumentAnalysisRequest(mode="explain", title="Daily notes", text=SAMPLE_TEXT)
    result = asyncio.run(orb_document_understanding_service.analyse_document(request))
    assert result.plain_english_summary
    assert result.standalone_only is True
    assert result.os_linked is False
    assert result.care_record_access is False


def test_action_plan_mode():
    request = OrbDocumentAnalysisRequest(mode="action_plan", title="Policy", text=SAMPLE_TEXT)
    result = asyncio.run(orb_document_understanding_service.analyse_document(request))
    assert result.action_plan
    assert result.action_plan.actions
    assert any(a.priority for a in result.action_plan.actions)


def test_manager_briefing_mode():
    request = OrbDocumentAnalysisRequest(mode="manager_briefing", title="Brief", text=SAMPLE_TEXT)
    result = asyncio.run(orb_document_understanding_service.analyse_document(request))
    assert result.plain_english_summary
    assert result.key_themes


def test_safeguarding_lens_includes_caveat():
    request = OrbDocumentAnalysisRequest(mode="safeguarding_lens", title="Doc", text=SAMPLE_TEXT)
    result = asyncio.run(orb_document_understanding_service.analyse_document(request))
    assert SAFEGUARDING_LENS_NOTICE.split(".")[0] in (result.safety_notice or "")
    assert "threshold" in (result.safety_notice or "").lower() or "escalat" in (result.safety_notice or "").lower()


def test_ofsted_lens_no_grades_caveat():
    request = OrbDocumentAnalysisRequest(mode="ofsted_lens", title="Doc", text=SAMPLE_TEXT)
    result = asyncio.run(orb_document_understanding_service.analyse_document(request))
    assert "grade" in (result.safety_notice or "").lower() or OFSTED_LENS_NOTICE in (result.safety_notice or "")
    limitations = " ".join(result.limitations).lower()
    assert "grade" in limitations or "predict" in limitations


def test_source_id_analysis(monkeypatch):
    ingested = orb_knowledge_library_service.create_source(
        {
            "title": "Test policy",
            "description": "Test",
            "source_type": "policy",
            "status": "indexed",
            "origin": "user_uploaded",
        }
    )
    orb_knowledge_library_service.upsert_chunks(
        ingested["id"],
        [
            {
                "id": f"{ingested['id']}-chunk-0",
                "source_id": ingested["id"],
                "chunk_index": 0,
                "text": SAMPLE_TEXT,
                "citation_label": "Test policy",
            }
        ],
    )
    result = asyncio.run(
        orb_document_understanding_service.analyse_source(ingested["id"], "summarise")
    )
    assert result.plain_english_summary
    assert result.source_id == ingested["id"]


def test_service_module_has_no_os_imports():
    from pathlib import Path

    text = Path("services/orb_document_understanding_service.py").read_text(encoding="utf-8")
    assert "intelligence_spine" not in text.lower()
    assert "care_hub" not in text.lower()
    assert "child_id" not in text
