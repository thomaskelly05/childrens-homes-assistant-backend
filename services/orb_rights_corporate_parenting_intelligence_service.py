from __future__ import annotations

"""Rights and Corporate Parenting Intelligence for ORB Residential.

Keeps ORB anchored to the child's rights, identity, belonging, advocacy,
aspiration and the principle that corporate parenting is more than process.
ORB prompts reflection; it does not replace statutory decision-makers.
"""

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class RightsCorporateParentingDecision:
    active: bool
    considerations: list[str] = field(default_factory=list)
    prompts: list[str] = field(default_factory=list)
    source_anchors: list[str] = field(default_factory=list)
    boundary: str = "ORB supports rights-aware thinking; statutory responsibilities remain with accountable adults and agencies."

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbRightsCorporateParentingIntelligenceService:
    VERSION = "orb-rights-corporate-parenting-intelligence-v1"

    TRIGGERS = (
        "rights",
        "advocacy",
        "advocate",
        "complaint",
        "not listened",
        "voice",
        "wishes",
        "feelings",
        "identity",
        "culture",
        "religion",
        "race",
        "belonging",
        "family time",
        "contact",
        "aspiration",
        "future",
        "ordinary life",
        "corporate parent",
        "care leaver",
        "independent visitor",
        "iro",
    )

    def evaluate(self, text: str, *, mode: str | None = None, note_type: str | None = None) -> RightsCorporateParentingDecision:
        blob = f"{text or ''} {mode or ''} {note_type or ''}".lower()
        active = any(trigger in blob for trigger in self.TRIGGERS)
        if not active and any(term in blob for term in ("young person", "child", "record", "placement", "care plan")):
            active = True
        if not active:
            return RightsCorporateParentingDecision(active=False)

        considerations = [
            "The child should be heard and helped to influence their care where safe and appropriate.",
            "Complaints, reluctance, silence and behaviour may all be forms of voice requiring curiosity.",
            "Identity, culture, family relationships, belonging and ordinary life opportunities are part of care quality.",
            "Corporate parenting should consider aspiration, stability, safety, relationships and long-term outcomes.",
            "Advocacy or independent support may be relevant where the child is not being heard or needs help to challenge decisions.",
        ]
        prompts = [
            "What does the child want adults to understand?",
            "Has the child's voice been recorded in their words or communication style?",
            "Is advocacy, an independent visitor, IRO oversight or complaints support relevant?",
            "Does this decision support identity, belonging, family relationships and ordinary life where safe?",
            "Would a good parent be satisfied with the warmth, ambition and follow-through shown here?",
            "What changed because the child spoke, complained, withdrew or communicated distress?",
        ]
        return RightsCorporateParentingDecision(
            active=True,
            considerations=considerations,
            prompts=prompts,
            source_anchors=["[Children Act]", "[Corporate parenting]", "[Advocacy]", "[Child voice]", "[Quality Standards]"],
        )

    def context_payload(self, text: str, **kwargs: Any) -> dict[str, Any]:
        payload = self.evaluate(text, **kwargs).to_dict()
        payload["service_version"] = self.VERSION
        return payload

    def prompt_block(self, text: str, **kwargs: Any) -> str:
        decision = self.evaluate(text, **kwargs)
        if not decision.active:
            return ""
        lines = [
            "Rights and Corporate Parenting Intelligence:",
            "- Think beyond compliance: safety, belonging, identity, aspiration and voice.",
            "- Treat complaints, silence, avoidance and behaviour as possible communication, not inconvenience.",
            "- Prompt advocacy or independent support where the child may need help to be heard.",
            "- Do not replace statutory decision-makers, IROs, social workers or local procedures.",
        ]
        lines.extend(f"- {prompt}" for prompt in decision.prompts[:6])
        return "\n".join(lines)


orb_rights_corporate_parenting_intelligence_service = OrbRightsCorporateParentingIntelligenceService()
