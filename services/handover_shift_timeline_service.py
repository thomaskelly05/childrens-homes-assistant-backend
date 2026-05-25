"""Shift timeline / chronology link foundation for completed handovers."""

from __future__ import annotations

import logging
from typing import Any

from schemas.handover_drafts import HandoverDraftRecord

logger = logging.getLogger("indicare.handover_shift_timeline")

PENDING_TIMELINE_STEP = (
    "Review shift timeline linking when formal handover route is wired."
)


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _actor_id(current_user: dict[str, Any]) -> int | None:
    try:
        value = current_user.get("user_id") or current_user.get("id")
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


class HandoverShiftTimelineService:
    """Link completed handovers to chronology when a formal record exists."""

    def timeline_supported(self, draft: HandoverDraftRecord, formal_response: dict[str, Any]) -> bool:
        return bool(
            draft.child_id
            and formal_response.get("formal_record_created")
            and formal_response.get("formal_record_id")
        )

    def route_hint(self, draft: HandoverDraftRecord) -> str | None:
        if draft.child_id:
            return f"/young-people/{draft.child_id}/journey"
        return "/handover"

    def build_timeline_metadata(
        self, draft: HandoverDraftRecord, formal_response: dict[str, Any]
    ) -> dict[str, Any]:
        return {
            "draft_id": draft.id,
            "child_id": draft.child_id,
            "formal_record_id": formal_response.get("formal_record_id"),
            "shift_label": draft.shift_label,
            "workspace_only": not formal_response.get("formal_record_created"),
            "route_hint": self.route_hint(draft),
        }

    def create_or_prepare_link(
        self,
        draft: HandoverDraftRecord,
        formal_response: dict[str, Any],
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> dict[str, Any]:
        if not self.timeline_supported(draft, formal_response):
            return {
                "timeline_linked": False,
                "linked_timeline_id": None,
                "next_steps": [PENDING_TIMELINE_STEP],
                "route_hint": self.route_hint(draft),
            }
        if conn is None or not draft.child_id:
            return {
                "timeline_linked": False,
                "linked_timeline_id": None,
                "next_steps": [PENDING_TIMELINE_STEP],
            }

        record_id = formal_response.get("formal_record_id")
        try:
            from services.young_people_linking_service import YoungPeopleLinkingService

            workflow = YoungPeopleLinkingService.process_record_event(
                conn,
                young_person_id=int(draft.child_id),
                source_table="handover_records",
                source_id=int(record_id),
                event_type="approved",
                title=f"Handover: {draft.title}",
                summary=_text(draft.body, draft.title)[:2000],
                narrative=None,
                category="handover",
                subcategory=draft.shift_label or "shift",
                significance="medium",
                created_by=_actor_id(current_user),
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": bool(draft.manager_review_required),
                    "safeguarding": bool(draft.safeguarding_review_required),
                    "link_support_plans": False,
                    "link_monthly_reviews": False,
                    "link_quality_standards": True,
                },
                metadata={
                    "handover_draft_id": draft.id,
                    "workspace_completion": True,
                    "no_raw_body": True,
                },
            )
            conn.commit()
            chronology_id = workflow.get("chronology_event_id")
            if chronology_id:
                return {
                    "timeline_linked": True,
                    "linked_timeline_id": str(chronology_id),
                    "next_steps": ["Chronology event linked from formal handover record."],
                    "route_hint": self.route_hint(draft),
                }
        except Exception as exc:
            logger.debug("handover_timeline_link_skipped: %s", exc)
            try:
                conn.rollback()
            except Exception:
                pass

        return {
            "timeline_linked": False,
            "linked_timeline_id": None,
            "next_steps": [PENDING_TIMELINE_STEP],
            "route_hint": self.route_hint(draft),
        }


handover_shift_timeline_service = HandoverShiftTimelineService()
