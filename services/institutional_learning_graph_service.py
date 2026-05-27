from __future__ import annotations

from typing import Any


class InstitutionalLearningGraphService:
    """Transforms operational history into organisational learning signals."""

    def analyse(self, events: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        events = events or []
        repeated_themes: dict[str, int] = {}
        for event in events:
            for theme in event.get("themes", []):
                repeated_themes[theme] = repeated_themes.get(theme, 0) + 1

        emerging = [theme for theme, count in repeated_themes.items() if count >= 2]
        entrenched = [theme for theme, count in repeated_themes.items() if count >= 5]

        return {
            "event_count": len(events),
            "repeated_themes": repeated_themes,
            "emerging_learning_themes": emerging,
            "entrenched_provider_themes": entrenched,
            "learning_questions": [
                "What keeps happening across time or teams?",
                "What actions reduced risk or improved outcomes?",
                "What audits led to meaningful change?",
                "What learning is not yet embedded into practice?",
            ],
        }

    def prompt_addendum(self, events: list[dict[str, Any]] | None = None) -> str:
        data = self.analyse(events)
        lines = [
            "Institutional learning cognition:",
            f"- Event count: {data['event_count']}",
        ]
        if data["emerging_learning_themes"]:
            lines.append("- Emerging themes: " + "; ".join(data["emerging_learning_themes"]))
        if data["entrenched_provider_themes"]:
            lines.append("- Entrenched themes: " + "; ".join(data["entrenched_provider_themes"]))
        lines.append("- Learning questions:")
        for question in data["learning_questions"]:
            lines.append(f"  - {question}")
        return "\n".join(lines)


institutional_learning_graph_service = InstitutionalLearningGraphService()
