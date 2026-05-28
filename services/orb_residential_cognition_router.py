from __future__ import annotations

from typing import Any

from services.orb_professional_curiosity_service import orb_professional_curiosity_service
from services.orb_scenario_playbook_service import orb_scenario_playbook_service


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
        "child_journey_cognition": "Child experience",
        "professional_curiosity_cognition": "Professional curiosity",
        "immediate_safeguarding_cognition": "Immediate safeguarding",
        "exploitation_risk_cognition": "Exploitation risk",
        "police_escalation_cognition": "Police escalation",
        "dynamic_risk_cognition": "Dynamic risk",
        "evidence_confidence": "Evidence",
        "institutional_depth_frame": "Institutional depth",
    }

    # Preferred visible pill order per topic (Ask ORB auto-route).
    TOPIC_DISPLAY_ORDER: dict[str, list[str]] = {
        "live_safeguarding_incident": [
            "Immediate safeguarding",
            "Exploitation risk",
            "Missing from home",
            "Restrictive practice",
        ],
        "physical_intervention_live": [
            "Restrictive practice",
            "Immediate safeguarding",
            "Recording quality",
            "Leadership oversight",
        ],
        "medication": ["Medication / health", "Recording quality", "Leadership oversight"],
        "missing": ["Missing from home", "Safeguarding", "Recording quality", "Ofsted evidence"],
        "therapeutic": ["Therapeutic reflection", "Recording quality", "Child experience"],
        "cumulative_concern": [
            "Safeguarding",
            "Professional curiosity",
            "Leadership oversight",
            "Ofsted evidence",
        ],
        "allegations": ["Safeguarding", "Recording quality", "Leadership oversight", "Professional curiosity"],
        "restraint": ["Restrictive practice", "Safeguarding", "Recording quality", "Leadership oversight"],
        "recording": ["Recording quality", "Therapeutic reflection"],
        "leadership": ["Leadership oversight", "Professional curiosity"],
        "inspection": ["Ofsted Lens", "Leadership oversight"],
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
        "live_safeguarding_incident": [
            "immediate_safeguarding_cognition",
            "safeguarding_cognition",
            "exploitation_risk_cognition",
            "missing_from_home_cognition",
            "restrictive_practice_cognition",
            "police_escalation_cognition",
            "dynamic_risk_cognition",
            "recording_quality_cognition",
            "governance_cognition",
            "professional_curiosity_cognition",
        ],
        "physical_intervention_live": [
            "restrictive_practice_cognition",
            "immediate_safeguarding_cognition",
            "safeguarding_cognition",
            "recording_quality_cognition",
            "governance_cognition",
            "professional_curiosity_cognition",
        ],
        "age_16_17_autonomy": [
            "immediate_safeguarding_cognition",
            "exploitation_risk_cognition",
            "child_journey_cognition",
            "safeguarding_cognition",
            "restrictive_practice_cognition",
            "recording_quality_cognition",
        ],
        "exploitation": [
            "exploitation_risk_cognition",
            "safeguarding_cognition",
            "missing_from_home_cognition",
            "chronology_cognition",
            "governance_cognition",
        ],
        "self_harm": [
            "immediate_safeguarding_cognition",
            "safeguarding_cognition",
            "therapeutic_reflective_cognition",
            "recording_quality_cognition",
        ],
        "cumulative_concern": [
            "safeguarding_cognition",
            "governance_cognition",
            "professional_curiosity_cognition",
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
            "live_safeguarding_incident",
            "physical_intervention_live",
            "exploitation",
            "self_harm",
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

    CRITICAL_DEPTH_TOPICS = frozenset({"live_safeguarding_incident", "physical_intervention_live"})

    def route(self, *, message: str, mode: str | None = None) -> dict[str, Any]:
        text = str(message or "").lower()
        mode_text = str(mode or "Ask ORB").strip()
        mode_lower = mode_text.lower()
        playbook = orb_scenario_playbook_service.detect_playbook(message)
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
        if playbook and playbook.labels:
            display_labels = self._apply_playbook_labels(display_labels, playbook.labels)
        depth_level = self._depth_level(topic, residential, playbook=playbook)
        vault_domains = self._vault_domains(topic, active_brains)
        if playbook and playbook.recommended_vaults:
            vault_domains = list(dict.fromkeys(list(playbook.recommended_vaults) + vault_domains))

        return {
            "topic": topic,
            "playbook_id": playbook.id if playbook else None,
            "residential": residential,
            "high_attention": topic in self.HIGH_ATTENTION_TOPICS if topic else False,
            "depth_level": depth_level,
            "active_brains": active_brains,
            "cognition_display_labels": display_labels,
            "vault_domains": vault_domains,
            "reasoning_lenses": self._universal_lenses(topic),
        }

    def detect_topic(self, text: str, *, mode: str | None = None) -> str | None:
        playbook_topic = orb_scenario_playbook_service.detect_topic(text)
        if playbook_topic in {"live_safeguarding_incident", "physical_intervention_live"}:
            return playbook_topic
        curiosity = orb_professional_curiosity_service.detect_topic(text, mode=mode)
        if curiosity in {
            "live_safeguarding_incident",
            "physical_intervention_live",
            "age_16_17_autonomy",
            "police_escalation",
        }:
            return curiosity
        if playbook_topic:
            return playbook_topic
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
            label = self._brain_display_label(brain, topic=topic, mode=mode, message=message)
            if label and label not in labels:
                labels.append(label)
        labels = self._filter_display_labels(labels, message=message, mode=mode, topic=topic)
        labels = self._apply_topic_display_order(labels, topic=topic, mode=mode)
        if mode == "ofsted lens" and "Ofsted Lens" not in labels:
            labels.insert(0, "Ofsted Lens")
        return labels[:5]

    def _brain_display_label(
        self,
        brain: str,
        *,
        topic: str | None,
        mode: str,
        message: str,
    ) -> str | None:
        if brain == "regulatory_cognition":
            mode_lower = str(mode or "").lower()
            text = str(message or "").lower()
            inspection_focus = topic in {"missing", "cumulative_concern", "restraint", "allegations"} or any(
                term in text or term in mode_lower
                for term in ("ofsted", "sccif", "inspection", "reg 44", "reg 45", "quality standard")
            )
            if mode_lower == "ask orb" and inspection_focus and topic != "inspection":
                return "Ofsted evidence"
            return self.COGNITION_DISPLAY.get(brain)
        return self.COGNITION_DISPLAY.get(brain)

    def _apply_topic_display_order(
        self,
        labels: list[str],
        *,
        topic: str | None,
        mode: str,
    ) -> list[str]:
        if not topic:
            return labels
        preferred = list(self.TOPIC_DISPLAY_ORDER.get(topic or "", []))
        if not preferred:
            return labels
        mode_lower = str(mode or "").lower()
        if mode_lower not in {"", "ask orb", "general cognition"} and topic == "inspection":
            return labels
        ordered: list[str] = []
        for label in preferred:
            if label in labels and label not in ordered:
                ordered.append(label)
            elif label not in ordered:
                ordered.append(label)
        strict_topics = {
            "medication",
            "therapeutic",
            "missing",
            "cumulative_concern",
        }
        if topic in strict_topics:
            return ordered[: len(preferred)]
        for label in labels:
            if label not in ordered:
                ordered.append(label)
        return ordered

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
            labels = [
                label
                for label in labels
                if label
                not in {
                    "Therapeutic reflection",
                    "Child experience",
                    "Safeguarding",
                    "Ofsted Lens",
                    "Professional curiosity",
                }
            ]
        if topic == "missing":
            labels = [
                label
                for label in labels
                if label not in {"Therapeutic reflection", "Chronology", "Ofsted Lens"}
            ]
            if "Ofsted evidence" not in labels:
                labels.append("Ofsted evidence")
        if topic == "therapeutic" and "safeguard" not in text:
            labels = [
                label
                for label in labels
                if label not in {"Safeguarding", "Professional curiosity", "Ofsted Lens", "Ofsted evidence"}
            ]
        if topic == "cumulative_concern":
            labels = [
                label
                for label in labels
                if label
                not in {
                    "Chronology",
                    "Restrictive practice",
                    "Ofsted Lens",
                    "Missing from home",
                    "Therapeutic reflection",
                    "Child experience",
                }
            ]
            if "Ofsted evidence" not in labels:
                labels.append("Ofsted evidence")
        if topic == "live_safeguarding_incident":
            labels = [
                label
                for label in labels
                if label
                not in {
                    "Therapeutic reflection",
                    "Ofsted Lens",
                    "Chronology",
                    "Child experience",
                    "Workforce supervision",
                    "Education",
                }
            ]
        if topic == "physical_intervention_live":
            labels = [label for label in labels if label not in {"Therapeutic reflection", "Ofsted Lens", "Chronology"}]
        return labels

    def _depth_level(
        self,
        topic: str | None,
        residential: bool,
        *,
        playbook: Any | None = None,
    ) -> str:
        if playbook and playbook.depth_level == "critical":
            return "critical"
        if topic in self.CRITICAL_DEPTH_TOPICS:
            return "critical"
        if topic in self.HIGH_ATTENTION_TOPICS:
            return "high"
        if topic == "general_residential" or residential:
            return "standard"
        return "concise"

    def _apply_playbook_labels(
        self,
        labels: list[str],
        playbook_labels: tuple[str, ...] | list[str],
    ) -> list[str]:
        ordered = list(playbook_labels)
        for label in labels:
            if label not in ordered:
                ordered.append(label)
        return ordered[:5]

    def _vault_domains(self, topic: str | None, active_brains: list[str]) -> list[str]:
        vault_map = {
            "live_safeguarding_incident": [
                "Immediate Safeguarding Vault",
                "Exploitation / CSE / CCE Vault",
                "Unknown Adult / Vehicle Risk Vault",
                "Physical Intervention / Lawful Restriction Vault",
                "Missing From Home Vault",
                "Police / Emergency Escalation Vault",
                "Dynamic Risk Assessment Vault",
            ],
            "physical_intervention_live": [
                "Physical Intervention / Lawful Restriction Vault",
                "Deprivation of Liberty / Movement Restriction Vault",
                "Immediate Safeguarding Vault",
                "Recording Quality Vault",
            ],
            "exploitation": [
                "Exploitation / CSE / CCE Vault",
                "Missing From Home Vault",
                "Online Harm / Digital Contact Vault",
            ],
            "self_harm": [
                "Self-Harm / Mental Health Crisis Vault",
                "Immediate Safeguarding Vault",
                "Safeguarding Vault",
            ],
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
            "look after",
            "we look after",
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
