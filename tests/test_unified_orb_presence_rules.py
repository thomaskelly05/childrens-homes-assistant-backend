from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
RULES = REPO_ROOT / "frontend-next" / "lib" / "orb" / "orb-presence-rules.ts"


def _read() -> str:
    return RULES.read_text(encoding="utf-8")


def test_presence_rules_module_exports():
    text = _read()
    for name in (
        "shouldShowOrbRail",
        "shouldShowFloatingOrb",
        "shouldShowInlineOrbCard",
        "operationalOrbLabel",
        "operationalOrbPrivacyText",
        "operationalOrbPrompts",
        "shouldShowShellContextualOrbPanel",
        "hasPageEmbeddedOrbRail",
        "isRecordingEditorPathStrict",
    ):
        assert f"export function {name}" in text


def test_child_workspace_has_rail_not_floating():
    text = _read()
    assert "young-people" in text and "workspace" in text
    assert "shouldShowFloatingOrb" in text
    assert "hasPageEmbeddedOrbRail" in text


def test_recording_editor_excludes_rail_and_floating():
    text = _read()
    assert "isRecordingEditorPathStrict" in text
    assert "pathname === '/record'" in text


def test_operational_prompts_use_assistant_orb():
    text = _read()
    assert "/assistant/orb" in text
    assert "draft" not in text.lower() or "draft bodies" in text.lower()
