from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
GLOBALS = REPO_ROOT / "frontend-next" / "app" / "globals.css"
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
SIDEBAR = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-sidebar.tsx"
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"
CITATION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-inline-citation.tsx"
AMBIENT = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-ambient-cognition.tsx"
PROFILE_STORE = REPO_ROOT / "frontend-next" / "lib" / "orb" / "adult-profile-store.ts"
RUNTIME = REPO_ROOT / "services" / "shared_institutional_cognition_runtime.py"


def test_design_tokens_in_globals():
    css = GLOBALS.read_text(encoding="utf-8")
    for token in ("--orb-bg-deep: #07111f", "--orb-primary-cyan", "--orb-glow-cyan"):
        assert token in css, token
    assert ".orb-ambient-cognition" in css
    assert ".orb-composer-glass" in css


def test_ambient_cognition_component():
    source = AMBIENT.read_text(encoding="utf-8")
    assert "data-orb-cognition-state" in source
    assert "OrbAmbientCognition" in source


def test_sidebar_memory_workspace_markers():
    sidebar = SIDEBAR.read_text(encoding="utf-8")
    for marker in (
        'title="Core"',
        'title="Intelligence"',
        'title="Workspace"',
        'title="Profiles"',
        "data-orb-adult-profile-card",
        "Search chats",
        "Agents",
        "Pinned",
        "Today",
    ):
        assert marker in sidebar, marker


def test_composer_send_and_tools_preserved():
    composer = COMPOSER.read_text(encoding="utf-8")
    assert "data-testid=\"orb-standalone-send-clickable\"" in composer
    assert "data-orb-composer-tools" in composer
    assert "onKeyDown" in composer
    assert "form.requestSubmit" in composer


def test_live_citation_popover():
    citation = CITATION.read_text(encoding="utf-8")
    assert "data-orb-citation-popover" in citation
    assert "citationCardForLabel" in citation
    assert "Evidence expectations" in citation


def test_adult_profile_store():
    store = PROFILE_STORE.read_text(encoding="utf-8")
    assert "buildAdultProfilePromptBlock" in store
    assert "cognitionPreferences" in store
    assert "ADULT_PROFILE_STORAGE_KEY" in store


def test_companion_integrations():
    companion = COMPANION.read_text(encoding="utf-8")
    assert "OrbAmbientCognition" in companion
    assert "buildAdultProfilePromptBlock" in companion
    assert "data-orb-cognition-state" in companion
    assert "STANDALONE_ORB_VOICE_CAPTURE_ENABLED" in companion
    assert "wake" not in companion.lower() or "wake_listening" in companion  # no wake word reintroduced
    assert "getUserMedia" not in companion


def test_chronology_and_curiosity_runtime():
    runtime = RUNTIME.read_text(encoding="utf-8")
    assert "chronology_cognition" in runtime
    assert "professional curiosity" in runtime.lower()
    assert "longitudinally" in runtime


def test_no_auto_mic_in_permissions_panel():
    permissions = (REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-permissions-panel.tsx").read_text(
        encoding="utf-8"
    )
    assert "getUserMedia" not in permissions or "push-to-talk" in permissions.lower() or "microphone" in permissions.lower()
