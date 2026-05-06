from __future__ import annotations

from assistant.regulatory_context_builder import (
    build_adult_regulatory_context,
    build_regulatory_answer_contract,
    merge_regulatory_sources,
)


def test_build_adult_regulatory_context_for_reg45_includes_quote_and_sources():
    context = build_adult_regulatory_context(
        message="Help me write a Reg 45 quality of care review for the home.",
        mode="quality_review",
        task_type="report",
        output_type="reg45_report",
        safeguarding_level="normal",
        urgency="routine",
        user_role_profile="manager",
    )

    keys = {item["key"] for item in context["regulatory_basis"]}

    assert "reg45" in keys
    assert "reg13" in keys
    assert context["regulatory_source_count"] >= 2
    assert "Regulation 45" in context["prompt_block"]
    assert "Review of quality of care" in context["prompt_block"]


def test_build_adult_regulatory_context_for_notification_includes_reg40():
    context = build_adult_regulatory_context(
        message="Does this serious incident need notifying to Ofsted?",
        mode="safeguarding",
        task_type="advice",
        output_type="answer",
        safeguarding_level="heightened",
        urgency="urgent",
        user_role_profile="manager",
    )

    labels = {item["label"] for item in context["regulatory_basis"]}

    assert any("Regulation 40" in label for label in labels)
    assert any("Regulation 12" in label for label in labels)
    assert "without delay" in context["prompt_block"].lower()


def test_merge_regulatory_sources_dedupes_existing_sources():
    regulatory_context = build_adult_regulatory_context(
        message="Explain Reg 45.",
        mode="quality_review",
        task_type="report",
        output_type="reg45_report",
        safeguarding_level="normal",
        urgency="routine",
        user_role_profile="manager",
    )

    first_source = regulatory_context["regulatory_sources"][0]
    merged = merge_regulatory_sources(
        [first_source, {"citation_ref": "[daily_note:1]", "label": "Daily note"}],
        regulatory_context,
    )

    refs = [source.get("citation_ref") for source in merged]

    assert refs.count(first_source["citation_ref"]) == 1
    assert "[daily_note:1]" in refs


def test_regulatory_answer_contract_is_present_when_basis_exists():
    regulatory_context = build_adult_regulatory_context(
        message="What does Regulation 12 mean for safeguarding practice?",
        mode="safeguarding",
        task_type="advice",
        output_type="answer",
        safeguarding_level="heightened",
        urgency="heightened",
        user_role_profile="staff",
    )

    contract = build_regulatory_answer_contract(regulatory_context)

    assert "REGULATORY ANSWER CONTRACT" in contract
    assert "label the relevant regulation" in contract
    assert "Do not use regulation text as evidence" in contract


def test_regulatory_context_for_non_regulatory_question_can_be_empty():
    context = build_adult_regulatory_context(
        message="Make this sentence sound warmer and more professional.",
        mode="rewrite",
        task_type="draft",
        output_type="answer",
        safeguarding_level="normal",
        urgency="routine",
        user_role_profile="staff",
    )

    assert context["regulatory_basis"] == []
    assert context["regulatory_sources"] == []
    assert context["prompt_block"] == ""
