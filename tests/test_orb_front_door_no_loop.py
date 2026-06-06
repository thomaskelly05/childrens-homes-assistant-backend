"""ORB front-door routing must not bounce users between /orb and /orb/login."""

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MIDDLEWARE = (REPO_ROOT / "frontend-next" / "middleware.ts").read_text(encoding="utf-8")
ORB_LOGIN_PAGE = (REPO_ROOT / "frontend-next" / "app" / "orb" / "login" / "page.tsx").read_text(
    encoding="utf-8"
)
AUTH_GATE = (REPO_ROOT / "frontend-next" / "components" / "orb-residential" / "orb-auth-gate.tsx").read_text(
    encoding="utf-8"
)


def test_middleware_orb_login_redirects_to_canonical_orb():
    assert "/orb/login" in MIDDLEWARE
    assert "redirectToOrbFrontDoor" in MIDDLEWARE
    assert "loginUrl.pathname = '/orb/login'" not in MIDDLEWARE


def test_legacy_orb_login_page_converges_to_orb():
    assert "buildOrbFrontDoorUrl" in ORB_LOGIN_PAGE
    assert "redirect(" in ORB_LOGIN_PAGE


def test_auth_gate_embeds_login_without_route_replace():
    assert "OrbLoginScreen" in AUTH_GATE
    assert "embeddedGateMode" in AUTH_GATE
    assert "deriveOrbGateState" in AUTH_GATE
    assert "router.replace('/orb')" not in AUTH_GATE
    assert "window.location" not in AUTH_GATE
