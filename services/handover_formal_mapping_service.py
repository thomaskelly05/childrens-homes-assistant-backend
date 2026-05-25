"""Formal handover record mapping — honest, child-scoped only when clearly safe."""

from __future__ import annotations

import logging
from typing import Any

from repositories.os_repository_utils import table_exists
from schemas.handover_drafts import HandoverDraftRecord, HandoverFormalTarget

logger = logging.getLogger("indicare.handover_formal_mapping")

FORMAL_NOT_WIRED_WARNING = "Formal handover record is not wired yet."
YOUNG_PERSON_RECORD_TYPE = "handover_records"


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _build_summary_from_draft(draft: HandoverDraftRecord) -> str:
    parts: list[str] = []
    if draft.body:
        parts.append(draft.body.strip())
    for section in draft.sections or []:
        title = _text(section.get("title") if isinstance(section, dict) else None)
        body = _text(section.get("body") if isinstance(section, dict) else None)
        if body:
            parts.append(f"{title}:\n{body}" if title else body)
    return "\n\n".join(parts).strip() or draft.title


class HandoverFormalMappingService:
    """Map approved workspace drafts to formal young-person handover_records when safe."""

    def get_target(self, draft: HandoverDraftRecord) -> HandoverFormalTarget:
        can_create, record_type, hint, warnings, steps = self._assess(draft)
        return HandoverFormalTarget(
            draft_id=draft.id,
            can_create_formal_record=can_create,
            formal_status="not_attempted" if can_create else "not_wired",
            formal_record_type=record_type,
            route_hint=hint,
            warnings=warnings,
            next_steps=steps,
        )

    def can_create_formal_record(self, draft: HandoverDraftRecord) -> bool:
        return self._assess(draft)[0]

    def _assess(
        self, draft: HandoverDraftRecord
    ) -> tuple[bool, str | None, str | None, list[str], list[str]]:
        warnings: list[str] = []
        steps: list[str] = []
        if not draft.child_id:
            warnings.append(FORMAL_NOT_WIRED_WARNING)
            steps.append("Link draft to a young person to enable formal handover_records mapping.")
            return False, None, "/young-people", warnings, steps
        if draft.scope not in ("child", "home", "shift"):
            warnings.append(FORMAL_NOT_WIRED_WARNING)
            return False, None, None, warnings, steps
        summary = _build_summary_from_draft(draft)
        if not summary:
            warnings.append("Add handover narrative before creating a formal record.")
            return False, YOUNG_PERSON_RECORD_TYPE, None, warnings, steps
        steps.append(
            f"Formal record will use workspace narrative only — not auto-imported intelligence."
        )
        hint = f"/young-people/{draft.child_id}/handover"
        return True, YOUNG_PERSON_RECORD_TYPE, hint, warnings, steps

    def build_formal_payload(self, draft: HandoverDraftRecord) -> dict[str, Any]:
        return {
            "young_person_id": int(draft.child_id),
            "title": draft.title,
            "summary_text": _build_summary_from_draft(draft),
            "shift_type": (draft.shift_label or "day").lower().replace(" ", "_")[:32] or "day",
            "status": "approved",
            "source": "handover_workspace_draft",
            "draft_id": draft.id,
        }

    def create_formal_record(
        self,
        draft: HandoverDraftRecord,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> dict[str, Any]:
        target = self.get_target(draft)
        if not target.can_create_formal_record:
            return self.normalise_formal_response(
                {
                    "formal_record_created": False,
                    "formal_status": "not_wired",
                    "warnings": target.warnings or [FORMAL_NOT_WIRED_WARNING],
                    "next_steps": target.next_steps,
                }
            )
        if conn is None:
            return self.normalise_formal_response(
                {
                    "formal_record_created": False,
                    "formal_status": "not_wired",
                    "warnings": [FORMAL_NOT_WIRED_WARNING],
                }
            )
        try:
            if not table_exists(conn, "handover_records"):
                return self.normalise_formal_response(
                    {
                        "formal_record_created": False,
                        "formal_status": "not_wired",
                        "warnings": [FORMAL_NOT_WIRED_WARNING],
                    }
                )
        except Exception as exc:
            logger.debug("formal_handover_table_check_failed: %s", exc)
            return self.normalise_formal_response(
                {
                    "formal_record_created": False,
                    "formal_status": "not_wired",
                    "warnings": [FORMAL_NOT_WIRED_WARNING],
                }
            )

        payload = self.build_formal_payload(draft)
        actor_id = current_user.get("id") or current_user.get("user_id")
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO handover_records (
                        young_person_id,
                        handover_date,
                        shift_type,
                        title,
                        summary_text,
                        status,
                        source_window_start,
                        source_window_end,
                        generated_by,
                        approved_by,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        %s,
                        CURRENT_DATE,
                        %s,
                        %s,
                        %s,
                        %s,
                        NOW() - INTERVAL '1 day',
                        NOW(),
                        %s,
                        %s,
                        NOW(),
                        NOW()
                    )
                    RETURNING id
                    """,
                    (
                        payload["young_person_id"],
                        payload["shift_type"],
                        payload["title"],
                        payload["summary_text"],
                        payload["status"],
                        actor_id,
                        actor_id,
                    ),
                )
                row = cur.fetchone()
            conn.commit()
            record_id = str(row[0]) if row else None
            if not record_id:
                return self.normalise_formal_response(
                    {
                        "formal_record_created": False,
                        "formal_status": "failed",
                        "warnings": ["Formal handover insert did not return an id."],
                    }
                )
            return self.normalise_formal_response(
                {
                    "formal_record_created": True,
                    "formal_record_id": record_id,
                    "formal_record_type": YOUNG_PERSON_RECORD_TYPE,
                    "formal_status": "created",
                    "warnings": [],
                    "next_steps": ["Formal young-person handover record created from workspace narrative."],
                }
            )
        except Exception as exc:
            logger.warning("formal_handover_create_failed: %s", exc)
            try:
                conn.rollback()
            except Exception:
                pass
            return self.normalise_formal_response(
                {
                    "formal_record_created": False,
                    "formal_status": "failed",
                    "warnings": [f"Formal handover creation failed: {exc}"],
                }
            )

    def normalise_formal_response(self, result: dict[str, Any]) -> dict[str, Any]:
        warnings = list(result.get("warnings") or [])
        if not result.get("formal_record_created") and FORMAL_NOT_WIRED_WARNING not in warnings:
            if result.get("formal_status") in ("not_wired", None):
                warnings.append(FORMAL_NOT_WIRED_WARNING)
        return {
            "formal_record_created": bool(result.get("formal_record_created")),
            "formal_record_id": result.get("formal_record_id"),
            "formal_record_type": result.get("formal_record_type"),
            "formal_status": result.get("formal_status") or "not_attempted",
            "warnings": warnings,
            "next_steps": list(result.get("next_steps") or []),
        }

    def route_hint(self, draft: HandoverDraftRecord) -> str | None:
        return self.get_target(draft).route_hint

    def build_next_steps(
        self, draft: HandoverDraftRecord, formal_response: dict[str, Any]
    ) -> list[str]:
        steps = list(formal_response.get("next_steps") or [])
        if formal_response.get("formal_record_created"):
            steps.append("Open young-person handover history to view the formal record.")
        elif draft.child_id:
            steps.append("Workspace handover completed without formal record.")
        else:
            steps.append("Add a young person to the draft if a formal record is required.")
        return steps


handover_formal_mapping_service = HandoverFormalMappingService()
