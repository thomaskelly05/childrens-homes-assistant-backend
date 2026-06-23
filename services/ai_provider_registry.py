from __future__ import annotations

import os
from typing import Iterable

from schemas.ai_models import (
    AiCostTier,
    AiModelCapability,
    AiModelProfile,
    AiProviderName,
    AiQualityTier,
)
from services.ai_providers.mock_provider import mock_provider
from services.ai_providers.openai_provider import openai_provider


def _env(name: str, default: str = "") -> str:
    return str(os.getenv(name, default) or "").strip()


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _dev_model(name: str, fallback: str) -> str:
    value = _env(name)
    return value or fallback


class AiProviderRegistry:
    """Central registry of supported AI providers and model profiles."""

    def __init__(self) -> None:
        self._openai_text = _dev_model("AI_DEFAULT_TEXT_MODEL", _dev_model("OPENAI_DEFAULT_MODEL", "gpt-4o-mini"))
        self._openai_fast = _dev_model("AI_DEFAULT_FAST_MODEL", _dev_model("OPENAI_FAST_MODEL", self._openai_text))
        self._openai_reasoning = _dev_model(
            "AI_DEFAULT_REASONING_MODEL",
            _dev_model("OPENAI_REASONING_MODEL", self._openai_text),
        )
        self._openai_vision = _dev_model("AI_DEFAULT_VISION_MODEL", _dev_model("OPENAI_VISION_MODEL", self._openai_text))
        self._openai_low_cost = _dev_model(
            "AI_DEFAULT_LOW_COST_MODEL",
            _dev_model("OPENAI_LOW_COST_MODEL", self._openai_fast),
        )
        self._profiles = self._build_profiles()

    def _build_profiles(self) -> list[AiModelProfile]:
        profiles: list[AiModelProfile] = []
        openai_models = {
            self._openai_text: (AiQualityTier.BALANCED, AiCostTier.STANDARD, []),
            self._openai_fast: (AiQualityTier.FAST, AiCostTier.LOW, [AiModelCapability.LOW_LATENCY]),
            self._openai_reasoning: (
                AiQualityTier.HIGH,
                AiCostTier.PREMIUM,
                [AiModelCapability.REASONING, AiModelCapability.SAFETY],
            ),
            self._openai_vision: (
                AiQualityTier.BALANCED,
                AiCostTier.STANDARD,
                [AiModelCapability.VISION],
            ),
            self._openai_low_cost: (AiQualityTier.FAST, AiCostTier.LOW, [AiModelCapability.LOW_LATENCY]),
        }
        seen: set[str] = set()
        for model, (quality, cost, extra_caps) in openai_models.items():
            if not model or model in seen:
                continue
            seen.add(model)
            caps = [
                AiModelCapability.TEXT,
                AiModelCapability.CITATIONS,
                *extra_caps,
            ]
            profiles.append(
                AiModelProfile(
                    provider=AiProviderName.OPENAI,
                    model=model,
                    capabilities=caps,
                    quality_tier=quality,
                    cost_tier=cost,
                    supports_vision=AiModelCapability.VISION in extra_caps,
                    supports_low_latency=AiModelCapability.LOW_LATENCY in extra_caps,
                    supports_reasoning=AiModelCapability.REASONING in extra_caps,
                    default_timeout_seconds=float(_env("OPENAI_TIMEOUT_SECONDS", "45") or 45),
                )
            )
        profiles.append(
            AiModelProfile(
                provider=AiProviderName.MOCK,
                model="mock-text",
                capabilities=[AiModelCapability.TEXT, AiModelCapability.LOW_LATENCY],
                quality_tier=AiQualityTier.FAST,
                cost_tier=AiCostTier.LOW,
                supports_low_latency=True,
                default_timeout_seconds=5.0,
            )
        )
        return profiles

    def list_providers(self) -> list[str]:
        return [p.value for p in AiProviderName if self.provider_available(AiProviderName(p)) or p == AiProviderName.MOCK]

    def list_models(self, provider: str | AiProviderName | None = None) -> list[AiModelProfile]:
        if provider is None:
            return list(self._profiles)
        name = provider.value if isinstance(provider, AiProviderName) else str(provider).strip().lower()
        return [p for p in self._profiles if p.provider.value == name]

    def get_default_provider(self) -> AiProviderName:
        configured = _env("AI_DEFAULT_PROVIDER", "openai").lower()
        try:
            provider = AiProviderName(configured)
        except ValueError:
            provider = AiProviderName.OPENAI
        if self.provider_available(provider):
            return provider
        if _env_bool("AI_PROVIDER_STRICT", False):
            return provider
        return AiProviderName.MOCK if mock_provider.is_available() else provider

    def get_model_profile(self, provider: str | AiProviderName, model: str) -> AiModelProfile | None:
        provider_name = provider.value if isinstance(provider, AiProviderName) else str(provider).strip().lower()
        for profile in self._profiles:
            if profile.provider.value == provider_name and profile.model == model:
                return profile
        return None

    def provider_available(self, provider: str | AiProviderName) -> bool:
        name = provider.value if isinstance(provider, AiProviderName) else str(provider).strip().lower()
        if name == AiProviderName.OPENAI.value:
            return openai_provider.is_available()
        if name == AiProviderName.MOCK.value:
            return mock_provider.is_available()
        return False

    def models_configured(self, provider: str | AiProviderName) -> bool:
        name = provider.value if isinstance(provider, AiProviderName) else str(provider).strip().lower()
        if name == AiProviderName.OPENAI.value:
            return bool(self._openai_text)
        if name == AiProviderName.MOCK.value:
            return True
        return False

    def choose_default_model_for_capability(
        self,
        capability: AiModelCapability | str,
        *,
        quality_tier: AiQualityTier = AiQualityTier.BALANCED,
        cost_tier: AiCostTier = AiCostTier.STANDARD,
        provider: AiProviderName | None = None,
    ) -> tuple[AiProviderName, str]:
        resolved_provider = provider or self.get_default_provider()
        cap = capability if isinstance(capability, AiModelCapability) else AiModelCapability(str(capability))

        if resolved_provider == AiProviderName.OPENAI:
            if cap == AiModelCapability.VISION:
                return resolved_provider, self._openai_vision
            if quality_tier == AiQualityTier.MAXIMUM or quality_tier == AiQualityTier.HIGH:
                return resolved_provider, self._openai_reasoning
            if quality_tier == AiQualityTier.FAST or cost_tier == AiCostTier.LOW:
                return resolved_provider, self._openai_low_cost
            return resolved_provider, self._openai_text

        return AiProviderName.MOCK, "mock-text"

    def health_payload(self) -> dict:
        providers = []
        for name in (AiProviderName.OPENAI, AiProviderName.MOCK):
            providers.append(
                {
                    "name": name.value,
                    "available": self.provider_available(name),
                    "models_configured": self.models_configured(name),
                }
            )
        return {
            "available": any(p["available"] for p in providers),
            "default_provider": self.get_default_provider().value,
            "providers": providers,
            "strict": _env_bool("AI_PROVIDER_STRICT", False),
            "openai_configured": openai_provider.is_available(),
            "live_signoff_ready": openai_provider.is_available() and _env_bool("AI_PROVIDER_STRICT", False),
        }

    def iter_registered_provider_names(self) -> Iterable[str]:
        return [AiProviderName.OPENAI.value, AiProviderName.MOCK.value]


ai_provider_registry = AiProviderRegistry()
