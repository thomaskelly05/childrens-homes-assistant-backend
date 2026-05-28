from __future__ import annotations

from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
STANDALONE_CLIENT = REPO / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
OPERATIONAL_CLIENT = REPO / "frontend-next" / "lib" / "orb" / "operational-client.ts"
OS_ORB_API = REPO / "frontend-next" / "lib" / "os-api" / "orb.ts"
STANDALONE_ROUTES = REPO / "routers" / "orb_standalone_routes.py"
OPERATIONAL_ROUTES = REPO / "routers" / "orb_operational_routes.py"
ORB_COMPANION = REPO / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
OPERATIONAL_UI = REPO / "frontend-next" / "components" / "orb-operational" / "orb-conversation-experience.tsx"


def test_standalone_client_does_not_import_operational_client():
    text = STANDALONE_CLIENT.read_text(encoding="utf-8")
    assert "operational-client" not in text
    assert "/assistant/orb" not in text
    assert "/api/assistant/orb" not in text


def test_operational_ui_imports_operational_client_only():
    text = OPERATIONAL_UI.read_text(encoding="utf-8")
    assert "operational-client" in text
    assert "/orb/standalone/" not in text


def test_standalone_routes_do_not_mount_assistant_orb_paths():
    text = STANDALONE_ROUTES.read_text(encoding="utf-8")
    assert 'prefix="/assistant/orb"' not in text
    assert "orb_operational_routes" not in text
    assert "orb_operational_assistant_service" not in text


def test_operational_routes_are_separate_prefix():
    text = OPERATIONAL_ROUTES.read_text(encoding="utf-8")
    assert 'prefix="/assistant/orb"' in text
    assert "/orb/standalone" not in text


def test_standalone_companion_does_not_call_os_apis():
    text = ORB_COMPANION.read_text(encoding="utf-8")
    for forbidden in ("/api/os/", "/os/", "operational-client", "/api/orb/conversation"):
        assert forbidden not in text


def test_operational_client_uses_assistant_orb_api_only():
    text = OPERATIONAL_CLIENT.read_text(encoding="utf-8")
    assert "/api/assistant/orb/" in text
    assert "/orb/standalone/" not in text
    assert "/api/orb/conversation" not in text
    assert "/api/assistant/orb/briefing" in text
    assert "/api/assistant/orb/briefings/" not in text


def test_os_orb_api_helper_stays_inside_assistant_orb_boundary():
    text = OS_ORB_API.read_text(encoding="utf-8")
    assert "/api/assistant/orb/conversation" in text
    assert "/api/orb/conversation" not in text
    assert "young_person_id" in text
    assert "child_id" in text
