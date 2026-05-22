from __future__ import annotations

import asyncio
from pathlib import Path

import pytest
import routers.assistant_product_map_routes as assistant_product_map_routes
import routers.orb_standalone_routes as orb_standalone_routes
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app import app
from core.frontend_routes import register_frontend_routes

INDICARE_AI_DIR = Path(__file__).resolve().parents[1] / "indicare-ai"


def _frontend_client() -> TestClient:
    frontend_app = FastAPI()
    register_frontend_routes(frontend_app)
    return TestClient(frontend_app)


def _route(path: str, method: str) -> APIRoute:
    for route in app.router.routes:
        if isinstance(route, APIRoute) and route.path == path and method in route.methods:
            return route
    raise AssertionError(f"{method} {path} route is not registered")


def test_orb_page_serves_standalone_shell():
    with _frontend_client() as client:
        response = client.get("/orb")

    assert response.status_code == 200
    html = response.text
    assert "orb-care-companion-runtime-v2.js" in html
    assert "orb-care-companion-runtime.js" not in html
    assert "__ORB_STANDALONE_ONLY" in html
    assert 'data-os-linked="false"' in html
    assert 'data-care-record-access="false"' in html


def test_assistant_page_serves_os_assistant_shell():
    with _frontend_client() as client:
        response = client.get("/assistant")

    assert response.status_code == 200
    assert "assistant-runtime.js" in response.text
    assert "orb-care-companion-runtime-v2.js" not in response.text


def test_orb_asset_audit_declares_standalone_isolation():
    with _frontend_client() as client:
        response = client.get("/orb/assets/audit")

    assert response.status_code == 200
    payload = response.json()
    assert payload["route"] == "/orb"
    assert payload["os_linked"] is False
    assert payload["care_record_access"] is False
    assert payload["surface"] == "orb_standalone"
    assert payload["ok"] is True
    assert "orb-care-companion-runtime-v2.js" in payload["assets"]
    assert "/orb/standalone/conversation" in payload["api"]


def test_orb_config_points_to_standalone_endpoints_only():
    config_text = (INDICARE_AI_DIR / "orb-care-companion-config.js").read_text(encoding="utf-8")
    assert "/orb/standalone/conversation" in config_text
    assert "/orb/standalone/config" in config_text
    assert "/orb/conversation" not in config_text
    assert "/orb/config" not in config_text


def test_standalone_orb_health_route_is_registered():
    _route("/orb/standalone/health", "GET")


def test_standalone_orb_health_declares_isolation(fake_state):
    response = asyncio.run(
        orb_standalone_routes.standalone_orb_health(current_user=fake_state["user"])
    )
    data = response["data"]
    assert data["os_linked"] is False
    assert data["care_record_access"] is False
    assert data["surface"] == "standalone_orb_ai"


def test_standalone_orb_conversation_uses_mode_field(fake_state, monkeypatch):
    captured: dict = {}

    async def fake_answer(message, **kwargs):
        captured["message"] = message
        captured["kwargs"] = kwargs
        return {"answer": "Standalone guidance only.", "tools_used": ["standalone_orb_general_assistant"]}

    monkeypatch.setattr(
        orb_standalone_routes.orb_general_assistant_service,
        "answer",
        fake_answer,
    )

    response = asyncio.run(
        orb_standalone_routes.standalone_orb_conversation(
            orb_standalone_routes.OrbStandaloneConversationRequest(
                message="How should I record this?",
                mode="Record This Properly",
            ),
            current_user=fake_state["user"],
        )
    )

    assert response["context_used"]["os_linked"] is False
    assert response["context_used"]["care_record_access"] is False
    assert response["context_used"]["surface"] == "standalone_orb_ai"
    assert response["context_used"]["mode"] == "Record This Properly"
    assert "Mode: Record This Properly" in captured["message"]
    assert "How should I record this?" in captured["message"]
    assert "[Record This Properly]" not in captured["message"]


def test_assistants_map_route_is_registered():
    _route("/assistants/map", "GET")


def test_assistants_map_differentiates_os_and_standalone_orb(fake_state):
    response = asyncio.run(
        assistant_product_map_routes.assistant_product_map(current_user=fake_state["user"])
    )
    data = response["data"]
    products = data["products"]
    assert products["indicare_os_assistant"]["route"] == "/assistant"
    assert products["indicare_os_assistant"]["os_linked"] is True
    assert products["orb_care_companion"]["route"] == "/orb"
    assert products["orb_care_companion"]["os_linked"] is False
    assert products["orb_care_companion"]["care_record_access"] is False
    assert products["orb_care_companion"]["api"]["conversation"] == "/orb/standalone/conversation"
    assert "/orb/standalone/" in data["routing_rule"]


def test_orb_standalone_module_has_no_os_context_imports():
    source = Path(__file__).resolve().parents[1].joinpath("routers", "orb_standalone_routes.py").read_text(encoding="utf-8")
    assert "from services.orb_operational_context_service" not in source
    assert "build_orb_context" not in source
    assert "build_orb_response" not in source
    assert "get_db" not in source
    assert "orb_operational_context" not in source
