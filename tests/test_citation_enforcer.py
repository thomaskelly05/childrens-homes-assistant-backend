from __future__ import annotations

from assistant.citation_enforcer import (
    build_citation_repair_instruction,
    enforce_citations,
    extract_record_citations,
    extract_regulatory_citations,
)


def test_extract_record_citations_returns_unique_refs():
    text = "The chronology shows escalation [incident:44] and later risk [incident:44] with a handover [handover:2]."

    refs = extract_record_citations(text)

    assert refs == ["[incident:44]", "[handover:2]"]


def test_extract_regulatory_citations_returns_regulatory_refs():
    text = "This may engage [reg40] notification duties and should be reviewed alongside [sccif]."

    refs = extract_regulatory_citations(text)

    assert "[reg40]" in refs
    assert "[sccif]" in refs


def test_os_answer_requires_visible_record_citations_when_evidence_exists():
    result = enforce_citations(
        answer_text="The incident shows escalating risk and missing episodes.",
        assistant_surface="os_embedded",
        requires_os_citations=True,
        sources=[
            {
                "citation_ref": "[incident:44]",
            }
        ],
    )

    assert result.ok is False
    assert result.missing_required_record_citations is True
    assert "missing_required_os_citations" in result.blockers


def test_os_answer_with_supported_citations_passes_enforcement():
    result = enforce_citations(
        answer_text="The incident record describes escalating missing episodes [incident:44].",
        assistant_surface="os_embedded",
        requires_os_citations=True,
        sources=[
            {
                "citation_ref": "[incident:44]",
            }
        ],
    )

    assert result.ok is True
    assert result.used_record_refs == ["[incident:44]"]


def test_unsupported_record_citations_are_blocked():
    result = enforce_citations(
        answer_text="The chronology indicates increasing risk [incident:99].",
        assistant_surface="os_embedded",
        requires_os_citations=True,
        sources=[
            {
                "citation_ref": "[incident:44]",
            }
        ],
    )

    assert result.ok is False
    assert "unsupported_record_citations" in result.blockers
    assert result.unsupported_record_citations == ["[incident:99]"]


def test_regulatory_warning_is_raised_when_expected_without_reg_citation():
    result = enforce_citations(
        answer_text="The home should review whether notification thresholds are met.",
        assistant_surface="standalone",
        requires_os_citations=False,
        requires_regulatory_basis=True,
    )

    assert result.ok is True
    assert "regulatory_basis_expected_without_regulatory_citation" in result.warnings


def test_citation_repair_instruction_contains_visible_refs_and_rules():
    result = enforce_citations(
        answer_text="The chronology indicates increased safeguarding concerns.",
        assistant_surface="os_embedded",
        requires_os_citations=True,
        sources=[
            {
                "citation_ref": "[incident:44]",
            },
            {
                "citation_ref": "[daily_note:7]",
            },
        ],
    )

    instruction = build_citation_repair_instruction(result)

    assert "CITATION REPAIR REQUIRED" in instruction
    assert "[incident:44]" in instruction
    assert "Do not invent record refs" in instruction
