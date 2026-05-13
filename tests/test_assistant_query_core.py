from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

import routers.assistant_query_routes as assistant_query_routes
from repositories.os_repository_utils import build_scope_where
from services.assistant_context_service import build_shared_assistant_context
from services.assistant_response_service import AssistantResponseService
from services.assistant_retrieval_service import AssistantRetrievalResult


def test_assistant_query_route_uses_shared_context(fake_state, monkeypatch):
    captured: dict[str, Any] = {}
    fake_state["user"]["role"] = "manager"

    def fake_query(conn, *, message, context, current_user):
        captured["message"] = message
        captured["context"] = context
        captured["current_user"] = current_user
        return {
            "answer": "Records indicate a cited answer.",
            "citations": [{"label": "Daily recording #1", "source_type": "daily_log", "source_id": "1"}],
            "related_records": [],
            "suggested_actions": [],
            "evidence_gaps": [],
            "regulatory_links": [],
            "follow_up_questions": [],
            "confidence": "medium",
            "review_required": True,
        }

    monkeypatch.setattr("routers.assistant_query_routes.assistant_response_service.query", fake_query)

    class FakeConn:
        pass

    response = asyncio.run(
        assistant_query_routes.query_assistant(
            assistant_query_routes.AssistantQueryRequest(
                message="Summarise this young person's last 7 days.",
                mode="embedded",
                context={
                    "current_route": "/young-people/12",
                    "selected_young_person_id": 12,
                },
            ),
            conn=FakeConn(),
            current_user=fake_state["user"],
        )
    )

    body = response
    assert body["success"] is True
    assert body["data"]["review_required"] is True
    assert captured["context"].assistant_mode == "embedded"
    assert captured["context"].selected_young_person_id == 12
    assert captured["context"].permissions


def test_assistant_query_requires_authentication(client):
    response = client.post(
        "/assistant/query",
        json={"message": "Can I use the assistant?", "mode": "standalone", "context": {}},
    )

    assert response.status_code == 401


def test_os_scope_where_blocks_other_home_for_non_admin():
    where, params = build_scope_where(
        {"home_id", "archived"},
        {"id": 10, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]},
        home_id=2,
    )

    assert "1 = 0" in where
    assert 2 not in params


@dataclass
class EmptyRetrievalService:
    def retrieve(self, *_args, **_kwargs):
        return AssistantRetrievalResult(
            sources=[],
            related_records=[],
            suggested_actions=[],
            evidence_gaps=[{"area": "evidence", "gap": "No evidence records were found.", "severity": "review"}],
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


def test_record_specific_answer_requires_citations():
    context = build_shared_assistant_context(
        current_user={"id": 1, "role": "manager", "home_id": 1},
        requested_context={"selected_young_person_id": 4},
        mode="chronology_qna",
    )
    service = AssistantResponseService(retrieval_service=EmptyRetrievalService())

    data = service.query(
        _Conn(),
        message="Summarise this young person's chronology.",
        context=context,
        current_user={"id": 1, "role": "manager", "home_id": 1},
    )

    assert data["citations"] == []
    assert "no citable sources" in data["answer"].lower()
    assert data["confidence"] == "low"
    assert data["review_required"] is True
