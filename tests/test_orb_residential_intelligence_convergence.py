from __future__ import annotations

import pytest

from services.orb_indicare_intelligence_convergence_service import (
    orb_indicare_intelligence_convergence_service,
)
from services.orb_learning_micro_service import orb_learning_micro_service
from services.orb_review_this_service import orb_review_this_service
from services.orb_template_generation_service import orb_template_generation_service
from services.orb_template_library_registry import orb_template_library_registry
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime


MISSING_CANNABIS_PROMPT = (
    "A young person returned from missing smelling of cannabis and refused to talk."
)
LOCALITY_PROMPT = "Create a locality risk assessment template for my home."
LEARNING_PROMPT = "Turn this answer into a 5-minute staff learning session about professional curiosity."


def test_template_library_has_full_categories():
    templates = orb_template_library_registry.list_templates()
    assert len(templates) >= 80
    categories = {c["id"] for c in orb_template_library_registry.categories()}
    assert categories == {
        "safeguarding",
        "recording",
        "care_planning",
        "ofsted_sccif",
        "leadership_ri",
        "staff_supervision",
        "locality",
        "learning_academy",
    }


def test_missing_return_conversation_template_resolves():
    template_id = orb_template_library_registry.resolve_template_id(
        "Create a missing from care return conversation template"
    )
    assert template_id == "missing_return_conversation"


def test_template_generate_and_export_pdf():
    generated = orb_template_generation_service.generate("daily_record")
    assert generated["title"] == "Daily record"
    assert len(generated["sections"]) >= 5
    exported = orb_template_generation_service.export("daily_record", profile="pdf")
    assert exported["profile"] == "pdf"
    assert exported.get("content_base64")


def test_intelligence_convergence_activates_missing_and_isn():
    routing = orb_indicare_intelligence_convergence_service.route(MISSING_CANNABIS_PROMPT)
    engines = routing["active_engines"]
    assert "missing_episode_intelligence" in engines or "safeguarding_intelligence" in engines
    assert "outstanding_practice_intelligence" in engines


def test_intelligence_convergence_locality_and_template():
    routing = orb_indicare_intelligence_convergence_service.route(LOCALITY_PROMPT)
    assert "locality_intelligence" in routing["active_engines"]
    assert "template_intelligence" in routing["active_engines"]


def test_shared_runtime_wires_convergence_isn_review_learning():
    ctx = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message=MISSING_CANNABIS_PROMPT,
        mode="Ask ORB",
    )
    assert ctx["explainability"]["intelligence_convergence_active"]
    assert ctx["explainability"]["isn_cognition_active"]
    assert ctx["explainability"]["outstanding_practice_lens_applied"]
    assert ctx["explainability"]["standalone_only_reasoning"] is True
    assert ctx["active_engines"]


def test_review_this_detects_and_structures():
    assert orb_review_this_service.detect("Review this incident record")
    meta = orb_review_this_service.metadata(
        "Review this incident record",
        document_text="Child returned at 2am. Staff smell cannabis.",
    )
    assert meta["active"]
    assert "Overall View" in meta["review_sections"]


def test_learning_micro_detects():
    assert orb_learning_micro_service.detect(LEARNING_PROMPT)
    structure = orb_learning_micro_service.build_structure(LEARNING_PROMPT)
    assert structure["format"] == "five_minute_session"


def test_shared_runtime_review_this_with_document():
    ctx = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message="Review this incident record.",
        operational_context={"document_text": "YP refused to speak on return."},
    )
    assert ctx["explainability"]["review_this_active"]


def test_shared_runtime_learning_micro():
    ctx = shared_institutional_cognition_runtime.build_context(
        surface="standalone_orb",
        message=LEARNING_PROMPT,
    )
    assert ctx["explainability"]["learning_micro_active"]
