from __future__ import annotations

"""Standalone ORB location intelligence.

This service does not infer or access a home's live OS address. It only uses
location details supplied in the standalone conversation or profile context.
It prepares a locality-risk prompt so ORB can build locality risk assessments
without pretending to know facts it has not been given.
"""

import re
from typing import Any

POSTCODE_RE = re.compile(r"\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b", re.I)

LOCALITY_RISK_DOMAINS = [
    "missing-from-care routes and return-home planning",
    "contextual safeguarding and exploitation indicators",
    "transport hubs, town centres, parks, shopping areas and secluded locations",
    "peer groups, online contact and unknown adults",
    "education travel routes and community access",
    "substances, alcohol, criminal exploitation and risky locations",
    "local safeguarding partnerships and police/social-care escalation routes",
    "protective community assets, activities, trusted adults and safe places",
]


class OrbLocationIntelligenceService:
    def detect_location_request(self, message: str) -> bool:
        text = str(message or "").lower()
        return any(
            term in text
            for term in (
                "locality risk",
                "local area risk",
                "community risk assessment",
                "local risk assessment",
                "risk assessment for my home",
                "where my home is",
                "postcode",
                "local authority area",
            )
        )

    def extract_location(self, message: str, *, context: dict[str, Any] | None = None) -> dict[str, Any]:
        context = context or {}
        text = str(message or "")
        postcode_match = POSTCODE_RE.search(text)
        postcode = postcode_match.group(1).upper().replace(" ", "") if postcode_match else None
        supplied = {
            "postcode": postcode or context.get("postcode") or context.get("home_postcode"),
            "town": context.get("town") or context.get("home_town"),
            "local_authority": context.get("local_authority"),
            "police_force": context.get("police_force"),
            "region": context.get("region"),
            "home_type": context.get("home_type"),
        }
        return {key: value for key, value in supplied.items() if value}

    def prompt_block(self, message: str, *, context: dict[str, Any] | None = None) -> str:
        if not self.detect_location_request(message):
            return ""
        location = self.extract_location(message, context=context)
        lines = [
            "Standalone ORB Location Intelligence:",
            "- The user appears to be asking for locality/community risk support.",
            "- Do not claim access to the home's live OS address or records.",
            "- Use only location information the user supplied in this conversation/profile context.",
            "- If postcode/town/local authority is missing, provide a strong reusable locality risk assessment template and say what local information should be added.",
            "- If location details are supplied, tailor the headings and prompts to that locality, but do not invent crime, exploitation or safeguarding facts.",
            "- Recommend checking local safeguarding partnership, police/community safety information, local authority, school/transport routes and recent professional knowledge before final sign-off.",
        ]
        if location:
            lines.append(f"- Supplied location context: {location}")
        lines.append("- Locality risk domains to cover:")
        lines.extend(f"  - {item}" for item in LOCALITY_RISK_DOMAINS)
        return "\n".join(lines)

    def metadata(self, message: str, *, context: dict[str, Any] | None = None) -> dict[str, Any]:
        active = self.detect_location_request(message)
        return {
            "active": active,
            "location_context": self.extract_location(message, context=context) if active else {},
            "domains": LOCALITY_RISK_DOMAINS if active else [],
            "standalone": True,
            "os_records_accessed": False,
        }


orb_location_intelligence_service = OrbLocationIntelligenceService()
