from __future__ import annotations

from abc import ABC, abstractmethod

from schemas.ai_models import AiProviderRequest, AiProviderResponse


class AiProviderBase(ABC):
    provider_name: str = "base"

    @abstractmethod
    def is_available(self) -> bool:
        ...

    @abstractmethod
    async def complete(self, request: AiProviderRequest) -> AiProviderResponse:
        ...
