from __future__ import annotations

from collections import Counter
from typing import Any

from repositories.isn_repository import isn_repository
from services.isn_contextual_safeguarding_service import isn_contextual_safeguarding_service
from services.isn_escalation_service import isn_escalation_service
from services.isn_timeline_service import isn_timeline_service
from services.isn_uk_transport_service import isn_uk_transport_service


class ISNMultiAgencyService:
    """Creates safe contextual safeguarding packs for strategy discussions and multi-agency review."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def safeguarding_pack(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        young_person_id: int | None = None,
        days: int = 30,
        limit: int = 1000,
    ) -> dict[str, Any]:
        signals = self.repository.list_signals(
            conn,
            current_user=current_user,
            filters={"young_person_id": young_person_id} if young_person_id else {},
            limit=limit,
        )
        timeline = isn_timeline_service.timeline(
            conn,
            current_user=current_user,
            young_person_id=young_person_id,
            days=days,
            limit=limit,
        )
        escalation = isn_escalation_service.escalations(
            conn,
            current_user=current_user,
            days=days,
            limit=limit,
        )
        contextual = isn_contextual_safeguarding_service.overview(
            conn,
            current_user=current_user,
            limit=limit,
        )
        transport = isn_uk_transport_service.corridors(
            conn,
            current_user=current_user,
            limit=limit,
        )

        return {
            "ok": True,
            "country": "UK",
            "pack_type": "contextual_safeguarding_multi_agency_pack",
            "young_person_id": young_person_id,
            "window_days": days,
            "summary": self._summary(signals),
            "professional_principle": "This pack supports professional judgement. It must not be used as an automated risk decision or to criminalise a child.",
            "contextual_domains": contextual.get("domains", {}),
            "top_escalations": escalation.get("escalations", [])[:10],
            "transport_corridors": transport.get("corridors", [])[:10],
            "timeline": timeline.get("events", [])[:50],
            "recommended_discussion_points": self._discussion_points(signals, escalation.get("escalations", [])),
        }

    def police_intelligence_export(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        days: int = 30,
        limit: int = 1000,
    ) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        intelligence_items = []
        for signal in signals:
            if signal.signal_type not in {
                "county_lines_indicator",
                "vehicle_sighting",
                "unknown_adult_contact",
                "transport_route",
                "location_sighting",
                "digital_risk",
            }:
                continue
            intelligence_items.append(
                {
                    "signal_id": signal.id,
                    "signal_type": signal.signal_type,
                    "occurred_at": signal.occurred_at,
                    "risk_level": signal.risk_level,
                    "location_text": signal.location_text,
                    "postcode_prefix": signal.postcode_prefix,
                    "transport_route": signal.transport_route,
                    "vehicle_description": signal.vehicle_description,
                    "alias_or_nickname": signal.alias_or_nickname,
                    "digital_handle": signal.digital_handle,
                    "summary": signal.summary,
                    "source_record_type": signal.source_record_type,
                    "source_record_id": signal.source_record_id,
                }
            )
        return {
            "ok": True,
            "country": "UK",
            "export_type": "professional_safeguarding_intelligence",
            "warning": "Export only through lawful safeguarding information-sharing routes and local protocols.",
            "items": intelligence_items,
            "total": len(intelligence_items),
        }

    def _summary(self, signals: list[Any]) -> dict[str, Any]:
        types = Counter(signal.signal_type for signal in signals)
        risks = Counter(signal.risk_level for signal in signals)
        return {
            "signal_count": len(signals),
            "signal_types": [name for name, _count in types.most_common()],
            "highest_risk": self._highest_risk(risks),
            "risk_breakdown": dict(risks),
        }

    def _highest_risk(self, risks: Counter[str]) -> str:
        for risk in ["critical", "high", "medium", "low"]:
            if risks.get(risk):
                return risk
        return "low"

    def _discussion_points(self, signals: list[Any], escalations: list[dict[str, Any]]) -> list[str]:
        points = []
        if any(signal.signal_type == "missing_episode" for signal in signals):
            points.append("Review missing episode chronology, return-home interview themes and contextual pull factors.")
        if any(signal.vehicle_description for signal in signals):
            points.append("Review repeated vehicle descriptions and whether disruption activity is required.")
        if any(signal.transport_route for signal in signals):
            points.append("Review transport routes, stations, taxi/private hire links and cross-boundary movement.")
        if any(signal.digital_handle or signal.signal_type == "digital_risk" for signal in signals):
            points.append("Review digital contact, location sharing, messaging platforms and online grooming indicators.")
        if escalations:
            points.append("Review top ISN escalations and agree multi-agency ownership of actions.")
        if not points:
            points.append("Review current contextual safeguarding signals and agree monitoring actions.")
        return points


isn_multi_agency_service = ISNMultiAgencyService()
