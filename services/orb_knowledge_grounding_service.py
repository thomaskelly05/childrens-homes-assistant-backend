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
            if not anchor:
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
