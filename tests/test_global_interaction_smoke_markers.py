from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_scope_selector_has_clickable_buttons():
    text = (FRONTEND / "components/indicare/scope/home-child-selector.tsx").read_text(encoding="utf-8")
    assert "data-testid=\"home-child-selector\"" in text
    assert "onClick" in text
    assert "type=\"button\"" in text
    assert "disabled={busy || scopeBusy}" in text


def test_child_workspace_quick_actions_clickable():
    text = (FRONTEND / "components/young-people/workspace/child-workspace-overview.tsx").read_text(encoding="utf-8")
    assert "prefetch={false}" in text
    assert "onClick" not in text or "Link" in text
    assert "data-testid=" in text


def test_recording_editor_save_submit_handlers():
    text = (FRONTEND / "components/indicare/record/recording-editor.tsx").read_text(encoding="utf-8")
    assert "data-testid=\"recording-save-draft\"" in text
    assert "data-testid=\"recording-submit-draft\"" in text
    assert "onClick" in text
    assert "type=\"button\"" in text


def test_orb_pages_have_message_input_and_send():
    standalone = (FRONTEND / "components/orb-standalone/orb-standalone-composer.tsx").read_text(encoding="utf-8")
    operational = (FRONTEND / "components/orb-operational/orb-conversation-experience.tsx").read_text(encoding="utf-8")
    assert "data-orb-composer-send" in standalone
    assert "onSubmit" in standalone
    assert "data-testid=\"orb-operational-send-button\"" in operational
    assert "onSubmit={submit}" in operational


def test_app_shell_no_fullscreen_click_blocker():
    shell = (FRONTEND / "components/indicare/app-shell.tsx").read_text(encoding="utf-8")
    assert "fixed inset-0" not in shell
    css = (FRONTEND / "app/globals.css").read_text(encoding="utf-8")
    assert ".orb-overlay-shell" in css
    assert "pointer-events: none" in css
