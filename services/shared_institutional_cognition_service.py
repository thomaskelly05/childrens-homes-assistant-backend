from __future__ import annotations

from typing import Any


class SharedInstitutionalCognitionService:
    """Shared cognition architecture for IndiCare OS and Standalone ORB.

    OS and ORB share the same institutional reasoning principles,
    safeguarding cognition, therapeutic cognition and explainability.

    The key distinction is data boundary access:

    - ORB: guidance-first cognition with no direct live care-record authority.
    - OS: operational cognition with governed access to records, chronology,
      oversight and provider intelligence.
    """

    def architecture(self) -> dict[str, Any]:
        return {
            "shared_brains": {
                "regulatory_cognition": {
                    "shared": True,
                    "purpose": "Children's Homes Regulations, Quality Standards, SCCIF and evidence reasoning.",
                },
                "therapeutic_cognition": {
                    "shared": True,
                    "purpose": "Trauma-informed, relational and emotionally containing guidance.",
                },
                "reflective_cognition": {
                    "shared": True,
                    "purpose": "Reflective prompts, emotionally intelligent supervision-style support.",
                },
                "safeguarding_cognition": {
                    "shared": True,
                    "purpose": "Safeguarding reflection, escalation-aware thinking and evidence prompts.",
                },
                "confidence_cognition": {
                    "shared": True,
                    "purpose": "Confidence calibration, explainability and uncertainty awareness.",
                },
                "emotional_climate_cognition": {
                    "shared": True,
                    "purpose": "Relational warmth, strain and emotional continuity awareness.",
                },
            },
            "orb_boundary": {
                "role": "Residential guidance and reflection copilot.",
                "access": [
                    "general intelligence",
                    "residential cognition",
                    "therapeutic guidance",
                    "regulatory explanation",
                    "reflective support",
                    "recording guidance",
                ],
                "restricted": [
                    "direct live child records",
                    "authoritative safeguarding decisions",
                    "provider operational control",
                    "direct chronology ownership",
                ],
                "identity": "Calm premium ChatGPT-style residential copilot.",
            },
            "os_boundary": {
                "role": "Governed operational cognition platform.",
                "access": [
                    "live records",
                    "chronology intelligence",
                    "provider cognition",
                    "continuous operational state",
                    "governance oversight",
                    "Inspection evidence preparation",
                    "event-driven cognition",
                ],
                "identity": "Operational institutional cognition infrastructure.",
            },
            "shared_principles": [
                "Child-centred reasoning.",
                "Trauma-informed communication.",
                "Reflective safeguarding support.",
                "Human-led accountability.",
                "Explainable cognition.",
                "Calm emotionally regulating UX.",
            ],
            "future_direction": [
                "Shared cognition runtime with governed access tiers.",
                "Unified ORB identity across products.",
                "Continuous institutional learning.",
                "Provider-wide reflective intelligence.",
            ],
        }

    def prompt_addendum(self) -> str:
        data = self.architecture()
        return "\n".join(
            [
                "Shared institutional cognition:",
                "- ORB and OS share the same cognition principles.",
                "- ORB remains guidance-first with bounded data access.",
                "- OS remains the governed operational cognition layer.",
                "- Shared brains: regulatory, therapeutic, safeguarding, reflective and explainability cognition.",
            ]
        )


shared_institutional_cognition_service = SharedInstitutionalCognitionService()
