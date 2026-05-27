from __future__ import annotations

from typing import Any


class ReflectiveGuidanceEngine:
    """Reflective practice guidance for ORB.

    Generates emotionally intelligent prompts designed to encourage curiosity,
    emotional awareness, child-centred thinking and safer reflection.
    """

    def build(self, *, scenario: str, mode: str = "general") -> dict[str, Any]:
        lower = str(scenario or "").lower()
        prompts = self._base_prompts()
        if any(term in lower for term in ("restraint", "hold", "physical intervention")):
            prompts.extend([
                "How did the child appear emotionally before the intervention?",
                "What helped reduce risk afterwards?",
                "What repair or reflection may now be needed?",
            ])
        if any(term in lower for term in ("missing", "abscond", "away from home")):
            prompts.extend([
                "What may the child have been communicating through leaving?",
                "What protective relationships are strongest around this child?",
                "What might help the child feel emotionally safer returning?",
            ])
        if any(term in lower for term in ("staff", "burnout", "tired", "overwhelmed")):
            prompts.extend([
                "What support might the adults themselves need right now?",
                "Has emotional fatigue started affecting decision-making or containment?",
            ])

        return {
            "mode": mode,
            "tone": "calm_reflective_therapeutic",
            "prompts": list(dict.fromkeys(prompts))[:12],
            "principles": [
                "Promote curiosity over judgement.",
                "Focus on the child's lived experience.",
                "Encourage emotionally containing reflection.",
                "Support accountability without shame.",
            ],
        }

    def prompt_addendum(self, *, scenario: str, mode: str = "general") -> str:
        data = self.build(scenario=scenario, mode=mode)
        lines = [
            "Reflective guidance engine:",
            f"- Tone: {data['tone']}",
            "- Reflective prompts:",
        ]
        for prompt in data["prompts"][:6]:
            lines.append(f"  - {prompt}")
        return "\n".join(lines)

    def _base_prompts(self) -> list[str]:
        return [
            "What may the child have been feeling in that moment?",
            "What helped the situation feel safer or calmer?",
            "What does the child need adults to understand here?",
            "How would the child describe this experience?",
            "What follow-up support or repair may now be needed?",
            "What should the next adult understand from this reflection?",
        ]


reflective_guidance_engine = ReflectiveGuidanceEngine()
