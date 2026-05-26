from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
HOME_PAGE = REPO_ROOT / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx"


def test_home_workspace_page_exists():
    assert HOME_PAGE.is_file()


def test_home_workspace_uses_scope_route_helpers():
    text = HOME_PAGE.read_text(encoding="utf-8")
    assert "HOME_WORKSPACE_WORKFLOW_HREFS" in text
    assert "home-workspace-page" in text
    assert "home-workspace-scope-orb" in text


def test_home_workspace_links_are_scoped():
    text = HOME_PAGE.read_text(encoding="utf-8")
    for key in (
        "dailyBrief",
        "handover",
        "recordingAlerts",
        "recordingReviews",
        "inspectionReadiness",
        "reg45",
        "archiveSummary",
        "planImpactReview",
        "lifeechoPending",
    ):
        assert key in text, f"Missing section key {key}"
    assert "home-workspace-${key}" in text or 'home-workspace-${key}' in text
    assert "getGovernanceCommandCentre" not in text
    assert 'href: "/young-people"' not in text
    assert 'href="/young-people"' not in text


def test_home_workspace_no_global_dashboard_builder():
    text = HOME_PAGE.read_text(encoding="utf-8")
    assert "getGovernanceCommandCentre" not in text
    assert "workforce-os/dashboard" not in text
