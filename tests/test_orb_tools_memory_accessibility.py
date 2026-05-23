from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

TOOLS_PANEL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-tools-panel.tsx"
MEMORY_PANEL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-memory-panel.tsx"
A11Y_PANEL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-accessibility-panel.tsx"
PERMISSIONS_PANEL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-permissions-panel.tsx"
MAP_PANEL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-intelligence-map-panel.tsx"
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
COMPOSER = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-composer.tsx"
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
GLOBALS = REPO_ROOT / "frontend-next" / "app" / "globals.css"
BOUNDARY = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-os-boundary.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_tools_panel_contains_expected_tools():
    text = _read(TOOLS_PANEL)
    for marker in (
        "IndiCare Tools",
        "Search tools",
        "Knowledge Library",
        "Deep Research",
        "Agents",
        "Saved Outputs",
        "Documents",
        "Ask ORB",
        "Privacy Governance",
        "AI Governance",
    ):
        assert marker in text
    assert "/api/os/" not in text
    assert "Requires IndiCare OS context" in text


def test_memory_panel_standalone_wording():
    text = _read(MEMORY_PANEL)
    assert "Standalone ORB remembers only what you save locally" in text
    assert "Clear local chat memory" in text
    assert "does not access IndiCare OS records" in text
    assert "OS memory" not in text.lower() or "does not access" in text


def test_accessibility_panel_toggles():
    text = _read(A11Y_PANEL)
    for marker in (
        "Dyslexia-friendly text",
        "Low sensory mode",
        "Larger text",
        "High contrast",
        "Reduce animations",
        "Simplified reading mode",
    ):
        assert marker in text


def test_accessibility_css_classes_in_globals():
    text = _read(GLOBALS)
    for marker in (
        "orb-dyslexia-mode",
        "orb-low-sensory",
        "orb-large-text",
        "orb-high-contrast",
        "orb-reduced-motion",
        "orb-simplified-reading",
    ):
        assert marker in text


def test_permissions_panel_readiness():
    text = _read(PERMISSIONS_PANEL)
    for marker in (
        "Microphone available",
        "Speech recognition available",
        "Speech output available",
        "Camera capture supported",
        "Image upload supported",
    ):
        assert marker in text


def test_companion_integrates_panels():
    text = _read(COMPANION)
    for marker in (
        "OrbToolsPanel",
        "OrbStandaloneSettingsPanel",
        "OrbMemoryPanel",
        "OrbStandaloneAccessibilityPanel",
        "OrbPermissionsPanel",
    ):
        assert marker in text
    assert "openToolsPanel" in text or "setToolsPanelOpen" in text


def test_camera_capture_in_composer():
    text = _read(COMPOSER)
    assert 'capture="environment"' in text
    assert "Use camera" in text


def test_standalone_client_capability_paths():
    text = _read(CLIENT)
    assert "/orb/standalone/capabilities" in text
    assert "/orb/standalone/surface-route" in text
    assert "/api/os/" not in text


def test_os_boundary_module():
    text = _read(BOUNDARY)
    assert "permissioned IndiCare OS context" in text
    assert "chronology" in text.lower()
