from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
OS_PROVIDERS = REPO / "frontend-next" / "components" / "indicare" / "scope" / "os-app-providers.tsx"
PRODUCT_MODE = REPO / "frontend-next" / "lib" / "orb" / "product-mode.ts"
LAYOUT = REPO / "frontend-next" / "app" / "layout.tsx"

FORBIDDEN_ON_STANDALONE_MOUNT = [
    "OsScopeProvider",
    "ActiveChildProvider",
    "OperationalContextProvider",
]


def test_os_app_providers_bypasses_standalone_orb():
    text = OS_PROVIDERS.read_text(encoding="utf-8")
    assert "isStandaloneOrbSurfaceRoute" in text
    assert "if (isStandaloneOrbSurfaceRoute(pathname))" in text
    assert "return <>{children}</>" in text
    bypass_block = text.split("if (isStandaloneOrbSurfaceRoute(pathname))", 1)[1].split("return", 1)[0]
    for marker in FORBIDDEN_ON_STANDALONE_MOUNT:
        assert marker not in bypass_block


def test_product_mode_defines_standalone_orb_surface():
    text = PRODUCT_MODE.read_text(encoding="utf-8")
    assert "isStandaloneOrbSurfaceRoute" in text
    assert "pathname === '/orb'" in text
    assert "pathname?.startsWith('/orb/')" in text


def test_root_layout_keeps_auth_outside_os_providers():
    text = LAYOUT.read_text(encoding="utf-8")
    assert "<AuthProvider>" in text
    assert "<OsAppProviders>" in text
    assert text.index("<AuthProvider>") < text.index("<OsAppProviders>")
