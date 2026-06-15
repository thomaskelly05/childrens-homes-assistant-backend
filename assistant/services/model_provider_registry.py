"""IndiCare model provider registry — model-supported, not model-dependent.

Extends the core AI provider registry with ORB-facing capability metadata.
Does not remove or replace existing OpenAI integrations.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

from schemas.ai_models import AiModelCapability, AiModelProfile, AiProviderName
from services.ai_provider_registry import ai_provider_registry


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class ModelProviderEntry:
  """ORB-facing provider/model descriptor for IndiCare Intelligence routing."""

  provider_id: str
  model_id: str
  capability_tags: tuple[str, ...] = field(default_factory=tuple)
  streaming_support: bool = True
  vision_support: bool = False
  audio_support: bool = False
  cost_tier: str = "standard"
  privacy_mode: str = "cloud"
  fallback_eligible: bool = True
  enabled_env_flag: str | None = None

  @property
  def enabled(self) -> bool:
    if not self.enabled_env_flag:
        return True
    return _env_bool(self.enabled_env_flag, default=True)

  def to_dict(self) -> dict[str, Any]:
    return {
        "provider_id": self.provider_id,
        "model_id": self.model_id,
        "capability_tags": list(self.capability_tags),
        "streaming_support": self.streaming_support,
        "vision_support": self.vision_support,
        "audio_support": self.audio_support,
        "cost_tier": self.cost_tier,
        "privacy_mode": self.privacy_mode,
        "fallback_eligible": self.fallback_eligible,
        "enabled_env_flag": self.enabled_env_flag,
        "enabled": self.enabled,
    }


def _profile_to_entry(profile: AiModelProfile) -> ModelProviderEntry:
    caps = [c.value for c in profile.capabilities]
    privacy = "local" if profile.provider == AiProviderName.MOCK else "cloud"
    env_flag = None
    if profile.provider == AiProviderName.OPENAI:
        env_flag = "AI_OPENAI_ENABLED"
    elif profile.provider == AiProviderName.MOCK:
        env_flag = "AI_MOCK_ENABLED"

    return ModelProviderEntry(
        provider_id=profile.provider.value,
        model_id=profile.model,
        capability_tags=tuple(caps),
        streaming_support=AiModelCapability.TEXT in profile.capabilities,
        vision_support=profile.supports_vision or AiModelCapability.VISION in profile.capabilities,
        audio_support=AiModelCapability.AUDIO in profile.capabilities,
        cost_tier=profile.cost_tier.value,
        privacy_mode=privacy,
        fallback_eligible=profile.provider != AiProviderName.OPENAI or _env_bool("AI_OPENAI_FALLBACK_ELIGIBLE", True),
        enabled_env_flag=env_flag,
    )


class ModelProviderRegistry:
    """IndiCare Intelligence provider registry — frameworks own the brain; models are engines."""

    def __init__(self) -> None:
        self._entries: list[ModelProviderEntry] = self._build_entries()

    def _build_entries(self) -> list[ModelProviderEntry]:
        entries = [_profile_to_entry(p) for p in ai_provider_registry.list_models()]
        # Roadmap placeholders — disabled until adapters exist; not hardcoded as sole provider.
        roadmap = [
            ModelProviderEntry(
                provider_id=AiProviderName.ANTHROPIC.value,
                model_id="roadmap-anthropic",
                capability_tags=("text", "reasoning"),
                streaming_support=True,
                cost_tier="premium",
                privacy_mode="cloud",
                fallback_eligible=True,
                enabled_env_flag="AI_ANTHROPIC_ENABLED",
            ),
            ModelProviderEntry(
                provider_id=AiProviderName.GOOGLE.value,
                model_id="roadmap-google",
                capability_tags=("text", "vision"),
                streaming_support=True,
                vision_support=True,
                cost_tier="standard",
                privacy_mode="cloud",
                fallback_eligible=True,
                enabled_env_flag="AI_GOOGLE_ENABLED",
            ),
            ModelProviderEntry(
                provider_id=AiProviderName.LOCAL.value,
                model_id="roadmap-local",
                capability_tags=("text", "low_latency"),
                streaming_support=True,
                cost_tier="low",
                privacy_mode="local",
                fallback_eligible=False,
                enabled_env_flag="AI_LOCAL_ENABLED",
            ),
        ]
        entries.extend(roadmap)
        return entries

    def list_entries(self, *, enabled_only: bool = False) -> list[ModelProviderEntry]:
        if enabled_only:
            return [e for e in self._entries if e.enabled and self._provider_available(e.provider_id)]
        return list(self._entries)

    def _provider_available(self, provider_id: str) -> bool:
        try:
            return ai_provider_registry.provider_available(AiProviderName(provider_id))
        except ValueError:
            return False

    def get_default_entry(self) -> ModelProviderEntry | None:
        provider = ai_provider_registry.get_default_provider()
        for entry in self._entries:
            if entry.provider_id == provider.value and entry.enabled:
                return entry
        enabled = self.list_entries(enabled_only=True)
        return enabled[0] if enabled else None

    def choose_fallback(self, exclude_provider: str | None = None) -> ModelProviderEntry | None:
        for entry in self._entries:
            if not entry.fallback_eligible or not entry.enabled:
                continue
            if exclude_provider and entry.provider_id == exclude_provider:
                continue
            if self._provider_available(entry.provider_id):
                return entry
        return None

    def health_payload(self) -> dict[str, Any]:
        base = ai_provider_registry.health_payload()
        return {
            **base,
            "indicare_brain": "model-supported-not-model-dependent",
            "registered_entries": [e.to_dict() for e in self._entries],
            "enabled_entries": [e.to_dict() for e in self.list_entries(enabled_only=True)],
            "default_entry": (self.get_default_entry() or ModelProviderEntry("mock", "mock-text")).to_dict(),
            "requires_single_provider": False,
        }

    def iter_provider_ids(self) -> list[str]:
        return sorted({e.provider_id for e in self._entries})


model_provider_registry = ModelProviderRegistry()
