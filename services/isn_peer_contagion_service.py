from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from repositories.isn_repository import isn_repository


class ISNPeerContagionService:
    """Detects peer-linked contextual safeguarding escalation patterns."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def analyse(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        limit: int = 2000,
    ) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)

        peer_networks: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "young_people": set(),
                "routes": Counter(),
                "locations": Counter(),
                "signal_ids": [],
                "risk_levels": Counter(),
            }
        )

        for signal in signals:
            alias = (signal.alias_or_nickname or "").strip().lower()
            if not alias:
                continue

            network = peer_networks[alias]
            if signal.young_person_id is not None:
                network["young_people"].add(signal.young_person_id)

            if signal.transport_route:
                network["routes"][signal.transport_route.strip().lower()] += 1

            if signal.location_text:
                network["locations"][signal.location_text.strip().lower()] += 1

            network["signal_ids"].append(signal.id)
            network["risk_levels"][signal.risk_level] += 1

        output = []

        for alias, data in peer_networks.items():
            if len(data["young_people"]) < 2:
                continue

            output.append(
                {
                    "peer_key": alias,
                    "young_people_count": len(data["young_people"]),
                    "young_people": sorted(data["young_people"]),
                    "linked_signal_ids": data["signal_ids"],
                    "transport_routes": [
                        route for route, _count in data["routes"].most_common(5)
                    ],
                    "locations": [
                        location for location, _count in data["locations"].most_common(5)
                    ],
                    "contextual_pressure": self._pressure(data),
                    "highest_risk": self._highest_risk(data["risk_levels"]),
                    "professional_note": "Peer relationships should be understood contextually and not assumed to be harmful without safeguarding assessment.",
                }
            )

        output.sort(key=lambda item: item["young_people_count"], reverse=True)

        return {
            "ok": True,
            "country": "UK",
            "peer_networks": output,
            "total": len(output),
        }

    def _pressure(self, data: dict[str, Any]) -> str:
        if len(data["young_people"]) >= 5:
            return "critical"
        if len(data["young_people"]) >= 3:
            return "high"
        return "medium"

    def _highest_risk(self, risks: Counter[str]) -> str:
        for risk in ["critical", "high", "medium", "low"]:
            if risks.get(risk):
                return risk
        return "low"


isn_peer_contagion_service = ISNPeerContagionService()
