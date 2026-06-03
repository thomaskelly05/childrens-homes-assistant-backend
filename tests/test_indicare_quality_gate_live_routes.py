from __future__ import annotations

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_answer_quality_gate_service import orb_answer_quality_gate_service


def test_quality_gate_blocks_grade_prediction():
    gate = orb_answer_quality_gate_service.evaluate_text(
        "Your home will be inadequate at inspection.",
        message="Ofsted tomorrow",
        risk_level="medium",
    )
    assert gate["passed"] is False
    assert "grade_prediction" in gate.get("critical_flags", [])


def test_quality_gate_blocks_diagnosis():
    gate = orb_answer_quality_gate_service.evaluate_text(
        "This child has ADHD confirmed.",
        message="behaviour",
        risk_level="medium",
    )
    assert gate["passed"] is False
    assert "diagnosis" in gate.get("critical_flags", [])


def test_quality_gate_blocks_fake_os_access():
    gate = orb_answer_quality_gate_service.evaluate_text(
        "I checked live IndiCare OS and the chronology shows no risk.",
        message="risk",
        risk_level="low",
    )
    assert gate["passed"] is False
    assert "fake_os_access" in gate.get("critical_flags", [])


def test_quality_gate_blocks_referral_certainty():
    gate = orb_answer_quality_gate_service.evaluate_text(
        "A referral is required to children's services.",
        message="concern",
        risk_level="medium",
    )
    assert gate["passed"] is False
    assert "definite_referral" in gate.get("critical_flags", [])


def test_intelligence_evaluate_answer_on_packet():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Missing overnight", mode="Safeguarding Thinking"
    )
    gate = indicare_intelligence_core_service.evaluate_answer(
        packet, "Focus on immediate safety and inform your manager."
    )
    assert "passed" in gate
    assert "composite_score" in gate


def test_standalone_routes_import_intelligence_core():
    from routers import orb_standalone_routes

    assert hasattr(orb_standalone_routes, "indicare_intelligence_core_service")
