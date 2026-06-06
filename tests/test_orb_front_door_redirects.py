from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_root_page_redirects_to_orb():
    page = (REPO_ROOT / "frontend-next/app/page.tsx").read_text(encoding="utf-8")
    assert "redirect('/orb')" in page or 'redirect("/orb")' in page


def test_login_page_redirects_to_orb_front_door():
    page = (REPO_ROOT / "frontend-next/app/login/page.tsx").read_text(encoding="utf-8")
    assert "buildOrbFrontDoorUrl" in page
    assert "redirect(" in page


def test_orb_login_page_redirects_to_orb():
    page = (REPO_ROOT / "frontend-next/app/orb/login/page.tsx").read_text(encoding="utf-8")
    assert "buildOrbFrontDoorUrl" in page


def test_middleware_canonical_front_door_rules():
    middleware = (REPO_ROOT / "frontend-next/middleware.ts").read_text(encoding="utf-8")
    assert "pathname === '/'" in middleware
    assert "/orb/login" in middleware
    assert "redirectToOrbFrontDoor" in middleware
    assert "loginUrl.pathname = '/orb/login'" not in middleware


def test_middleware_keeps_oauth_and_stripe_paths_public():
    middleware = (REPO_ROOT / "frontend-next/middleware.ts").read_text(encoding="utf-8")
    assert "'/api'" in middleware
    assert "'/backend'" in middleware
    assert "'/auth'" in middleware
