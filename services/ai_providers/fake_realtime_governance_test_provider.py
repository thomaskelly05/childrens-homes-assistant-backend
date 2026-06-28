"""Test-only realtime provider adapter for governed egress tests."""

from __future__ import annotations

import time

from schemas.ai_realtime import (
    AiRealtimeSessionRequest,
    AiRealtimeSessionResponse,
    RealtimeProviderName,
)
from services.ai_providers.realtime_base import AiRealtimeProviderBase


class FakeRealtimeGovernanceTestProvider(AiRealtimeProviderBase):
    provider_name = "fake_realtime_governance_test"

    def __init__(self) -> None:
        self.session_calls: list[AiRealtimeSessionRequest] = []
        self.raise_on_issue: Exception | None = None
        self.return_session: dict | None = {
            "id": "fake_realtime_session",
            "object": "realtime.client_secret",
            "model": "mock-realtime",
            "client_secret": {"value": "ek_fake_test", "expires_at": 9999999999},
        }

    def is_available(self) -> bool:
        return True

    async def issue_session(self, request: AiRealtimeSessionRequest) -> AiRealtimeSessionResponse:
        self.session_calls.append(request)
        if self.raise_on_issue:
            raise self.raise_on_issue
        started = time.perf_counter()
        latency_ms = int((time.perf_counter() - started) * 1000)
        return AiRealtimeSessionResponse(
            configured=True,
            provider=RealtimeProviderName.MOCK,
            model=request.model,
            session=dict(self.return_session or {}),
            voice=request.voice,
            provider_latency_ms=latency_ms,
            provider_endpoint="fake",
            fallback_text_mode=False,
            metadata={"fake_realtime_provider": True},
        )


fake_realtime_governance_test_provider = FakeRealtimeGovernanceTestProvider()
