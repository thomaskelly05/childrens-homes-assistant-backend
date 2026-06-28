from __future__ import annotations

from abc import ABC, abstractmethod

from schemas.ai_tts import AiTtsSynthesisRequest, AiTtsSynthesisResponse


class AiTtsProviderBase(ABC):
    provider_name: str = "base"

    @abstractmethod
    def is_available(self) -> bool:
        ...

    @abstractmethod
    def synthesize_speech(self, request: AiTtsSynthesisRequest) -> AiTtsSynthesisResponse:
        ...
