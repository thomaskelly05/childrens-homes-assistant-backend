from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from schemas.orb import OrbContext, OrbModeDecision
from services.orb_tool_router import tools_for_decision


ToolIntent = Literal["read", "navigate", "draft", "external", "confirm_required"]


@dataclass
class OrbToolAction:
    name: str
    intent: ToolIntent
    status: Literal["planned", "ready", "blocked"] = "planned"
    requires_confirmation: bool = False
    requires_citations: bool = False
    target: dict[str, Any] = field(default_factory=dict)
    spoken_summary: str | None = None

    def model_dump(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "intent": self.intent,
            "status": self.status,
            "requires_confirmation": self.requires_confirmation,
            "requires_citations": self.requires_citations,
            "target": self.target,
            "spoken_summary": self.spoken_summary,
        }


class OrbToolOrchestrationService:
    """Converts routed intent into safe conversational tool actions.

    This layer describes and prepares OS actions. It deliberately does not write
    records; write-like actions remain draft/preview/confirmation only.
    """

    def plan_turn(
        self,
        *,
        decision: OrbModeDecision,
        message: str,
        context: OrbContext,
        memory_snapshot: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        manifest = tools_for_decision(decision, message)
        actions = [self._action_from_tool(tool, message, context, memory_snapshot or {}) for tool in manifest]
        primary = self._primary_action(actions, message)
        return {
            "manifest": manifest,
            "actions": [action.model_dump() for action in actions],
            "primary_action": primary.model_dump() if primary else None,
            "writeback_policy": {
                "silent_writeback_allowed": False,
                "preview_required": True,
                "confirmation_required": any(action.requires_confirmation for action in actions),
                "audit_required": any(action.requires_confirmation for action in actions),
            },
        }

    def _action_from_tool(
        self,
        tool: dict[str, Any],
        message: str,
        context: OrbContext,
        memory_snapshot: dict[str, Any],
    ) -> OrbToolAction:
        name = str(tool.get("name"))
        requires_confirmation = bool(tool.get("requires_confirmation"))
        requires_citations = bool(tool.get("requires_citations"))
        lower = message.lower()
        target = self._target_for_message(lower, context, memory_snapshot)

        if requires_confirmation or name.endswith("_draft") or "draft" in name:
            return OrbToolAction(
                name=name,
                intent="draft",
                status="ready",
                requires_confirmation=True,
                requires_citations=requires_citations,
                target=target,
                spoken_summary="I can prepare a draft and ask before anything is saved.",
            )
        if name.startswith("open_") or "open it" in lower:
            return OrbToolAction(
                name=name,
                intent="navigate",
                status="ready" if target else "blocked",
                requires_confirmation=False,
                requires_citations=False,
                target=target,
                spoken_summary="I can open the relevant workspace.",
            )
        if tool.get("category") == "current_facts":
            return OrbToolAction(
                name=name,
                intent="external",
                status="ready",
                requires_confirmation=False,
                requires_citations=False,
                target={},
                spoken_summary="I will use configured live tools for that.",
            )
        return OrbToolAction(
            name=name,
            intent="read",
            status="ready",
            requires_confirmation=False,
            requires_citations=requires_citations,
            target=target,
            spoken_summary="I will look at the permitted records.",
        )

    @staticmethod
    def _target_for_message(lower: str, context: OrbContext, memory_snapshot: dict[str, Any]) -> dict[str, Any]:
        pinned = memory_snapshot.get("pinned") or {}
        last_record = memory_snapshot.get("last_record") or pinned.get("active_record") or {}
        active_child = pinned.get("active_child") or {}
        target: dict[str, Any] = {}
        if context.home_id:
            target["home_id"] = context.home_id
        if context.selected_young_person_id:
            target["young_person_id"] = context.selected_young_person_id
        elif active_child.get("id"):
            target["young_person_id"] = active_child.get("id")
        if context.selected_record_id:
            target["record_id"] = context.selected_record_id
            target["record_type"] = context.selected_record_type
        elif any(term in lower for term in ("that incident", "the incident", "open it", "earlier one")) and last_record:
            target["record_id"] = last_record.get("id") or last_record.get("source_id")
            target["record_type"] = last_record.get("type") or last_record.get("source_type")
        return {key: value for key, value in target.items() if value not in (None, "", [], {})}

    @staticmethod
    def _primary_action(actions: list[OrbToolAction], message: str) -> OrbToolAction | None:
        lower = message.lower()
        if "open" in lower:
            return next((action for action in actions if action.intent == "navigate"), None) or (actions[0] if actions else None)
        if any(term in lower for term in ("create", "draft", "write", "start a", "follow-up action")):
            return next((action for action in actions if action.intent == "draft"), None) or (actions[0] if actions else None)
        return actions[0] if actions else None


orb_tool_orchestration_service = OrbToolOrchestrationService()
