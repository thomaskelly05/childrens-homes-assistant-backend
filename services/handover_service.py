from __future__ import annotations

from typing import Any

from repositories.shift_repository import OperationalSchemaUnavailable, ShiftRepository
from services.shift_service import unavailable_payload


class HandoverService:
    """Shift handover workspace and history service."""

    def __init__(self, repository: ShiftRepository | None = None) -> None:
        self.repository = repository or ShiftRepository()

    def current_handover(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> dict[str, Any]:
        try:
            shift = self.repository.current_shift(conn, current_user, home_id=home_id)
            shift_id = str((shift or {}).get("id") or "")
            items = self.repository.list_handover_items(conn, current_user, shift_id=shift_id or None, home_id=home_id)
            escalations = self.repository.safeguarding_escalations(conn, current_user, home_id=home_id)
            qa_items = self.repository.qa_items(conn, current_user, home_id=home_id)
            return {
                "ok": True,
                "available": True,
                "shift": shift,
                "items": items,
                "timeline": self.timeline(items, escalations, qa_items),
                "summary": {
                    "handover_items": len(items),
                    "follow_up_items": len([item for item in items if item.get("requires_follow_up")]),
                    "safeguarding_reviews": len(escalations),
                    "manager_review_items": len(qa_items),
                },
                "assistant_prompts": [
                    "Summarise safeguarding concerns for my shift.",
                    "What follow-up actions remain?",
                    "What evidence is missing?",
                    "What should management review?",
                ],
            }
        except OperationalSchemaUnavailable as exc:
            conn.rollback()
            return unavailable_payload(exc.feature, exc.table_name)

    def handover_history(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None, limit: int = 20) -> dict[str, Any]:
        try:
            shifts = self.repository.list_shifts(conn, current_user, home_id=home_id, limit=limit)
            return {
                "ok": True,
                "available": True,
                "items": shifts,
                "timeline": [
                    {
                        "id": str(shift.get("shift_session_id") or shift.get("id")),
                        "title": f"{shift.get('shift_type', 'shift')} handover",
                        "date": shift.get("ended_at") or shift.get("started_at") or shift.get("shift_date"),
                        "status": shift.get("shift_status"),
                        "href": f"/handover/history?shift={shift.get('shift_session_id') or shift.get('id')}",
                    }
                    for shift in shifts
                ],
            }
        except OperationalSchemaUnavailable as exc:
            conn.rollback()
            return unavailable_payload(exc.feature, exc.table_name)

    def prepare_handover(self, conn: Any, current_user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        item = self.repository.create_handover_item(conn, current_user, payload)
        return {"ok": True, "item": item}

    def timeline(
        self,
        items: list[dict[str, Any]],
        escalations: list[dict[str, Any]],
        qa_items: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        timeline = [
            {
                "id": item.get("id"),
                "type": "handover_item",
                "title": item.get("title"),
                "body": item.get("details"),
                "priority": item.get("priority"),
                "date": item.get("created_at"),
                "href": f"/handover/current?item={item.get('id')}",
            }
            for item in items
        ]
        timeline.extend(
            {
                "id": item.get("id"),
                "type": "safeguarding_workflow",
                "title": item.get("title"),
                "body": item.get("language_guardrail"),
                "priority": item.get("priority"),
                "date": None,
                "href": item.get("href") or "/safeguarding",
            }
            for item in escalations
        )
        timeline.extend(
            {
                "id": item.get("id"),
                "type": "qa_review",
                "title": item.get("title"),
                "body": "Manager QA review or sign-off required.",
                "priority": item.get("priority"),
                "date": None,
                "href": item.get("href") or "/management",
            }
            for item in qa_items[:10]
        )
        return timeline[:80]
