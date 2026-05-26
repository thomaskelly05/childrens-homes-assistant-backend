from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"
WORKSPACE_PAGE = FRONTEND / "app" / "young-people" / "[id]" / "workspace" / "page.tsx"
OVERVIEW = FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-overview.tsx"
NORMALISER = FRONTEND / "lib" / "young-people" / "child-workspace-normaliser.ts"
SCOPE_NAV = FRONTEND / "lib" / "navigation" / "scope-navigation.ts"
ORB_RAIL = FRONTEND / "components" / "young-people" / "workspace" / "child-workspace-orb-rail.tsx"

SECTION_MARKERS = [
    "child-about-card",
    "child-what-matters-card",
    "child-support-card",
    "child-today-card",
    "child-risk-safeguarding-card",
    "child-plans-documents-card",
    "child-voice-card",
]

COPY_MARKERS = [
    "What matters to",
    "How best to support",
    "Today's picture",
    "Safeguarding and risk",
    "Plans and documents",
    "Child voice",
]


def test_workspace_page_uses_overview_not_record_workspace():
    page = WORKSPACE_PAGE.read_text(encoding="utf-8")
    overview = OVERVIEW.read_text(encoding="utf-8")
    assert "ChildWorkspaceOverview" in page
    assert "normaliseChildWorkspaceOverview" in page
    assert "RecordWorkspacePage" not in page
    assert "JSON.stringify" not in page
    assert "redirect(" not in page
    assert "child-workspace-overview-page" in overview


def test_overview_sections_and_hero():
    overview = OVERVIEW.read_text(encoding="utf-8")
    workspace_dir = FRONTEND / "components" / "young-people" / "workspace"
    combined = overview + "\n".join(p.read_text(encoding="utf-8") for p in workspace_dir.glob("*.tsx"))
    hero = (workspace_dir / "child-profile-hero.tsx").read_text(encoding="utf-8")
    for marker in SECTION_MARKERS:
        assert marker in overview
    for copy in COPY_MARKERS:
        assert copy in combined
    assert "child-workspace-hero" in hero


def test_quick_actions_and_orb_routes():
    normaliser = NORMALISER.read_text(encoding="utf-8")
    orb = ORB_RAIL.read_text(encoding="utf-8")
    assert "child-quick-daily-note" in normaliser
    assert "childDailyNoteHref" in normaliser or "childRecordHref" in normaliser
    assert "childOrbHref" in normaliser
    assert "standalone /orb" not in orb.lower()
    assert "OperationalOrbRail" in orb
    assert "ScopeOrbLauncher" not in orb
    assert "operationalOrbPrivacyText" in (REPO_ROOT / "frontend-next" / "lib" / "orb" / "orb-presence-rules.ts").read_text() or "Summary-level child context" in (REPO_ROOT / "frontend-next" / "lib" / "orb" / "orb-presence-rules.ts").read_text()
    assert "/os/young-people" not in normaliser.replace("childWorkspaceApiHref", "")


def test_empty_states_in_normaliser():
    text = NORMALISER.read_text(encoding="utf-8")
    assert "No communication profile has been added yet." in text
    assert "No child voice notes are available yet." in text
    assert "No current actions are linked." in text


def test_scope_nav_overview_and_child_scoped_record():
    nav = SCOPE_NAV.read_text(encoding="utf-8")
    child_nav = nav.split("export function childScopeNavigation")[1].split("export function")[0]
    assert "Overview" in child_nav
    assert "childWorkspaceHref" in child_nav
    assert "childRecordHref" in child_nav
    assert "/os/young-people" not in child_nav
    assert "childActionsHref" in child_nav
