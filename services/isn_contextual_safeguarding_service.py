from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from repositories.isn_repository import isn_repository

CONTEXTUAL_DOMAINS = {
    "movement": {
        "signal_types": {"missing_episode", "transport_route", "location_sighting"},
        "fields": ["transport_route", "postcode_prefix", "location_text"],
    },
    "exploitation": {
        "signal_types": {"county_lines_indicator", "exploitation_concern", "gifting_or_debt", "vehicle_sighting"},
        "fields": ["alias_or_nickname", "vehicle_description", "postcode_prefix"],
    },
    "digital": {
        "signal_types": {"digital_risk"},
        "fields": ["digital_handle", "alias_or_nickname"],
    },
    "place": {
        "signal_types": {"location_sighting", "missing_episode", "professional_intelligence"},
        "fields": ["location_text", "postcode_prefix"],
    },
    "relationship": {
        "signal_types": {"peer_association", "unknown_adult_contact", "professional_intelligence"},
        "fields": ["alias_or_nickname", "digital_handle"],
    },
    "vulnerability": {
        "signal_types": {"gifting_or_debt", "digital_risk", "unknown_adult_contact"},
        "fields": ["indicator_tags"],
    },
    "cross_boundary": {
        "signal_types": {"transport_route", "county_lines_indicator", "missing_episode"},
        "fields": ["transport_route", "postcode_prefix"],
    },
}

PLACE_TERMS = {
    "transport_hub": ["station", "metro", "bus", "interchange", "platform", "taxi"],
    "hotel_or_temporary_accommodation": ["hotel", "travelodge", "premier inn", "airbnb", "bnb"],
    "retail_or_food": ["retail park", "shopping", "takeaway", "mcdonald", "kfc", "chicken"],
    "outdoor_isolation": ["park", "woods", "woodland", "beach", "field", "car park"],
    "private_address": ["flat", "house", "address", "estate", "block"],
}

DIGITAL_TERMS = {
    "encrypted_messaging": ["telegram", "signal", "whatsapp"],
    "social_media": ["snapchat", "instagram", "tiktok", "facebook"],
    "gaming_chat": ["xbox", "playstation", "discord", "gaming"],
    "image_based_risk": ["image", "photo", "nude", "screenshot", "shared"],
    "location_sharing": ["snap map", "location", "live location", "find my"],
}


class ISNContextualSafeguardingService:
    """Domain-level contextual safeguarding routes across people, places, digital, movement and systems."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def overview(self, conn: Any, *, current_user: dict[str, Any], limit: int = 1000) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        domains = {domain: self._domain_summary(domain, signals) for domain in CONTEXTUAL_DOMAINS}
        return {
            "ok": True,
            "country": "UK",
            "principle": "Understand risk in contexts around the child, not as a label on the child.",
            "domains": domains,
            "total_signals": len(signals),
        }

    def routes(self, conn: Any, *, current_user: dict[str, Any], limit: int = 1000) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        return {
            "ok": True,
            "country": "UK",
            "movement": self._movement_routes(signals),
            "exploitation": self._exploitation_routes(signals),
            "digital": self._digital_routes(signals),
            "relationship": self._relationship_routes(signals),
            "cross_boundary": self._cross_boundary_routes(signals),
        }

    def places(self, conn: Any, *, current_user: dict[str, Any], limit: int = 1000) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        places: dict[str, dict[str, Any]] = {}
        for signal in signals:
            key = (signal.location_text or signal.postcode_prefix or "unknown").strip()
            norm = key.lower()
            places.setdefault(
                norm,
                {
                    "place": key,
                    "place_type": self._place_type(key),
                    "signal_count": 0,
                    "risk_level": "medium",
                    "linked_signal_ids": [],
                    "signal_types": Counter(),
                },
            )
            places[norm]["signal_count"] += 1
            places[norm]["linked_signal_ids"].append(signal.id)
            places[norm]["signal_types"][signal.signal_type] += 1
            if signal.risk_level in {"high", "critical"}:
                places[norm]["risk_level"] = signal.risk_level
        output = []
        for place in places.values():
            place["signal_types"] = [name for name, _count in place["signal_types"].most_common()]
            if place["signal_count"] >= 5 and place["risk_level"] != "critical":
                place["risk_level"] = "high"
            output.append(place)
        output.sort(key=lambda item: item["signal_count"], reverse=True)
        return {"ok": True, "country": "UK", "places": output}

    def digital(self, conn: Any, *, current_user: dict[str, Any], limit: int = 1000) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        risks: dict[str, dict[str, Any]] = {}
        for signal in signals:
            text = " ".join(
                str(value or "")
                for value in [signal.digital_handle, signal.summary, signal.intelligence_notes, signal.alias_or_nickname]
            )
            category = self._digital_type(text)
            if not category and signal.signal_type != "digital_risk":
                continue
            key = signal.digital_handle or signal.alias_or_nickname or category or "digital_risk"
            norm = key.lower()
            risks.setdefault(
                norm,
                {
                    "key": key,
                    "digital_risk_type": category or "digital_risk",
                    "signal_count": 0,
                    "risk_level": "medium",
                    "linked_signal_ids": [],
                },
            )
            risks[norm]["signal_count"] += 1
            risks[norm]["linked_signal_ids"].append(signal.id)
            if signal.risk_level in {"high", "critical"}:
                risks[norm]["risk_level"] = signal.risk_level
        output = sorted(risks.values(), key=lambda item: item["signal_count"], reverse=True)
        return {"ok": True, "country": "UK", "digital_routes": output}

    def vulnerabilities(self, conn: Any, *, current_user: dict[str, Any], limit: int = 1000) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        triggers: Counter[str] = Counter()
        linked: dict[str, list[str]] = defaultdict(list)
        for signal in signals:
            tags = signal.indicator_tags or []
            for tag in tags:
                key = str(tag).strip().lower()
                if not key:
                    continue
                triggers[key] += 1
                linked[key].append(signal.id)
        output = [
            {
                "trigger": trigger,
                "signal_count": count,
                "risk_level": "high" if count >= 5 else "medium",
                "linked_signal_ids": linked[trigger],
            }
            for trigger, count in triggers.most_common()
        ]
        return {"ok": True, "country": "UK", "vulnerability_triggers": output}

    def cross_boundary(self, conn: Any, *, current_user: dict[str, Any], limit: int = 1000) -> dict[str, Any]:
        signals = self.repository.list_signals(conn, current_user=current_user, limit=limit)
        child_regions: dict[str, set[str]] = defaultdict(set)
        child_signals: dict[str, list[str]] = defaultdict(list)
        for signal in signals:
            if signal.young_person_id is None:
                continue
            uk_location = (signal.metadata or {}).get("uk_location") or {}
            region = uk_location.get("region_hint")
            if region:
                child_regions[str(signal.young_person_id)].add(region)
                child_signals[str(signal.young_person_id)].append(signal.id)
        movements = [
            {
                "young_person_id": child_id,
                "regions": sorted(regions),
                "region_count": len(regions),
                "risk_level": "critical" if len(regions) >= 3 else "high",
                "linked_signal_ids": child_signals[child_id],
            }
            for child_id, regions in child_regions.items()
            if len(regions) >= 2
        ]
        movements.sort(key=lambda item: item["region_count"], reverse=True)
        return {"ok": True, "country": "UK", "cross_boundary_movements": movements}

    def escalation_map(self, conn: Any, *, current_user: dict[str, Any], limit: int = 1000) -> dict[str, Any]:
        overview = self.overview(conn, current_user=current_user, limit=limit)["domains"]
        return {
            "ok": True,
            "country": "UK",
            "map": [
                {
                    "domain": domain,
                    "risk_level": summary["risk_level"],
                    "signal_count": summary["signal_count"],
                    "recommended_action": self._recommended_action(domain, summary["risk_level"]),
                }
                for domain, summary in overview.items()
            ],
        }

    def _domain_summary(self, domain: str, signals: list[Any]) -> dict[str, Any]:
        config = CONTEXTUAL_DOMAINS[domain]
        matched = [signal for signal in signals if signal.signal_type in config["signal_types"]]
        high = sum(1 for signal in matched if signal.risk_level in {"high", "critical"})
        return {
            "signal_count": len(matched),
            "high_risk_count": high,
            "risk_level": "critical" if high >= 5 else "high" if high >= 2 or len(matched) >= 5 else "medium" if matched else "low",
            "signal_types": sorted(set(signal.signal_type for signal in matched)),
        }

    def _movement_routes(self, signals: list[Any]) -> list[dict[str, Any]]:
        return self._field_routes(signals, "transport_route", "movement_route")

    def _exploitation_routes(self, signals: list[Any]) -> list[dict[str, Any]]:
        routes = self._field_routes(signals, "alias_or_nickname", "alias")
        routes.extend(self._field_routes(signals, "vehicle_description", "vehicle"))
        return sorted(routes, key=lambda item: item["signal_count"], reverse=True)

    def _digital_routes(self, signals: list[Any]) -> list[dict[str, Any]]:
        return self._field_routes(signals, "digital_handle", "digital_handle")

    def _relationship_routes(self, signals: list[Any]) -> list[dict[str, Any]]:
        return self._field_routes(signals, "alias_or_nickname", "relationship")

    def _cross_boundary_routes(self, signals: list[Any]) -> list[dict[str, Any]]:
        return self._field_routes(signals, "postcode_prefix", "postcode_route")

    def _field_routes(self, signals: list[Any], field: str, route_type: str) -> list[dict[str, Any]]:
        counts: Counter[str] = Counter()
        linked: dict[str, list[str]] = defaultdict(list)
        for signal in signals:
            value = getattr(signal, field, None)
            if not value:
                continue
            key = str(value).strip().lower()
            counts[key] += 1
            linked[key].append(signal.id)
        return [
            {
                "route_type": route_type,
                "key": key,
                "signal_count": count,
                "risk_level": "high" if count >= 3 else "medium",
                "linked_signal_ids": linked[key],
            }
            for key, count in counts.most_common()
        ]

    def _place_type(self, value: str) -> str | None:
        lowered = value.lower()
        for place_type, terms in PLACE_TERMS.items():
            if any(term in lowered for term in terms):
                return place_type
        return None

    def _digital_type(self, value: str) -> str | None:
        lowered = value.lower()
        for risk_type, terms in DIGITAL_TERMS.items():
            if any(term in lowered for term in terms):
                return risk_type
        return None

    def _recommended_action(self, domain: str, risk_level: str) -> str:
        if risk_level == "critical":
            return f"Immediate contextual safeguarding review for {domain}; consider strategy discussion and multi-agency intelligence sharing."
        if risk_level == "high":
            return f"Manager review for {domain}; check linked signals and update risk planning."
        if risk_level == "medium":
            return f"Monitor {domain}; review during keywork, supervision and safeguarding oversight."
        return f"No active {domain} pattern detected."


isn_contextual_safeguarding_service = ISNContextualSafeguardingService()
