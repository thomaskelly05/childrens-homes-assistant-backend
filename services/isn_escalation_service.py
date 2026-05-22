from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from repositories.isn_repository import isn_repository

HIGH_VALUE_INDICATORS = {
    "county_lines_indicator",
    "unknown_adult_contact",
    "gifting_or_debt",
    "digital_risk",
    "vehicle_sighting",
    "transport_route",
    "missing_episode",
}

CRITICAL_COMBINATIONS = [
    {"missing_episode", "unknown_adult_contact", "transport_route"},
    {"missing_episode", "gifting_or_debt", "digital_risk"},
    {"county_lines_indicator", "vehicle_sighting", "transport_route"},
    {"digital_risk", "unknown_adult_contact", "gifting_or_debt"},
]


class ISNEscalationService:
    """Human-review safeguarding escalation engine for exploitation patterns."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def escalations(self, conn: Any, *, current_user: dict[str, Any], days: int = 30, limit: int = 1000) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        since = datetime.now(timezone.utc) - timedelta(days=max(1, min(days, 365)))
        recent = [signal for signal in signals if self._is_recent(signal.created_at or signal.occurred_at, since)]

        by_child: dict[str, list[Any]] = defaultdict(list)
        by_alias: dict[str, list[Any]] = defaultdict(list)
        by_vehicle: dict[str, list[Any]] = defaultdict(list)
        by_route: dict[str, list[Any]] = defaultdict(list)
        by_postcode: dict[str, list[Any]] = defaultdict(list)

        for signal in recent:
            if signal.young_person_id is not None:
                by_child[str(signal.young_person_id)].append(signal)
            if signal.alias_or_nickname:
                by_alias[signal.alias_or_nickname.strip().lower()].append(signal)
            if signal.vehicle_description:
                by_vehicle[signal.vehicle_description.strip().lower()].append(signal)
            if signal.transport_route:
                by_route[signal.transport_route.strip().lower()].append(signal)
            if signal.postcode_prefix:
                by_postcode[signal.postcode_prefix.strip().upper()].append(signal)

        escalations: list[dict[str, Any]] = []
        escalations.extend(self._group_escalations("young_person_pattern", by_child, minimum=3))
        escalations.extend(self._group_escalations("alias_pattern", by_alias, minimum=3))
        escalations.extend(self._group_escalations("vehicle_pattern", by_vehicle, minimum=2))
        escalations.extend(self._group_escalations("route_pattern", by_route, minimum=3))
        escalations.extend(self._group_escalations("postcode_hotspot", by_postcode, minimum=5))

        escalations.sort(key=lambda item: (item["risk_rank"], item["signal_count"]), reverse=True)
        for item in escalations:
            item.pop("risk_rank", None)

        return {
            "ok": True,
            "country": "UK",
            "window_days": days,
            "escalations": escalations,
            "total": len(escalations),
        }

    def create_alerts_from_escalations(self, conn: Any, *, current_user: dict[str, Any], days: int = 30, limit: int = 1000) -> dict[str, Any]:
        result = self.escalations(conn, current_user=current_user, days=days, limit=limit)
        created = []
        for escalation in result["escalations"]:
            if escalation["risk_level"] not in {"high", "critical"}:
                continue
            alert = self.repository.create_alert(
                conn,
                payload={
                    "alert_type": escalation["type"],
                    "title": escalation["title"],
                    "summary": escalation["summary"],
                    "risk_level": escalation["risk_level"],
                    "linked_signal_ids": escalation["linked_signal_ids"],
                    "hotspot_key": escalation["key"],
                    "pattern": escalation,
                    "recommended_action": "Review through contextual safeguarding, consider strategy discussion, and record professional judgement.",
                },
            )
            created.append(alert.model_dump(mode="json"))
        return {"ok": True, "created_alerts": created, "total": len(created)}

    def _group_escalations(self, kind: str, grouped: dict[str, list[Any]], *, minimum: int) -> list[dict[str, Any]]:
        output = []
        for key, signals in grouped.items():
            if len(signals) < minimum:
                continue
            types = Counter(signal.signal_type for signal in signals)
            risk_level = self._risk_level(signals, set(types))
            output.append(
                {
                    "type": kind,
                    "key": key,
                    "title": self._title(kind, key),
                    "summary": self._summary(kind, key, signals, types),
                    "signal_count": len(signals),
                    "signal_types": [signal_type for signal_type, _count in types.most_common()],
                    "linked_signal_ids": [signal.id for signal in signals],
                    "risk_level": risk_level,
                    "risk_rank": {"low": 1, "medium": 2, "high": 3, "critical": 4}.get(risk_level, 2),
                    "country": "UK",
                }
            )
        return output

    def _risk_level(self, signals: list[Any], signal_types: set[str]) -> str:
        if any(signal.risk_level == "critical" for signal in signals):
            return "critical"
        if any(combo.issubset(signal_types) for combo in CRITICAL_COMBINATIONS):
            return "critical"
        if len(signals) >= 5 or len(signal_types.intersection(HIGH_VALUE_INDICATORS)) >= 3:
            return "high"
        return "medium"

    def _title(self, kind: str, key: str) -> str:
        labels = {
            "young_person_pattern": "Repeated safeguarding pattern",
            "alias_pattern": "Recurring alias pattern",
            "vehicle_pattern": "Recurring vehicle pattern",
            "route_pattern": "Transport route pattern",
            "postcode_hotspot": "UK safeguarding hotspot",
        }
        return f"{labels.get(kind, 'Safeguarding pattern')}: {key}"

    def _summary(self, kind: str, key: str, signals: list[Any], types: Counter[str]) -> str:
        type_list = ", ".join(signal_type for signal_type, _count in types.most_common(4))
        return f"{len(signals)} linked ISN signals for {key}; main indicators: {type_list}. Human safeguarding review required."

    def _is_recent(self, value: str | None, since: datetime) -> bool:
        if not value:
            return True
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return parsed >= since
        except Exception:
            return True


isn_escalation_service = ISNEscalationService()
