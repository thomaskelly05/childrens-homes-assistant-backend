from __future__ import annotations

from services.ai_context_minimisation_service import ai_context_minimisation_service


def test_strips_raw_body():
    context = {
        "summary": {"headline": "Attention needed", "body": "Sensitive narrative"},
        "raw_body": "Should not pass",
    }
    result = ai_context_minimisation_service.minimise_context(context)
    assert "raw_body" not in str(result.context)
    assert result.minimisation_applied is True


def test_keeps_themes_and_labels():
    context = {"summary": {"themes": ["missing episodes"], "headline": "Brief"}}
    result = ai_context_minimisation_service.minimise_context(context)
    dumped = str(result.context)
    assert "themes" in dumped or "headline" in dumped


def test_returns_summary():
    result = ai_context_minimisation_service.minimise_context({"body": "x", "themes": ["a"]})
    assert "Minimised" in result.summary
