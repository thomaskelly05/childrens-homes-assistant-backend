from __future__ import annotations


class OrbLatencyStrategyService:
    def route(self, *, realtime_configured: bool, network_quality: str = "normal") -> dict[str, str | bool | int]:
        if realtime_configured and network_quality != "poor":
            return {"route": "realtime_voice", "fallback": "caption_text", "stream_first_token": True, "target_ack_ms": 350}
        return {"route": "caption_text", "fallback": "browser_tts_optional", "stream_first_token": False, "target_ack_ms": 700}


orb_latency_strategy_service = OrbLatencyStrategyService()

