from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class OperationalConsciousnessEvent:
    event_type: str
    domain: str
    summary: str
    severity: str = "normal"
    themes: tuple[str, ...] = field(default_factory=tuple)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OperationalConsciousnessEventEngine:
    """Event-driven cognition foundation for IndiCare.

    This service converts operational events into cognition updates. It is
    intentionally persistence-ready but not database-backed yet.
    """

    HIGH_ATTENTION_TYPES = {
        "safeguarding",
        "allegation",
        "missing_episode",
        "restraint",
        "police_contact",
        "serious_incident",
        "ofsted_notification",
    }

    def ingest(self, event: dict[str, Any]) -> dict[str, Any]:
        parsed = self._parse(event)
        cognition_updates = self._updates(parsed)
        return {
            "event": parsed.to_dict(),
            "cognition_updates": cognition_updates,
            "requires_state_refresh": bool(cognition_updates),
            "requires_human_review": parsed.event_type in self.HIGH_ATTENTION_TYPES or parsed.severity in {"high", "critical"},
        }

    def summarise_batch(self, events: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        parsed = [self._parse(event) for event in (events or [])]
        event_counts = Counter(event.event_type for event in parsed)
        domain_counts = Counter(event.domain for event in parsed)
        theme_counts = Counter(theme for event in parsed for theme in event.themes)
        high_attention = [event.to_dict() for event in parsed if event.event_type in self.HIGH_ATTENTION_TYPES or event.severity in {"high", "critical"}]
        return {
            "event_count": len(parsed),
            "event_counts": dict(event_counts),
            "domain_counts": dict(domain_counts),
            "theme_counts": dict(theme_counts),
            "high_attention_events": high_attention[:20],
            "state_updates_needed": self._batch_state_updates(parsed),
        }

    def prompt_addendum(self, events: list[dict[str, Any]] | None = None) -> str:
        summary = self.summarise_batch(events)
        lines = [
            "Operational consciousness event engine:",
            f"- Event count: {summary['event_count']}",
            "- State updates needed: " + "; ".join(summary["state_updates_needed"] or ["none detected"]),
        ]
        if summary["high_attention_events"]:
            lines.append(f"- High-attention events visible: {len(summary['high_attention_events'])}")
        return "\n".join(lines)

    def _parse(self, event: dict[str, Any]) -> OperationalConsciousnessEvent:
        event_type = str(event.get("event_type") or event.get("type") or event.get("category") or "general_event").lower()
        domain = str(event.get("domain") or self._domain_for(event_type))
        summary = str(event.get("summary") or event.get("title") or event.get("description") or "Operational event")
        severity = str(event.get("severity") or self._severity_for(event_type)).lower()
        themes = tuple(str(theme).lower() for theme in event.get("themes", []) if theme)
        return OperationalConsciousnessEvent(event_type=event_type, domain=domain, summary=summary, severity=severity, themes=themes)

    def _domain_for(self, event_type: str) -> str:
        if event_type in {"safeguarding", "allegation", "missing_episode", "police_contact"}:
            return "safeguarding"
        if event_type in {"staff_sickness", "supervision_gap", "staffing_shortfall"}:
            return "workforce"
        if event_type in {"audit", "reg_44", "reg_45", "overdue_action"}:
            return "governance"
        if event_type in {"incident", "restraint", "keywork", "daily_note"}:
            return "child_journey"
        return "operations"

    def _severity_for(self, event_type: str) -> str:
        if event_type in self.HIGH_ATTENTION_TYPES:
            return "high"
        return "normal"

    def _updates(self, event: OperationalConsciousnessEvent) -> list[str]:
        updates: list[str] = []
        if event.domain == "safeguarding":
            updates.extend(["safeguarding_pressure", "evidence_lineage", "manager_oversight"])
        if event.domain == "workforce":
            updates.extend(["workforce_fragility", "emotional_climate"])
        if event.domain == "governance":
            updates.extend(["governance_drift", "provider_learning", "inspection_readiness"])
        if event.domain == "child_journey":
            updates.extend(["child_lived_experience", "narrative_continuity", "emotional_climate"])
        if event.event_type in self.HIGH_ATTENTION_TYPES:
            updates.append("human_review_queue")
        return list(dict.fromkeys(updates))

    def _batch_state_updates(self, events: list[OperationalConsciousnessEvent]) -> list[str]:
        updates: list[str] = []
        for event in events:
            updates.extend(self._updates(event))
        return list(dict.fromkeys(updates))


operational_consciousness_event_engine = OperationalConsciousnessEventEngine()
