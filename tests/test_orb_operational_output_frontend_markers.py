from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]

PANEL = REPO / "frontend-next" / "components" / "orb-operational" / "orb-operational-outputs-panel.tsx"
CLIENT = REPO / "frontend-next" / "lib" / "orb" / "operational-client.ts"
BRIEFING = REPO / "frontend-next" / "components" / "orb-operational" / "orb-operational-briefing-card.tsx"
CONVERSATION = REPO / "frontend-next" / "components" / "orb-operational" / "orb-conversation-experience.tsx"


def test_operational_outputs_panel_exists():
    text = PANEL.read_text(encoding="utf-8")
    assert "orb-operational-outputs-panel" in text
    assert "Operational outputs" in text


def test_save_briefing_button():
    assert 'data-testid="orb-save-briefing"' in BRIEFING.read_text(encoding="utf-8")
    assert "Save briefing" in BRIEFING.read_text(encoding="utf-8")


def test_send_manager_review_and_export():
    text = PANEL.read_text(encoding="utf-8")
    assert 'data-testid="orb-send-manager-review"' in text
    assert 'data-testid="orb-export-markdown"' in text
    assert "Awaiting review" in text


def test_linked_actions_and_artefact_notice():
    text = PANEL.read_text(encoding="utf-8")
    assert "orb-linked-actions" in text
    assert "orb-operational-artefact-notice" in text
    assert "OPERATIONAL_ARTEFACT_NOTICE" in text


def test_operational_client_uses_outputs_api():
    text = CLIENT.read_text(encoding="utf-8")
    assert "/api/assistant/orb/outputs" in text
    assert "listOperationalOutputs" in text


def test_conversation_wires_outputs_panel():
    text = CONVERSATION.read_text(encoding="utf-8")
    assert "OrbOperationalOutputsPanel" in text
    assert "orb-open-operational-outputs" in text
