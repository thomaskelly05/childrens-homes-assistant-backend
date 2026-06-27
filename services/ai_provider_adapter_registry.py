"""Provider adapter registry for governed AI egress.

OpenAI, Mock, and future provider adapters are registered here. Product code must
resolve adapters through this registry (via AiGovernedEgress), not import adapters
directly for inference.
"""

from __future__ import annotations

import os
from typing import Any

from schemas.ai_models import AiProviderName
from services.ai_providers.base import AiProviderBase
from services.ai_providers.mock_provider import mock_provider
from services.ai_providers.openai_provider import openai_provider

_TEST_PROVIDER_ENV = "AI_ALLOW_TEST_PROVIDER"


def _env_bool(name: str) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return False
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class AiProviderAdapterRegistry:
    """Maps provider names to adapter implementations."""

    def __init__(self) -> None:
        self._adapters: dict[str, AiProviderBase] = {
            AiProviderName.OPENAI.value: openai_provider,
            AiProviderName.MOCK.value: mock_provider,
        }
        self._test_adapters: dict[str, AiProviderBase] = {}

    def register_test_adapter(self, name: str, adapter: AiProviderBase) -> None:
        """Register a test-only adapter. Requires AI_ALLOW_TEST_PROVIDER=true."""
        if not _env_bool(_TEST_PROVIDER_ENV):
            raise RuntimeError(
                f"Test provider adapter registration requires {_TEST_PROVIDER_ENV}=true"
            )
        self._test_adapters[str(name).strip().lower()] = adapter

    def clear_test_adapters(self) -> None:
        self._test_adapters.clear()

    def get(self, provider: AiProviderName | str) -> AiProviderBase | None:
        name = provider.value if isinstance(provider, AiProviderName) else str(provider).strip().lower()
        if name in self._test_adapters and _env_bool(_TEST_PROVIDER_ENV):
            return self._test_adapters[name]
        return self._adapters.get(name)

    def is_registered(self, provider: AiProviderName | str) -> bool:
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


ai_provider_adapter_registry = AiProviderAdapterRegistry()
