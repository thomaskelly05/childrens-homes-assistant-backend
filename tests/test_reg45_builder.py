from __future__ import annotations

from assistant.reg45_builder import (
    build_reg45_prompt_block,
    build_reg45_review_context,
    serialise_reg45_review_context,
)


def test_reg45_builder_returns_required_sections_and_regulatory_context():
    evidence = [
        {
            "citation_ref": "[daily_note:1]",
            "record_type": "daily_note",
            "excerpt": "Young person engaged positively in education.",
        },
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "excerpt": "Missing from home incident with police involvement.",
        },
    ]

    context = build_reg45_review_context(
        evidence_index=evidence,
    )

    assert "Children's experiences and progress" in context.required_sections
    assert context.regulatory_context["regulatory_basis"] != []
    assert context.evidence_count == 2


def test_reg45_builder_identifies_evidence_gaps():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "excerpt": "Safeguarding concern with police involvement.",
        }
    ]

    context = build_reg45_review_context(
        evidence_index=evidence,
    )

    assert context.evidence_gaps != []
    assert "reg45_evidence_gaps_present" in context.warnings


def test_reg45_prompt_block_contains_structure_and_actions():
    evidence = [
        {
            "citation_ref": "[risk:2]",
            "record_type": "risk_assessment",
            "excerpt": "Known self-harm concerns and emotional wellbeing needs.",
        },
        {
            "citation_ref": "[task:7]",
            "record_type": "task",
            "excerpt": "Manager review required.",
        },
    ]

    context = build_reg45_review_context(
        evidence_index=evidence,
    )

    prompt_block = build_reg45_prompt_block(context)

    assert "REG 45 REVIEW CONTEXT" in prompt_block
    assert "Do not invent evidence" in prompt_block
    assert "Required sections" in prompt_block
    assert "Action prompts" in prompt_block


def test_serialised_reg45_context_contains_patterns_and_safeguarding():
    evidence = [
        {
            "citation_ref": "[incident:44]",
            "record_type": "incident",
            "excerpt": "Repeated missing episodes and exploitation concerns.",
        },
        {
            "citation_ref": "[daily_note:4]",
            "record_type": "daily_note",
            "excerpt": "Young person anxious following contact.",
        },
    ]

    context = build_reg45_review_context(
        evidence_index=evidence,
    )

    payload = serialise_reg45_review_context(context)

    assert payload["patterns"]["findings"] != []
    assert payload["safeguarding"]["level"] in {"review", "heightened", "urgent"}
    assert payload["action_prompts"] != []
