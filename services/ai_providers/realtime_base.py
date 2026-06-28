from __future__ import annotations

from abc import ABC, abstractmethod

from schemas.ai_realtime import AiRealtimeSessionRequest, AiRealtimeSessionResponse


class AiRealtimeProviderBase(ABC):
    provider_name: str = "base"

    @abstractmethod
    def is_available(self) -> bool:
        ...

    @abstractmethod
    async def issue_session(self, request: AiRealtimeSessionRequest) -> AiRealtimeSessionResponse:
        ...
