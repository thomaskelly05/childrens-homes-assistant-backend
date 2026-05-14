from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from schemas.data_intelligence import AIUsageEvent


class AIUsageMeteringService:
    """Content-free AI cost observability by provider, home and feature."""

    def __init__(self) -> None:
        self._events: list[AIUsageEvent] = []

    def record_event(self, event: AIUsageEvent | dict[str, Any]) -> AIUsageEvent:
        usage_event = event if isinstance(event, AIUsageEvent) else AIUsageEvent(**event)
        self._events.append(usage_event)
        return usage_event

    def summary(
        self,
        *,
        provider_id: int | None = None,
        home_id: int | None = None,
    ) -> dict[str, Any]:
        events = [
            event
            for event in self._events
            if (provider_id is None or event.provider_id == provider_id)
            and (home_id is None or event.home_id == home_id)
        ]
        by_feature = Counter(event.feature for event in events)
        by_home = Counter(str(event.home_id or "unknown") for event in events)
        by_model = Counter(event.model_tier for event in events)
        workflows: defaultdict[str, int] = defaultdict(int)
        token_total = 0
        cache_hits = 0
        blocked = 0
        realtime_seconds = 0
        expensive = 0
        redaction_modes = Counter()
        for event in events:
            token_total += event.tokens_estimated
            cache_hits += int(event.cache_hit)
            blocked += int(event.external_call_blocked)
            realtime_seconds += event.realtime_voice_seconds
            expensive += int(event.expensive_model)
            redaction_modes[event.redaction_mode] += 1
            workflows[event.workflow or event.feature] += event.tokens_estimated

        total = len(events)
        return {
            "total_ai_events": total,
            "ai_calls_by_provider": {str(provider_id or "all"): total},
            "ai_calls_by_home": dict(by_home),
            "ai_calls_by_feature": dict(by_feature),
            "cache_hit_rate": round(cache_hits / total, 3) if total else 0.0,
            "tokens_estimated": token_total,
            "realtime_voice_session_duration": realtime_seconds,
            "expensive_model_usage": expensive,
            "redaction_mode_used": dict(redaction_modes),
            "blocked_external_calls": blocked,
            "top_costly_workflows": [
                {"workflow": workflow, "tokens_estimated": tokens}
                for workflow, tokens in sorted(workflows.items(), key=lambda item: item[1], reverse=True)[:10]
            ],
        }

    def clear(self) -> None:
        self._events.clear()


ai_usage_metering_service = AIUsageMeteringService()
