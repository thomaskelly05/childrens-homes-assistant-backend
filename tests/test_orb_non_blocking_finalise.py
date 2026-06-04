from __future__ import annotations

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence


def test_ledger_failure_does_not_fail_finalize(monkeypatch):
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "What is the capital of France?",
        mode="Ask ORB",
    )

    def boom(*_args, **_kwargs):
        raise RuntimeError("ledger_unavailable")

    monkeypatch.setattr(
        indicare_intelligence_core_service,
        "record_learning",
        boom,
    )

    answer, meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer="Paris is the capital of France.",
        prompt_text="What is the capital of France?",
        mode="Ask ORB",
        record_learning=True,
    )

    assert answer
    assert meta.get("answer_quality_gate")
    ledger = meta.get("learning_ledger") or {}
    assert ledger.get("recorded") is False
    assert ledger.get("error") == "RuntimeError"


def test_quality_gate_runs_during_finalize():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Tell me about IndiCare OS live records",
        mode="Ask ORB",
    )
    answer, meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer="I pulled the child's chronology from IndiCare OS.",
        prompt_text="Tell me about IndiCare OS live records",
        mode="Ask ORB",
        record_learning=False,
    )
    assert answer
    assert meta.get("answer_quality_gate") is not None
