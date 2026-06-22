from __future__ import annotations

"""Health and Wellbeing Intelligence for ORB Residential.

Anchors ORB to health, emotional wellbeing, trusted relationships, stability,
participation and transitions for looked-after children. It does not diagnose,
prescribe treatment or replace health professionals.
"""

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class HealthWellbeingDecision:
    active: bool
    considerations: list[str] = field(default_factory=list)
    prompts: list[str] = field(default_factory=list)
    source_anchors: list[str] = field(default_factory=list)
    boundary: str = "ORB supports observation, recording and professional discussion; it does not diagnose or provide clinical treatment advice."

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbHealthWellbeingIntelligenceService:
    VERSION = "orb-health-wellbeing-intelligence-v1"

    TRIGGERS = (
        "health",
        "wellbeing",
        "well-being",
        "camhs",
        "mental health",
        "self-harm",
        "suicide",
        "low mood",
        "anxiety",
        "panic",
        "sleep",
        "eating",
        "medication",
        "doctor",
        "gp",
        "nurse",
        "injury",
        "transition",
        "placement stability",
        "relationship",
        "trusted adult",
        "participation",
        "voice",
        "looked after",
    )

    def evaluate(self, text: str, *, mode: str | None = None, note_type: str | None = None) -> HealthWellbeingDecision:
        blob = f"{text or ''} {mode or ''} {note_type or ''}".lower()
        active = any(trigger in blob for trigger in self.TRIGGERS)
        if not active and any(term in blob for term in ("young person", "child", "missing", "incident", "restraint", "family time")):
            active = True
        if not active:
            return HealthWellbeingDecision(active=False)

        considerations = [
            "Consider the child's physical health, emotional wellbeing and presentation without diagnosing.",
            "Consider whether trusted relationships, belonging and stability have been strengthened or disrupted.",
            "Consider whether the child was able to participate and express wishes, feelings or preferences.",
            "Consider whether transitions, family time, education or peer relationships are affecting wellbeing.",
            "Consider whether manager discussion or health advice is needed under local policy if risk or symptoms are present.",
        ]
        prompts = [
            "What was the child's presentation before, during and after the event?",
            "What did the child say, show or communicate about how they were feeling?",
            "Who is the trusted adult or relationship that may help the child feel safe?",
            "Has placement, education, relationship or emotional stability been affected?",
            "Is CAMHS, GP, NHS 111, emergency health advice or another health professional relevant under local policy?",
            "What follow-up would support wellbeing, participation and stability?",
        ]
        return HealthWellbeingDecision(
            active=True,
            considerations=considerations,
            prompts=prompts,
            source_anchors=["[NICE looked-after children]", "[Health and wellbeing]", "[Placement stability]", "[Working Together]"],
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
            "Health and Wellbeing Intelligence:",
            "- Do not diagnose or give clinical treatment instructions.",
            "- Consider physical health, emotional wellbeing, stability, trusted relationships and participation.",
            "- Prompt appropriate health or crisis routes where the information suggests risk, symptoms or immediate concern.",
            "- Record observations, the child's words/presentation, actions taken and follow-up needed.",
        ]
        lines.extend(f"- {prompt}" for prompt in decision.prompts[:6])
        return "\n".join(lines)


orb_health_wellbeing_intelligence_service = OrbHealthWellbeingIntelligenceService()
