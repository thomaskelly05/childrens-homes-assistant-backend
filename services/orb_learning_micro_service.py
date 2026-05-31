from __future__ import annotations

"""Micro-learning convergence for ORB Residential.

Turns ORB answers into short learning artefacts without building a separate academy.
"""

from typing import Any


LEARNING_FORMATS = {
    "five_minute_session": "5-minute learning session",
    "staff_briefing": "staff briefing",
    "reflective_supervision": "reflective supervision prompt",
    "knowledge_check": "knowledge check",
    "scenario": "scenario learning",
    "cpd_note": "CPD note",
    "team_exercise": "team learning exercise",
}


class OrbLearningMicroService:
    def detect(self, message: str, *, mode: str | None = None) -> bool:
        text = f"{message or ''} {mode or ''}".lower()
        triggers = (
            "5-minute",
            "5 minute",
            "learning session",
            "staff briefing",
            "knowledge check",
            "turn this into",
            "cpd note",
            "team learning",
            "micro-learning",
            "micro learning",
            "scenario learning",
            "reflective supervision prompt",
        )
        return any(t in text for t in triggers)

    def detect_format(self, message: str) -> str:
        text = (message or "").lower()
        if "briefing" in text:
            return "staff_briefing"
        if "knowledge check" in text or "quiz" in text:
            return "knowledge_check"
        if "supervision" in text:
            return "reflective_supervision"
        if "scenario" in text:
            return "scenario"
        if "cpd" in text:
            return "cpd_note"
        if "team" in text:
            return "team_exercise"
        return "five_minute_session"

    def prompt_block(self, message: str, *, prior_answer: str | None = None) -> str:
        if not self.detect(message):
            return ""
        fmt = self.detect_format(message)
        label = LEARNING_FORMATS.get(fmt, "learning session")
        lines = [
            f"ORB Learning Micro-format: {label}",
            "- Convert the preceding ORB guidance into a practical learning artefact for residential staff.",
            "- Use clear headings, short bullets, one practice example, and 2–4 discussion or reflection questions.",
            "- Include safeguarding and child voice prompts; do not invent incidents or names.",
            "- Suitable for team briefing, supervision or CPD — not a formal qualification assessment.",
            "- Suggest saving as a team learning note if the user wants to keep it.",
        ]
        if prior_answer:
            lines.append("- Base the learning session on this prior ORB answer:")
            lines.append(prior_answer.strip()[:3000])
        return "\n".join(lines)

    def build_structure(self, message: str, *, topic: str | None = None) -> dict[str, Any]:
        fmt = self.detect_format(message)
        return {
            "format": fmt,
            "label": LEARNING_FORMATS.get(fmt, "learning session"),
            "sections": [
                "Learning objective",
                "Key messages (3–5)",
                "Practice example",
                "Discussion or reflection questions",
                "Safeguarding reminder",
                "What to take back to practice",
            ],
            "topic": topic or "professional practice",
            "standalone": True,
            "template_id": "micro_learning_session",
        }

    def metadata(self, message: str) -> dict[str, Any]:
        active = self.detect(message)
        return {
            "active": active,
            "format": self.detect_format(message) if active else None,
            "display_labels": ["Learn"] if active else [],
            "reasoning_lenses": ["Academy / Learning"],
            "vault_domains": ["academy", "learning"],
            "active_brains": ["learning_micro_cognition"] if active else [],
            "standalone": True,
            "os_records_accessed": False,
        }


orb_learning_micro_service = OrbLearningMicroService()
