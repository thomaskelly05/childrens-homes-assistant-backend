from __future__ import annotations

import inspect

from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence
from services.orb_chat_timing_service import OrbChatTimingTracker


def test_finalize_records_timing_marks(monkeypatch):
    monkeypatch.setenv("ORB_CHAT_TIMING_DEBUG", "true")
    from services.indicare_intelligence_core_service import indicare_intelligence_core_service

    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Help me word a daily log",
        mode="Record This Properly",
    )
    timing = OrbChatTimingTracker()
    finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer="Here is a draft wording.",
        prompt_text="Help me word a daily log",
        mode="Record This Properly",
        record_learning=False,
        timing=timing,
    )
    marks = timing.to_debug_metadata()
    assert marks.get("finalise_start_ms") is not None
    assert marks.get("quality_gate_complete_ms") is not None


def test_stream_route_finalize_before_metadata_event():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    finalize_idx = source.index("finalize_standalone_intelligence(")
    metadata_idx = source.index('yield _sse_event("metadata"')
    assert finalize_idx < metadata_idx


def test_stream_tokens_can_precede_finalize():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    token_idx = source.index('yield _sse_event("token"')
    finalize_idx = source.index("finalize_standalone_intelligence(")
    assert token_idx < finalize_idx
