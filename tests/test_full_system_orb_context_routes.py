from __future__ import annotations

import re

from tests.full_system_qa_helpers import FRONTEND, href_literals_in_os_surfaces, os_surface_sources, read

SCOPE_ROUTES = FRONTEND / "lib" / "navigation" / "scope-routes.ts"
APP_SHELL = FRONTEND / "components" / "indicare" / "app-shell.tsx"
ORB_LAUNCHER = FRONTEND / "components" / "orb-operational" / "scope-orb-launcher.tsx"

OS_ORB_HREF = re.compile(r"""href\s*=\s*[{`'"][^`'"]*['"`]/orb(?:\?|['"`])""")
OS_ORB_PUSH = re.compile(r"""(?:router\.(?:push|replace)|href)\s*\(\s*['"`]/orb""")


def test_scope_routes_assistant_orb_helper():
    text = read(SCOPE_ROUTES)
    assert "assistantOrbHref" in text
    assert "/assistant/orb" in text
    assert "assistantOrbHref" in text


def test_app_shell_sidebar_orb_link():
    text = read(APP_SHELL)
    assert 'href="/assistant/orb"' in text or "href='/assistant/orb'" in text
    assert "sidebar-orb-link" in text


def test_scope_orb_launcher_uses_assistant():
    text = read(ORB_LAUNCHER)
    assert "scopeOrbLaunchHref" in text


def test_os_surfaces_do_not_link_browser_to_standalone_orb():
    combined = href_literals_in_os_surfaces()
  # Assistant hub may link to standalone intentionally
    assistant_hub = read(FRONTEND / "app" / "assistant" / "page.tsx")
    without_hub = combined.replace(assistant_hub, "")
    assert not OS_ORB_HREF.search(without_hub), "OS surface must not href /orb"
    allow_standalone_boundary = {
        "app/assistant/page.tsx",
        "app/assistant/orb/operational-orb-page.tsx",
    }
    for path in os_surface_sources():
        rel = str(path.relative_to(FRONTEND))
        if rel.startswith("app/orb/") or rel.startswith("components/orb-standalone/"):
            continue
        if rel in allow_standalone_boundary:
            continue
        text = read(path)
        assert not OS_ORB_PUSH.search(text), rel
