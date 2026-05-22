from __future__ import annotations

from schemas.ai_models import AiModelCapability, AiProviderName, AiQualityTier, AiCostTier
from services.ai_provider_registry import AiProviderRegistry, ai_provider_registry


def test_openai_and_mock_registered():
    providers = {p["name"] for p in ai_provider_registry.health_payload()["providers"]}
    assert "openai" in providers
    assert "mock" in providers


def test_import_without_openai_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    registry = AiProviderRegistry()
    assert registry.get_default_provider() in {AiProviderName.OPENAI, AiProviderName.MOCK}


def test_default_provider_resolves(monkeypatch):
    monkeypatch.setenv("AI_DEFAULT_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert ai_provider_registry.get_default_provider() == AiProviderName.MOCK


def test_choose_model_for_vision_capability():
    provider, model = ai_provider_registry.choose_default_model_for_capability(
        AiModelCapability.VISION,
        quality_tier=AiQualityTier.BALANCED,
        cost_tier=AiCostTier.STANDARD,
        provider=AiProviderName.OPENAI,
    )
    assert provider == AiProviderName.OPENAI
    assert model


def test_list_models_filters_by_provider():
    openai_models = ai_provider_registry.list_models("openai")
    assert openai_models
    assert all(m.provider == AiProviderName.OPENAI for m in openai_models)
