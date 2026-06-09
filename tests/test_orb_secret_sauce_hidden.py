from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PANEL = REPO / "frontend-next" / "components" / "orb-standalone" / "orb-intelligence-core-panel.tsx"
ASSISTANT = REPO / "frontend-next" / "components" / "orb-standalone" / "orb-assistant-message.tsx"
COPY = REPO / "frontend-next" / "lib" / "orb" / "orb-user-facing-copy.ts"
STREAM_STATUS = REPO / "services" / "orb_stream_status_service.py"

FORBIDDEN_IN_NORMAL_UI = (
    "What ORB checked",
    "IndiCare Intelligence Core",
    "expert_depth",
    "care_relevance_score",
    "active_intelligence_layers",
    "registered_home_domains",
    "quality_standard_hits",
    "professional_lens_hits",
    "missingness graph",
    "quality gate running",
    "route finaliser",
    "learning ledger",
    "backend brain",
)


def test_response_support_panel_label():
    panel = PANEL.read_text(encoding="utf-8")
    assert "ORB_RESPONSE_SUPPORT_PANEL_LABEL" in panel
    assert "data-orb-response-support-panel" in panel
    assert "What ORB checked" not in panel


def test_panel_does_not_render_raw_internal_chip_labels():
    panel = PANEL.read_text(encoding="utf-8")
    assert 'label="Depth"' not in panel
    assert 'label="Care relevance"' not in panel
    assert 'label="Quality gate"' not in panel
    assert 'label="Registered home domains"' not in panel


def test_stream_status_messages_are_plain_language():
    from services.orb_stream_status_service import stream_status_sequence

    user_messages: list[str] = []
    for depth in (
        "general_light",
        "residential_light",
        "residential_standard",
        "residential_deep",
        "safeguarding_critical",
    ):
        for event in stream_status_sequence(depth):
            if event.get("message"):
                user_messages.append(str(event["message"]))
    joined = " ".join(user_messages).lower()
    for forbidden in FORBIDDEN_IN_NORMAL_UI:
        assert forbidden.lower() not in joined, forbidden


def test_technical_drawer_gated_to_founder_admin():
    assistant = ASSISTANT.read_text(encoding="utf-8")
    assert "userHasFounderAccess" in assistant
    assert "showTechnicalDetails={founderDebugAccess}" in assistant


def test_forbidden_terms_listed_for_sanitisation():
    copy = COPY.read_text(encoding="utf-8")
    assert "indicare_intelligence_core" in copy
    assert "expert_brain_9" in copy
    assert "sanitiseOrbUserFacingStatus" in copy
