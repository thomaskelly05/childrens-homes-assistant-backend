from __future__ import annotations

import asyncio
from pathlib import Path

import pytest

import routers.orb_document_routes as document_routes
from services.orb_knowledge_library_service import orb_knowledge_library_service


@pytest.fixture(autouse=True)
def memory_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()


SAMPLE = (
    "Daily notes should be factual, child-centred and include the child's voice. "
    "Avoid attention seeking or bad behaviour labels."
)


def test_documents_health(fake_state):
    response = asyncio.run(document_routes.documents_health(current_user=fake_state["user"]))
    assert response["success"] is True
    assert response["data"]["standalone_only"] is True


def test_upload_and_analyse_routes(fake_state):
    upload = asyncio.run(
        document_routes.upload_document(
            document_routes.OrbDocumentUploadRequest(title="Notes policy", text=SAMPLE),
            current_user=fake_state["user"],
        )
    )
    assert upload["success"] is True
    source_id = upload["data"]["source_id"]

    analyse = asyncio.run(
        document_routes.analyse_document(
            document_routes.OrbDocumentAnalysisRequest(
                mode="explain", source_id=source_id
            ),
            current_user=fake_state["user"],
        )
    )
    assert analyse["success"] is True
    assert analyse["data"]["understanding"]["plain_english_summary"]


def test_action_plan_route(fake_state):
    response = asyncio.run(
        document_routes.document_action_plan(
            document_routes.OrbDocumentAnalysisRequest(mode="explain", text=SAMPLE, title="T"),
            current_user=fake_state["user"],
        )
    )
    understanding = response["data"]["understanding"]
    assert understanding["action_plan"]


def test_briefing_and_compare_routes(fake_state):
    briefing = asyncio.run(
        document_routes.document_briefing(
            document_routes.OrbDocumentAnalysisRequest(
                mode="manager_briefing", text=SAMPLE, title="T"
            ),
            current_user=fake_state["user"],
        )
    )
    assert briefing["success"] is True

    compare = asyncio.run(
        document_routes.document_compare(
            document_routes.OrbDocumentAnalysisRequest(text=SAMPLE, title="T"),
            current_user=fake_state["user"],
        )
    )
    assert compare["data"]["understanding"]["analysis_mode"] == "policy_comparison"


def test_summary_route(fake_state):
    upload = asyncio.run(
        document_routes.upload_document(
            document_routes.OrbDocumentUploadRequest(title="Sum", text=SAMPLE),
            current_user=fake_state["user"],
        )
    )
    summary = asyncio.run(
        document_routes.document_summary(
            upload["data"]["source_id"],
            current_user=fake_state["user"],
        )
    )
    assert summary["success"] is True


def test_rejects_os_ids(fake_state):
    with pytest.raises(Exception) as exc:
        asyncio.run(
            document_routes.upload_document(
                document_routes.OrbDocumentUploadRequest(
                    title="Bad",
                    text=SAMPLE,
                    metadata={"child_id": 1},
                ),
                current_user=fake_state["user"],
            )
        )
    assert exc.value.status_code == 400  # type: ignore[attr-defined]


def test_document_router_registered():
    loader = Path(__file__).resolve().parents[1] / "core" / "router_loader.py"
    text = loader.read_text(encoding="utf-8")
    assert "routers.orb_document_routes" in text
    assert "routers.orb_evaluation_routes" in text
