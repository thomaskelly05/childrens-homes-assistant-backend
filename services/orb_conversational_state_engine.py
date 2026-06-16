from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class OrbConversationState:
    tone: str
    unresolved_themes: tuple[str, ...] = field(default_factory=tuple)
    coaching_focus: tuple[str, ...] = field(default_factory=tuple)
    safeguarding_attention: bool = False
    reflective_continuity: tuple[str, ...] = field(default_factory=tuple)
    next_best_follow_up: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbConversationalStateEngine:
    """Maintains reflective continuity across ORB conversations.

    This is not persistent storage yet. It creates a conversation-state frame from
    current message/history so ORB behaves more relationally and less like a
    stateless chatbot.
    """

    THEME_TERMS = {
        "safeguarding": ("safeguarding", "allegation", "missing", "harm", "risk", "police", "lado"),
        "recording_quality": ("record", "wording", "daily note", "incident report", "child voice"),
        "therapeutic_reflection": ("trauma", "behaviour", "repair", "co-regulation", "shame", "dysregulated"),
        "oversight": ("manager", "review", "sign off", "action", "oversight", "audit"),
        "staff_wellbeing": ("staff", "burnout", "tired", "overwhelmed", "debrief", "supervision"),
        "ofsted_evidence": ("ofsted", "sccif", "inspection", "reg 44", "reg 45", "evidence"),
    }

    def build(self, message: str, *, history: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        text = self._combined_text(message, history or [])
        lower = text.lower()
        themes = tuple(theme for theme, terms in self.THEME_TERMS.items() if any(term in lower for term in terms))
        state = OrbConversationState(
            tone=self._tone(lower),
            unresolved_themes=themes,
            coaching_focus=self._coaching_focus(themes),
            safeguarding_attention="safeguarding" in themes,
            reflective_continuity=self._reflective_continuity(themes),
            next_best_follow_up=self._follow_up(themes),
        )
        return state.to_dict()

    def prompt_addendum(self, message: str, *, history: list[dict[str, Any]] | None = None) -> str:
        state = self.build(message, history=history)
        lines = [
            "ORB conversational state:",
            f"- Tone: {state['tone']}",
            f"- Safeguarding attention: {state['safeguarding_attention']}",
        ]
        if state["unresolved_themes"]:
            lines.append("- Unresolved themes: " + "; ".join(state["unresolved_themes"]))
        if state["coaching_focus"]:
            lines.append("- Coaching focus: " + "; ".join(state["coaching_focus"]))
        if state["next_best_follow_up"]:
            lines.append("- Next best follow-up: " + "; ".join(state["next_best_follow_up"][:4]))
        return "\n".join(lines)

    def _combined_text(self, message: str, history: list[dict[str, Any]]) -> str:
        parts = [str(message or "")]
        for item in history[-8:]:
            if isinstance(item, dict):
                parts.append(str(item.get("content") or item.get("message") or ""))
        return "\n".join(parts)

    def _tone(self, lower: str) -> str:
        if any(term in lower for term in ("urgent", "unsafe", "allegation", "police", "harm", "missing")):
            return "calm_clear_safeguarding_priority"
        if any(term in lower for term in ("upset", "overwhelmed", "burnout", "distressed", "dysregulated")):
            return "emotionally_containing_reflective"
        return "calm_practical_reflective"

    def _coaching_focus(self, themes: tuple[str, ...]) -> tuple[str, ...]:
        mapping = {
            "safeguarding": "safe escalation and evidence preservation",
            "recording_quality": "factual child-centred recording",
            "therapeutic_reflection": "co-regulation and repair",
            "oversight": "manager review and action ownership",
            "staff_wellbeing": "debrief and emotionally safe practice",
            "ofsted_evidence": "inspection evidence preparation and impact",
        }
        return tuple(mapping[theme] for theme in themes if theme in mapping)

    def _reflective_continuity(self, themes: tuple[str, ...]) -> tuple[str, ...]:
        if not themes:
            return ("Keep the response practical and invite one useful next reflection.",)
        return tuple(f"Continue the {theme.replace('_', ' ')} thread without sounding repetitive." for theme in themes)

    def _follow_up(self, themes: tuple[str, ...]) -> tuple[str, ...]:
        questions: list[str] = []
        if "safeguarding" in themes:
            questions.append("What is known, unknown and time-critical?")
        if "recording_quality" in themes:
            questions.append("Would you like ORB to rewrite this into professional wording?")
        if "therapeutic_reflection" in themes:
            questions.append("What might the child have been communicating underneath the behaviour?")
        if "oversight" in themes:
            questions.append("Who owns the next action and when will it be reviewed?")
        if "staff_wellbeing" in themes:
            questions.append("Does the adult or team need debrief before the next shift?")
        if "ofsted_evidence" in themes:
            questions.append("What evidence shows impact rather than activity?")
        return tuple(questions or ["What would be most helpful to think through next?"])


orb_conversational_state_engine = OrbConversationalStateEngine()
