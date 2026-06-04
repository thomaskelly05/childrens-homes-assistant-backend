from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_composer_copyright_line_exists():
    copyright_ts = read_frontend("components/orb-standalone/orb-composer-copyright.tsx")
    composer = read_frontend("components/orb-standalone/orb-standalone-composer.tsx")
    assert "ORB_COMPOSER_COPYRIGHT_LINE" in copyright_ts
    assert "professional judgement" in copyright_ts.lower()
    assert "OrbComposerCopyright" in composer
    assert "data-orb-composer-copyright" in copyright_ts


def test_intelligence_action_chips_by_depth():
    core = read_frontend("lib/orb/indicare-intelligence-core.ts")
    assistant = read_frontend("components/orb-standalone/orb-assistant-message.tsx")
    assert "buildIntelligenceContextActionChips" in core
    assert "general_light" in core
    assert "safeguarding_critical" in core
    assert "buildIntelligenceContextActionChips" in assistant
    assert "GENERAL_UNRELATED_RE" in core or "capital of france" in core.lower()


def test_what_orb_checked_collapsed_by_default():
    panel = read_frontend("components/orb-standalone/orb-intelligence-core-panel.tsx")
    assert "expandedByDefault = false" in panel
    assert "What ORB checked" in panel
    assert "data-orb-what-orb-checked-collapsed" in panel


def test_missing_evidence_chips_only_when_gaps():
    panel = read_frontend("components/orb-standalone/orb-intelligence-core-panel.tsx")
    assert "hasMissingEvidence" in panel
    assert "data-orb-missing-evidence-chips" in panel
    assert "missingChips.length" in panel or "hasMissingEvidence ?" in panel


def test_premium_workspace_layout_component():
    layout = read_frontend("components/orb-standalone/orb-premium-workspace-layout.tsx")
    assert "OrbPremiumWorkspaceLayout" in layout
    assert "data-orb-premium-workspace" in layout
    practice = read_frontend("components/orb-standalone/orb-practice-panels.tsx")
    assert "OrbPremiumWorkspaceLayout" in practice


def test_micro_status_for_residential_depth():
    micro = read_frontend("components/orb-standalone/orb-intelligence-micro-status.tsx")
    companion = read_frontend("components/orb-standalone/orb-care-companion.tsx")
    assert "OrbIntelligenceMicroStatus" in micro
    assert "Checking context" in read_frontend("lib/orb/indicare-intelligence-core.ts")
    assert "OrbIntelligenceMicroStatus" in companion


def test_routes_preserved_in_standalone_client():
    client = read_frontend("lib/orb/standalone-client.ts")
    assert "/orb/standalone/conversation" in client
    dictate = read_frontend("lib/orb/dictate/orb-dictate-client.ts")
    assert "generateOrbDictateNote" in dictate
