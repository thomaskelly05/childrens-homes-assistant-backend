from __future__ import annotations

"""Standalone-safe ISN cognition for ORB Residential.

ISN operational data is OS-only. This service does not read ISN records. It
brings the existing ISN model into ORB's reasoning as a professional lens:
signals, hotspots, routes, contextual safeguarding, escalation, transport
corridors, timeline and multi-agency thinking.
"""

from typing import Any


ISN_DOMAINS = [
    "safeguarding signals",
    "hotspots and places",
    "relationships and peer/adult networks",
    "routes and transport corridors",
    "contextual safeguarding",
    "digital contact and online risk",
    "cross-boundary movement",
    "escalation patterns",
    "timeline and chronology",
    "multi-agency sharing",
]


class OrbISNCognitionService:
    def detect(self, message: str, *, mode: str | None = None) -> bool:
        text = f"{message or ''} {mode or ''}".lower()
        return any(
            term in text
            for term in (
                "isn",
                "intelligence sharing",
                "hotspot",
                "hotspots",
                "route",
                "transport corridor",
                "unknown adult",
                "vehicle",
                "missing",
                "exploitation",
                "cse",
                "cce",
                "county lines",
                "contextual safeguarding",
                "multi-agency",
                "police export",
                "safeguarding pack",
                "location risk",
                "locality risk",
                "digital risk",
                "cross-boundary",
            )
        )

    def prompt_block(self, message: str, *, mode: str | None = None) -> str:
        if not self.detect(message, mode=mode):
            return ""
        lines = [
            "ISN Cognition Lens (standalone-safe):",
            "- ISN operational records are OS-only; do not claim access to live ISN signals, hotspots, graphs, routes or exports in standalone ORB.",
            "- Use the ISN model as a professional reasoning lens: signals, hotspots, relationships, routes, transport corridors, contextual safeguarding, digital risk, escalation, chronology and multi-agency information sharing.",
            "- When missing, exploitation, unknown adults, vehicles, substances, local area risk or repeated routes are mentioned, think beyond the single incident and ask what the wider network/context may show.",
            "- Encourage adults to capture factual intelligence: who, where, when, route, vehicle, peer/adult, phone/social contact, substance/gift/debt, immediate safety and child's words/presentation.",
            "- For managers/RI users, include oversight: pattern review, safeguarding escalation, multi-agency sharing, chronology, locality risk update and whether ISN/OS intelligence should be reviewed.",
            "- For RSW users, keep it practical: observe, record factually, pass to senior/manager/DSL, follow missing/exploitation/local safeguarding procedures.",
            "- Do not advise sharing intelligence outside local policy or lawful safeguarding routes; emphasise local procedures and proportionate, factual information sharing.",
            "- Avoid overclaiming exploitation; say the pattern increases professional curiosity and may require contextual safeguarding thinking.",
            "- ISN domains to consider:",
        ]
        lines.extend(f"  - {domain}" for domain in ISN_DOMAINS)
        return "\n".join(lines)

    def metadata(self, message: str, *, mode: str | None = None) -> dict[str, Any]:
        active = self.detect(message, mode=mode)
        return {
            "active": active,
            "name": "ISN Cognition Lens",
            "domains": ISN_DOMAINS if active else [],
            "boundary": "Standalone ORB uses ISN as a reasoning lens only; live ISN data remains OS-only.",
            "standalone": True,
            "os_records_accessed": False,
        }


orb_isn_cognition_service = OrbISNCognitionService()
