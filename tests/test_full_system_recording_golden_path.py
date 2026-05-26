from __future__ import annotations

from tests.full_system_qa_helpers import FRONTEND, PRIORITY_RECORDING_TYPES, read

RECORD_PAGE = FRONTEND / "app" / "record" / "page.tsx"
EDITOR = FRONTEND / "components" / "indicare" / "record" / "recording-editor.tsx"
AUTOSAVE = FRONTEND / "components" / "indicare" / "record" / "recording-autosave-indicator.tsx"
ORB_RAIL = FRONTEND / "components" / "indicare" / "record" / "recording-orb-rail.tsx"
REGISTRY = FRONTEND / "lib" / "record" / "recording-form-registry.ts"


def test_record_page_accepts_child_and_type():
    text = read(RECORD_PAGE)
    for token in ("child_id", "home_id", "type", "draft_id"):
        assert token in text


def test_priority_recording_types_in_registry():
    combined = read(REGISTRY) + read(FRONTEND / "lib" / "record" / "recording-form-catalogue-entries.ts")
    for rt in PRIORITY_RECORDING_TYPES:
        assert f"'{rt}'" in combined or f'"{rt}"' in combined, rt


def test_recording_editor_autosave_and_recovery_markers():
    text = read(EDITOR)
    for marker in (
        "persistBackend",
        "persistLocal",
        "event_date",
        "structured_data",
        "showRecoveryBanner",
        "autosaveRecordingDraft",
    ):
        assert marker in text, marker


def test_autosave_status_labels():
    text = read(AUTOSAVE)
    for label in ("Saving…", "Saved securely", "Saved in this browser", "Unable to autosave"):
        assert label in text, label


def test_recording_orb_rail_uses_assistant_orb():
    text = read(ORB_RAIL)
    assert "RECORDING_OS_ORB_HREF" in text
    coach = read(FRONTEND / "lib" / "record" / "recording-quality-coach.ts")
    assert "/assistant/orb" in coach
    assert "RECORDING_STANDALONE_ORB_HREF" in coach
    assert "/assistant/orb?mode=general_operational_question" in coach


def test_body_map_scope_route_uses_injury_body_map():
    routes = read(FRONTEND / "lib" / "navigation" / "scope-routes.ts")
    assert "type: 'injury-body-map'" in routes or 'type: "injury-body-map"' in routes
