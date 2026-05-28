from __future__ import annotations

from services.orb_data_vault_registry_service import orb_data_vault_registry_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_operating_brain_service import orb_operating_brain_service


def test_operating_brain_has_core_orb_only_assets():
    knowledge = orb_operating_brain_service.get_knowledge()
    assert "answer_standard" in knowledge
    assert "safety_rules" in knowledge
    assert "routing_map" in knowledge
    assert "review_checklists" in knowledge
    assert "evaluation_tests" in knowledge
    assert "What Am I Missing?" in knowledge["modes"]
    assert "What Am I Missing? Brain" in knowledge["brains"]


def test_operating_brain_restraint_sections_selected():
    sections = orb_operating_brain_service.relevant_sections(
        "What do I record after a restraint?",
        mode="Record This Properly",
    )
    assert "routing_map_restraint" in sections
    assert "review_checklist_restraint" in sections
    assert "evaluation_restraint" in sections
    assert "child voice" in sections["evaluation_restraint"]["must_include"]
    assert "manager review" in sections["evaluation_restraint"]["must_include"]


def test_operating_brain_what_am_i_missing_selected():
    sections = orb_operating_brain_service.relevant_sections(
        "What am I missing here?",
        mode="What Am I Missing?",
    )
    assert "what_am_i_missing_checks" in sections
    assert "evaluation_what_am_i_missing" in sections
    assert "missing child voice" in sections["what_am_i_missing_checks"]
    assert "safeguarding consideration" in sections["evaluation_what_am_i_missing"]["must_include"]


def test_retrieval_includes_operating_brain_pack():
    sources = orb_knowledge_retrieval_service.retrieve_sources(
        "What do I record after a restraint?",
        mode="Record This Properly",
    )
    pack_keys = [source.get("pack_key") for source in sources]
    assert "orb_operating_brain" in pack_keys
    assert "orb_knowledge_spine" in pack_keys


def test_retrieval_exposes_operating_brain_metadata():
    classification = orb_knowledge_retrieval_service.classify_query(
        "What would Ofsted ask about leadership?",
        mode="Ofsted Lens",
    )
    assert classification["intents"]["orb_operating_brain"] is True
    selected_sections = classification["orb_operating_brain"]["selected_sections"]
    assert "answer_standard" in selected_sections
    assert "evaluation_ofsted_leadership" in selected_sections


def test_data_vault_registry_has_standalone_boundaries():
    vaults = orb_data_vault_registry_service.list_vaults()
    assert vaults
    assert all(vault["standalone_allowed"] is True for vault in vaults)
    assert all(vault["live_os_records"] is False for vault in vaults)


def test_data_vault_registry_maps_restraint_vault():
    vault = orb_data_vault_registry_service.get_vault("Restrictive Practice Vault")
    assert vault is not None
    assert vault["category"] == "restrictive_practice"
    assert "medication_restraint" in vault["typical_modules"]
    assert "[Recording quality]" in vault["typical_anchors"]
