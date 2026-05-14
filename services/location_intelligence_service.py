from __future__ import annotations

import re
from collections import defaultdict
from typing import Any

from schemas.location_intelligence import LocationCategory, LocationIntelligence, ReviewRiskLevel
from services.risk_intelligence_language import citation, field, now_iso, record_text, safe_payload, safe_text, scope_records


CATEGORY_TERMS: tuple[tuple[LocationCategory, tuple[str, ...]], ...] = (
    (LocationCategory.SCHOOL, ("school", "academy", "education")),
    (LocationCategory.PARK, ("park", "playground")),
    (LocationCategory.SHOPPING_CENTRE, ("shopping centre", "mall", "shops")),
    (LocationCategory.FAST_FOOD, ("mcdonald", "kfc", "burger", "takeaway", "fast food")),
    (LocationCategory.TRAIN_STATION, ("train station", "railway")),
    (LocationCategory.BUS_STATION, ("bus station", "bus stop")),
    (LocationCategory.GP_SURGERY, ("gp", "doctor", "surgery")),
    (LocationCategory.HOSPITAL, ("hospital", "a&e")),
    (LocationCategory.CAMHS, ("camhs",)),
    (LocationCategory.POLICE_STATION, ("police station",)),
    (LocationCategory.YOUTH_CENTRE, ("youth centre", "youth club")),
    (LocationCategory.FAMILY_ADDRESS, ("family address", "mum", "dad", "aunt", "grandmother")),
    (LocationCategory.KNOWN_SAFE_LOCATION, ("safe location", "safe route", "trusted")),
    (LocationCategory.KNOWN_CONCERN_LOCATION, ("concern location", "unknown adult", "exploitation", "cse", "county lines")),
    (LocationCategory.EXPLOITATION_HOTSPOT, ("exploitation hotspot",)),
    (LocationCategory.KNOWN_MISSING_RETURN_LOCATION, ("found at", "returned from", "missing return")),
    (LocationCategory.TRANSPORT_ROUTE, ("route", "taxi", "bus", "train", "transport")),
    (LocationCategory.PEER_ASSOCIATE_AREA, ("peer", "friend", "associate")),
)


LOCATION_AFTER_TERMS = re.compile(
    r"\b(?:at|near|from|to|towards|around|outside|inside|found at|returned from)\s+([A-Z][A-Za-z0-9'& -]{2,60})"
)


class LocationIntelligenceService:
    """Builds practical locality records from visible metadata and source records."""

    def build_locations(
        self,
        *,
        records: list[dict[str, Any]],
        young_person_id: int | str | None = None,
        home_id: int | str | None = None,
        manual_locations: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        scoped = scope_records(records, young_person_id=young_person_id, home_id=home_id, active_child_only=young_person_id is not None)
        grouped: dict[str, dict[str, Any]] = {}
        for item in manual_locations or []:
            location = self._normalise_manual_location(item, young_person_id=young_person_id)
            grouped[location["location_id"]] = location

        for record in scoped:
            for name, category in self._locations_from_record(record):
                key = self._location_id(name)
                current = grouped.setdefault(
                    key,
                    {
                        "location_id": key,
                        "name": name,
                        "category": category.value,
                        "description": f"records indicate {name} appears in visible records.",
                        "address": field(record, "address"),
                        "postcode": field(record, "postcode"),
                        "latitude": field(record, "latitude"),
                        "longitude": field(record, "longitude"),
                        "distance_from_home": field(record, "distance_from_home", "distanceFromHome"),
                        "travel_time_estimate": field(record, "travel_time_estimate", "travelTimeEstimate"),
                        "risk_level": ReviewRiskLevel.MONITOR.value,
                        "protective_value": None,
                        "linked_children": [],
                        "linked_incidents": [],
                        "linked_missing_episodes": [],
                        "linked_safeguarding_records": [],
                        "linked_professionals": [],
                        "evidence_refs": [],
                        "last_reviewed_at": None,
                        "review_required": True,
                        "source_type": "record_metadata",
                        "source_confidence": "limited",
                        "review_notes": "review recommended: verify source record context before using this location operationally.",
                    },
                )
                self._link_record(current, record, young_person_id=young_person_id)
                current["risk_level"] = self._risk_level(current, record)
                current["protective_value"] = self._protective_value(current, record)

        locations = [LocationIntelligence(**safe_payload(value)).model_dump() for value in grouped.values()]
        return sorted(locations, key=lambda item: (str(item["risk_level"]), str(item["name"])))

    def linked_counts(self, locations: list[dict[str, Any]]) -> dict[str, int]:
        totals = defaultdict(int)
        for location in locations:
            totals["locations"] += 1
            totals["evidence_refs"] += len(location.get("evidence_refs") or [])
            if location.get("review_required"):
                totals["review_required"] += 1
        return dict(totals)

    def _locations_from_record(self, record: dict[str, Any]) -> list[tuple[str, LocationCategory]]:
        text = record_text(record)
        explicit = field(record, "location_name", "locationName", "location")
        found: list[tuple[str, LocationCategory]] = []
        if explicit:
            name = safe_text(explicit)
            found.append((name, self._category_for_text(f"{name} {text}")))
        for match in LOCATION_AFTER_TERMS.findall(text):
            name = safe_text(match).strip(" .,:;")
            if len(name.split()) <= 8:
                found.append((name, self._category_for_text(f"{name} {text}")))
        deduped: dict[str, tuple[str, LocationCategory]] = {}
        for name, category in found:
            deduped[self._location_id(name)] = (name, category)
        return list(deduped.values())

    def _normalise_manual_location(self, item: dict[str, Any], *, young_person_id: int | str | None) -> dict[str, Any]:
        name = safe_text(item.get("name") or item.get("location") or "Locality location")
        category = item.get("category") or self._category_for_text(name).value
        payload = {
            "location_id": item.get("location_id") or self._location_id(name),
            "name": name,
            "category": category,
            "description": safe_text(item.get("description") or f"records indicate {name} is part of locality context."),
            "address": item.get("address"),
            "postcode": item.get("postcode"),
            "latitude": item.get("latitude"),
            "longitude": item.get("longitude"),
            "distance_from_home": item.get("distance_from_home"),
            "travel_time_estimate": item.get("travel_time_estimate"),
            "risk_level": item.get("risk_level") or ReviewRiskLevel.MONITOR.value,
            "protective_value": item.get("protective_value"),
            "linked_children": [young_person_id] if young_person_id is not None else [],
            "linked_incidents": item.get("linked_incidents") or [],
            "linked_missing_episodes": item.get("linked_missing_episodes") or [],
            "linked_safeguarding_records": item.get("linked_safeguarding_records") or [],
            "linked_professionals": item.get("linked_professionals") or [],
            "evidence_refs": item.get("evidence_refs") or [],
            "last_reviewed_at": item.get("last_reviewed_at"),
            "review_required": item.get("review_required", True),
            "source_type": item.get("source_type") or "manual",
            "source_confidence": item.get("source_confidence") or "staff_entered",
            "review_notes": safe_text(item.get("review_notes") or "review recommended: staff should verify context."),
        }
        return safe_payload(payload)

    def _category_for_text(self, text: str) -> LocationCategory:
        lower = text.lower()
        for category, terms in CATEGORY_TERMS:
            if any(term in lower for term in terms):
                return category
        return LocationCategory.KNOWN_CONCERN_LOCATION if "missing" in lower else LocationCategory.KNOWN_SAFE_LOCATION

    def _link_record(self, location: dict[str, Any], record: dict[str, Any], *, young_person_id: int | str | None) -> None:
        record_id = field(record, "id", "record_id")
        record_type = str(field(record, "record_type", "recordType", "type", "category") or "").lower()
        child_id = field(record, "young_person_id", "youngPersonId", "child_id", "childId") or young_person_id
        if child_id is not None and child_id not in location["linked_children"]:
            location["linked_children"].append(child_id)
        if record_id:
            if "incident" in record_type and record_id not in location["linked_incidents"]:
                location["linked_incidents"].append(record_id)
            if "missing" in record_type and record_id not in location["linked_missing_episodes"]:
                location["linked_missing_episodes"].append(record_id)
            if "safeguard" in record_type and record_id not in location["linked_safeguarding_records"]:
                location["linked_safeguarding_records"].append(record_id)
        professional_id = field(record, "staff_id", "staffId", "professional_id", "professionalId")
        if professional_id and professional_id not in location["linked_professionals"]:
            location["linked_professionals"].append(professional_id)
        location["evidence_refs"].append(citation(record, reason="evidence found: location referenced in visible record."))

    def _risk_level(self, location: dict[str, Any], record: dict[str, Any]) -> str:
        text = record_text(record).lower()
        if any(term in text for term in ("exploitation", "cse", "county lines", "unknown adult")):
            return ReviewRiskLevel.PRIORITY_REVIEW.value
        if location["linked_missing_episodes"] or any(term in text for term in ("missing", "police", "late evening")):
            return ReviewRiskLevel.REVIEW.value
        return location.get("risk_level") or ReviewRiskLevel.MONITOR.value

    def _protective_value(self, location: dict[str, Any], record: dict[str, Any]) -> str | None:
        text = record_text(record).lower()
        if any(term in text for term in ("trusted", "safe route", "positive", "settled", "school", "camhs", "gp", "hospital")):
            return "records indicate this location may have protective value when staff verify current context."
        return location.get("protective_value")

    def _location_id(self, name: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        return f"loc-{slug or 'locality'}"


location_intelligence_service = LocationIntelligenceService()
