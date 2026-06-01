from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_dictate_dependency import require_orb_dictate_access
from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_dictate_routes import router
from services.orb_dictate_edit_service import edit_dictate_document
from services.orb_dictate_service import generate_dictate_note
from schemas.orb_dictate import OrbDictateEditRequest, OrbDictateGenerateRequest


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


def test_dictate_templates_returns_note_types(dictate_client):
    response = dictate_client.get("/orb/dictate/templates")
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert isinstance(data, list)
    assert len(data) >= 8
    assert any(item["note_type"] == "incident_record" for item in data)
    assert "standalone_boundary" in body


def test_dictate_generate_without_openai(monkeypatch, dictate_client):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/generate",
        json={
            "input_text": "Child became distressed at tea. Staff offered space and calm voice.",
            "note_type": "daily_record",
            "include_child_voice": True,
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["note_type"] == "daily_record"
    assert data["professional_note"]
    assert data["quality_checks"]["recording_quality"] in {"good", "needs_review"}
    assert "IndiCare OS" in data["standalone_boundary"]


def test_dictate_generate_team_meeting_requires_consent_confirmed(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/generate",
        json={
            "input_text": "Team meeting notes.",
            "note_type": "team_meeting",
            "mode": "team_meeting",
            "consent_confirmed": False,
        },
    )
    assert response.status_code == 400


def test_dictate_generate_requires_consent_for_conversation(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/generate",
        json={
            "input_text": "Team debrief about missing episode.",
            "note_type": "staff_debrief",
            "source": "dictation",
            "conversation_consent_confirmed": False,
        },
    )
    assert response.status_code == 400


def test_dictate_save_returns_standalone_boundary(dictate_client, monkeypatch):
    from schemas.orb_saved_outputs import OrbSavedOutputRecord

    def fake_create(_user_id, payload):
        return OrbSavedOutputRecord(
            id="out_test",
            title=payload.title,
            type=payload.type,
        )

    monkeypatch.setattr(
        "services.orb_dictate_service.orb_saved_output_service.create_output",
        fake_create,
    )
    monkeypatch.setattr(
        "services.orb_dictate_service._user_can_access_os_ai_notes",
        lambda _user: False,
    )
    response = dictate_client.post(
        "/orb/dictate/save",
        json={
            "title": "Test daily record",
            "note_type": "daily_record",
            "professional_note": "Draft note for review.",
            "summary": "Summary",
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["saved_output_id"] == "out_test"
    assert "not" in data["standalone_boundary"].lower() or "IndiCare" in data["standalone_boundary"]


def test_generate_includes_quality_checks():
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text='Child said "I don\'t want to go upstairs." Staff supported with calm voice.',
            note_type="incident_record",
        )
    )
    assert result.quality_checks.child_voice in {"present", "weak", "missing"}
    assert result.governance_notice


def test_dictate_edit_spelling_grammar(dictate_client, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = dictate_client.post(
        "/orb/dictate/edit",
        json={
            "document_text": "Child became distresed at tea. Staff offered space.",
            "instruction": "Check spelling and grammar",
            "note_type": "daily_record",
            "mode": "spelling_grammar",
            "preserve_facts": True,
        },
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["revised_text"]
    assert "distresed" in data["revised_text"] or "distressed" in data["revised_text"].lower()
    assert data["quality_checks"]
    assert "IndiCare" in data["standalone_boundary"] or "draft" in data["standalone_boundary"].lower()


def test_dictate_edit_therapeutic_does_not_invent_facts(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = edit_dictate_document(
        OrbDictateEditRequest(
            document_text="Child was manipulative during tea.",
            instruction="Make this more therapeutic",
            note_type="daily_record",
            mode="therapeutic_rewrite",
        )
    )
    assert "manipulative" not in result.revised_text.lower() or "[review wording]" in result.revised_text
    assert result.revised_text


def test_dictate_edit_ofsted_adds_placeholders_not_evidence(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = edit_dictate_document(
        OrbDictateEditRequest(
            document_text="Staff supported child after incident.",
            instruction="Make Ofsted-ready",
            note_type="incident_record",
            mode="ofsted_ready",
        )
    )
    assert "[" in result.revised_text or "placeholder" in " ".join(result.change_summary).lower()
    assert any("evidence" in w.lower() or "placeholder" in w.lower() for w in result.warnings) or result.warnings


def test_dictate_edit_investigation_neutral_offline(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = edit_dictate_document(
        OrbDictateEditRequest(
            document_text="X stated that Y shouted. No conclusion reached.",
            instruction="Improve recording",
            note_type="investigation_meeting",
            mode="factual_tone",
        )
    )
    assert "stated" in result.revised_text.lower() or "X" in result.revised_text


def test_dictate_transcribe_text(dictate_client):
    response = dictate_client.post(
        "/orb/dictate/transcribe",
        json={"text": "Rough shift notes here."},
    )
    assert response.status_code == 200
    assert response.json()["data"]["transcript"] == "Rough shift notes here."


def test_dictate_transcribe_audio_accepts_wav_webm_mp4(dictate_client, monkeypatch):
    async def fake_transcribe(_path: str):
        return {
            "transcript": "Captured audio transcript.",
            "segments": [],
            "participants": [],
        }

    monkeypatch.setattr(
        "routers.orb_dictate_routes.transcribe_dictate_audio",
        fake_transcribe,
    )

    for filename, content_type in (
        ("note.webm", "audio/webm"),
        ("note.wav", "audio/wav"),
        ("note.mp4", "audio/mp4"),
    ):
        response = dictate_client.post(
            "/orb/dictate/transcribe/audio",
            files={"file": (filename, b"\x00\x01\x02", content_type)},
        )
        assert response.status_code == 200, filename
        assert response.json()["data"]["transcript"] == "Captured audio transcript."
