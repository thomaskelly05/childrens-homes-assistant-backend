from __future__ import annotations

from typing import Any

from repositories.isn_repository import isn_repository

PROMPTS_BY_SIGNAL = {
    "missing_episode": [
        "Have return-home interview themes been compared against known places, routes, peers and digital contacts?",
        "Is there a repeated time, location or transport pattern linked to missing episodes?",
        "Have push and pull factors been recorded in the young person's own words?",
    ],
    "county_lines_indicator": [
        "Is there evidence of debt, coercion, transport movement or older peer/adult influence?",
        "Have cross-boundary routes and transport hubs been reviewed?",
        "Has information sharing been considered through lawful safeguarding pathways?",
    ],
    "digital_risk": [
        "Which platform, handle or location-sharing feature is involved?",
        "Is there evidence of coercion, threats, image-based abuse or grooming?",
        "Have trusted adults explored online contact without blaming the child?",
    ],
    "vehicle_sighting": [
        "Is the vehicle linked to repeated locations, missing episodes or unknown adults?",
        "Has partial registration, colour, make or model been recorded?",
        "Does this require multi-agency disruption or police intelligence sharing?",
    ],
    "unknown_adult_contact": [
        "What is known about the adult's role, age, relationship and access to the child?",
        "Is the contact linked to gifts, transport, secrecy, fear or missing episodes?",
        "Have protective relationships and safe adults been strengthened?",
    ],
}

DOMAIN_PROMPTS = {
    "movement": "Explore transport routes, timing, collection points and return routes.",
    "exploitation": "Explore coercion, gifts, debt, older associates, fear, secrecy and control.",
    "digital": "Explore platforms, handles, disappearing messages, location sharing and image-based abuse.",
    "place": "Explore why this location matters, who is present there and what happens there.",
    "relationship": "Explore peer influence, adults of concern, trusted relationships and protective anchors.",
    "cross_boundary": "Explore movement across local authority or police force boundaries.",
}


class ISNProfessionalCuriosityService:
    """Generates safeguarding reflection prompts without making automated determinations."""

    def __init__(self, repository=isn_repository):
        self.repository = repository

    def prompts(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        young_person_id: int | None = None,
        limit: int = 500,
    ) -> dict[str, Any]:
        signals = self.repository.list_signals(
            conn,
            current_user=current_user,
            filters={"young_person_id": young_person_id} if young_person_id else {},
            limit=limit,
        )
        prompts: list[dict[str, Any]] = []
        seen: set[str] = set()

        for signal in signals:
            for prompt in PROMPTS_BY_SIGNAL.get(signal.signal_type, []):
                if prompt in seen:
                    continue
                seen.add(prompt)
                prompts.append(
                    {
                        "prompt": prompt,
                        "reason": signal.signal_type,
                        "linked_signal_id": signal.id,
                        "risk_level": signal.risk_level,
                        "principle": "professional_curiosity",
                    }
                )

        domains = self._domains(signals)
        for domain in domains:
            prompt = DOMAIN_PROMPTS.get(domain)
            if prompt and prompt not in seen:
                prompts.append(
                    {
                        "prompt": prompt,
                        "reason": domain,
                        "linked_signal_id": None,
                        "risk_level": "medium",
                        "principle": "contextual_safeguarding",
                    }
                )

        return {
            "ok": True,
            "country": "UK",
            "young_person_id": young_person_id,
            "prompts": prompts,
            "total": len(prompts),
        }

    def _domains(self, signals: list[Any]) -> set[str]:
        domains: set[str] = set()
        for signal in signals:
            if signal.signal_type in {"missing_episode", "transport_route", "location_sighting"}:
                domains.add("movement")
            if signal.signal_type in {"county_lines_indicator", "exploitation_concern", "gifting_or_debt", "vehicle_sighting"}:
                domains.add("exploitation")
            if signal.signal_type == "digital_risk" or signal.digital_handle:
                domains.add("digital")
            if signal.location_text or signal.postcode_prefix:
                domains.add("place")
            if signal.alias_or_nickname:
                domains.add("relationship")
            if signal.transport_route:
                domains.add("cross_boundary")
        return domains


isn_professional_curiosity_service = ISNProfessionalCuriosityService()
