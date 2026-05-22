from __future__ import annotations

import time

from schemas.ai_models import (
    AiProviderName,
    AiProviderRequest,
    AiProviderResponse,
    AiUsageEstimate,
    AiCostTier,
)
from services.ai_providers.base import AiProviderBase


class MockAiProvider(AiProviderBase):
    provider_name = AiProviderName.MOCK.value

    def is_available(self) -> bool:
        return True

    async def complete(self, request: AiProviderRequest) -> AiProviderResponse:
        started = time.perf_counter()
        snippet = (request.message or "")[:120].strip()
        text = (
            "ORB mock engine response. "
            f"Task received ({len(snippet)} chars). "
            "Configure OPENAI_API_KEY for live answers."
        )
        return AiProviderResponse(
            text=text,
            provider=AiProviderName.MOCK,
            model=request.model or "mock-text",
            usage=AiUsageEstimate(estimated_cost_tier=AiCostTier.LOW),
            latency_ms=int((time.perf_counter() - started) * 1000),
            finish_reason="mock",
            metadata={"mock": True},
        )


mock_provider = MockAiProvider()
