from __future__ import annotations

import pytest

from services.orb_agent_registry_service import orb_agent_registry_service

CITATION_REQUIRED_TYPES = {
    "deep_research",
    "ofsted_research",
    "safeguarding_reflection",
    "general_research",
}


def test_all_agents_listed():
    agents = orb_agent_registry_service.list_agents()
    assert len(agents) >= 8
    types = {a.type for a in agents}
    assert "deep_research" in types
    assert "ofsted_research" in types
    assert "recording_quality" in types
    assert "safeguarding_reflection" in types


def test_all_agents_standalone_only():
    for agent in orb_agent_registry_service.list_agents():
        assert agent.standalone_only is True
        assert agent.os_linked is False
        assert agent.care_record_access is False


def test_citations_required_for_research_agents():
    for agent in orb_agent_registry_service.list_agents():
        if agent.type in CITATION_REQUIRED_TYPES:
            assert agent.requires_citations is True


@pytest.mark.parametrize(
    ("prompt", "expected"),
    [
        ("research Ofsted child voice", "ofsted_research"),
        ("compare this policy to guidance", "policy_comparison"),
        ("help me write this daily note", "recording_quality"),
        ("does this need safeguarding review", "safeguarding_reflection"),
        ("create manager briefing", "manager_briefing"),
        ("deep research missing from care", "deep_research"),
    ],
)
def test_classify_agent(prompt: str, expected: str):
    agent_type, _reason = orb_agent_registry_service.classify_agent(prompt)
    assert agent_type == expected


def test_default_output_format():
    assert orb_agent_registry_service.default_output_format("manager_briefing") == "briefing"
    assert orb_agent_registry_service.default_output_format("policy_comparison") == "comparison"
