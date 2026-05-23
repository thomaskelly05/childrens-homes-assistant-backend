from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

ORB_COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
ORB_SIDEBAR = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-sidebar.tsx"
ORB_COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"
ORB_TOOLS = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-tools-panel.tsx"
ORB_SETTINGS = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-settings-panel.tsx"
ORB_GLOW = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-glow.tsx"
GLOBALS_CSS = REPO_ROOT / "frontend-next" / "app" / "globals.css"
STANDALONE_CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
STANDALONE_OS_BOUNDARY = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-os-boundary.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_ui_tools_settings_saved_outputs_markers():
    sidebar = _read(ORB_SIDEBAR)
    companion = _read(ORB_COMPANION)
    assert 'data-orb-sidebar-tools' in sidebar
    assert 'Tools' in sidebar
    assert 'data-orb-sidebar-settings' in sidebar
    assert 'Settings' in sidebar
    assert 'data-orb-sidebar-saved-outputs' in sidebar
    assert 'Saved outputs' in sidebar
    assert 'data-orb-header-tools' in companion
    assert 'data-orb-header-settings' in companion
    assert 'Documents' not in sidebar or 'onOpenDocuments' not in sidebar
    assert 'Knowledge Library' not in sidebar
    assert 'Agents' not in sidebar or 'onOpenAgents' not in sidebar


def test_advanced_features_behind_tools_or_settings():
    tools = _read(ORB_TOOLS)
    settings = _read(ORB_SETTINGS)
    for marker in ('Documents', 'Agents', 'Knowledge Library', 'Deep Research'):
        assert marker in tools
    for marker in ('Memory', 'Accessibility', 'Permissions'):
        assert marker in tools or marker in settings


def test_privacy_and_empty_state_markers():
    sources = _read(ORB_COMPANION) + _read(ORB_SIDEBAR)
    assert 'No OS records accessed' in sources
    assert 'How can I help today?' in sources
    assert 'data-orb-empty-state' in _read(ORB_COMPANION)
    companion = _read(ORB_COMPANION)
    assert 'data-orb-starter-cards' in companion
    for starter in (
        'Help me write a daily note',
        'Explain Ofsted expectations',
        'Think through a safeguarding concern',
        'Make wording more child-centred',
    ):
        assert starter in companion


def test_compact_orb_companion_markers():
    sources = _read(ORB_COMPANION) + _read(GLOBALS_CSS) + _read(ORB_GLOW)
    assert 'orb-companion-float' in sources
    assert 'data-orb-companion-fab' in sources
    assert 'data-orb-expanded-voice-settings' in sources
    assert 'Say Hey ORB' in sources
    assert 'orb-floating-dock--expanded' not in sources
    assert 'Wake phrase' in sources


def test_composer_controls_markers():
    composer = _read(ORB_COMPOSER)
    for marker in (
        'data-orb-composer-attach',
        'data-orb-composer-document',
        'data-orb-composer-mic',
        'data-orb-composer-send',
        'data-orb-composer-input',
        'Message ORB',
    ):
        assert marker in composer


def test_single_active_panel_state():
    companion = _read(ORB_COMPANION)
    assert "activePanel" in companion
    assert "closeAllPanels" in companion
    assert "data-orb-active-panel" in companion
    assert "toolsPanelOpen" not in companion


def test_product_split_standalone_client():
    client = _read(STANDALONE_CLIENT)
    companion = _read(ORB_COMPANION)
    assert '/api/os/' not in client
    assert '/assistant/orb' not in client
    assert 'operational-orb' not in client.lower() or '/assistant/orb' not in client
    tools = _read(ORB_TOOLS)
    assert 'href=' in tools
    assert 'fetch(' not in re.sub(r'<Link[^>]*href=', '', tools.split('Operational OS links')[1][:800])


def test_accessibility_classes_preserved():
    text = _read(GLOBALS_CSS) + _read(ORB_COMPANION)
    for marker in (
        'orb-dyslexia-mode',
        'orb-low-sensory',
        'orb-large-text',
        'orb-high-contrast',
        'orb-reduced-motion',
        'orb-simplified-reading',
    ):
        assert marker in text


def test_mode_chip_short_labels():
    companion = _read(ORB_COMPANION)
    assert 'modeChipLabel' in companion
    labels = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-mode-labels.ts"
    text = _read(labels)
    assert "'Record This Properly': 'Record'" in text
    assert "'Ofsted Lens': 'Ofsted'" in text


def test_os_boundary_module_unchanged():
    text = _read(STANDALONE_OS_BOUNDARY)
    assert 'permissioned IndiCare OS context' in text
