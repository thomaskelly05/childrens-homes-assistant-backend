from __future__ import annotations

from collections import Counter
from typing import Any

from repositories.isn_repository import isn_repository
from schemas.isn_contracts import (
    ISNAlertListResponse,
    ISNHotspotResponse,
    ISNListResponse,
    ISNSignalCreateRequest,
)
from services.isn_uk_location_service import isn_uk_location_service


class ISNService:
    """Contextual safeguarding intelligence and hotspot detection."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def create_signal(self, conn: Any, *, payload: ISNSignalCreateRequest, current_user: dict[str, Any]):
        data = payload.model_dump(mode="json")

        uk_location = isn_uk_location_service.normalise_location(
            location_text=data.get("location_text"),
            postcode_prefix=data.get("postcode_prefix"),
        )

        metadata = data.get("metadata") or {}
        metadata["uk_location"] = uk_location
        data["metadata"] = metadata

        if uk_location.get("postcode_prefix") and not data.get("postcode_prefix"):
            data["postcode_prefix"] = uk_location["postcode_prefix"]

        signal = self.repository.create_signal(
            conn,
            payload=data,
            current_user=current_user,
        )
        self._analyse_signal(conn, signal=signal)
        return signal

    def list_signals(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        provider_id: int | None = None,
        home_id: int | None = None,
        young_person_id: int | None = None,
        signal_type: str | None = None,
        risk_level: str | None = None,
        limit: int = 100,
    ) -> ISNListResponse:
        items = self.repository.list_signals(
            conn,
            current_user=current_user,
            filters={
                "provider_id": provider_id,
                "home_id": home_id,
                "young_person_id": young_person_id,
                "signal_type": signal_type,
                "risk_level": risk_level,
            },
            limit=limit,
        )
        return ISNListResponse(items=items, total=len(items))

    def hotspots(self, conn: Any, *, current_user: dict[str, Any], limit: int = 500) -> ISNHotspotResponse:
        records = self.repository.list_signals(conn, current_user=current_user, limit=limit)

        postcode_counter: Counter[str] = Counter()
        route_counter: Counter[str] = Counter()
        alias_counter: Counter[str] = Counter()

        for record in records:
            if record.postcode_prefix:
                postcode_counter[record.postcode_prefix.upper()] += 1
            if record.transport_route:
                route_counter[record.transport_route.lower()] += 1
            if record.alias_or_nickname:
                alias_counter[record.alias_or_nickname.lower()] += 1

        hotspots: list[dict[str, Any]] = []

        for postcode, count in postcode_counter.most_common(20):
            hotspots.append(
                {
                    "type": "postcode_hotspot",
                    "key": postcode,
                    "signal_count": count,
                    "risk": "high" if count >= 5 else "medium",
                    "country": "UK",
                }
            )

        for route, count in route_counter.most_common(20):
            hotspots.append(
                {
                    "type": "transport_route",
                    "key": route,
                    "signal_count": count,
                    "risk": "high" if count >= 4 else "medium",
                    "country": "UK",
                }
            )

        for alias, count in alias_counter.most_common(20):
            if count >= 2:
                hotspots.append(
                    {
                        "type": "recurring_alias",
                        "key": alias,
                        "signal_count": count,
                        "risk": "high",
                        "country": "UK",
                    }
                )

        hotspots = sorted(hotspots, key=lambda item: item["signal_count"], reverse=True)

        return ISNHotspotResponse(hotspots=hotspots)

    def alerts(self, conn: Any, *, status: str | None = None, limit: int = 100) -> ISNAlertListResponse:
        alerts = self.repository.list_alerts(conn, status=status, limit=limit)
        return ISNAlertListResponse(alerts=alerts, total=len(alerts))

    def _analyse_signal(self, conn: Any, *, signal) -> None:
        if signal.alias_or_nickname:
            related = self.repository.list_signals(
                conn,
                current_user={"role": "system", "provider_id": signal.provider_id},
                filters={},
                limit=500,
            )
            matches = [
                item
                for item in related
                if item.alias_or_nickname
                and item.alias_or_nickname.lower() == signal.alias_or_nickname.lower()
            ]
            if len(matches) >= 3:
                self.repository.create_alert(
                    conn,
                    payload={
                        "alert_type": "recurring_alias_pattern",
                        "title": f"Recurring safeguarding alias detected: {signal.alias_or_nickname}",
                        "summary": "Multiple safeguarding signals reference the same alias or nickname.",
                        "risk_level": "high",
                        "linked_signal_ids": [item.id for item in matches],
                        "hotspot_key": signal.alias_or_nickname.lower(),
                        "pattern": {
                            "match_count": len(matches),
                            "signal_types": list(sorted(set(item.signal_type for item in matches))),
                            "country": "UK",
                        },
                        "recommended_action": "Review linked safeguarding intelligence and consider contextual safeguarding escalation.",
                    },
                )


isn_service = ISNService()
