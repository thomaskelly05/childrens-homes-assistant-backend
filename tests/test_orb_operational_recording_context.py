from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

SCHEMA = REPO_ROOT / "schemas" / "orb_operational.py"
SERVICE = REPO_ROOT / "services" / "orb_operational_assistant_service.py"
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "operational-client.ts"
ROUTES = REPO_ROOT / "routers" / "orb_operational_routes.py"


def test_recording_live_coach_mode_registered():
    schema = SCHEMA.read_text(encoding="utf-8")
    routes = ROUTES.read_text(encoding="utf-8")
    client = CLIENT.read_text(encoding="utf-8")
    service = SERVICE.read_text(encoding="utf-8")
    assert "recording_live_coach" in schema
    assert "recording_live_coach" in routes
    assert "recording_live_coach" in client
    assert "Recording workspace context" in service or "form_id" in service


def test_operational_recording_context_fields():
    schema = SCHEMA.read_text(encoding="utf-8")
    client = CLIENT.read_text(encoding="utf-8")
    for field in ("form_id", "recording_type", "selected_excerpt", "high_level_flags"):
        assert field in schema
        assert field in client


def test_operational_orb_recording_href_helper():
    client = CLIENT.read_text(encoding="utf-8")
    assert "operationalOrbRecordingHref" in client
    assert "/assistant/orb" in client
    assert "no full draft body" in client.lower() or "never includes full draft body" in client.lower()
