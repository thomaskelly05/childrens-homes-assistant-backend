from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

CLIENT_COMPONENTS = [
    "components/orb-operational/operational-orb-rail.tsx",
    "components/indicare/operational/contextual-orb-panel.tsx",
    "components/indicare/scope/home-child-selector.tsx",
    "components/orb-operational/orb-conversation-experience.tsx",
    "components/orb-standalone/orb-care-companion.tsx",
    "components/indicare/app-shell.tsx",
    "components/indicare/orb/orb-button.tsx",
    "components/assistant/mobile-conversation-drawer.tsx",
]


def test_client_directives_on_interactive_components():
    for rel in CLIENT_COMPONENTS:
        path = FRONTEND / rel
        text = path.read_text(encoding="utf-8")
        assert text.lstrip().startswith("'use client'") or text.lstrip().startswith('"use client"'), rel
