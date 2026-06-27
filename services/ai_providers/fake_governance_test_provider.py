"""Test-only provider adapter for governed egress tests.

Cannot be registered unless AI_ALLOW_TEST_PROVIDER=true.
"""

from __future__ import annotations

import time
from collections.abc import AsyncIterator

from schemas.ai_models import (
    AiProviderName,
    AiProviderRequest,
    AiProviderResponse,
    AiUsageEstimate,
    AiCostTier,
)
from services.ai_providers.base import AiProviderBase


class FakeGovernanceTestProvider(AiProviderBase):
    provider_name = "fake_governance_test"

    def __init__(self) -> None:
        self.complete_calls: list[AiProviderRequest] = []
        self.stream_calls: list[AiProviderRequest] = []
        self.raise_on_complete: Exception | None = None

    def is_available(self) -> bool:
        return True

    async def complete(self, request: AiProviderRequest) -> AiProviderResponse:
        self.complete_calls.append(request)
        if self.raise_on_complete:
            raise self.raise_on_complete
        started = time.perf_counter()
        return AiProviderResponse(
            text=f"fake-response:{request.message[:40]}",
            provider=AiProviderName.MOCK,
            model=request.model or "fake-test-model",
            usage=AiUsageEstimate(input_tokens=10, output_tokens=5, total_tokens=15),
            latency_ms=int((time.perf_counter() - started) * 1000),
            finish_reason="stop",
            metadata={"fake_provider": True},
        )

    async def stream(self, request: AiProviderRequest) -> AsyncIterator[str]:
        self.stream_calls.append(request)
        response = await self.complete(request)
        yield response.text or ""


fake_governance_test_provider = FakeGovernanceTestProvider()
