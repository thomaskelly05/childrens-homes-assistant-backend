from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SCOPE_ORB = REPO_ROOT / "frontend-next" / "lib" / "orb" / "scope-orb-context.ts"
LAUNCHER = REPO_ROOT / "frontend-next" / "components" / "orb-operational" / "scope-orb-launcher.tsx"
ORB_PAGE = REPO_ROOT / "frontend-next" / "app" / "assistant" / "orb" / "operational-orb-page.tsx"


def test_scope_orb_context_module():
    text = SCOPE_ORB.read_text(encoding="utf-8")
    assert "buildScopeOrbContextLabel" in text
    assert "scopeOrbLaunchHref" in text
    assert "Summary-level child context only" in text
    assert "draft bodies are never" in text.lower() or "never sent automatically" in text


def test_scope_orb_launcher_uses_assistant_orb():
    text = LAUNCHER.read_text(encoding="utf-8")
    assert "ScopeOrbLauncher" in text
    assert "scope-orb-launcher" in text
    assert "scopeOrbLaunchHref" in text
    assert 'href="/orb"' not in text


def test_operational_orb_page_maps_scope_and_mode():
    text = ORB_PAGE.read_text(encoding="utf-8")
    assert "initialScope" in text
    assert "initialOperationalMode" in text or "query.mode" in text.replace(" ", "")
    assert "young_person_id" in text
