from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from repositories.isn_repository import isn_repository
from services.isn_uk_location_service import isn_uk_location_service

UK_TRANSPORT_KEYWORDS = {
    "rail": ["train", "rail", "station", "platform", "national rail", "lner", "northern rail", "transpennine"],
    "metro": ["metro", "tube", "underground", "tram"],
    "bus": ["bus", "coach", "megabus", "national express", "interchange"],
    "taxi_private_hire": ["taxi", "uber", "bolt", "private hire"],
    "road": ["motorway", "a1", "a19", "m1", "m6", "m62", "a-road", "dual carriageway"],
}


class ISNUKTransportService:
    """UK-bound transport corridor intelligence for county lines and exploitation risk."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def corridors(self, conn: Any, *, current_user: dict[str, Any], limit: int = 1000) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        corridor_counter: Counter[str] = Counter()
        corridor_signals: dict[str, list[str]] = defaultdict(list)
        mode_counter: Counter[str] = Counter()
        region_pairs: Counter[str] = Counter()

        for signal in signals:
            corridor_key = self._corridor_key(signal)
            if corridor_key:
                corridor_counter[corridor_key] += 1
                corridor_signals[corridor_key].append(signal.id)
            mode = self._mode(signal.transport_route or signal.location_text or "")
            if mode:
                mode_counter[mode] += 1
            uk_location = (signal.metadata or {}).get("uk_location") or {}
            region = uk_location.get("region_hint")
            if region and signal.transport_route:
                region_pairs[f"{region}::{signal.transport_route.strip().lower()}"] += 1

        corridors = [
            {
                "corridor": corridor,
                "signal_count": count,
                "risk_level": "critical" if count >= 8 else "high" if count >= 4 else "medium",
                "linked_signal_ids": corridor_signals[corridor],
                "country": "UK",
            }
            for corridor, count in corridor_counter.most_common()
        ]

        modes = [
            {"mode": mode, "signal_count": count, "country": "UK"}
            for mode, count in mode_counter.most_common()
        ]

        regional_routes = [
            {
                "region": key.split("::", 1)[0],
                "route": key.split("::", 1)[1],
                "signal_count": count,
                "risk_level": "high" if count >= 3 else "medium",
            }
            for key, count in region_pairs.most_common()
        ]

        return {
            "ok": True,
            "country": "UK",
            "corridors": corridors,
            "transport_modes": modes,
            "regional_routes": regional_routes,
        }

    def _corridor_key(self, signal: Any) -> str | None:
        route = (signal.transport_route or "").strip().lower()
        if route:
            return route
        location = isn_uk_location_service.normalise_location(
            location_text=signal.location_text,
            postcode_prefix=signal.postcode_prefix,
        )
        postcode = location.get("postcode_prefix")
        location_type = location.get("contextual_location_type")
        if postcode and location_type in {"station", "bus_interchange", "taxi_rank"}:
            return f"{postcode}:{location_type}"
        return None

    def _mode(self, value: str) -> str | None:
        lowered = value.lower()
        for mode, terms in UK_TRANSPORT_KEYWORDS.items():
            if any(term in lowered for term in terms):
                return mode
        return None


isn_uk_transport_service = ISNUKTransportService()
