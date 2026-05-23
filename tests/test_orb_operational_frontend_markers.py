from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

PANELS = [
    REPO / "frontend-next" / "components" / "orb-operational" / "orb-operational-context-panel.tsx",
    REPO / "frontend-next" / "components" / "orb-operational" / "orb-operational-source-panel.tsx",
    REPO / "frontend-next" / "components" / "orb-operational" / "orb-operational-actions-panel.tsx",
    REPO / "frontend-next" / "components" / "orb-operational" / "orb-operational-briefing-card.tsx",
]
EXPERIENCE = REPO / "frontend-next" / "components" / "orb-operational" / "orb-conversation-experience.tsx"
CLIENT = REPO / "frontend-next" / "lib" / "orb" / "operational-client.ts"


def test_context_panel_markers():
    text = PANELS[0].read_text(encoding="utf-8")
    assert 'data-testid="orb-operational-context-panel"' in text
    assert "orb-operational-context-unavailable" in text


def test_source_panel_markers():
    text = PANELS[1].read_text(encoding="utf-8")
    assert 'data-testid="orb-operational-source-panel"' in text


def test_draft_action_markers():
    text = PANELS[2].read_text(encoding="utf-8")
    assert 'data-testid="orb-operational-actions-panel"' in text
    assert "orb-operational-draft-actions" in text
    assert "orb-create-draft-actions" in text


def test_briefing_markers():
    text = PANELS[3].read_text(encoding="utf-8")
    assert 'data-testid="orb-operational-briefing-card"' in text
    assert "orb-copy-briefing" in text


def test_experience_permission_badges():
    text = EXPERIENCE.read_text(encoding="utf-8")
    assert "orb-operational-permission-badges" in text
    assert "Permissioned OS context" in text
    assert "OrbOperationalContextPanel" in text


def test_operational_client_new_routes():
    text = CLIENT.read_text(encoding="utf-8")
    assert "/api/assistant/orb/actions/draft" in text
    assert "/api/assistant/orb/briefings/create" in text
    assert "context_cards" in text
