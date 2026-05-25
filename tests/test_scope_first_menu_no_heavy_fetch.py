from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FILES = [
    REPO_ROOT / "frontend-next" / "lib" / "navigation" / "scope-navigation.ts",
    REPO_ROOT / "frontend-next" / "components" / "indicare" / "app-shell.tsx",
    REPO_ROOT / "frontend-next" / "components" / "mobile-nav.tsx",
    REPO_ROOT / "frontend-next" / "app" / "homes" / "[id]" / "workspace" / "page.tsx",
]


def test_heavy_routes_use_prefetch_false_in_scope_menus():
    combined = "\n".join(path.read_text(encoding="utf-8") for path in FILES if path.is_file())
    for route in (
        "prefetch={false}",
        "/command-centre",
        "/governance",
        "/chronology",
        "/actions",
        "/intelligence/inspection-readiness",
    ):
        assert route in combined


def test_scope_nav_declares_heavy_route_hints():
    text = (REPO_ROOT / "frontend-next" / "lib" / "navigation" / "scope-navigation.ts").read_text(encoding="utf-8")
    assert "SCOPE_HEAVY_ROUTE_HINTS" in text
    assert "/api/governance-os/command-centre" not in text
    assert "/api/workforce-os/dashboard" not in text
