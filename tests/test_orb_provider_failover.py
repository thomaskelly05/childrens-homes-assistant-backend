import asyncio

import httpx

from services.orb_observability_service import orb_observability_service
from services.orb_realtime_provider_service import OrbRealtimeProviderService


class TimeoutClient:
    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def post(self, *args, **kwargs):
        raise httpx.TimeoutException("provider timed out")


def test_provider_timeout_returns_text_fallback_without_raw_prompt_logging(monkeypatch):
    async def scenario():
        service = OrbRealtimeProviderService()
        result = await service.create_ephemeral_session(instructions="Do not log this prompt", orb_session_id="orb_session_1")

        assert result["fallback_text_mode"] is True
        assert result["error"] == "provider_timeout"
        assert service.provider_status()["status"] == "degraded"
        metrics = orb_observability_service.metrics()
        assert metrics["privacy"]["raw_prompts_logged"] is False

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")
    monkeypatch.setenv("ORB_PROVIDER_FAILURE_THRESHOLD", "1")
    monkeypatch.setattr("services.orb_realtime_provider_service.httpx.AsyncClient", TimeoutClient)
    orb_observability_service.reset_for_tests()
    asyncio.run(scenario())


def test_provider_circuit_breaker_prevents_endless_retries(monkeypatch):
    async def scenario():
        service = OrbRealtimeProviderService()
        first = await service.create_ephemeral_session(instructions="voice instructions")
        second = await service.create_ephemeral_session(instructions="voice instructions")

        assert first["error"] == "provider_timeout"
        assert second["error"] == "provider_circuit_open"
        assert second["fallback_text_mode"] is True

    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setenv("ORB_REALTIME_ENABLED", "true")
    monkeypatch.setenv("ORB_PROVIDER_FAILURE_THRESHOLD", "1")
    monkeypatch.setattr("services.orb_realtime_provider_service.httpx.AsyncClient", TimeoutClient)
    asyncio.run(scenario())
