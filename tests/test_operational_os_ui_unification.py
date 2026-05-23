from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

OS_UI_MARKERS = [
    "ORB on shift",
    "Connected to this workspace",
    "What needs attention?",
    "What needs recording?",
    "ORB can help with wording",
    "Ask ORB to summarise",
    "Open ORB with this context",
    "ORB supports practice",
]

OS_UI_FILES = [
    FRONTEND / "components" / "indicare" / "operational" / "orb-companion-panel.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-attention-strip.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-recording-section.tsx",
    FRONTEND / "components" / "indicare" / "operational" / "orb-inline-hint.tsx",
    FRONTEND / "components" / "indicare" / "os-design-tokens.ts",
    FRONTEND / "app" / "command-centre" / "page.tsx",
    FRONTEND / "components" / "indicare" / "app-shell.tsx",
    FRONTEND / "app" / "globals.css",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_operational_os_design_tokens_exist():
    text = _read(FRONTEND / "components" / "indicare" / "os-design-tokens.ts")
    for token in ("os-page", "os-hero", "os-action-card", "os-orb-hint", "os-context-rail"):
        assert token in text


def test_globals_css_defines_os_patterns():
    text = _read(FRONTEND / "app" / "globals.css")
    for cls in (".os-page", ".os-hero", ".os-action-card", ".os-context-rail", ".os-orb-hint"):
        assert cls in text


def test_operational_os_ui_unification_markers_present():
    combined = "\n".join(_read(path) for path in OS_UI_FILES)
    for marker in OS_UI_MARKERS:
        assert marker in combined, f"OS UI unification marker missing: {marker}"


def test_app_shell_sidebar_orb_connected_copy():
    text = _read(FRONTEND / "components" / "indicare" / "app-shell.tsx")
    assert "ORB supports this route" in text
    assert "IndiCare OS ORB" not in text or "ORB supports this route" in text


def test_care_hub_page_has_attention_and_recording_sections():
    text = _read(FRONTEND / "app" / "command-centre" / "page.tsx")
    assert "CareHubAttentionStrip" in text
    assert "CareHubRecordingSection" in text
    assert "OrbCompanionPanel" in text
