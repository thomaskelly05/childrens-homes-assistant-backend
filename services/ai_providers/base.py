from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from schemas.ai_models import AiProviderRequest, AiProviderResponse


class AiProviderBase(ABC):
    provider_name: str = "base"

    @abstractmethod
    def is_available(self) -> bool:
        ...

    @abstractmethod
    async def complete(self, request: AiProviderRequest) -> AiProviderResponse:
        ...

    async def stream(self, request: AiProviderRequest) -> AsyncIterator[str]:
        """Yield answer text deltas. Default: single chunk from non-streaming complete."""
        response = await self.complete(request)
        if response.text:
            yield response.text
