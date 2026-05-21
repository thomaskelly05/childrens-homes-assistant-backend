from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class LifeEchoProvider:
    name: str
    source_system: str
    enabled: bool = True
    capabilities: list[str] = field(default_factory=list)


class LifeEchoProviderRegistry:
    """Registry of systems connected into LifeEcho."""

    def __init__(self) -> None:
        self._providers: dict[str, LifeEchoProvider] = {}

    def register(self, provider: LifeEchoProvider) -> LifeEchoProvider:
        self._providers[provider.name] = provider
        return provider

    def list_providers(self) -> list[LifeEchoProvider]:
        return list(self._providers.values())

    def get_provider(self, provider_name: str) -> LifeEchoProvider | None:
        return self._providers.get(provider_name)


provider_registry = LifeEchoProviderRegistry()

provider_registry.register(
    LifeEchoProvider(
        name="IndiCare",
        source_system="indicare",
        capabilities=[
            "daily_notes",
            "incidents",
            "wellbeing",
            "chronology",
            "keywork",
        ],
    )
)
