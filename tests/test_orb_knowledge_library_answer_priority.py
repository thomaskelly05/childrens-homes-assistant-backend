from __future__ import annotations

from services.orb_knowledge_answer_priority_service import orb_knowledge_answer_priority_service


def test_priority_order_includes_safeguarding_first():
    labels = [label for _, label in orb_knowledge_answer_priority_service.SOURCE_PRIORITY_ORDER]
    assert "safeguarding" in labels[0].lower()


def test_rank_provider_policy_before_general():
    sources = [
        {"title": "General guidance", "governance_status": "approved", "official_source": True},
        {"title": "Home safeguarding policy", "governance_status": "approved", "document_family": "provider_policy"},
    ]
    ranked = orb_knowledge_answer_priority_service.rank_knowledge_sources(sources)
    assert ranked[0]["title"] == "Home safeguarding policy"


def test_no_policy_message_in_prompt():
    block = orb_knowledge_answer_priority_service.build_priority_prompt_block(
        has_approved_home_policy=False
    )
    assert "cannot see an approved home policy" in block
