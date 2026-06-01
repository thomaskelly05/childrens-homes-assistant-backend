from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_dictate_dependency import require_orb_dictate_access
from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_dictate_routes import router
from services.orb_dictate_service import generate_dictate_note
from services.orb_dictate_speaker import (
    parse_introduction_line,
    suggest_participants_from_text,
    text_to_segments,
)
from schemas.orb_dictate import (
    OrbDictateGenerateRequest,
    OrbDictateParticipant,
    OrbDictateTranscriptSegment,
)


@pytest.fixture
def dictate_client():
    app = FastAPI()
    app.include_router(router)

    async def fake_auth():
        return {"id": 1, "user_id": 1, "role": "orb_residential", "email": "orb@test"}

    app.dependency_overrides[require_orb_residential_auth] = fake_auth
    app.dependency_overrides[require_orb_dictate_access] = fake_auth
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_parse_self_introduction():
    parsed = parse_introduction_line("Tom Kelly, Registered Manager, speaking.")
    assert parsed is not None
    assert parsed[0] == "Tom Kelly"
    assert "Manager" in (parsed[1] or "")


def test_suggest_participants_from_transcript():
    text = "Tom Kelly, Registered Manager, speaking.\nSarah Jones, Deputy Manager, speaking."
    people = suggest_participants_from_text(text)
    assert len(people) >= 2
    assert any(p.name == "Tom Kelly" for p in people)


def test_generate_team_meeting_requires_consent(dictate_client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/generate",
        json={
            "input_text": "Team meeting about staffing.",
            "note_type": "team_meeting",
            "mode": "team_meeting",
            "consent_confirmed": False,
        },
    )
    assert response.status_code == 400


def test_generate_investigation_requires_boundary(dictate_client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/generate",
        json={
            "input_text": "Investigation discussion.",
            "note_type": "investigation_meeting",
            "mode": "investigation_meeting",
            "consent_confirmed": True,
            "investigation_boundary_confirmed": False,
        },
    )
    assert response.status_code == 400


def test_generate_returns_speaker_summary(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Tom Kelly, Registered Manager, speaking. We reviewed the plan.",
            note_type="team_meeting",
            mode="team_meeting",
            consent_confirmed=True,
            participants=[
                OrbDictateParticipant(
                    id="p1",
                    name="Tom Kelly",
                    role="Registered Manager",
                    introduced_by="self",
                )
            ],
            segments=[
                OrbDictateTranscriptSegment(
                    id="s1",
                    speaker_id="p1",
                    speaker_label="Tom Kelly, Registered Manager",
                    text="We reviewed the plan.",
                    source="paste",
                )
            ],
        )
    )
    assert result.speaker_summary is not None
    assert result.speaker_boundary_notice
    assert result.participants


def test_quality_checks_extended_fields():
    from services.orb_dictate_quality import compute_quality_checks

    checks = compute_quality_checks(
        'Child said "I need space." Staff supported with calm voice. Follow-up tomorrow.',
        "daily_record",
    )
    assert checks.factual_clarity in {"present", "weak", "missing"}
    assert checks.non_judgemental_language in {"present", "review", "missing"}


def test_text_to_segments():
    segs = text_to_segments("Tom Kelly: Hello team.\n\nSarah Jones: Thanks.")
    assert len(segs) >= 1
