from __future__ import annotations

"""IndiCare Intelligence Convergence Layer.

Purpose:
Turn ORB into the orchestration layer for existing intelligence services.

This service does not replace existing engines.
It decides which engines should silently contribute to an answer.
"""

from typing import Any


class OrbIndiCareIntelligenceConvergenceService:
    def route(self, message: str, mode: str | None = None) -> dict[str, Any]:
        text = f"{message or ''} {mode or ''}".lower()

        engines = [
            "professional_curiosity",
            "outstanding_practice",
        ]

        if any(x in text for x in ["incident", "record", "chronology", "daily note", "care plan", "risk assessment"]):
            engines.append("document_intelligence")

        if any(x in text for x in ["child", "voice", "feelings", "wishes", "lived experience"]):
            engines.append("child_experience_intelligence")

        if any(x in text for x in ["impact", "outcome", "plan", "review"]):
            engines.append("plan_impact_intelligence")

        if any(x in text for x in ["ofsted", "sccif", "quality standards", "reg 44", "reg 45"]):
            engines.append("inspection_readiness")

        if any(x in text for x in ["missing", "exploitation", "unknown adult", "vehicle", "hotspot", "contextual safeguarding"]):
            engines.append("isn_intelligence")

        if "template" in text:
            engines.append("template_copilot")

        if any(x in text for x in ["locality", "postcode", "local area", "community risk"]):
            engines.append("location_intelligence")

        return {
            "active_engines": list(dict.fromkeys(engines)),
            "answer_order": [
                "child_experience",
                "child_voice",
                "safeguarding",
                "professional_curiosity",
                "impact",
                "leadership",
                "inspection",
                "outstanding_practice",
            ],
            "purpose": "Converge existing IndiCare intelligence into one ORB response.",
        }


orb_indicare_intelligence_convergence_service = OrbIndiCareIntelligenceConvergenceService()
