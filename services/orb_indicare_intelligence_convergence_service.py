from __future__ import annotations

"""IndiCare Intelligence Convergence Layer for ORB Residential.

Decides which intelligence layers should silently contribute to an answer.
Does not replace existing engines — orchestrates reasoning lenses only.
"""

from typing import Any


INTELLIGENCE_LAYERS: dict[str, str] = {
    "child_experience_intelligence": "Child Experience Intelligence",
    "child_voice_intelligence": "Child Voice Intelligence",
    "safeguarding_intelligence": "Safeguarding Intelligence",
    "professional_curiosity_intelligence": "Professional Curiosity Intelligence",
    "isn_intelligence": "ISN Intelligence",
    "contextual_safeguarding_intelligence": "Contextual Safeguarding Intelligence",
    "recording_intelligence": "Recording Intelligence",
    "document_intelligence": "Document Intelligence",
    "plan_impact_intelligence": "Plan Impact Intelligence",
    "therapeutic_practice_intelligence": "Therapeutic Practice Intelligence",
    "relationship_intelligence": "Relationship Intelligence",
    "leadership_rm_intelligence": "Leadership / RM Intelligence",
    "ri_governance_intelligence": "RI Governance Intelligence",
    "inspection_readiness_intelligence": "Inspection evidence preparation Intelligence",
    "sccif_intelligence": "SCCIF Intelligence",
    "quality_standards_intelligence": "Quality Standards Intelligence",
    "outstanding_practice_intelligence": "Outstanding Practice Intelligence",
    "public_evidence_intelligence": "Public Evidence Intelligence",
    "evidence_graph_intelligence": "Evidence Graph Intelligence",
    "locality_intelligence": "Locality Intelligence",
    "template_intelligence": "Template Intelligence",
    "learning_academy_intelligence": "Learning / Academy Intelligence",
    "missing_episode_intelligence": "Missing Episode Intelligence",
}


class OrbIndiCareIntelligenceConvergenceService:
    def route(self, message: str, mode: str | None = None) -> dict[str, Any]:
        text = f"{message or ''} {mode or ''}".lower()
        engines: list[str] = [
            "professional_curiosity_intelligence",
            "outstanding_practice_intelligence",
        ]
        lenses: list[str] = []
        matched_rules: list[str] = []

        def activate(engine: str, rule: str, *extra_lenses: str) -> None:
            if engine not in engines:
                engines.append(engine)
            matched_rules.append(rule)
            for lens in extra_lenses:
                if lens not in lenses:
                    lenses.append(lens)

        # Incident / recording
        if any(x in text for x in ("incident", "returned from missing", "cannabis", "refused to talk")):
            for eng in (
                "document_intelligence",
                "safeguarding_intelligence",
                "child_experience_intelligence",
                "child_voice_intelligence",
                "recording_intelligence",
                "plan_impact_intelligence",
                "inspection_readiness_intelligence",
                "sccif_intelligence",
            ):
                activate(eng, "incident_scenario")
            lenses.extend(["Ofsted / SCCIF Lens", "Evidence of Impact", "Professional Curiosity"])

        if any(x in text for x in ("incident", "record", "chronology", "daily note")):
            activate("document_intelligence", "recording_document")
            activate("recording_intelligence", "recording_document")

        # Care plan review
        if "care plan" in text and any(x in text for x in ("review", "child voice", "ofsted")):
            for eng in (
                "document_intelligence",
                "child_voice_intelligence",
                "child_experience_intelligence",
                "plan_impact_intelligence",
                "quality_standards_intelligence",
                "sccif_intelligence",
                "inspection_readiness_intelligence",
            ):
                activate(eng, "care_plan_review")
            lenses.extend(["Ofsted Challenge", "Evidence of Impact"])

        # Missing from care
        if any(x in text for x in ("missing", "returned from missing", "went missing", "missing from care")):
            for eng in (
                "safeguarding_intelligence",
                "isn_intelligence",
                "contextual_safeguarding_intelligence",
                "child_experience_intelligence",
                "missing_episode_intelligence",
                "locality_intelligence",
                "plan_impact_intelligence",
                "inspection_readiness_intelligence",
            ):
                activate(eng, "missing_episode")
            lenses.extend(["Location / Route / Hotspot", "Ofsted Lens"])

        # ISN triggers
        if any(
            x in text
            for x in (
                "exploitation",
                "unknown adult",
                "vehicle",
                "hotspot",
                "route",
                "contextual safeguarding",
                "county lines",
                "cse",
                "cce",
            )
        ):
            activate("isn_intelligence", "isn_signals")
            activate("contextual_safeguarding_intelligence", "isn_signals")

        # Locality risk
        if any(x in text for x in ("locality risk", "local area", "community risk", "postcode", "local authority")):
            for eng in (
                "template_intelligence",
                "locality_intelligence",
                "isn_intelligence",
                "contextual_safeguarding_intelligence",
                "safeguarding_intelligence",
                "public_evidence_intelligence",
            ):
                activate(eng, "locality_risk")
            lenses.append("PDF/document export support")

        # Template requests
        if "template" in text or "create a" in text and any(
            x in text for x in ("assessment", "plan", "record", "conversation", "review")
        ):
            activate("template_intelligence", "template_request")
            activate("document_intelligence", "template_request")

        # Child voice / experience
        if any(x in text for x in ("child voice", "child's voice", "wishes", "feelings", "lived experience")):
            activate("child_voice_intelligence", "child_voice")
            activate("child_experience_intelligence", "child_voice")

        # Plan impact
        if any(x in text for x in ("plan", "impact", "what should change", "after this incident")):
            activate("plan_impact_intelligence", "plan_impact")

        # Inspection / Ofsted / SCCIF
        if any(x in text for x in ("ofsted", "sccif", "quality standards", "reg 44", "reg 45", "inspection")):
            activate("inspection_readiness_intelligence", "inspection")
            activate("sccif_intelligence", "inspection")
            activate("quality_standards_intelligence", "inspection")

        # RI / leadership
        if any(x in text for x in ("ri challenge", "responsible individual", "registered manager", "governance", "oversight")):
            activate("ri_governance_intelligence", "ri_governance")
            activate("leadership_rm_intelligence", "ri_governance")

        # Therapeutic / relationship
        if any(x in text for x in ("therapeutic", "behaviour", "relationship", "repair", "trauma")):
            activate("therapeutic_practice_intelligence", "therapeutic")
            activate("relationship_intelligence", "therapeutic")

        # Review this
        if "review this" in text or ("review" in text and any(x in text for x in ("incident", "care plan", "record"))):
            activate("document_intelligence", "review_this")
            activate("recording_intelligence", "review_this")

        # Learning
        if any(x in text for x in ("5-minute", "5 minute", "learning session", "staff briefing", "cpd")):
            activate("learning_academy_intelligence", "learning_micro")

        # Outstanding practice explicit
        if any(x in text for x in ("outstanding practice", "outstanding", "what would make this")):
            activate("outstanding_practice_intelligence", "outstanding_explicit")

        # Public evidence / evidence graph (standalone knowledge)
        if any(x in text for x in ("sector", "national", "research", "what does the evidence say")):
            activate("public_evidence_intelligence", "public_evidence")
            activate("evidence_graph_intelligence", "public_evidence")

        engines = list(dict.fromkeys(engines))
        display_labels = [INTELLIGENCE_LAYERS.get(e, e.replace("_", " ").title()) for e in engines[:10]]

        return {
            "active_engines": engines,
            "active_lenses": lenses[:12],
            "intelligence_layers": {e: INTELLIGENCE_LAYERS.get(e, e) for e in engines},
            "activation_rules_matched": matched_rules,
            "cognition_display_labels": display_labels,
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
            "purpose": "Converge IndiCare intelligence layers into one ORB Residential response.",
            "standalone_boundary": "Reasoning lenses only — no live OS or ISN record access in standalone ORB.",
        }


orb_indicare_intelligence_convergence_service = OrbIndiCareIntelligenceConvergenceService()
