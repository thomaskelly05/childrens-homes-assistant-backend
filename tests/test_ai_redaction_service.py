from __future__ import annotations

from services.ai_redaction_service import ai_redaction_service


SAMPLE = (
    "John Smith DOB 12/04/2010 lives at 1 Test Street, NE1 1AA. "
    "Mum Sarah called 07700123456. NHS 123 456 7890. test@example.com"
)


def test_redact_email_phone_dob_nhs_postcode():
    result = ai_redaction_service.redact_to_result(SAMPLE, mode="strict")
    assert "test@example.com" not in result.text
    assert "07700123456" not in result.text
    assert "123 456 7890" not in result.text
    assert "NE1 1AA" not in result.text.upper() or "[POSTCODE" in result.text


def test_redact_school_and_family_phrases():
    text = "School named Riverside Academy. Mum called Emma Smith."
    result = ai_redaction_service.redact_to_result(text, mode="strict")
    assert "Riverside" not in result.text or "[SCHOOL" in result.text


def test_detect_identifiers():
    findings = ai_redaction_service.detect_identifiers(SAMPLE)
    labels = {f.label for f in findings}
    assert "email" in labels or "phone" in labels


def test_safe_excerpt():
    long_text = "A" * 2000 + " test@example.com"
    excerpt = ai_redaction_service.safe_excerpt(long_text, max_chars=800)
    assert len(excerpt) <= 900
    assert "test@example.com" not in excerpt


def test_redaction_warning_present():
    result = ai_redaction_service.redact_to_result("hello", mode="standard")
    assert any("Automated redaction" in w for w in result.warnings)
