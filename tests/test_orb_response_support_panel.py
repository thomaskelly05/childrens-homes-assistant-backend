from __future__ import annotations

from pathlib import Path

from services.indicare_intelligence_route_finalize_service import intelligence_context_summary
from services.orb_response_support_service import build_response_support_chips
from services.indicare_intelligence_core_service import indicare_intelligence_core_service

REPO = Path(__file__).resolve().parents[1]
PANEL = REPO / "frontend-next" / "components" / "orb-standalone" / "orb-intelligence-core-panel.tsx"


def test_response_support_chips_are_plain_language():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "A young person returned missing and smells of cannabis",
        mode="Safeguarding Thinking",
    )
    chips = build_response_support_chips(packet, mode="Safeguarding Thinking")
    assert chips
    assert all("_" not in c for c in chips)
    assert all(c[0].isupper() for c in chips)


def test_intelligence_summary_includes_response_support():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Help me record an incident properly",
        mode="Record This Properly",
    )
    summary = intelligence_context_summary(packet, mode="Record This Properly")
    assert "response_support" in summary
    assert isinstance(summary["response_support"], list)


def test_panel_collapsed_by_default_and_plain_chips():
    panel = PANEL.read_text(encoding="utf-8")
    assert "expandedByDefault = false" in panel
    assert "data-orb-response-support-chip" in panel
    assert "Safety considered" not in panel or "SupportChip" in panel
