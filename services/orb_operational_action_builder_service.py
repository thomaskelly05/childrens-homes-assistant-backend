"""Operational ORB draft actions and recommendations — explicit persistence only."""

from __future__ import annotations

import uuid
from typing import Any

from schemas.intelligence_actions import IntelligenceActionCreate
from schemas.orb_operational import (
    OrbOperationalActionsCreateRequest,
    OrbOperationalBriefing,
    OrbOperationalDraftAction,
    OrbOperationalRecommendation,
    OrbOperationalRequest,
)

from services.orb_operational_context_service import orb_operational_context_bridge

_SEVERITY_TO_PRIORITY = {
    "info": "low",
    "low": "low",
    "medium": "medium",
    "high": "high",
    "urgent": "urgent",
}


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _wants_actions(message: str, mode: str) -> bool:
    lower = message.lower()
    if mode in {"action_priority"}:
        return True
    return any(
        phrase in lower
        for phrase in (
            "create action",
            "draft action",
            "what should i prioritise",
            "what should i prioritize",
            "action plan",
            "prioritise",
            "prioritize",
        )
    )


def _wants_briefing(message: str, mode: str) -> bool:
    lower = message.lower()
    if mode in {"manager_daily_brief", "governance_briefing"}:
        return "briefing" in lower or mode == "manager_daily_brief"
    return any(phrase in lower for phrase in ("briefing", "manager briefing", "handover brief"))


class OrbOperationalActionBuilderService:
    """Convert operational answers into draft actions — no auto-persist on chat."""

    def build_recommendations(
        self,
        context: dict[str, Any],
        answer: str,
        request: OrbOperationalRequest | Any,
    ) -> list[OrbOperationalRecommendation]:
        _ = answer
        raw = orb_operational_context_bridge.build_recommendations(context, request)
        return [OrbOperationalRecommendation.model_validate(item) for item in raw]

    def build_draft_actions(
        self,
        recommendations: list[OrbOperationalRecommendation],
        request: OrbOperationalRequest | Any,
    ) -> list[OrbOperationalDraftAction]:
        drafts: list[OrbOperationalDraftAction] = []
        for rec in recommendations[:8]:
            priority = rec.priority if rec.priority in _SEVERITY_TO_PRIORITY.values() else "medium"
            review_required = rec.review_required or priority in {"high", "urgent"}
            drafts.append(
                OrbOperationalDraftAction(
                    title=rec.title,
                    description=_text(rec.summary),
                    priority=priority,  # type: ignore[arg-type]
                    source=", ".join(rec.source_labels[:3]) or self.action_source_from_context({}),
                    due_label="Within 7 days" if priority in {"high", "urgent"} else "This week",
                    owner_label="Registered manager",
                    review_required=review_required,
                    evidence_basis=rec.rationale,
                    standalone_only=False,
                    os_linked=True,
                )
            )
        if _wants_actions(_text(getattr(request, "message", None)), _text(getattr(request, "mode", None))) and not drafts:
            drafts.append(
                OrbOperationalDraftAction(
                    title="Review Intelligence Actions board",
                    description="Open proposed intelligence actions for your scope and accept or defer.",
                    priority="medium",
                    source=self.action_source_from_context({}),
                    due_label="Today",
                    owner_label="Registered manager",
                    review_required=True,
                    evidence_basis="Operational ORB action priority mode",
                )
            )
        return drafts

    def build_review_prompts(
        self,
        recommendations: list[OrbOperationalRecommendation],
        request: OrbOperationalRequest | Any,
    ) -> list[dict[str, Any]]:
        context = {"summary": {}}
        return orb_operational_context_bridge.build_review_prompts(context, request)

    def priority_from_severity(self, severity: str) -> str:
        return _SEVERITY_TO_PRIORITY.get(severity, "medium")

    def action_source_from_context(self, context: dict[str, Any]) -> str:
        scope = _text(context.get("scope") or context.get("mode"), "operational_orb")
        return f"operational_orb:{scope}"

    def build_briefing(
        self,
        context: dict[str, Any],
        answer: str,
        request: OrbOperationalRequest | Any,
        *,
        evaluation: dict[str, Any] | None = None,
        force: bool = False,
    ) -> OrbOperationalBriefing | None:
        if not force and not _wants_briefing(
            _text(getattr(request, "message", None)), _text(getattr(request, "mode", None))
        ):
            return None

        summary = context.get("summary")
        if hasattr(summary, "model_dump"):
            summary_data = summary.model_dump()
        elif isinstance(summary, dict):
            summary_data = summary
        else:
            summary_data = {}

        key_points = list(summary_data.get("summary_lines") or [])[:6]
        key_points.extend((summary_data.get("themes") or [])[:4])
        risks = list(summary_data.get("safeguarding_signals") or [])[:4]
        risks.extend((summary_data.get("ofsted_evidence_notes") or [])[:3])
        actions = list(summary_data.get("attention_items") or [])[:6]
        sources = [_text(s.get("label")) for s in orb_operational_context_bridge.safe_context_sources(context)[:8]]
        citations = [
            {
                "label": s.get("label"),
                "source_type": s.get("source_type"),
                "basis": (s.get("basis") or "")[:240],
            }
            for s in orb_operational_context_bridge.safe_context_sources(context)[:8]
        ]

        return OrbOperationalBriefing(
            title=f"Manager briefing — {_text(summary_data.get('headline'), 'Operational summary')[:80]}",
            summary=answer.split("\n", 1)[0][:400] if answer else _text(summary_data.get("headline")),
            key_points=[_text(p) for p in key_points if p][:10],
            risks=[_text(r) for r in risks if r][:8],
            actions=[_text(a) for a in actions if a][:8],
            sources=[s for s in sources if s],
            citations=citations,
            evaluation=evaluation,
            created_from_mode=_text(getattr(request, "mode", None)),
            context_scope=_text(getattr(request, "scope", None)),
        )

    def build_follow_up_actions(self, context: dict[str, Any], request: Any) -> list[dict[str, Any]]:
        from schemas.orb_operational import OrbOperationalFollowUpAction

        follow_ups: list[dict[str, Any]] = []
        mode = _text(getattr(request, "mode", None))
        routes = {
            "manager_daily_brief": "/command-centre",
            "safeguarding_themes": "/intelligence-spine",
            "record_quality_review": "/intelligence-spine",
            "ofsted_evidence_review": "/governance",
            "action_priority": "/intelligence-actions",
            "staff_support": "/staff",
            "child_journey_summary": "/young-people",
            "governance_briefing": "/governance",
        }
        route = routes.get(mode, "/assistant/orb")
        follow_ups.append(
            OrbOperationalFollowUpAction(
                label="Open relevant OS area",
                route=route,
                action_type="navigate",
            ).model_dump()
        )
        if context.get("raw_available"):
            follow_ups.append(
                OrbOperationalFollowUpAction(
                    label="Review Intelligence Actions",
                    route="/intelligence-actions",
                    action_type="review",
                ).model_dump()
            )
        return follow_ups

    def enrich_response_fields(
        self,
        *,
        context: dict[str, Any],
        answer: str,
        request: OrbOperationalRequest,
        audit_reference: str | None = None,
        evaluation: dict[str, Any] | None = None,
        current_user: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        recommendations = self.build_recommendations(context, answer, request)
        draft_actions = self.build_draft_actions(recommendations, request)
        if not _wants_actions(request.message, request.mode):
            draft_actions = draft_actions[:2]

        briefing = self.build_briefing(context, answer, request, evaluation=evaluation)

        return {
            "context_cards": orb_operational_context_bridge.build_context_cards(context, request),
            "evidence_items": orb_operational_context_bridge.build_evidence_items(context, request),
            "recommendations": [r.model_dump() for r in recommendations],
            "draft_actions": [d.model_dump() for d in draft_actions],
            "review_prompts": orb_operational_context_bridge.build_review_prompts(context, request),
            "audit_summary": orb_operational_context_bridge.build_audit_summary(
                context,
                request,
                audit_reference=audit_reference,
                current_user=current_user,
            ),
            "context_status": orb_operational_context_bridge.build_context_status(context, request),
            "follow_up_actions": self.build_follow_up_actions(context, request),
            "briefing": briefing.model_dump() if briefing else None,
            "save_available": bool(
                briefing
                or draft_actions
                or recommendations
                or answer
            ),
            "action_creation_available": True,
        }

    def create_actions_from_drafts(
        self,
        drafts: list[OrbOperationalDraftAction],
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
        home_id: int | None = None,
        child_id: int | None = None,
        staff_id: int | None = None,
    ) -> dict[str, Any]:
        from services.intelligence_action_service import intelligence_action_service

        created_ids: list[str] = []
        errors: list[str] = []
        for draft in drafts:
            action_type = "manager_signoff"
            if "safeguarding" in draft.title.lower():
                action_type = "safeguarding_review"
            elif "record" in draft.title.lower() and "quality" in draft.title.lower():
                action_type = "record_quality_review"
            elif "ofsted" in draft.title.lower() or "evidence" in draft.title.lower():
                action_type = "ofsted_evidence_strengthening"

            payload = IntelligenceActionCreate(
                home_id=str(home_id) if home_id else None,
                child_id=str(child_id) if child_id else None,
                staff_id=str(staff_id) if staff_id else None,
                action_type=action_type,  # type: ignore[arg-type]
                title=draft.title,
                summary=draft.description,
                priority=draft.priority,  # type: ignore[arg-type]
                source_service="operational_orb",
                reason=draft.evidence_basis,
                suggested_next_step=draft.due_label,
                owner_role="registered_manager",
            )
            try:
                record = intelligence_action_service.create_action(
                    payload,
                    current_user=current_user,
                    conn=conn,
                )
                created_ids.append(record.id)
            except Exception as exc:
                errors.append(f"{draft.title}: {exc}")

        return {
            "created_ids": created_ids,
            "errors": errors,
            "persistence_available": intelligence_action_service.persistence_available(),
            "notice": "Actions are proposed for manager review — not automatically accepted.",
        }

    def draft_only_from_request(
        self,
        request: OrbOperationalActionsCreateRequest | Any,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> list[OrbOperationalDraftAction]:
        _ = current_user, conn
        if hasattr(request, "drafts") and request.drafts:
            return list(request.drafts)
        return []


orb_operational_action_builder_service = OrbOperationalActionBuilderService()
