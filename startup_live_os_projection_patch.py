from __future__ import annotations

import logging
from typing import Any

from repositories.os_repository_utils import array_text, isoformat, normalise_priority, normalise_severity, normalise_status, safe_int
from repositories.safeguarding_repository import safeguarding_repository

logger = logging.getLogger(__name__)

OPEN_SAFEGUARDING_STATES = {
    "draft",
    "submitted",
    "manager_review",
    "action_required",
    "escalated",
    "external_notification",
    "monitoring",
}


def _safeguarding_records(conn: Any, current_user: dict[str, Any], filters: dict[str, Any], limit: int) -> list[Any]:
    try:
        return safeguarding_repository.list(
            conn,
            current_user=current_user,
            filters={
                "home_id": filters.get("home_id"),
                "young_person_id": filters.get("young_person_id"),
                "lifecycle_state": filters.get("lifecycle_state"),
            },
            limit=max(1, min(int(limit or 250), 600)),
        )
    except Exception:
        logger.warning("Could not project safeguarding records into OS live views", exc_info=True)
        return []


def _safeguarding_to_evidence(record: Any) -> dict[str, Any]:
    rid = str(record.id)
    return {
        "id": f"safeguarding:{rid}",
        "source_type": "safeguarding",
        "source_id": rid,
        "original_table": "safeguarding_domain_records",
        "original_id": rid,
        "title": record.title or "Safeguarding evidence",
        "description": record.concern_summary or record.immediate_actions or "Safeguarding record available for review.",
        "evidence_type": "safeguarding_record",
        "young_person_id": str(record.young_person_id) if record.young_person_id is not None else None,
        "home_id": str(record.home_id) if record.home_id is not None else None,
        "linked_regulation": "Safeguarding / Regulation 12",
        "linked_report_ids": [],
        "created_by": str(record.created_by) if record.created_by is not None else None,
        "created_at": record.created_at or "",
        "quality": "review_required" if record.lifecycle_state in OPEN_SAFEGUARDING_STATES else "adequate",
        "tags": [
            "safeguarding",
            "helped_and_protected",
            str(record.concern_category or "safeguarding"),
            str(record.lifecycle_state or "open"),
        ],
        "metadata": {
            "lifecycle_state": record.lifecycle_state,
            "severity": record.severity,
            "external_notification_required": record.external_notification_required,
            "external_notification_at": record.external_notification_at,
            "review_due_at": record.review_due_at,
            "child_voice_present": bool(record.child_voice),
            "chronology_event_ids": record.chronology_event_ids,
            "evidence_ids": record.evidence_ids,
            "linked_action_ids": record.linked_action_ids,
        },
    }


def _safeguarding_to_action(record: Any) -> dict[str, Any] | None:
    state = str(record.lifecycle_state or "").lower()
    needs_action = (
        state in OPEN_SAFEGUARDING_STATES
        or bool(record.external_notification_required and not record.external_notification_at)
        or bool(record.review_due_at)
        or not bool(record.child_voice)
    )
    if not needs_action:
        return None

    rid = str(record.id)
    title = "Review safeguarding record"
    if record.external_notification_required and not record.external_notification_at:
        title = "Complete external safeguarding notification"
    elif not record.child_voice:
        title = "Record child voice for safeguarding concern"
    elif state == "action_required":
        title = "Complete safeguarding follow-up action"

    description_parts = [record.concern_summary or "Safeguarding record requires review."]
    if record.immediate_actions:
        description_parts.append(f"Immediate actions: {record.immediate_actions}")
    if record.review_due_at:
        description_parts.append(f"Review due: {record.review_due_at}")

    priority = "urgent" if str(record.severity).lower() == "critical" else "high" if str(record.severity).lower() == "high" else "medium"
    return {
        "id": f"safeguarding_action:{rid}",
        "source_type": "safeguarding",
        "source_id": rid,
        "source_table": "safeguarding_domain_records",
        "original_table": "safeguarding_domain_records",
        "original_id": rid,
        "title": title,
        "description": " ".join(description_parts),
        "summary": " ".join(description_parts),
        "status": normalise_status("open" if state in OPEN_SAFEGUARDING_STATES else state),
        "priority": normalise_priority(priority),
        "due_date": record.review_due_at,
        "assigned_to_staff_id": "",
        "assigned_role": "registered_manager",
        "young_person_id": str(record.young_person_id) if record.young_person_id is not None else None,
        "home_id": str(record.home_id) if record.home_id is not None else None,
        "regulation": "Safeguarding / Regulation 12",
        "evidence_required": ["manager_review", "child_voice", "external_notification"] if record.external_notification_required else ["manager_review", "child_voice"],
        "evidence_ids": array_text(record.evidence_ids),
        "created_at": record.created_at,
        "updated_at": record.updated_at,
        "completed_at": record.resolved_at,
        "metadata": {
            "lifecycle_state": record.lifecycle_state,
            "severity": record.severity,
            "chronology_event_ids": record.chronology_event_ids,
            "linked_action_ids": record.linked_action_ids,
        },
    }


def apply() -> None:
    try:
        import repositories.evidence_repository as evidence_repo
        import repositories.actions_repository as actions_repo
    except Exception:
        logger.warning("Could not import OS repositories for live projection patch", exc_info=True)
        return

    original_evidence = evidence_repo.list_evidence
    original_actions = actions_repo.list_actions

    if not getattr(original_evidence, "_indicare_safeguarding_projection_patched", False):
        def patched_list_evidence(conn: Any, *, current_user: dict[str, Any], filters: dict[str, Any] | None = None, limit: int = 250) -> list[dict[str, Any]]:
            filters_in = filters or {}
            items = original_evidence(conn, current_user=current_user, filters=filters_in, limit=limit)
            records = _safeguarding_records(conn, current_user, filters_in, limit)
            projected = [_safeguarding_to_evidence(record) for record in records]
            existing_ids = {str(item.get("id")) for item in items}
            for item in projected:
                if item["id"] not in existing_ids:
                    items.append(item)
            items.sort(key=lambda item: item.get("created_at") or "", reverse=True)
            return items[: max(1, min(int(limit or 250), 600))]

        patched_list_evidence._indicare_safeguarding_projection_patched = True  # type: ignore[attr-defined]
        evidence_repo.list_evidence = patched_list_evidence

    if not getattr(original_actions, "_indicare_safeguarding_projection_patched", False):
        def patched_list_actions(conn: Any, *, current_user: dict[str, Any], filters: dict[str, Any] | None = None, limit: int = 250) -> list[dict[str, Any]]:
            filters_in = filters or {}
            items = original_actions(conn, current_user=current_user, filters=filters_in, limit=limit)
            records = _safeguarding_records(conn, current_user, filters_in, limit)
            projected = [item for item in (_safeguarding_to_action(record) for record in records) if item]
            existing_ids = {str(item.get("id")) for item in items}
            for item in projected:
                if item["id"] not in existing_ids:
                    items.append(item)
            items.sort(key=lambda item: (item.get("status") != "overdue", item.get("due_date") or "9999-12-31", item.get("created_at") or ""))
            return items[: max(1, min(int(limit or 250), 600))]

        patched_list_actions._indicare_safeguarding_projection_patched = True  # type: ignore[attr-defined]
        actions_repo.list_actions = patched_list_actions

    workspace_repo = __import__("sys").modules.get("repositories.workspaces_repository")
    if workspace_repo is not None:
        setattr(workspace_repo, "list_evidence", evidence_repo.list_evidence)
        setattr(workspace_repo, "list_actions", actions_repo.list_actions)


apply()
