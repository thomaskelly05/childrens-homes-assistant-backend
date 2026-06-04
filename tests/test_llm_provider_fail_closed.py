from __future__ import annotations

import pytest

from assistant import llm_provider
from assistant.llm_provider import build_llm_provider, reset_llm_provider


def test_unknown_provider_fails_closed_in_production(monkeypatch):
    reset_llm_provider()
    monkeypatch.setenv("INDICARE_LLM_PROVIDER", "unknown_vendor")
    monkeypatch.setenv("INDICARE_ENV", "production")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    with pytest.raises(RuntimeError, match="Unknown LLM provider"):
        build_llm_provider()


def test_unknown_provider_warns_in_development(monkeypatch):
    reset_llm_provider()
    monkeypatch.setenv("INDICARE_LLM_PROVIDER", "unknown_vendor")
    monkeypatch.setenv("INDICARE_ENV", "development")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    provider = build_llm_provider()
    assert provider is not None


def test_openai_remains_approved(monkeypatch):
    reset_llm_provider()
    monkeypatch.setenv("INDICARE_LLM_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    assert "openai" in llm_provider.APPROVED_LLM_PROVIDERS
    provider = build_llm_provider()
    assert provider.__class__.__name__ == "OpenAIProvider"
