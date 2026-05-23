from __future__ import annotations

from services.orb_agent_registry_service import orb_agent_registry_service


def test_document_analysis_agent_exists():
    agent = orb_agent_registry_service.get_document_analysis_agent()
    assert agent.agent_type == "document_analysis"
    assert agent.standalone_only is True
    assert agent.os_linked is False
    assert agent.care_record_access is False
    assert "user_uploaded" in agent.allowed_sources


def test_list_agents_includes_document_analysis():
    agents = orb_agent_registry_service.list_agents()
    ids = {a.id for a in agents}
    assert "document_analysis" in ids
