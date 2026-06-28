"""TTS provider adapter registry for governed egress (NR-1 Phase 2B)."""

from __future__ import annotations

import os
from typing import Any

from schemas.ai_tts import TtsProviderName
from services.ai_providers.elevenlabs_tts_provider import elevenlabs_tts_provider
from services.ai_providers.openai_tts_provider import openai_tts_provider
from services.ai_providers.tts_base import AiTtsProviderBase

_TEST_PROVIDER_ENV = "AI_ALLOW_TEST_PROVIDER"


def _env_bool(name: str) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return False
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class AiTtsProviderAdapterRegistry:
    def __init__(self) -> None:
        self._adapters: dict[str, AiTtsProviderBase] = {
            TtsProviderName.OPENAI.value: openai_tts_provider,
            TtsProviderName.ELEVENLABS.value: elevenlabs_tts_provider,
        }
        self._test_adapters: dict[str, AiTtsProviderBase] = {}

    def register_test_adapter(self, name: str, adapter: AiTtsProviderBase) -> None:
        if not _env_bool(_TEST_PROVIDER_ENV):
            raise RuntimeError(
                f"Test TTS provider adapter registration requires {_TEST_PROVIDER_ENV}=true"
            )
        self._test_adapters[str(name).strip().lower()] = adapter

    def clear_test_adapters(self) -> None:
        self._test_adapters.clear()

    def get(self, provider: TtsProviderName | str) -> AiTtsProviderBase | None:
        name = provider.value if isinstance(provider, TtsProviderName) else str(provider).strip().lower()
        if name in self._test_adapters and _env_bool(_TEST_PROVIDER_ENV):
            return self._test_adapters[name]
        return self._adapters.get(name)

    def is_registered(self, provider: TtsProviderName | str) -> bool:
        return self.get(provider) is not None

    def list_registered(self) -> list[str]:
        names = list(self._adapters.keys())
        if _env_bool(_TEST_PROVIDER_ENV):
            names.extend(k for k in self._test_adapters if k not in names)
        return sorted(names)

    def adapter_metadata(self) -> dict[str, Any]:
        return {
            "production_adapters": sorted(self._adapters.keys()),
            "test_adapters_enabled": _env_bool(_TEST_PROVIDER_ENV),
            "test_adapters": sorted(self._test_adapters.keys()) if _env_bool(_TEST_PROVIDER_ENV) else [],
        }


ai_tts_provider_adapter_registry = AiTtsProviderAdapterRegistry()
