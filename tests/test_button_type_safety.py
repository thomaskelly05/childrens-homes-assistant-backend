from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_recording_editor_buttons_are_type_button():
    text = (FRONTEND / "components/indicare/record/recording-editor.tsx").read_text(encoding="utf-8")
    assert "data-testid=\"recording-save-draft\"" in text
    idx = text.index("data-testid=\"recording-save-draft\"")
    snippet = text[max(0, idx - 80) : idx + 40]
    assert 'type="button"' in snippet


def test_scope_selector_buttons_are_type_button():
    text = (FRONTEND / "components/indicare/scope/home-child-selector.tsx").read_text(encoding="utf-8")
    assert text.count('type="button"') >= 3


def test_orb_operational_send_is_submit_in_form():
    text = (FRONTEND / "components/orb-operational/orb-conversation-experience.tsx").read_text(encoding="utf-8")
    assert '<form onSubmit={submit}' in text
    assert 'type="submit"' in text


def test_standalone_composer_send_is_button_not_nested_submit():
    text = (FRONTEND / "components/orb-standalone/orb-standalone-composer.tsx").read_text(encoding="utf-8")
    assert 'type="button"' in text
    assert "data-orb-composer-send" in text
