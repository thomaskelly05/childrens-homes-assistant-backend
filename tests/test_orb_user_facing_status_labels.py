from __future__ import annotations

from pathlib import Path

from services.orb_stream_status_service import (
    USER_STATUS_BUILDING_ANSWER,
    USER_STATUS_PREPARING_GUIDANCE,
    USER_STATUS_RECORDING_POINTS,
    USER_STATUS_SAFEST_STEPS,
    USER_STATUS_THINKING,
    stream_status_sequence,
)

REPO = Path(__file__).resolve().parents[1]
FRONTEND_COPY = REPO / "frontend-next" / "lib" / "orb" / "orb-user-facing-copy.ts"
MICRO_STATUS = REPO / "frontend-next" / "components" / "orb-standalone" / "orb-intelligence-micro-status.tsx"

FORBIDDEN = (
    "IndiCare Intelligence Core",
    "expert depth",
    "care relevance score",
    "active intelligence layers",
    "quality gate running",
    "missingness graph",
    "registered home domain",
    "route finaliser",
    "professional lens hits",
)


def test_allowed_status_labels_in_stream_service():
    allowed = {
        USER_STATUS_THINKING,
        USER_STATUS_PREPARING_GUIDANCE,
        USER_STATUS_SAFEST_STEPS,
        "Preparing recording points…",
        USER_STATUS_BUILDING_ANSWER,
    }
    for depth in (
        "general_light",
        "residential_light",
        "residential_standard",
        "residential_deep",
        "safeguarding_critical",
    ):
        for event in stream_status_sequence(depth):
            msg = event.get("message") or ""
            if msg:
                assert msg in allowed or msg == USER_STATUS_RECORDING_POINTS


def test_residential_standard_sequence():
    seq = stream_status_sequence("residential_standard")
    messages = [s.get("message") for s in seq]
    assert USER_STATUS_PREPARING_GUIDANCE in messages
    assert USER_STATUS_RECORDING_POINTS in messages


def test_frontend_micro_status_copy_matches_contract():
    text = FRONTEND_COPY.read_text(encoding="utf-8")
    assert USER_STATUS_PREPARING_GUIDANCE in text
    assert USER_STATUS_SAFEST_STEPS in text
    # ORB_MICRO_STATUS values are user-facing; ORB_FORBIDDEN_UI_TERMS list is intentional
    assert "ORB_MICRO_STATUS_BY_DEPTH" in text
    assert "ORB_FORBIDDEN_UI_TERMS" in text


def test_micro_status_component_sanitises_backend_messages():
    source = MICRO_STATUS.read_text(encoding="utf-8")
    assert "sanitiseOrbUserFacingStatus" in source
