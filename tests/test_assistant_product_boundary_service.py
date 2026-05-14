from __future__ import annotations

import pytest

from schemas.standalone_assistant import AssistantProductMode
from services.assistant_context_service import build_shared_assistant_context
from services.assistant_product_boundary_service import (
    assert_citations_allowed,
    assert_tool_allowed,
    build_product_boundary_decision,
    clear_unsafe_context_on_switch,
    sanitize_standalone_context,
)
from services.assistant_response_service import AssistantResponseService
from services.assistant_retrieval_service import AssistantRetrievalResult


def test_standalone_assistant_cannot_call_os_retrieval_tools():
    with pytest.raises(PermissionError):
        assert_tool_allowed(AssistantProductMode.STANDALONE_ASSISTANT, "young_person_records")


def test_standalone_assistant_cannot_use_os_citations():
    with pytest.raises(PermissionError):
        assert_citations_allowed(
            AssistantProductMode.STANDALONE_ASSISTANT,
            [
                {
                    "label": "Daily log #4",
                    "source_type": "daily_log",
                    "source_id": "4",
                    "route": "/young-people/12/daily-logs/4",
                    "young_person_name": "Test Child",
                }
            ],
        )


def test_switching_to_standalone_clears_active_child_context():
    context = {
        "assistant_product_mode": "standalone_assistant",
        "current_route": "/assistant",
        "home_id": 7,
        "selected_young_person_id": 12,
        "selected_record_summary": "Private child context",
        "visible_chronology_ids": ["c1"],
    }

    cleared = clear_unsafe_context_on_switch(AssistantProductMode.STANDALONE_ASSISTANT, context)

    assert cleared["home_id"] is None
    assert cleared["selected_young_person_id"] is None
    assert cleared["selected_record_summary"] is None
    assert cleared["visible_chronology_ids"] == []


def test_standalone_and_orb_memory_stores_are_separate():
    standalone = build_product_boundary_decision(
        {"assistant_product_mode": "standalone_assistant", "current_route": "/assistant"},
        mode="standalone",
    )
    orb = build_product_boundary_decision({"current_route": "/young-people/12"}, mode="embedded")

    assert standalone.memory_store == "standalone_assistant_memory"
    assert orb.memory_store == "os_orb_session_memory"
    assert standalone.audit_event_type == "standalone_assistant.query"
    assert orb.audit_event_type == "os_orb.query"


class FailingRetrievalService:
    def retrieve(self, *_args, **_kwargs):
        raise AssertionError("standalone assistant must not call OS retrieval")


class EmptyRetrievalService:
    def retrieve(self, *_args, **_kwargs):
        return AssistantRetrievalResult(
            sources=[],
            related_records=[],
            suggested_actions=[],
            evidence_gaps=[],
            regulatory_links=[],
            retrieval_errors=[],
        )


class _Cursor:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, *_args, **_kwargs):
        return None

    def fetchone(self):
        return {"exists": False}


class _Conn:
    def cursor(self, *_args, **_kwargs):
        return _Cursor()


def test_standalone_assistant_cannot_retrieve_young_person_data():
    context = build_shared_assistant_context(
        current_user={"id": 1, "role": "manager", "home_id": 9},
        requested_context={
            "current_route": "/assistant",
            "selected_young_person_id": 12,
            "selected_record_summary": "Unsafe active context",
        },
        mode="standalone",
    )

    data = AssistantResponseService(retrieval_service=FailingRetrievalService()).query(
        _Conn(),
        message="Summarise this young person's chronology.",
        context=context,
        current_user={"id": 1, "role": "manager", "home_id": 9},
    )

    assert data["assistant_product_mode"] == "standalone_assistant"
    assert data["related_records"] == []
    assert data["citations"] == []
    assert "No live IndiCare OS records" in data["answer"]


def test_standalone_sector_brain_can_cite_static_regulations_only():
    context = sanitize_standalone_context(
        build_shared_assistant_context(
            current_user={"id": 1, "role": "manager", "home_id": 9},
            requested_context={"current_route": "/assistant"},
            mode="standalone",
        )
    )

    data = AssistantResponseService(retrieval_service=FailingRetrievalService()).query(
        _Conn(),
        message="Explain Regulation 12 in plain English.",
        context=context,
        current_user={"id": 1, "role": "manager", "home_id": 9},
    )

    assert data["citations"]
    assert {item["source_type"] for item in data["citations"]} <= {"static_regulation", "static_framework", "static_guidance", "uploaded_source"}
    assert all(not str(item.get("route") or "").startswith("/young-people") for item in data["citations"])


def test_orb_remains_os_scoped_and_uses_retrieval():
    context = build_shared_assistant_context(
        current_user={"id": 1, "role": "manager", "home_id": 9},
        requested_context={"current_route": "/young-people/12", "selected_young_person_id": 12},
        mode="chronology_qna",
    )

    data = AssistantResponseService(retrieval_service=EmptyRetrievalService()).query(
        _Conn(),
        message="Summarise this young person's chronology.",
        context=context,
        current_user={"id": 1, "role": "manager", "home_id": 9},
    )

    assert data["assistant_product_mode"] != "standalone_assistant"
    assert "no citable sources" in data["answer"].lower()
