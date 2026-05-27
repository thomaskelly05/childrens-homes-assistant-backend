from __future__ import annotations

from services.indicare_intelligence_surface_router import (
    requires_live_os_records,
    route_intelligence_surface,
    standalone_os_boundary_message,
)


CHRONOLOGY_PROMPT = (
    "If Ofsted looked at one child's chronology, what would they expect to understand from it?"
)

THERAPEUTIC_CUP_PROMPT = (
    "A young person smashed a cup after being told family time was cancelled. "
    "Help me understand this therapeutically and how staff should record it."
)

LIVE_CHRONOLOGY_PROMPT = "Use this child's chronology from last week and summarise what happened"


def test_ofsted_chronology_expectation_allowed_in_standalone():
    decision = route_intelligence_surface(CHRONOLOGY_PROMPT)
    assert decision.allowed_in_standalone is True
    assert decision.requires_os_context is False
    assert standalone_os_boundary_message(CHRONOLOGY_PROMPT) is None


def test_therapeutic_cup_prompt_allowed_in_standalone():
    decision = route_intelligence_surface(THERAPEUTIC_CUP_PROMPT)
    assert decision.allowed_in_standalone is True
    assert decision.requires_os_context is False
    assert standalone_os_boundary_message(THERAPEUTIC_CUP_PROMPT) is None


def test_live_chronology_access_requires_os():
    decision = route_intelligence_surface(LIVE_CHRONOLOGY_PROMPT)
    assert decision.allowed_in_standalone is False
    assert decision.requires_os_context is True
    assert requires_live_os_records(LIVE_CHRONOLOGY_PROMPT) is True


def test_manager_review_general_question_allowed():
    decision = route_intelligence_surface("What should a manager consider after a difficult night?")
    assert decision.allowed_in_standalone is True
    assert decision.requires_os_context is False


def test_our_record_quality_dashboard_requires_os():
    decision = route_intelligence_surface("What is our record quality picture across the home dashboard?")
    assert decision.requires_os_context is True
