from __future__ import annotations

from pathlib import Path

CHILD_OVERVIEW = (
    Path(__file__).resolve().parents[1]
    / "frontend-next"
    / "components"
    / "young-people"
    / "workspace"
    / "child-workspace-overview.tsx"
)
HOME_PAGE = Path(__file__).resolve().parents[1] / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx"
MOBILE_SAFE = (
    Path(__file__).resolve().parents[1] / "frontend-next" / "components" / "indicare" / "mobile" / "mobile-safe-link.tsx"
)


def test_child_workspace_uses_mobile_safe_link():
    text = CHILD_OVERVIEW.read_text(encoding="utf-8")
    assert "MobileSafeLink" in text
    assert 'href="#"' not in text
    assert 'href=""' not in text


def test_home_workspace_uses_mobile_safe_link():
    page = HOME_PAGE.read_text(encoding="utf-8")
    assert "MobileSafeLink" in page
    assert 'href="#"' not in page


def test_mobile_safe_link_renders_anchor():
    link = MOBILE_SAFE.read_text(encoding="utf-8")
    assert "<a" in link or "Link" in link


def test_no_os_young_people_browser_hrefs_in_workspaces():
    for path in (CHILD_OVERVIEW, HOME_PAGE):
        text = path.read_text(encoding="utf-8")
        assert 'href="/os/young-people' not in text
        assert "href={'/os/young-people" not in text


def test_scope_routes_use_app_paths_not_os_browser():
    scope_routes = (
        Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "navigation" / "scope-routes.ts"
    ).read_text(encoding="utf-8")
    assert "/young-people/" in scope_routes
    assert 'href: `/os/young-people' not in scope_routes
