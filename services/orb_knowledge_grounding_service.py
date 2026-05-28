from __future__ import annotations

from typing import Any

from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_official_source_anchor_service import orb_official_source_anchor_service
from services.orb_residential_cognition_router import orb_residential_cognition_router


class OrbKnowledgeGroundingService:
    """Knowledge grounding layer for standalone ORB.

    Selects relevant vault domains and source anchors by topic, injects only
    relevant guidance, and returns topic-specific citations — not generic spam.
    """

    VAULT_DESCRIPTIONS: dict[str, str] = {
        "Regulatory Vault": "Children's Homes Regulations, Quality Standards and statutory framing.",
        "Safeguarding Vault": "Safeguarding practice, Working Together principles and protection standards.",
        "Therapeutic Vault": "Trauma-informed, attachment-aware and relational practice guidance.",
        "Recording Quality Vault": "Factual, child-centred recording and chronology principles.",
        "Ofsted/SCCIF Vault": "Inspection framework, child experience and leadership impact.",
        "Leadership/Governance Vault": "RM/RI oversight, audits, drift, learning and governance.",
        "Missing From Home Vault": "Missing episodes, return conversations, push/pull and exploitation indicators.",
        "Restrictive Practice Vault": "Restraint, physical intervention, de-escalation and repair.",
        "Medication/Health Vault": "Medication safety, MAR records, health appointments and oversight.",
        "Workforce/Supervision Vault": "Supervision, staff conduct, training and safer recruitment.",
        "Child Journey Vault": "Admission, care planning, education, identity and transitions.",
        "Complaints/Advocacy Vault": "Complaints, advocacy, voice of the child and fair process.",
        "Immediate Safeguarding Vault": "Live, time-critical safeguarding — urgent practical structure.",
        "Exploitation / CSE / CCE Vault": "Sexual and criminal exploitation, coercion, contextual safeguarding.",
        "Unknown Adult / Vehicle Risk Vault": "Unknown adults, vehicles, perimeter risk.",
        "Physical Intervention / Lawful Restriction Vault": "Lawful, proportionate physical responses.",
        "Deprivation of Liberty / Movement Restriction Vault": "Locking, blocking exits, confinement lawfulness.",
        "Age 16–17 Autonomy and Rights Vault": "Near-adult rights and proportionate protection.",
        "Police / Emergency Escalation Vault": "Police, ambulance, EDT routes.",
        "Dynamic Risk Assessment Vault": "In-the-moment risk judgement.",
        "Online Harm / Digital Contact Vault": "Digital exploitation and device restrictions.",
        "Substance / Intoxication Vault": "Intoxication and health escalation.",
        "Self-Harm / Mental Health Crisis Vault": "Immediate self-harm crisis.",
        "Sexual Harm / Pregnancy / Relationship Risk Vault": "Disclosures, pregnancy, relationship safeguarding.",
        "Violence / Weapons Vault": "Weapons and violent incidents.",
        "Peer-on-Peer Harm Vault": "Harm between children in placement.",
        "Visitor / Boundary Management Vault": "Visitors and perimeter security.",
        "Transport Safety Vault": "Vehicle pickups and transport exploitation.",
        "Legal Status / Care Order Vault": "Legal authority and care orders.",
    }

    TOPIC_ANCHOR_LABELS: dict[str, list[str]] = {
        "cumulative_concern": ["[Reg 12]", "[Reg 13]", "[SCCIF]", "[LADO]", "[Working Together]", "[Recording quality]"],
        "allegations": ["[Reg 12]", "[Reg 13]", "[SCCIF]", "[Working Together]", "[LADO]", "[Recording quality]"],
        "missing": ["[Reg 12]", "[Working Together]", "[SCCIF]", "[Recording quality]"],
        "restraint": ["[Reg 12]", "[Reg 13]", "[Recording quality]", "[SCCIF]"],
        "recording": ["[Recording quality]", "[SCCIF]", "[Reg 13]"],
        "chronology": ["[Recording quality]", "[SCCIF]", "[Reg 13]"],
        "leadership": ["[Reg 13]", "[SCCIF]", "[Reg 12]"],
        "inspection": ["[SCCIF]", "[Reg 13]", "[Reg 12]"],
        "therapeutic": ["[Therapeutic practice]", "[Recording quality]", "[SCCIF]"],
        "medication": ["[Reg 12]", "[Reg 13]", "[Recording quality]", "[Medication / health]"],
        "supervision": ["[Reg 13]", "[Recording quality]"],
        "staffing": ["[Reg 13]", "[SCCIF]"],
        "complaints": ["[Reg 13]", "[SCCIF]", "[Recording quality]"],
        "education_health": ["[SCCIF]", "[Reg 12]"],
        "placement_planning": ["[Reg 12]", "[SCCIF]", "[Reg 13]"],
    }

    TOPIC_CITATION_SUMMARIES: dict[str, dict[str, str]] = {
        "live_safeguarding_incident": {
            "[Reg 12]": "Immediate protection and safeguarding duties.",
            "[Working Together]": "Multi-agency escalation when risk is present.",
            "[Recording quality]": "Contemporaneous rationale and chronology.",
            "[Immediate safeguarding]": "Live incident — least restrictive lawful action.",
            "[Restrictive practice]": "Physical intervention only if necessary and proportionate.",
        },
        "physical_intervention_live": {
            "[Reg 12]": "Protection when considering physical contact.",
            "[Reg 13]": "Management oversight and review.",
            "[Recording quality]": "Antecedent, alternatives, rationale, debrief.",
            "[Restrictive practice]": "Necessity, proportionality, least restrictiveness.",
        },
        "medication": {
            "[Reg 12]": "Protection and health safety.",
            "[Reg 13]": "Management oversight and learning.",
            "[Recording quality]": "MAR/error record and rationale.",
            "[Medication / health]": "Seek appropriate medical/pharmacy advice.",
        },
        "missing": {
            "[Reg 12]": "Protection and safeguarding.",
            "[Working Together]": "Multi-agency safeguarding.",
            "[SCCIF]": "Child experience, safeguarding and leadership impact.",
            "[Recording quality]": "Return conversation and chronology.",
        },
        "therapeutic": {
            "[Therapeutic practice]": "Emotional meaning and co-regulation.",
            "[Recording quality]": "Factual, child-centred wording.",
            "[SCCIF]": "Child experience where relevant.",
        },
    }

    def build_grounding(
        self,
        *,
        message: str,
        mode: str | None = None,
        routing: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        routing = routing or orb_residential_cognition_router.route(message=message, mode=mode)
        topic = routing.get("topic")
        vault_domains = list(routing.get("vault_domains") or [])
        prompt = self.prompt_block(message=message, mode=mode, routing=routing)
        citations = self.citation_payload(message=message, mode=mode, routing=routing)
        return {
            "topic": topic,
            "vault_domains": vault_domains,
            "prompt_block": prompt,
            "citations": citations,
            "depth_level": routing.get("depth_level"),
        }

    def prompt_block(
        self,
        *,
        message: str,
        mode: str | None = None,
        routing: dict[str, Any] | None = None,
    ) -> str:
        routing = routing or orb_residential_cognition_router.route(message=message, mode=mode)
        topic = routing.get("topic")
        vault_domains = routing.get("vault_domains") or []
        if not vault_domains and not routing.get("residential"):
            return ""

        lines = [
            "Knowledge grounding layer (built-in vaults — not live OS records):",
            f"- Detected topic: {topic or 'general residential'}",
            f"- Depth level: {routing.get('depth_level')}",
            "- Relevant vault domains for this answer:",
        ]
        for domain in vault_domains:
            desc = self.VAULT_DESCRIPTIONS.get(domain, "Institutional practice guidance.")
            lines.append(f"  - {domain}: {desc}")
        lines.extend(
            [
                "- Use only vault guidance relevant to this question; do not list generic product sources.",
                "- Prefer inline citation anchors in the answer body over a generic Sources/basis footer.",
            ]
        )
        grounded = orb_grounded_answer_style_service.prompt_block(message, mode=mode)
        if grounded:
            lines.extend(["", grounded])
        official = orb_official_source_anchor_service.source_prompt()
        if official and topic not in (None, "general_residential", "indicare_product"):
            lines.extend(["", official])
        return "\n".join(lines)

    def citation_payload(
        self,
        *,
        message: str,
        mode: str | None = None,
        routing: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        routing = routing or orb_residential_cognition_router.route(message=message, mode=mode)
        topic = routing.get("topic")
        if not routing.get("residential") and not topic:
            return []

        if topic == "indicare_product":
            return []

        labels = list(self.TOPIC_ANCHOR_LABELS.get(topic or "", []))
        if not labels and routing.get("residential"):
            labels = ["[Reg 12]", "[Recording quality]"]

        anchor_by_label = {a["label"]: a for a in orb_grounded_answer_style_service.ANCHORS}
        compact = self.TOPIC_CITATION_SUMMARIES.get(topic or "", {})
        citations: list[dict[str, Any]] = []
        for label in labels:
            anchor = anchor_by_label.get(label)
            summary = compact.get(label)
            if not anchor:
                if summary:
                    citations.append({
                        "id": label.strip("[]").lower().replace(" ", "_"),
                        "label": label,
                        "type": "institutional_practice_anchor",
                        "basis": summary,
                        "note": summary,
                        "live_retrieved": False,
                        "source_integrity": "built_in_anchor_not_verbatim_quote",
                    })
                continue
            summary = compact.get(label)
            citations.append(
                {
                    "id": label.strip("[]").lower().replace(" ", "_"),
                    "label": label,
                    "type": (
                        "therapeutic_practice"
                        if label == "[Therapeutic practice]"
                        else "regulatory_framework"
                    ),
                    "basis": summary or anchor["basis"],
                    "note": summary or anchor["meaning"],
                    "live_retrieved": False,
                    "source_integrity": "built_in_anchor_not_verbatim_quote",
                }
            )
        return citations


orb_knowledge_grounding_service = OrbKnowledgeGroundingService()
