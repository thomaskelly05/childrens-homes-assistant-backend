"""Template-to-ORB Write auto-fill — sections, prompts, handoff."""

from __future__ import annotations

from pathlib import Path

import pytest

from schemas.orb_dictate import OrbDictatePrepareWriteRequest
from services.orb_dictate_service import prepare_write_document
from services.orb_recording_framework_service import build_structured_write_body, resolve_record_type

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def _read(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_template_creates_write_document_with_correct_sections():
    record_type = resolve_record_type(record_type_id="missing_from_home_record")
    body = build_structured_write_body(
        record_type=record_type,
        note_type="missing_episode_note",
    )
    assert "##" in body
    for heading in ("Return", "Child"):
        assert any(heading.lower() in line.lower() for line in body.splitlines() if line.startswith("##"))


def test_dictate_transcript_maps_to_write_sections():
    record_type = resolve_record_type(record_type_id="daily_record", note_type="daily_record")
    body = build_structured_write_body(
        record_type=record_type,
        note_type="daily_record",
        transcript="At 14:30 young person said they felt anxious.",
        professional_note="## What happened\n\nCalm support offered after tea.",
    )
    assert "What happened" in body or "happened" in body.lower()


def test_missing_fields_show_prompts_not_invented_content():
    result = prepare_write_document(
        OrbDictatePrepareWriteRequest(
            note_type="safeguarding_concern_record",
            transcript="Concern noted in lounge.",
        )
    )
    assert "*" in result.structured_body
    assert "invented" not in result.structured_body.lower()


def test_prepare_write_endpoint_wired_in_router():
    routes = (REPO_ROOT / "routers" / "orb_dictate_routes.py").read_text(encoding="utf-8")
    assert "/prepare-write" in routes
    assert "prepare_write_document" in routes


def test_frontend_template_handoff_carries_transcript():
    handoff = _read("lib/orb/write/orb-write-template-handoff.ts")
    assert "transcript" in handoff
    assert "structured_body" in handoff


def test_frontend_prepare_write_client_exists():
    client = _read("lib/orb/dictate/orb-dictate-client.ts")
    assert "prepareWriteOrbDocument" in client
    assert "/prepare-write" in client


def test_write_panel_uses_prepare_write_for_template_handoff():
    panel = _read("components/orb-write/orb-write-standalone-panel.tsx")
    assert "prepareWriteOrbDocument" in panel
    assert "loadOrbWriteTemplateHandoff" in panel


def test_voice_handoff_to_write_exists():
    companion = _read("components/orb-standalone/orb-care-companion.tsx")
    assert "openOrbWriteWithContent" in companion or "convergedHandoffToOrbWrite" in companion
