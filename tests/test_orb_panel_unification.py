from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

PANEL_SHELL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-panel-shell.tsx"
COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
TOOLS = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-tools-panel.tsx"
DOCUMENTS = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-document-panel.tsx"
AGENTS = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-agent-panel.tsx"
KNOWLEDGE = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-knowledge-library.tsx"
SAVED = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-saved-outputs-panel.tsx"
SETTINGS = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-standalone-settings-panel.tsx"
MEMORY = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-memory-panel.tsx"
A11Y = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-accessibility-panel.tsx"
PERMS = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-permissions-panel.tsx"
MAP_PANEL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-intelligence-map-panel.tsx"
STANDALONE_CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_all_major_panels_use_orb_standalone_panel_shell():
    for path, panel_id in (
        (TOOLS, "tools"),
        (DOCUMENTS, "documents"),
        (AGENTS, "agents"),
        (KNOWLEDGE, "knowledge"),
        (SAVED, "saved_outputs"),
        (SETTINGS, "settings"),
        (MEMORY, "memory"),
        (A11Y, "accessibility"),
        (PERMS, "permissions"),
        (MAP_PANEL, "intelligence_map"),
    ):
        text = _read(path)
        assert "OrbStandalonePanelShell" in text, path.name
        assert f'panelId="{panel_id}"' in text or f"panelId='{panel_id}'" in text, path.name


def test_single_active_panel_state_in_companion():
    text = _read(COMPANION)
    assert "activePanel" in text
    assert "setActivePanel" in text
    assert "closeAllPanels" in text
    assert "openPanel" in text
    assert "openTool" in text
    assert "data-orb-active-panel" in text
    assert "data-orb-close-all-panels" in text
    assert "knowledgeLibraryOpen" not in text
    assert "documentsPanelOpen" not in text
    assert "toolsPanelOpen" not in text


def test_tools_drawer_search_and_grouping():
    text = _read(TOOLS)
    assert "Search tools" in text
    assert "data-orb-tools-search" in text
    for marker in (
        "Documents",
        "Deep Research",
        "Agents",
        "Knowledge Library",
        "Saved Outputs",
        "Requires IndiCare OS context",
        "AI Governance",
        "Privacy Governance",
    ):
        assert marker in text


def test_documents_panel_standalone_copy_and_actions():
    text = _read(DOCUMENTS)
    assert "standalone context" in text.lower()
    assert "Create action plan" in text
    assert "Run Deep Research" in text
    assert "Save output" in text or "OrbOutputSaveActions" in text


def test_agents_panel_specialist_cards():
    text = _read(AGENTS)
    assert "specialist ORB agents" in text.lower() or "data-orb-specialist-agents" in text
    for marker in (
        "Document Analysis",
        "Ofsted Research",
        "Recording Quality",
        "Safeguarding Reflection",
    ):
        assert marker in text


def test_saved_outputs_library_filters_and_empty_state():
    text = _read(SAVED)
    assert "data-orb-saved-outputs-filters" in text
    assert "Reuse in chat" in text
    assert "No saved outputs yet" in text
    assert "document review, agent or deep research" in text


def test_settings_hub_cards():
    text = _read(SETTINGS)
    for marker in ("Memory", "Accessibility", "Voice", "Permissions", "Privacy", "Intelligence map"):
        assert marker in text


def test_product_split_standalone_client_unchanged():
    client = _read(STANDALONE_CLIENT)
    assert "/api/os/" not in client
    assert "/assistant/orb" not in client
    tools = _read(TOOLS)
    assert "href=" in tools
    operational = tools.split("Operational OS links")[1][:1200]
    assert "fetch(" not in re.sub(r"<Link[^>]*href=", "", operational)


def test_panel_shell_shared_overlay_marker():
    text = _read(PANEL_SHELL)
    assert "data-orb-panel-shell" in text
    assert "orb-panel-overlay" in text
    assert "100dvh" in text or "max-h-[100dvh]" in text
