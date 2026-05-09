from __future__ import annotations

from typing import Any

from services.indicare_ai_memory_service import IndiCareAIMemoryService
from services.indicare_ai_orchestrator_service import IndiCareAIOrchestratorService


class IndiCareAICrossSystemService:
    """Cross-system reasoning for the standalone IndiCare AI suite.

    This service intentionally stays inside IndiCare AI. It does not create an OS layer.
    It combines orchestrated context, long-term memory and longitudinal insight into
    one operational reasoning packet for the assistant.
    """

    def __init__(self) -> None:
        self.orchestrator = IndiCareAIOrchestratorService()
        self.memory = IndiCareAIMemoryService()

    def build_operational_picture(
        self,
        *,
        question: str,
        current_user: dict[str, Any],
        project_id: str | None = None,
        young_person_id: int | None = None,
        home_id: int | None = None,
        limit: int = 8,
    ) -> dict[str, Any]:
        context = self.orchestrator.build_context(
            question=question,
            current_user=current_user,
            project_id=project_id,
            young_person_id=young_person_id,
            home_id=home_id,
            limit=limit,
        )
        memory_context = self.memory.prompt_context(
            current_user=current_user,
            project_id=project_id,
            home_id=home_id,
            young_person_id=young_person_id,
            limit=8,
        )
        insights = self.memory.operational_insights(
            current_user=current_user,
            project_id=project_id,
            home_id=home_id,
            young_person_id=young_person_id,
            limit=80,
        )
        cards = insights.get("cards") or []
        cross_system_prompt = self._compose_cross_system_prompt(
            question=question,
            context_prompt=context.get("prompt_context") or "",
            memory_context=memory_context,
            insight_cards=cards,
        )
        return {
            "ok": True,
            "surface": "indicare_ai_standalone_tools",
            "mode": "cross_system_operational_reasoning",
            "project_id": project_id or context.get("project_id"),
            "home_id": home_id or context.get("home_id"),
            "young_person_id": young_person_id or context.get("young_person_id"),
            "context": context,
            "memory_context": memory_context,
            "insights": insights,
            "prompt_context": cross_system_prompt,
            "sources": (context.get("sources") or []) + [
                {"label": "long_term_memory", "ok": bool(memory_context)},
                {"label": "longitudinal_insights", "ok": True},
            ],
        }

    def _compose_cross_system_prompt(
        self,
        *,
        question: str,
        context_prompt: str,
        memory_context: str,
        insight_cards: list[dict[str, Any]],
    ) -> str:
        lines = [
            "INDICARE CROSS-SYSTEM OPERATIONAL REASONING:",
            "Use this as a unified operational picture for the standalone IndiCare AI suite.",
            "Reason across chronology, documents, Connect, proactive intelligence, continuity memory, meetings and assistant context where available.",
            "Do not overclaim. Treat patterns as signals for professional reflection unless the underlying evidence clearly supports stronger wording.",
            "For safeguarding-sensitive issues, separate facts, concerns, missing information and next actions. Do not make final threshold decisions.",
            "Respond conversationally, calmly and with reflective operational intelligence.",
            "",
            f"User request: {question}",
            "",
        ]
        if context_prompt:
            lines.extend(["ORCHESTRATED SYSTEM CONTEXT:", context_prompt[:35000], ""])
        if memory_context:
            lines.extend([memory_context[:12000], ""])
        if insight_cards:
            lines.append("LONGITUDINAL OPERATIONAL INSIGHT CARDS:")
            for card in insight_cards[:8]:
                lines.append(
                    f"- [{card.get('level')}] {card.get('title')}: {card.get('message')} Why: {card.get('why')}"
                )
            lines.append("")
        lines.append("Now produce a joined-up operational response. Keep it human, practical and reflective.")
        return "\n".join(lines)
