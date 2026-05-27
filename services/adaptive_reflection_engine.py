from __future__ import annotations

from typing import Any


class AdaptiveReflectionEngine:
    """Adaptive reflective practice cognition.

    Helps ORB support long-term professional development rather than
    one-off answers.
    """

    THEMES = {
        "oversight": ("sign off", "review", "oversight", "manager", "audit"),
        "repair": ("repair", "reconnect", "apology", "rupture"),
        "child_voice": ("voice", "wishes", "feelings", "choice"),
        "de_escalation": ("calm", "de-escalate", "regulated", "co-regulation"),
        "recording_quality": ("record", "wording", "factual", "child-centred"),
        "staff_pressure": ("tired", "burnout", "overwhelmed", "fatigue"),
    }

    def analyse(self, text: str) -> dict[str, Any]:
        lower = str(text or "").lower()
        active = {
            key: [term for term in values if term in lower]
            for key, values in self.THEMES.items()
        }
        active = {k: v for k, v in active.items() if v}
        return {
            "reflection_themes": active,
            "coaching_prompts": self._prompts(active),
            "development_focus": self._focus(active),
        }

    def prompt_addendum(self, text: str) -> str:
        data = self.analyse(text)
        lines = ["Adaptive reflection cognition:"]
        if data["reflection_themes"]:
            for theme, hits in data["reflection_themes"].items():
                lines.append(f"- {theme}: {'; '.join(hits)}")
        lines.append("- Coaching prompts:")
        for prompt in data["coaching_prompts"]:
            lines.append(f"  - {prompt}")
        return "\n".join(lines)

    def _prompts(self, active: dict[str, list[str]]) -> list[str]:
        prompts: list[str] = []
        if "oversight" in active:
            prompts.append("How visible would leadership review be to another professional?")
        if "repair" in active:
            prompts.append("Has emotional repair happened after conflict or rupture?")
        if "child_voice" in active:
            prompts.append("What would the child say about this situation?")
        if "de_escalation" in active:
            prompts.append("What helped regulate the situation safely?")
        if "recording_quality" in active:
            prompts.append("Is the wording factual, respectful and evidence-led?")
        if "staff_pressure" in active:
            prompts.append("Does the team need debrief or emotional support?")
        if not prompts:
            prompts.append("What learning or reflection opportunity exists here?")
        return prompts

    def _focus(self, active: dict[str, list[str]]) -> list[str]:
        if not active:
            return ["general reflective development"]
        return list(active.keys())


adaptive_reflection_engine = AdaptiveReflectionEngine()
