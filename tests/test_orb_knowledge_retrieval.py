from __future__ import annotations

import pytest

from services.orb_knowledge_retrieval_service import (
    RESEARCH_NOTE,
    orb_knowledge_retrieval_service,
)
from services.orb_knowledge_source_pack_service import SOURCE_PACK_IDS, list_source_packs


@pytest.fixture
def retrieval():
    return orb_knowledge_retrieval_service


def test_source_pack_catalogue_has_expected_keys():
    pack_keys = {pack["pack_key"] for pack in list_source_packs()}
    for key in SOURCE_PACK_IDS:
        assert key in pack_keys


@pytest.mark.parametrize(
    "message,expected_pack",
    [
        ("tell me about IndiCare", "indicare_product"),
        ("what would Ofsted expect around child voice", "ofsted_sccif"),
        ("help me write a daily note", "recording_quality"),
        ("does this need safeguarding", "safeguarding_principles"),
        ("what is quantum computing", "general_knowledge"),
    ],
)
def test_query_classification_selects_expected_packs(retrieval, message, expected_pack):
    classification = retrieval.classify_query(message)
    assert expected_pack in classification["pack_keys"]


def test_standalone_boundary_always_present(retrieval):
    packs = retrieval.retrieve_sources("hello")
    keys = {p["pack_key"] for p in packs}
    assert "standalone_boundary" in keys


def test_product_query_includes_product_and_boundary(retrieval):
    packs = retrieval.retrieve_sources("tell me about IndiCare")
    keys = {p["pack_key"] for p in packs}
    assert "indicare_product" in keys
    assert "standalone_boundary" in keys


def test_regulatory_query_includes_ofsted_and_quality_standards(retrieval):
    packs = retrieval.retrieve_sources("What would Ofsted expect in an inspection?")
    keys = {p["pack_key"] for p in packs}
    assert "ofsted_sccif" in keys
    assert "quality_standards" in keys
    assert "orb_knowledge_spine" in keys


def test_sccif_and_quality_standard_queries_use_specific_source_packs(retrieval):
    sccif_keys = {
        pack["pack_key"]
        for pack in retrieval.retrieve_sources("Use the SCCIF inspection lens for children's homes")
    }
    quality_keys = {
        pack["pack_key"]
        for pack in retrieval.retrieve_sources("Which Quality Standards apply to child voice?")
    }
    assert "ofsted_sccif" in sccif_keys
    assert "quality_standards" in sccif_keys
    assert "quality_standards" in quality_keys
    assert "residential_childrens_homes" not in quality_keys or "quality_standards" in quality_keys


def test_recording_quality_mode_pack(retrieval):
    packs = retrieval.retrieve_sources("draft wording", mode="Record This Properly")
    keys = {p["pack_key"] for p in packs}
    assert "recording_quality" in keys


def test_safeguarding_mode_pack(retrieval):
    packs = retrieval.retrieve_sources("worried about risk", mode="Safeguarding")
    keys = {p["pack_key"] for p in packs}
    assert "safeguarding_principles" in keys


def test_profile_context_adds_user_pack(retrieval):
    packs = retrieval.retrieve_sources("use my profile", profile_context=True)
    keys = {p["pack_key"] for p in packs}
    assert "user_provided_context" in keys


def test_research_intent_flag_and_note(retrieval):
    classification = retrieval.classify_query("research what Ofsted says about child voice")
    assert classification["research_intent"] is True
    assert classification["research_note"] == RESEARCH_NOTE


def test_prompt_tier_fast_for_short_general_query(retrieval):
    tier = retrieval.resolve_prompt_tier("hello there")
    assert tier == "fast"


def test_prompt_tier_deep_for_safeguarding_mode(retrieval):
    tier = retrieval.resolve_prompt_tier("help me think", mode="Safeguarding Thinking")
    assert tier == "deep"


def test_prepare_request_bundle_dedupes_classification(retrieval):
    bundle = retrieval.prepare_request_bundle("tell me about IndiCare")
    assert bundle["prompt_tier"] in {"fast", "residential", "deep"}
    assert bundle["grounding_context"]
    assert bundle["retrieval_elapsed_ms"] >= 0
    assert len(bundle["source_packs"]) >= 1


def test_build_grounding_context_is_honest_about_live_retrieval(retrieval):
    context = retrieval.build_grounding_context("tell me about IndiCare")
    lower = context.lower()
    assert "built-in" in lower or "live_retrieved: false" in lower
    assert "os records" not in lower or "not live" in lower or "built-in" in lower


def test_routing_hint_for_research(retrieval):
    classification = retrieval.classify_query("find sources on regulation says")
    assert classification["routing_hint"] == "deep_research_foundation"


def test_rag_retrieval_service_importable():
    from services.orb_rag_retrieval_service import orb_rag_retrieval_service

    assert orb_rag_retrieval_service is not None
