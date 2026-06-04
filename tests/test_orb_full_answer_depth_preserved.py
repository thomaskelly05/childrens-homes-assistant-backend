from __future__ import annotations

import inspect

from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence
from services.indicare_intelligence_core_service import indicare_intelligence_core_service


def test_finalize_still_runs_quality_gate():
    source = inspect.getsource(finalize_standalone_intelligence)
    assert "evaluate_answer" in source
    assert "answer_quality_gate" in source


def test_learning_ledger_still_recorded():
    source = inspect.getsource(finalize_standalone_intelligence)
    assert "record_learning" in source
    assert "learning_ledger" in source


def test_expert_answer_engine_not_removed_from_routes():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    assert "finalize_standalone_intelligence" in source
    assert "expert_answer_engine" in source or "orb_expert_answer_engine_service" in source


def test_fast_opening_does_not_replace_full_stream():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    assert "stream_answer" in source
    assert "fast_opening_for_message" in source
    # Fast opening is prepended; model stream continues
    assert source.index("fast_opening_for_message") < source.index("stream_answer")


def test_intelligence_core_service_still_builds_full_packet():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "She keeps saying she doesn't care.",
        mode="Ask ORB",
    )
    assert packet.get("expert_depth")
    assert "active_intelligence_layers" in packet or packet.get("care_relevance_score") is not None
