from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

ORB_DIR = REPO_ROOT / "frontend-next" / "app" / "orb"
ORB_COMPONENTS = REPO_ROOT / "frontend-next" / "components" / "orb-standalone"
ORB_LIB = REPO_ROOT / "frontend-next" / "lib" / "orb"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _ui_sources() -> str:
    parts: list[str] = []
    for base in (ORB_DIR, ORB_COMPONENTS):
        if not base.exists():
            continue
        for path in sorted(base.rglob("*.tsx")):
            if "node_modules" not in str(path):
                parts.append(_read(path))
    for css in (ORB_DIR / "orb-mobile.css", ORB_DIR / "orb-desktop.css"):
        if css.exists():
            parts.append(_read(css))
    return "\n".join(parts)


def test_orb_ui_uses_residential_product_name():
    sources = _ui_sources()
    assert "ORB Residential" in sources
    assert "Powered by IndiCare" in sources
    assert "Ready when you are" in sources


def test_orb_ui_no_user_facing_standalone_orb():
    sources = _ui_sources()
    forbidden = [
        "Standalone ORB",
        "standalone ORB",
        "Premium ORB",
        "Rich ORB",
        "ORB Care Companion",
        "standalone mode",
        "No OS records accessed",
    ]
    for marker in forbidden:
        assert marker not in sources, f"user-facing ORB UI must not include {marker!r}"


def test_orb_boundary_copy_does_not_imply_os_access():
    sources = _ui_sources()
    assert "does not access IndiCare OS records" in sources
    assert "ORB Residential does not grant IndiCare OS access" in sources or "does not grant IndiCare OS access" in sources


def test_orb_product_copy_helper_exists():
    copy = _read(ORB_LIB / "orb-product-copy.ts")
    for marker in (
        "ORB_PRODUCT_NAME = 'ORB Residential'",
        "ORB_POWERED_BY = 'Powered by IndiCare'",
        "does not access IndiCare OS records",
    ):
        assert marker in copy


def test_orb_login_access_onboarding_wording():
    login = _read(ORB_DIR / "login" / "page.tsx")
    signup = _read(ORB_DIR / "signup" / "page.tsx")
    onboarding = _read(ORB_DIR / "onboarding" / "page.tsx")
    access = _read(ORB_COMPONENTS / "orb-upgrade-screen.tsx")
    assert "Sign in to ORB Residential" in login
    assert "ORB Residential account" in signup or "Create your ORB Residential account" in signup
    assert "Welcome to ORB Residential" in onboarding
    assert "ORB Residential access" in access


def test_backend_product_copy_helper():
    copy = _read(REPO_ROOT / "services" / "orb_product_copy.py")
    assert 'ORB_PRODUCT_NAME = "ORB Residential"' in copy
    assert "does not access IndiCare OS records" in copy


def test_migration_docs_list_orb_sql_files():
    doc = _read(REPO_ROOT / "docs" / "orb-residential-production-migrations.md")
    for migration in (
        "sql/200_orb_residential_premium.sql",
        "sql/201_orb_feedback.sql",
        "sql/202_orb_improvement_candidates.sql",
        "sql/203_orb_residential_subscriptions.sql",
        "sql/204_orb_stripe_events.sql",
        "sql/205_orb_oauth_accounts.sql",
    ):
        assert migration in doc
