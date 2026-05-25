from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"
ROOT_PAGE = FRONTEND / "app" / "page.tsx"
SELECT_SCOPE_PAGE = FRONTEND / "app" / "select-scope" / "page.tsx"
SELECT_SCOPE_CLIENT = FRONTEND / "components" / "indicare" / "scope" / "select-scope-client.tsx"
LAYOUT = FRONTEND / "app" / "layout.tsx"
SCOPE_DIR = FRONTEND / "components" / "indicare" / "scope"

CLIENT_HOOK_MARKERS = (
    "useRouter",
    "usePathname",
    "useSearchParams",
    "useEffect",
    "localStorage",
    "sessionStorage",
    "window",
    "document",
)


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_root_page_redirects_to_select_scope_without_client_hooks():
    text = _read(ROOT_PAGE)
    assert 'redirect("/select-scope")' in text or "redirect('/select-scope')" in text
    assert '"use client"' not in text
    for marker in CLIENT_HOOK_MARKERS:
        assert marker not in text, f"root page must not use {marker}"


def test_select_scope_page_exists_and_uses_client_wrapper():
    assert SELECT_SCOPE_PAGE.is_file()
    text = _read(SELECT_SCOPE_PAGE)
    assert "SelectScopeClient" in text
    assert '"use client"' not in text


def test_select_scope_client_is_client_only():
    text = _read(SELECT_SCOPE_CLIENT)
    assert text.lstrip().startswith("'use client'") or text.lstrip().startswith('"use client"')
    assert "HomeChildSelector" in text
    assert "select-scope-loading" in text
    assert "select-scope-degraded-panel" in _read(SCOPE_DIR / "home-child-selector.tsx")


def test_layout_uses_client_provider_boundary():
    text = _read(LAYOUT)
    assert "OsAppProviders" in text
    assert '"use client"' not in text
    providers = _read(SCOPE_DIR / "os-app-providers.tsx")
    assert providers.lstrip().startswith("'use client'") or providers.lstrip().startswith('"use client"')
    assert "OsScopeProvider" in providers
    assert "OsScopeGate" in providers


def test_scope_components_marked_use_client_when_using_hooks():
    for name in ("os-scope-provider.tsx", "os-scope-gate.tsx", "home-child-selector.tsx"):
        path = SCOPE_DIR / name
        text = _read(path)
        assert text.lstrip().startswith("'use client'") or text.lstrip().startswith('"use client"'), name


def test_os_scope_lib_browser_apis_only_behind_guards():
    text = _read(FRONTEND / "lib" / "os-scope.ts")
    assert "typeof window === 'undefined'" in text
    for fn in ("readStorage", "persistScopeLocally", "clearScopeLocally"):
        body = text.split(f"function {fn}", 1)[1].split("\nfunction ", 1)[0]
        assert "typeof window === 'undefined'" in body, f"{fn} must guard browser access"
