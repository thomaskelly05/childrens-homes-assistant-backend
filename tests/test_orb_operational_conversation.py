from __future__ import annotations

import asyncio
from typing import Any

import routers.orb_routes as orb_routes
from app import app
from fastapi.routing import APIRoute
from services.orb_operational_context_service import build_orb_context, build_orb_response


class FakeCursor:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, *_args, **_kwargs):
        return None

    def fetchone(self):
        return {"exists": False}

    def fetchall(self):
        return []


class FakeConn:
    closed = False

    def cursor(self, *_args, **_kwargs):
        return FakeCursor()

    def rollback(self):
        return None


def test_api_orb_conversation_route_is_registered():
    assert any(
        isinstance(route, APIRoute)
        and route.path == "/api/orb/conversation"
        and "POST" in route.methods
        for route in app.router.routes
    )


def test_orb_conversation_route_returns_structured_answer(monkeypatch, fake_state):
    def fake_context(conn, current_user, scope, message, **kwargs):
        assert conn is fake_conn
        assert current_user["id"] == fake_state["user"]["id"]
        assert scope == "home"
        assert message == "What has changed today?"
        return {
            "answer": "Records indicate a calm review point.",
            "summary": "One source cited.",
            "sources": [{"title": "Daily note", "record_type": "daily_log", "record_id": "1", "citation_ref": "[1]"}],
            "actions": [],
            "confidence": "medium",
            "context_used": {"scope": "home", "projection_keys": [], "live_tables": ["daily_notes"], "snapshot_hit": False},
        }

    fake_conn = FakeConn()
    monkeypatch.setattr("routers.orb_routes.build_orb_context", fake_context)

    response = asyncio.run(
        orb_routes.api_orb_conversation(
            orb_routes.OrbConversationRequest(message="What has changed today?", scope="home"),
            conn=fake_conn,
            current_user=fake_state["user"],
        )
    )

    assert response["ok"] is True
    assert response["answer"]
    assert response["sources"][0]["citation_ref"] == "[1]"
    assert response["confidence"] == "medium"
    assert response["guardrails"]
    assert response["context_used"]["live_tables"] == ["daily_notes"]


def test_orb_context_gracefully_handles_no_live_data(fake_state):
    context = build_orb_context(
        FakeConn(),
        current_user=fake_state["user"],
        scope="inspection",
        message="What is missing for inspection readiness?",
    )
    response = build_orb_response(context)

    assert response["ok"] is True
    assert response["sources"] == []
    assert "I could not find live records for that area yet." in response["answer"]
    assert response["confidence"] == "low"
    assert response["context_used"]["snapshot_hit"] is False


def test_orb_context_uses_live_context_where_available(monkeypatch, fake_state):
    def fake_chronology(*_args: Any, **_kwargs: Any):
        return {
            "items": [
                {
                    "title": "Daily recording",
                    "source_type": "daily_log",
                    "source_id": "42",
                    "source_url": "/daily-logs/42",
                    "date_time": "2026-05-19T09:00:00Z",
                    "summary": "Jamie said school felt calmer after staff checked the timetable.",
                }
            ]
        }

    monkeypatch.setattr("services.orb_operational_context_service._existing_tables", lambda _conn: ["daily_notes", "young_people"])
    monkeypatch.setattr("services.orb_operational_context_service._snapshot_rows", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.orb_operational_context_service.list_chronology_for_connection", fake_chronology)
    monkeypatch.setattr("services.orb_operational_context_service.list_documents", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.orb_operational_context_service.list_actions", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.orb_operational_context_service.list_evidence", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.orb_operational_context_service.list_reports", lambda *_args, **_kwargs: [])
    monkeypatch.setattr("services.orb_operational_context_service.list_young_people", lambda *_args, **_kwargs: [])

    context = build_orb_context(
        FakeConn(),
        current_user=fake_state["user"],
        scope="home",
        message="What has changed today?",
    )
    response = build_orb_response(context)

    assert response["sources"][0]["record_type"] == "daily_log"
    assert response["sources"][0]["record_id"] == "42"
    assert "[1]" in response["answer"]
    assert response["context_used"]["live_tables"] == ["daily_notes", "young_people"]
