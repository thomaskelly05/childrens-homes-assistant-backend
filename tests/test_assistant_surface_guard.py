from __future__ import annotations

import pytest

from services.assistant_surface_guard import (
    build_surface_boundary_result,
    enrich_with_surface_boundary,
    enforce_surface_boundary,
    infer_assistant_surface,
)


def test_standalone_without_os_context_remains_standalone():
    context = {
        "assistant_type": "standalone",
        "role": "residential support worker",
    }

    result = build_surface_boundary_result(
        message="Help me write this more professionally.",
        user_context=context,
    )

    assert result.ok is True
    assert result.assistant_surface == "standalone"
    assert result.requires_evidence_grounding is False
    assert result.has_os_context is False


def test_os_assistant_type_infers_os_embedded_surface():
    context = {
        "assistant_type": "young_people_os",
        "evidence_index": [
            {
                "citation_ref": "[daily_note:123]",
                "record_type": "daily_note",
                "record_id": 123,
            }
        ],
    }

    assert infer_assistant_surface(context) == "os_embedded"

    result = build_surface_boundary_result(
        message="What do the records show today?",
        user_context=context,
    )

    assert result.ok is True
    assert result.assistant_surface == "os_embedded"
    assert result.requires_evidence_grounding is True
    assert result.has_evidence is True


def test_scope_type_infers_os_embedded_surface():
    context = {
        "scope_type": "home",
        "home_id": 4,
        "sources": [
            {
                "citation_ref": "[incident:88]",
                "record_type": "incident",
                "record_id": 88,
            }
        ],
    }

    result = build_surface_boundary_result(
        message="Summarise the incidents for the home.",
        user_context=context,
    )

    assert result.assistant_surface == "os_embedded"
    assert result.has_os_context is True
    assert result.has_evidence is True


def test_standalone_with_os_context_is_a_boundary_violation():
    context = {
        "assistant_surface": "standalone",
        "assistant_type": "standalone",
        "young_person_id": 12,
        "evidence_index": [
            {
                "citation_ref": "[incident:456]",
                "record_type": "incident",
                "record_id": 456,
            }
        ],
    }

    result = build_surface_boundary_result(
        message="What happened in this incident?",
        user_context=context,
    )

    assert "standalone_received_os_context" in result.violations
    assert result.ok is False

    with pytest.raises(ValueError):
        enforce_surface_boundary(
            message="What happened in this incident?",
            user_context=context,
        )


def test_os_record_specific_question_without_evidence_is_a_boundary_violation():
    context = {
        "assistant_type": "home_os",
        "scope_type": "home",
        "home_id": 7,
    }

    result = build_surface_boundary_result(
        message="What do the records show about safeguarding this week?",
        user_context=context,
    )

    assert result.assistant_surface == "os_embedded"
    assert result.record_specific_request is True
    assert result.has_evidence is False
    assert "os_record_specific_request_without_visible_evidence" in result.violations


def test_os_general_guidance_without_evidence_is_allowed_but_evidence_grounded():
    context = {
        "assistant_type": "home_os",
        "scope_type": "home",
        "home_id": 7,
    }

    result = build_surface_boundary_result(
        message="Explain what Regulation 45 is in general terms.",
        user_context=context,
    )

    assert result.assistant_surface == "os_embedded"
    assert result.requires_evidence_grounding is True
    assert result.has_evidence is False
    assert result.ok is True


def test_enrich_with_surface_boundary_adds_audit_metadata():
    context = {
        "assistant_type": "quality_os",
        "scope_type": "quality",
        "sources": [
            {
                "citation_ref": "[quality_audit:3]",
                "record_type": "quality_audit",
                "record_id": 3,
            }
        ],
    }

    enriched = enrich_with_surface_boundary(
        message="Give me an Ofsted readiness view.",
        user_context=context,
    )

    assert enriched["assistant_surface"] == "os_embedded"
    assert enriched["requires_evidence_grounding"] is True
    assert enriched["surface_boundary"]["has_evidence"] is True
    assert enriched["surface_boundary"]["violations"] == []
