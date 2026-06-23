from __future__ import annotations

import pytest

from services.orb_provider_user_answer_service import (
    ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE,
    assert_live_provider_for_signoff,
    is_mock_provider_leakage,
    is_sign_off_or_deployed_context,
    openai_key_configured,
    sanitize_user_visible_provider_answer,
)


def test_mock_leakage_patterns_detected():
    assert is_mock_provider_leakage("ORB mock engine response. Configure OPENAI_API_KEY for live answers.")
    assert is_mock_provider_leakage("placeholder provider unavailable")
    assert not is_mock_provider_leakage("Calm breakfast record with toast and TV.")


def test_sanitize_replaces_mock_in_deployed_context(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    text = "ORB mock engine response. Configure OPENAI_API_KEY for live answers."
    sanitized, issue = sanitize_user_visible_provider_answer(text, provider="mock")
    assert issue == "mock_provider"
    assert sanitized == ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE
    assert "OPENAI_API_KEY" not in sanitized


def test_sanitize_preserves_live_answer_in_deployed_context(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    text = "Record breakfast calmly with toast choice and handover notes."
    sanitized, issue = sanitize_user_visible_provider_answer(text, provider="openai")
    assert issue is None
    assert sanitized == text


def test_assert_live_provider_for_signoff_requires_key_and_strict(monkeypatch):
    monkeypatch.setenv("ORB_LIVE_SIGN_OFF", "true")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.setenv("AI_PROVIDER_STRICT", "true")
    with pytest.raises(RuntimeError, match="OPENAI_API_KEY"):
        assert_live_provider_for_signoff()

    monkeypatch.setenv("OPENAI_API_KEY", "sk-test-key")
    monkeypatch.setenv("AI_PROVIDER_STRICT", "false")
    with pytest.raises(RuntimeError, match="AI_PROVIDER_STRICT"):
        assert_live_provider_for_signoff()

    monkeypatch.setenv("AI_PROVIDER_STRICT", "true")
    assert_live_provider_for_signoff() is None


def test_openai_key_placeholder_detection(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "replace-with-openai-key")
    assert not openai_key_configured()
    monkeypatch.setenv("OPENAI_API_KEY", "sk-live")
    assert openai_key_configured()


def test_sanitize_replaces_product_boilerplate_in_deployed_context(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    text = (
        "IndiCare is a residential children's homes operating system and intelligence platform "
        "built to support staff and managers in registered homes."
    )
    sanitized, issue = sanitize_user_visible_provider_answer(
        text,
        provider="openai",
        source_text="Help me write a daily record.",
    )
    assert issue == "product_boilerplate_leakage"
    assert sanitized == ORB_PROVIDER_UNAVAILABLE_USER_MESSAGE
    monkeypatch.delenv("ORB_LIVE_SIGN_OFF", raising=False)
    monkeypatch.delenv("AI_PROVIDER_STRICT", raising=False)
    monkeypatch.setenv("APP_ENV", "development")
    assert not is_sign_off_or_deployed_context()

    monkeypatch.setenv("ORB_LIVE_SIGN_OFF", "1")
    assert is_sign_off_or_deployed_context()
