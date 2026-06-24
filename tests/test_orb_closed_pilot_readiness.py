"""ORB Residential closed pilot readiness — audit contracts, flows, migrations, safeguarding."""

from __future__ import annotations

import asyncio
import inspect
import json
import os
import re
from pathlib import Path

import pytest
from fastapi import HTTPException

import routers.orb_records_workspace_launch_routes as workspace_routes
import routers.orb_templates_launch_routes as template_routes
from assistant.knowledge.adult_identity_language import (
    build_simple_daily_record_draft,
    sanitize_visible_final_answer,
    strip_self_harm_generic_fillers,
)
from services.orb_recording_framework_service import get_framework_payload
from schemas.orb_home_documents import COMPLIANCE_NOT_GUARANTEED_DISCLAIMER, OrbHomeDocumentRecord
from schemas.orb_records_workspace import OrbRecordWorkspaceCreate
from schemas.orb_template_working_document import WORKING_DOCUMENT_REVIEW_REMINDER
from services.orb_founder_analytics_foundation_service import redact_founder_analytics_payload
from services.orb_home_document_retrieval_service import build_source_chip
from services.orb_home_documents_service import orb_home_documents_service
from services.orb_instant_first_lines_service import (
    guarded_instant_lines_for_message,
    instant_first_lines_for_message,
)
from services.orb_pilot_readiness_service import run_pilot_readiness_checks
from services.orb_records_workspace_service import orb_records_workspace_service
from services.orb_template_taxonomy_service import orb_template_taxonomy_service
from services.orb_template_working_document_service import orb_template_working_document_service

ROOT = Path(__file__).resolve().parents[1]
MIGRATION_210 = ROOT / "sql" / "210_orb_records_workspace.sql"
MIGRATION_211 = ROOT / "sql" / "211_orb_home_documents.sql"
NAV_PATH = ROOT / "frontend-next" / "lib" / "orb" / "orb-navigation-convergence.ts"
FRAMEWORK_BACKEND = ROOT / "assistant" / "knowledge" / "orb_recording_framework.json"
FRAMEWORK_FRONTEND = ROOT / "frontend-next" / "lib" / "orb" / "recording" / "orb-recording-framework.json"
VOICE_ENGINE = ROOT / "frontend-next" / "lib" / "orb" / "voice" / "orb-voice-conversation-engine.ts"
SAVED_PANEL = ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-saved-outputs-panel.tsx"
WRITE_EDITOR = ROOT / "frontend-next" / "components" / "orb-write" / "orb-write-working-document-editor.tsx"
SAFETY_COPY = ROOT / "frontend-next" / "lib" / "orb" / "orb-residential-safety-copy.ts"

BREAKFAST_PROMPT = (
    "Help me write a daily record — calm breakfast, chose toast, watched TV before handover."
)
SELF_HARM_PROMPT = "Young person disclosed self-harm and said they want to die."


@pytest.fixture(autouse=True)
def memory_services(monkeypatch):
    ws = orb_records_workspace_service
    ws._memory = {}
    ws._storage_mode = "memory"
    monkeypatch.setattr(ws, "_detect_storage_mode", lambda: "memory")

    hd = orb_home_documents_service
    hd._memory = {}
    hd._memory_chunks = {}
    hd._storage_mode = "memory"
    monkeypatch.setattr(hd, "_detect_storage_mode", lambda: "memory")


def _user(user_id: int, role: str = "manager") -> dict:
    return {"user_id": user_id, "id": user_id, "role": role, "home_id": 1}


# --- Part 2: Migration & readiness ---


def test_migration_210_file_defines_records_workspace():
    text = MIGRATION_210.read_text(encoding="utf-8")
    assert "CREATE TABLE IF NOT EXISTS orb_records_workspace" in text
    assert "audit_trail JSONB" in text
    assert "privacy_classification" in text


def test_migration_211_file_defines_home_documents():
    text = MIGRATION_211.read_text(encoding="utf-8")
    assert "CREATE TABLE IF NOT EXISTS orb_home_documents" in text
    assert "CREATE TABLE IF NOT EXISTS orb_home_document_chunks" in text
    assert "text_extract_status" in text


def test_pilot_readiness_script_module_importable():
    script = ROOT / "scripts" / "check_orb_pilot_readiness.py"
    assert script.is_file()
    text = script.read_text(encoding="utf-8")
    assert "run_pilot_readiness_checks" in text


def test_pilot_readiness_report_structure(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
    monkeypatch.setenv("SESSION_SECRET", "test-secret")
    report = run_pilot_readiness_checks(require_database=False)
    data = report.to_dict()
    assert "checks" in data
    assert "ready_for_pilot" in data
    assert any(c["id"] == "migration_210_file" for c in data["checks"])
    assert any(c["id"] == "communicate_hidden" for c in data["checks"])


def test_pilot_readiness_communicate_hidden_by_default(monkeypatch):
    monkeypatch.delenv("NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE", raising=False)
    monkeypatch.setenv("DATABASE_URL", "postgresql://x:x@localhost/x")
    monkeypatch.setenv("SESSION_SECRET", "s")
    report = run_pilot_readiness_checks(require_database=False)
    comm = next(c for c in report.checks if c.id == "communicate_hidden")
    assert comm.status == "pass"


def test_audit_and_migration_docs_exist():
    assert (ROOT / "docs/audits/orb-closed-pilot-readiness-audit.md").is_file()
    assert (ROOT / "docs/deployment/orb-closed-pilot-migration-checklist.md").is_file()
    assert (ROOT / "docs/pilot/orb-closed-pilot-scope.md").is_file()


# --- Part 3 Flow 1: Chat daily record ---


def test_daily_record_live_contract_narrative_no_placeholders():
    draft = build_simple_daily_record_draft(BREAKFAST_PROMPT)
    lower = draft.lower()
    assert "here is a simple daily record draft" in lower
    assert "chose toast" in lower
    assert "[date]" not in lower
    assert "[name]" not in lower
    assert "before saving" in lower


def test_daily_record_instant_lines_category():
    result = instant_first_lines_for_message(BREAKFAST_PROMPT)
    assert result.category_id == "daily_recording"
    assert "daily recording" in result.text.lower()


def test_daily_record_template_suggestion_available():
    suggestions = orb_template_taxonomy_service.suggest_for_content(
        BREAKFAST_PROMPT, station="chat", limit=3
    )
    assert len(suggestions) >= 1
    assert any("daily" in s.get("template_id", "").lower() for s in suggestions)


def test_daily_record_save_draft_to_workspace():
    created = asyncio.run(
        workspace_routes.create_workspace_item(
            OrbRecordWorkspaceCreate(
                title="Breakfast daily record",
                body=build_simple_daily_record_draft(BREAKFAST_PROMPT),
                source_station="chat",
                template_id="daily_record",
                category="recording",
            ),
            current_user=_user(501),
        )
    )
    item = created["data"]
    assert item.status == "draft"
    assert item.owner_user_id == "501"
    assert item.template_id == "daily_record"


# --- Part 3 Flow 2: Chat safeguarding ---


def test_self_harm_live_contract_prelude_and_escalation():
    prelude = guarded_instant_lines_for_message(SELF_HARM_PROMPT)
    assert "immediate safety" in prelude.text.lower()

    raw = (
        "Stay with the young person. Inform the manager/on-call and follow the home's self-harm procedure. "
        "Record exact words. Always prioritise wellbeing in all circumstances."
    )
    cleaned = strip_self_harm_generic_fillers(raw, source_text=SELF_HARM_PROMPT)
    lower = cleaned.lower()
    assert "manager/on-call" in lower
    assert "always prioritise" not in lower
    assert "everything will be fine" not in lower


def test_self_harm_sanitizer_preserves_escalation_over_filler():
    raw = (
        "Stay with the young person. Inform the manager/on-call and follow the home's self-harm procedure. "
        "Always prioritise wellbeing in all circumstances."
    )
    cleaned = strip_self_harm_generic_fillers(raw, source_text=SELF_HARM_PROMPT)
    assert "manager/on-call" in cleaned.lower()
    assert "always prioritise" not in cleaned.lower()


# --- Part 3 Flow 3: Chat to ORB Write ---


def test_chat_use_template_creates_working_document_with_sections():
    answer = "The young person had a calm breakfast and chose toast before handover."
    doc = orb_template_working_document_service.convert_answer_to_working_document(
        answer, "daily_record", source_station="chat"
    )
    assert doc.source_station == "chat"
    assert len(doc.sections) >= 3
    assert doc.rendered_body


def test_chat_working_document_save_to_workspace():
    doc = orb_template_working_document_service.build_working_document("daily_record")
    created = orb_records_workspace_service.create_item(
        601,
        OrbRecordWorkspaceCreate(
            title=doc.title,
            body=doc.rendered_body,
            source_station="write",
            template_id="daily_record",
            metadata={"working_document_id": doc.document_id},
        ),
    )
    assert created.template_id == "daily_record"
    assert created.source_station == "write"


# --- Part 3 Flow 4: ORB Write Reg 45 ---


def test_reg45_template_search():
    results = orb_template_taxonomy_service.search("Reg 45")
    assert len(results) >= 1
    assert any("reg45" in t["template_id"] or "reg_45" in t["template_id"] for t in results)


def test_reg45_working_document_has_table_and_action_plan():
    doc = orb_template_working_document_service.build_working_document("reg45_quality_review")
    table_types = {t.table_type for t in doc.tables}
    assert "reg_45_action_table" in table_types or doc.action_plans
    assert len(doc.sections) >= 3


def test_reg45_save_reopen_preserves_structure():
    doc = orb_template_working_document_service.build_working_document("reg45_quality_review")
    created = orb_records_workspace_service.create_item(
        701,
        OrbRecordWorkspaceCreate(
            title="Reg 45 review draft",
            body=doc.rendered_body,
            source_station="write",
            template_id="reg45_quality_review",
            metadata={"sections": [s.model_dump() for s in doc.sections]},
        ),
    )
    fetched = orb_records_workspace_service.get_item(701, created.id)
    assert fetched is not None
    assert fetched.template_id == "reg45_quality_review"
    assert fetched.metadata.get("sections")


# --- Part 3 Flow 5: Dictate Quick Record ---


def test_quick_record_backend_framework_label():
    framework = json.loads(FRAMEWORK_BACKEND.read_text(encoding="utf-8"))
    general = next(r for r in framework["record_types"] if r["id"] == "general_dictation")
    assert general["label"] == "Quick Record"


def test_quick_record_frontend_framework_label():
    framework = json.loads(FRAMEWORK_FRONTEND.read_text(encoding="utf-8"))
    general = next(r for r in framework["record_types"] if r["id"] == "general_dictation")
    assert general["label"] == "Quick Record"


def test_dictate_transcript_to_working_document_and_template_suggest():
    transcript = "Quick note — calm breakfast, chose toast, watched TV before handover."
    doc = orb_template_working_document_service.convert_dictation_to_working_document(
        transcript, "daily_record"
    )
    assert doc.template_id == "daily_record"
    suggestions = orb_template_taxonomy_service.suggest_for_content(transcript, station="dictate", limit=3)
    assert len(suggestions) <= 3


# --- Part 3 Flow 6: Voice ---


def test_voice_post_call_draft_save_path():
    item = orb_records_workspace_service.create_item(
        801,
        OrbRecordWorkspaceCreate(
            title="Voice conversation draft",
            body="Staff discussed a difficult handover. Child appeared calmer after support.",
            source_station="voice",
            category="recording",
            metadata={"voice_session": True, "audio_stored": False},
        ),
    )
    assert item.source_station == "voice"
    assert item.metadata.get("audio_stored") is False


def test_voice_engine_no_general_dictation_label():
    text = VOICE_ENGINE.read_text(encoding="utf-8")
    assert "Quick Record" in text
    assert "General Dictation" not in text


def test_voice_audio_not_stored_copy_in_privacy():
    privacy = (ROOT / "frontend-next" / "lib" / "orb" / "privacy" / "orb-privacy-content.ts").read_text(
        encoding="utf-8"
    )
    assert "not stored" in privacy.lower()


# --- Part 3 Flow 7: Records & Drafts ---


def test_records_draft_status_visible_lifecycle():
    item = orb_records_workspace_service.create_item(
        901,
        OrbRecordWorkspaceCreate(title="Draft item", body="Body", source_station="chat"),
    )
    assert item.status == "draft"
    reviewed = orb_records_workspace_service.review_item(901, item.id)
    assert reviewed is not None
    assert reviewed.status == "reviewed"
    archived = orb_records_workspace_service.archive_item(901, reviewed.id)
    assert archived is not None
    assert archived.status == "archived"


def test_records_reopen_after_save():
    created = orb_records_workspace_service.create_item(
        902,
        OrbRecordWorkspaceCreate(title="Reopen test", body="Original body", source_station="write"),
    )
    reopened = orb_records_workspace_service.get_item(902, created.id)
    assert reopened is not None
    assert reopened.body == "Original body"


def test_records_user_scoped_isolation():
    created = orb_records_workspace_service.create_item(
        10,
        OrbRecordWorkspaceCreate(title="Private", body="x", source_station="chat"),
    )
    with pytest.raises(HTTPException) as exc:
        asyncio.run(workspace_routes.get_workspace_item(created.id, current_user=_user(99)))
    assert exc.value.status_code == 404


def test_records_status_filter_ui_markers():
    panel = SAVED_PANEL.read_text(encoding="utf-8")
    assert "data-orb-saved-outputs-status-filters" in panel
    assert "ORB_RECORDS_STATUS_CHIPS" in panel


def test_finalise_requires_explicit_confirmation_in_write():
    editor = WRITE_EDITOR.read_text(encoding="utf-8")
    assert "data-orb-write-finalise-confirm" in editor


# --- Part 3 Flow 8: Home documents ---


def test_home_document_record_excludes_extracted_text_field():
    fields = set(OrbHomeDocumentRecord.model_fields.keys())
    assert "extracted_text" not in fields


def test_home_document_source_chip_no_raw_text():
    chip = build_source_chip("safeguarding_policy")
    assert chip == "Home document: Safeguarding policy"
    assert len(chip) < 80
    assert "\n" not in chip


def test_home_document_status_fields_in_schema():
    fields = set(OrbHomeDocumentRecord.model_fields.keys())
    assert "text_extract_status" in fields
    assert "indexing_status" in fields
    assert "privacy_classification" in fields


def test_home_document_audit_trail_on_operations():
    item = orb_records_workspace_service.create_item(
        1001,
        OrbRecordWorkspaceCreate(title="Audit test", body="x", source_station="chat"),
    )
    assert item.audit_trail
    assert item.audit_trail[0].get("action") == "create"


# --- Part 5 & 6: Safeguarding, privacy, audit ---


def test_no_compliance_guarantee_in_safety_copy():
    text = SAFETY_COPY.read_text(encoding="utf-8")
    assert "professional judgement" in text.lower()
    assert not re.search(r"guarantee[sd]?\s+compliance", text, re.IGNORECASE)
    assert COMPLIANCE_NOT_GUARANTEED_DISCLAIMER
    assert "does not guarantee compliance" in COMPLIANCE_NOT_GUARANTEED_DISCLAIMER.lower()


def test_high_risk_working_document_review_reminder():
    doc = orb_template_working_document_service.build_working_document("safeguarding_concern_record")
    assert WORKING_DOCUMENT_REVIEW_REMINDER
    combined = f"{doc.compliance_disclaimer} {doc.rendered_body}".lower()
    assert "review" in combined or "manager" in combined or "adult" in combined


def test_founder_analytics_redacts_identifiers():
    payload = {
        "child_name": "Child A",
        "body": "Sensitive record body",
        "counts": {"drafts": 5},
    }
    redacted = redact_founder_analytics_payload(payload)
    assert redacted["child_name"] == "[REDACTED]"
    assert redacted["body"] == "[REDACTED]"
    assert redacted["counts"]["drafts"] == 5


def test_founder_analytics_home_documents_redacted():
    analytics = orb_home_documents_service.founder_analytics()
    assert analytics.get("identifiers_redacted") is True
    dumped = json.dumps(analytics)
    assert "child_name" not in dumped.lower()


def test_workspace_audit_on_update_finalise():
    item = orb_records_workspace_service.create_item(
        1101,
        OrbRecordWorkspaceCreate(title="Lifecycle", body="b", source_station="write"),
    )
    reviewed = orb_records_workspace_service.review_item(1101, item.id)
    assert reviewed is not None
    finalised = orb_records_workspace_service.finalise_item(1101, reviewed.id)
    assert finalised is not None
    assert finalised.status == "finalised"
    actions = [e.get("action") for e in finalised.audit_trail]
    assert "create" in actions
    assert actions.count("update") >= 2


# --- Part 8: Navigation & Communicate ---


def test_communicate_hidden_from_launch_nav():
    nav = NAV_PATH.read_text(encoding="utf-8")
    names = (ROOT / "frontend-next" / "lib" / "orb" / "orb-user-facing-names.ts").read_text(encoding="utf-8")
    assert "ORB_HIDDEN_LAUNCH_STATION_IDS" in nav
    assert "orb_communicate" in nav
    assert "isOrbCommunicateLaunchVisible" in nav
    assert "orb_communicate" in names
    assert not re.search(r"id:\s*'orb_communicate'[\s\S]*ORB_VISIBLE_SIDEBAR_NAV", names)


def test_template_taxonomy_search_route_for_write():
    result = asyncio.run(template_routes.taxonomy_search(q="Reg 45", current_user=_user(1)))
    assert result["success"] is True
    assert len(result["data"]["templates"]) >= 1


def test_load_recording_framework_quick_record():
    framework = get_framework_payload()
    general = next(r for r in framework["record_types"] if r["id"] == "general_dictation")
    assert general["label"] == "Quick Record"


def test_pilot_readiness_endpoint_registered():
    source = inspect.getsource(__import__("routers.orb_pilot_routes", fromlist=["router"]))
    assert "/readiness" in source
    assert "run_pilot_readiness_checks" in source
