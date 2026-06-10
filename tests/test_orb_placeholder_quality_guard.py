"""Tests for universal ORB placeholder quality guard."""

from __future__ import annotations

from services.orb_placeholder_quality_guard_service import (
    clean_placeholders,
    find_placeholder_issues,
    has_broken_placeholders,
    sanitize_placeholders_in_answer,
    strip_generic_intros,
)
from services.orb_universal_answer_contract_map_service import sanitize_final_answer

BROKEN_SAMPLES = [
    "[A brief introduction about…]",
    "[Use widgets to express dre…]",
    "[Goal 1: Specific, measurab…]",
]


def test_broken_placeholder_detection():
    for sample in BROKEN_SAMPLES:
        assert has_broken_placeholders(sample)


def test_clean_placeholders_replaces_broken_brackets():
    text = "Name: [Use widgets to express dre…] Goal: [Goal 1: Specific, measurab…]"
    cleaned, issues = clean_placeholders(text)
    assert issues
    assert "…]" not in cleaned
    assert "[" in cleaned


def test_strip_generic_intros():
    text = "Creating a child-friendly support plan for the young person.\n\n# My Support Plan"
    cleaned = strip_generic_intros(text)
    assert "creating a child-friendly support plan" not in cleaned.lower()
    assert cleaned.startswith("# My Support Plan")


def test_sanitize_placeholders_no_ellipsis_in_brackets():
    polluted = (
        "Creating a child-friendly support plan.\n"
        "[A brief introduction about…]\n"
        "[Use widgets to express dre…]"
    )
    cleaned, issues = sanitize_placeholders_in_answer(polluted)
    assert "…]" not in cleaned
    assert issues


def test_final_answer_sanitize_removes_streaming_and_broken_placeholders():
    answer = "Creating a child-friendly support plan. [Use widgets to express dre…]"
    cleaned = sanitize_final_answer(answer, family_id="accessible_child_support_plan")
    assert "…]" not in cleaned
    assert "creating a child-friendly support plan" not in cleaned.lower()


def test_find_placeholder_issues_reports_broken():
    issues = find_placeholder_issues("[Goal 1: Specific, measurab…]")
    assert issues
