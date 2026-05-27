from __future__ import annotations

from typing import Any

from services.orb_professional_curiosity_service import orb_professional_curiosity_service


class OrbResidentialCognitionRouter:
    """Universal residential cognition router for standalone ORB.

    Detects topic from message content (and optional manual agent mode), selects
    active brains, human-readable cognition labels, vault domains and depth level.
    Ask ORB auto-routes; manual agent modes bias but do not disable routing.
    """

    COGNITION_DISPLAY: dict[str, str] = {
        "safeguarding_cognition": "Safeguarding",
        "missing_from_home_cognition": "Missing from home",
        "restrictive_practice_cognition": "Restrictive practice",
        "recording_quality_cognition": "Recording quality",
        "therapeutic_reflective_cognition": "Therapeutic reflection",
        "regulatory_cognition": "Ofsted Lens",
        "governance_cognition": "Leadership oversight",
        "chronology_cognition": "Chronology",
        "workforce_cognition": "Workforce supervision",
        "health_medication_cognition": "Medication / health",
        "education_cognition": "Education",
        "complaints_advocacy_cognition": "Complaints / advocacy",
        "child_journey_cognition": "Child journey",
        "professional_curiosity_cognition": "Professional curiosity",
        "evidence_confidence": "Evidence",
        "institutional_depth_frame": "Institutional depth",
    }

    MODE_BIAS: dict[str, list[str]] = {
        "safeguarding thinking": ["safeguarding_cognition", "professional_curiosity_cognition"],
        "ofsted lens": ["regulatory_cognition", "governance_cognition", "evidence_confidence"],
        "record this properly": ["recording_quality_cognition", "therapeutic_reflective_cognition"],
        "therapeutic reframe": ["therapeutic_reflective_cognition"],
        "manager copilot": ["governance_cognition", "regulatory_cognition"],
        "staff coach": ["workforce_cognition", "therapeutic_reflective_cognition"],
        "reg 44 / reg 45 prep": ["governance_cognition", "regulatory_cognition"],
    }

    TOPIC_BRAINS: dict[str, list[str]] = {
        "cumulative_concern": [
            "safeguarding_cognition",
            "chronology_cognition",
            "governance_cognition",
            "professional_curiosity_cognition",
            "restrictive_practice_cognition",
            "missing_from_home_cognition",
            "recording_quality_cognition",
        ],
        "allegations": [
            "safeguarding_cognition",
            "regulatory_cognition",
            "governance_cognition",
            "recording_quality_cognition",
            "therapeutic_reflective_cognition",
            "professional_curiosity_cognition",
        ],
        "missing": [
            "safeguarding_cognition",
            "missing_from_home_cognition",
            "chronology_cognition",
            "therapeutic_reflective_cognition",
            "governance_cognition",
            "recording_quality_cognition",
        ],
        "restraint": [
            "safeguarding_cognition",
            "restrictive_practice_cognition",
            "recording_quality_cognition",
            "therapeutic_reflective_cognition",
            "governance_cognition",
            "chronology_cognition",
        ],
        "recording": [
            "recording_quality_cognition",
            "therapeutic_reflective_cognition",
            "regulatory_cognition",
        ],
        "chronology": [
            "chronology_cognition",
            "regulatory_cognition",
            "governance_cognition",
            "recording_quality_cognition",
        ],
        "leadership": [
            "governance_cognition",
            "regulatory_cognition",
            "professional_curiosity_cognition",
        ],
        "inspection": [
            "regulatory_cognition",
            "governance_cognition",
            "evidence_confidence",
        ],
        "therapeutic": [
            "therapeutic_reflective_cognition",
            "child_journey_cognition",
            "recording_quality_cognition",
        ],
        "supervision": [
            "workforce_cognition",
            "therapeutic_reflective_cognition",
            "governance_cognition",
        ],
        "staffing": [
            "workforce_cognition",
            "governance_cognition",
            "safeguarding_cognition",
        ],
        "complaints": [
            "complaints_advocacy_cognition",
            "governance_cognition",
            "recording_quality_cognition",
        ],
        "medication": [
            "health_medication_cognition",
            "safeguarding_cognition",
            "recording_quality_cognition",
            "governance_cognition",
        ],
        "education_health": [
            "education_cognition",
            "child_journey_cognition",
            "governance_cognition",
        ],
        "placement_planning": [
            "child_journey_cognition",
            "safeguarding_cognition",
            "governance_cognition",
        ],
    }

    HIGH_ATTENTION_TOPICS = frozenset(
        {
            "cumulative_concern",
            "allegations",
            "missing",
            "restraint",
            "recording",
            "chronology",
            "leadership",
            "inspection",
            "therapeutic",
            "medication",
            "complaints",
            "supervision",
        }
    )

    def route(self, *, message: str, mode: str | None = None) -> dict[str, Any]:
        text = str(message or "").lower()
        mode_text = str(mode or "Ask ORB").strip()
        mode_lower = mode_text.lower()
        topic = self.detect_topic(text, mode=mode_lower)
        residential = self._is_residential(text, mode_lower)

        brains = ["general_intelligence"]
        if residential:
            brains.append("residential_practice")

        topic_brains = list(self.TOPIC_BRAINS.get(topic or "", []))
        if topic_brains:
            brains.extend(topic_brains)
        elif residential:
            brains.extend(["safeguarding_cognition", "recording_quality_cognition"])

        brains.extend(self._keyword_brains(text, mode_lower))
        brains.extend(self.MODE_BIAS.get(mode_lower, []))

        if topic in self.HIGH_ATTENTION_TOPICS:
            brains.append("professional_curiosity_cognition")
            brains.append("institutional_depth_frame")

        active_brains = list(dict.fromkeys(brains))
        display_labels = self.cognition_display_labels(
            active_brains,
            message=text,
            mode=mode_lower,
            topic=topic,
        )
        depth_level = self._depth_level(topic, residential)

        return {
            "topic": topic,
            "residential": residential,
            "high_attention": topic in self.HIGH_ATTENTION_TOPICS if topic else False,
            "depth_level": depth_level,
            "active_brains": active_brains,
            "cognition_display_labels": display_labels,
            "vault_domains": self._vault_domains(topic, active_brains),
            "reasoning_lenses": self._universal_lenses(topic),
        }

    def detect_topic(self, text: str, *, mode: str | None = None) -> str | None:
        curiosity = orb_professional_curiosity_service.detect_topic(text, mode=mode)
        if curiosity:
            return curiosity
        mode_text = str(mode or "").lower()
        if any(term in text for term in ("indicare", "orb", "care companion", "platform", "product")):
            return "indicare_product"
        if any(term in text for term in ("placement", "admission", "care plan", "risk assessment", "matching")):
            return "placement_planning"
        if any(term in text or term in mode_text for term in ("staffing", "rota", "agency staff", "safer recruitment", "probation")):
            return "staffing"
        if self._is_residential(text, mode_text):
            return "general_residential"
        return None

    def cognition_display_labels(
        self,
        active_brains: list[str],
        *,
        message: str = "",
        mode: str = "ask orb",
        topic: str | None = None,
    ) -> list[str]:
        labels: list[str] = []
        skip = {"general_intelligence", "residential_practice", "institutional_depth_frame"}
        for brain in active_brains:
            if brain in skip:
                continue
            label = self.COGNITION_DISPLAY.get(brain)
            if label and label not in labels:
                labels.append(label)
        labels = self._filter_display_labels(labels, message=message, mode=mode, topic=topic)
        if mode == "ofsted lens" and "Ofsted Lens" not in labels:
            labels.insert(0, "Ofsted Lens")
        return labels[:5]

    def _filter_display_labels(
        self,
        labels: list[str],
        *,
        message: str,
        mode: str,
        topic: str | None,
    ) -> list[str]:
        text = str(message or "").lower()
        inspection_focus = topic == "inspection" or any(
            term in text or term in mode for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45", "quality standard")
        )
        if mode == "ask orb" and not inspection_focus:
            labels = [label for label in labels if label != "Ofsted Lens"]
        if topic == "medication":
            labels = [label for label in labels if label not in {"Therapeutic reflection", "Child journey"}]
        if topic == "therapeutic" and "safeguard" not in text:
            labels = [label for label in labels if label != "Safeguarding"]
        return labels

    def _depth_level(self, topic: str | None, residential: bool) -> str:
        if topic in self.HIGH_ATTENTION_TOPICS:
            return "high"
        if topic == "general_residential" or residential:
            return "standard"
        return "concise"

    def _vault_domains(self, topic: str | None, active_brains: list[str]) -> list[str]:
        vault_map = {
            "cumulative_concern": [
                "Safeguarding Vault",
                "Restrictive Practice Vault",
                "Missing From Home Vault",
                "Leadership/Governance Vault",
                "Recording Quality Vault",
            ],
            "allegations": ["Safeguarding Vault", "Regulatory Vault", "Recording Quality Vault"],
            "missing": ["Missing From Home Vault", "Safeguarding Vault", "Recording Quality Vault"],
            "restraint": ["Restrictive Practice Vault", "Safeguarding Vault", "Recording Quality Vault"],
            "recording": ["Recording Quality Vault", "Therapeutic Vault"],
            "leadership": ["Leadership/Governance Vault", "Ofsted/SCCIF Vault"],
            "inspection": ["Ofsted/SCCIF Vault", "Regulatory Vault"],
            "therapeutic": ["Therapeutic Vault", "Recording Quality Vault"],
            "medication": ["Medication/Health Vault", "Safeguarding Vault"],
            "supervision": ["Workforce/Supervision Vault", "Therapeutic Vault"],
            "staffing": ["Workforce/Supervision Vault", "Leadership/Governance Vault"],
            "complaints": ["Complaints/Advocacy Vault", "Leadership/Governance Vault"],
            "education_health": ["Child Journey Vault", "Regulatory Vault"],
            "placement_planning": ["Child Journey Vault", "Safeguarding Vault"],
            "chronology": ["Recording Quality Vault", "Ofsted/SCCIF Vault"],
        }
        if topic and topic in vault_map:
            return vault_map[topic]
        if "regulatory_cognition" in active_brains:
            return ["Regulatory Vault", "Ofsted/SCCIF Vault"]
        if "safeguarding_cognition" in active_brains:
            return ["Safeguarding Vault"]
        return []

    def _universal_lenses(self, topic: str | None) -> list[str]:
        base = [
            "Practical meaning for adults working in the home",
            "Child's lived experience",
            "What may be missing from the account",
            "Recording expectations",
            "Leadership/management oversight",
            "Professional boundary and next steps",
        ]
        if topic in self.HIGH_ATTENTION_TOPICS:
            base.insert(2, "Immediate safety / risk if relevant")
            base.insert(4, "What patterns may matter")
            base.insert(6, "Therapeutic/emotional meaning")
            base.insert(7, "Regulatory/Ofsted relevance where appropriate")
        return base

    def _keyword_brains(self, text: str, mode_lower: str) -> list[str]:
        brains: list[str] = []
        if any(term in text or term in mode_lower for term in ("ofsted", "sccif", "regulation", "quality standard", "evidence")):
            brains.append("regulatory_cognition")
        if any(term in text or term in mode_lower for term in ("safeguard", "risk", "allegation", "missing", "harm", "exploit")):
            brains.append("safeguarding_cognition")
        if any(term in text or term in mode_lower for term in ("trauma", "therapeutic", "behaviour", "repair", "regulated", "reflect", "smashed")):
            brains.append("therapeutic_reflective_cognition")
        if any(term in text or term in mode_lower for term in ("record", "wording", "chronology", "daily note", "incident")):
            brains.append("recording_quality_cognition")
        if any(term in text or term in mode_lower for term in ("manager", "oversight", "audit", "reg 44", "reg 45", "leadership", "daily brief")):
            brains.append("governance_cognition")
        if any(
            term in text
            for term in (
                "pattern",
                "repeated",
                "again",
                "escalat",
                "chronology",
                "timeline",
                "over time",
                "history of",
                "drift",
                "theme",
            )
        ):
            brains.append("chronology_cognition")
        return brains

    def _is_residential(self, text: str, mode_lower: str) -> bool:
        residential_terms = (
            "children's home",
            "childrens home",
            "young person",
            "looked after",
            "residential",
            "staff",
            "home",
            "child",
            "safeguard",
            "quality standard",
            "ofsted",
            "placement",
        )
        specialist_modes = (
            "safeguarding",
            "ofsted",
            "record",
            "therapeutic",
            "manager",
            "staff coach",
            "reg 44",
            "reg 45",
        )
        return any(term in text for term in residential_terms) or any(term in mode_lower for term in specialist_modes)


orb_residential_cognition_router = OrbResidentialCognitionRouter()
