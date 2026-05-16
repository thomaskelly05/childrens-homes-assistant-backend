from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import (
    build_scope_where,
    can_write_records,
    current_home_id,
    current_provider_id,
    current_user_id,
    first_col,
    is_manager,
    normalise_priority,
    normalise_status,
    quote_ident,
    safe_int,
    table_columns,
    table_exists,
)
from services.operational_lifecycle_service import operational_lifecycle_service
from services.operational_memory_repository import operational_memory_repository
from services.realtime_event_bus import realtime_event_bus


ENTITY_TABLES: dict[str, list[str]] = {
    "daily_record": ["daily_notes", "os_young_person_care_records", "universal_records"],
    "daily_log": ["daily_notes", "os_young_person_care_records", "universal_records"],
    "incident": ["incidents", "universal_records"],
    "safeguarding": ["safeguarding_records", "universal_records"],
    "risk_assessment": ["risk_assessments", "risk_reviews", "universal_records"],
    "action": ["universal_tasks", "tasks", "manager_actions", "monthly_review_actions", "inspection_improvement_actions", "reg44_report_actions"],
    "document": ["document_intelligence_jobs", "statutory_documents", "documents", "child_documents", "reg44_report_imports"],
    "reg44": ["reg44_report_imports", "document_intelligence_jobs", "statutory_documents"],
    "report": ["ai_generated_reports", "reports", "reg45_reports", "ofsted_reports"],
    "reg45": ["reg45_reports", "ai_generated_reports", "reports"],
    "lac_review": ["ai_generated_reports", "reports"],
    "evidence": ["os_evidence_links", "inspection_evidence_facts", "os_inspection_evidence_notes", "reg44_report_evidence_items", "record_standard_links"],
}

SOURCE_TYPE_TABLES: dict[str, str] = {
    "task": "tasks",
    "universal_task": "universal_tasks",
    "manager_action": "manager_actions",
    "monthly_review_action": "monthly_review_actions",
    "inspection_improvement_action": "inspection_improvement_actions",
    "reg44_report_action": "reg44_report_actions",
    "daily_log": "daily_notes",
    "incident": "incidents",
    "safeguarding": "safeguarding_records",
    "risk_assessment": "risk_assessments",
    "risk_review": "risk_reviews",
    "document": "documents",
    "statutory_document": "statutory_documents",
    "child_document": "child_documents",
    "document_intelligence_job": "document_intelligence_jobs",
    "reg44_import": "reg44_report_imports",
    "ai_generated_report": "ai_generated_reports",
    "report": "reports",
    "reg45_report": "reg45_reports",
    "ofsted_report": "ofsted_reports",
    "record_evidence_link": "os_evidence_links",
}

STATUS_BY_ENTITY: dict[str, dict[str, str]] = {
    "operational_state": {
        "open": "open",
        "acknowledge": "acknowledged",
        "acknowledged": "acknowledged",
        "assign": "acknowledged",
        "review": "in_review",
        "start_review": "in_review",
        "in_review": "in_review",
        "resolve": "resolved",
        "resolved": "resolved",
        "reopen": "reopened",
        "reopened": "reopened",
        "escalate": "escalated",
        "escalated": "escalated",
        "archive": "archived",
        "archived": "archived",
        "sign_off": "resolved",
    },
    "action": {
        "complete": "completed",
        "completed": "completed",
        "reopen": "open",
        "assign": "in_progress",
        "escalate": "in_progress",
        "mark_overdue": "overdue",
        "attach_evidence": "in_progress",
        "management_sign_off": "completed",
        "sign_off": "completed",
    },
    "daily_record": {
        "save_draft": "draft",
        "submit": "submitted",
        "manager_review": "manager_review",
        "request_amendment": "returned",
        "approve": "approved",
        "lock": "locked",
        "approve_lock": "locked",
    },
    "daily_log": {
        "save_draft": "draft",
        "submit": "submitted",
        "manager_review": "manager_review",
        "request_amendment": "returned",
        "approve": "approved",
        "lock": "locked",
        "approve_lock": "locked",
    },
    "incident": {
        "draft": "draft",
        "submit": "submitted",
        "submitted": "submitted",
        "manager_reviewed": "manager_reviewed",
        "safeguarding_reviewed": "safeguarding_reviewed",
        "close": "closed",
        "closed": "closed",
        "reopen": "reopened",
    },
    "safeguarding": {
        "concern_raised": "concern_raised",
        "reviewed": "reviewed",
        "escalated": "escalated",
        "external_referral": "external_referral",
        "closed": "closed",
        "close": "closed",
    },
    "risk_assessment": {
        "draft": "draft",
        "active": "active",
        "review_due": "review_due",
        "reviewed": "reviewed",
        "archived": "archived",
        "archive": "archived",
    },
    "report": {
        "draft_generated": "draft",
        "manager_review": "manager_review",
        "ri_review": "ri_review",
        "approved": "approved",
        "approve": "approved",
        "archived": "archived",
        "exported": "exported",
        "archived_exported": "archived",
    },
    "document": {
        "uploaded": "uploaded",
        "processing": "processing",
        "review_required": "review_required",
        "approved": "approved",
        "archived": "archived",
    },
    "evidence": {
        "review_quality": "review_required",
        "accepted": "strong",
        "gap_identified": "review_required",
    },
}

MANAGER_TRANSITIONS = {
    "manager_review",
    "manager_reviewed",
    "safeguarding_reviewed",
    "management_sign_off",
    "sign_off",
    "approve",
    "approved",
    "approve_lock",
    "lock",
    "close",
    "closed",
    "archived",
    "archive",
    "ri_review",
    "signoff",
    "sign_off",
}


def _normalise_transition(value: Any) -> str:
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def _split_record_id(record_id: str) -> tuple[str | None, str]:
    source_type, separator, raw_id = str(record_id).partition(":")
    if separator:
        return source_type, raw_id
    return None, str(record_id)


def _row_to_jsonable(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    output: dict[str, Any] = {}
    for key, value in row.items():
        if isinstance(value, (datetime,)):
            output[key] = value.isoformat()
        else:
            output[key] = value
    return output


def _fetch_row(conn: Any, *, table_name: str, raw_id: str, current_user: dict[str, Any]) -> dict[str, Any] | None:
    if not table_exists(conn, table_name):
        return None
    cols = table_columns(conn, table_name)
    if "id" not in cols:
        return None
    where, params = build_scope_where(cols, current_user)
    where.append("id::text = %s")
    params.append(raw_id)
    where_sql = "WHERE " + " AND ".join(where)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(f"SELECT * FROM public.{quote_ident(table_name)} {where_sql} LIMIT 1", tuple(params))
        row = cur.fetchone()
    return dict(row) if row else None


def _resolve_record(conn: Any, *, entity_type: str, record_id: str, payload: dict[str, Any], current_user: dict[str, Any]) -> tuple[str, str, dict[str, Any]]:
    source_type, raw_id = _split_record_id(record_id)
    preferred = payload.get("original_table") or payload.get("source_table")
    candidates: list[str] = []
    if isinstance(preferred, str) and preferred in {table for tables in ENTITY_TABLES.values() for table in tables}:
        candidates.append(preferred)
    if source_type and SOURCE_TYPE_TABLES.get(source_type):
        candidates.append(SOURCE_TYPE_TABLES[source_type])
    candidates.extend(ENTITY_TABLES.get(entity_type, []))

    seen: set[str] = set()
    for table_name in candidates:
        if table_name in seen:
            continue
        seen.add(table_name)
        row = _fetch_row(conn, table_name=table_name, raw_id=raw_id, current_user=current_user)
        if row is not None:
            return table_name, raw_id, row

    raise HTTPException(status_code=404, detail=f"{entity_type.replace('_', ' ').title()} record not found.")


def _insert_audit_event(
    conn: Any,
    *,
    action: str,
    table_name: str,
    raw_id: str,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    notes: str | None,
    current_user: dict[str, Any],
    metadata: dict[str, Any],
) -> str | None:
    if not table_exists(conn, "os_audit_events"):
        return None
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO public.os_audit_events (
              provider_id, home_id, actor_user_id, action, entity_table, entity_id,
              previous_state, new_state, reason, metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, %s::jsonb)
            RETURNING id
            """,
            (
                current_provider_id(current_user),
                (after or before or {}).get("home_id") or current_home_id(current_user),
                current_user_id(current_user),
                action,
                table_name,
                raw_id,
                Json(before) if before is not None else None,
                Json(after) if after is not None else None,
                notes,
                Json(metadata),
            ),
        )
        row = cur.fetchone()
    return str(row["id"]) if row else None


def _insert_chronology_event(
    conn: Any,
    *,
    event_type: str,
    title: str,
    summary: str | None,
    table_name: str,
    raw_id: str,
    row: dict[str, Any],
    current_user: dict[str, Any],
    metadata: dict[str, Any],
) -> str | None:
    if not table_exists(conn, "os_chronology_events"):
        return None
    source_id = safe_int(raw_id)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO public.os_chronology_events (
              provider_id, home_id, young_person_id, staff_id, event_type, event_title,
              event_summary, event_at, source_table, source_id, sccif_area, regulation_refs,
              created_by, metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s::jsonb)
            RETURNING id
            """,
            (
                row.get("provider_id") or current_provider_id(current_user),
                row.get("home_id") or current_home_id(current_user),
                row.get("young_person_id"),
                row.get("staff_id") or row.get("author_id") or row.get("created_by"),
                event_type,
                title,
                summary,
                table_name,
                source_id,
                row.get("sccif_area"),
                row.get("regulation_refs") or [],
                current_user_id(current_user),
                Json(metadata),
            ),
        )
        inserted = cur.fetchone()
    return str(inserted["id"]) if inserted else None


def _insert_workflow_event(
    conn: Any,
    *,
    entity_type: str,
    raw_id: str,
    transition: str,
    status: str,
    table_name: str,
    row: dict[str, Any],
    notes: str | None,
    current_user: dict[str, Any],
    metadata: dict[str, Any],
) -> str | None:
    if not table_exists(conn, "record_workflow_events"):
        return None
    cols = table_columns(conn, "record_workflow_events")
    event: dict[str, Any] = {}
    for column, value in {
        "entity_type": entity_type,
        "entity_id": raw_id,
        "record_type": entity_type,
        "record_id": raw_id,
        "source_table": table_name,
        "source_id": safe_int(raw_id),
        "event_type": transition,
        "status": status,
        "workflow_status": status,
        "label": transition.replace("_", " ").title(),
        "description": notes,
        "summary": notes,
        "notes": notes,
        "home_id": row.get("home_id") or current_home_id(current_user),
        "provider_id": row.get("provider_id") or current_provider_id(current_user),
        "young_person_id": row.get("young_person_id"),
        "created_by": current_user_id(current_user),
        "event_at": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "metadata": metadata,
    }.items():
        if column in cols and value is not None:
            event[column] = value
    if not event:
        return None
    columns = list(event)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO public.record_workflow_events ({", ".join(quote_ident(col) for col in columns)})
            VALUES ({", ".join(["%s"] * len(columns))})
            RETURNING id
            """,
            tuple(Json(event[col]) if col == "metadata" else event[col] for col in columns),
        )
        inserted = cur.fetchone()
    return str(inserted["id"]) if inserted else None


def _status_for(entity_type: str, transition: str, payload: dict[str, Any]) -> str:
    if payload.get("status"):
        return str(payload["status"])
    mapping = STATUS_BY_ENTITY.get(entity_type) or STATUS_BY_ENTITY.get(entity_type.replace("_record", "_log")) or {}
    return mapping.get(transition) or operational_lifecycle_service.status_for_transition(transition) or normalise_status(transition)


def _update_columns(
    *,
    cols: set[str],
    transition: str,
    status: str,
    payload: dict[str, Any],
    current_user: dict[str, Any],
) -> tuple[list[str], list[Any]]:
    updates: list[str] = []
    params: list[Any] = []
    touched: set[str] = set()

    def set_col(column: str | None, value: Any) -> None:
        if column and column in cols and column not in touched and value is not None:
            updates.append(f"{quote_ident(column)} = %s")
            params.append(value)
            touched.add(column)

    set_col(first_col(cols, ["status", "workflow_status", "manager_review_status", "approval_status"]), status)
    if "review_state" in cols and transition in {"manager_review", "manager_reviewed", "request_amendment", "approve", "approved", "approve_lock"}:
        review_state = "completed" if transition in {"approve", "approved", "approve_lock"} else status
        set_col("review_state", review_state)
    if transition in {"assign", "escalate"}:
        set_col(first_col(cols, ["assigned_to_user_id", "assigned_to", "owner_user_id", "owner_id", "staff_id"]), safe_int(payload.get("assigned_to_staff_id") or payload.get("assigned_to_user_id")))
        set_col("assigned_role", payload.get("assigned_role"))
    if transition in {"acknowledge", "acknowledged"} or status == "acknowledged":
        set_col(first_col(cols, ["acknowledged_by", "acknowledged_by_user_id"]), current_user_id(current_user))
        if "acknowledged_at" in cols and "acknowledged_at" not in touched:
            updates.append("acknowledged_at = NOW()")
            touched.add("acknowledged_at")
    if transition in {"review", "start_review", "in_review", "manager_review"} or status == "in_review":
        set_col(first_col(cols, ["reviewed_by", "reviewer_id", "manager_reviewed_by"]), current_user_id(current_user))
        set_col(first_col(cols, ["review_notes", "manager_review_notes", "review_comment"]), payload.get("review_notes") or payload.get("notes") or payload.get("comment"))
        for timestamp_col in ["reviewed_at", "review_started_at", "manager_reviewed_at"]:
            if timestamp_col in cols and timestamp_col not in touched:
                updates.append(f"{quote_ident(timestamp_col)} = NOW()")
                touched.add(timestamp_col)
                break
    if transition in {"resolve", "resolved"} or status == "resolved":
        set_col(first_col(cols, ["resolved_by", "resolved_by_user_id"]), current_user_id(current_user))
        set_col(first_col(cols, ["resolution_reason", "resolution_notes"]), payload.get("resolution_reason") or payload.get("reason") or payload.get("notes"))
        if "resolved_at" in cols and "resolved_at" not in touched:
            updates.append("resolved_at = NOW()")
            touched.add("resolved_at")
    if transition in {"escalate", "escalated"} or status == "escalated":
        set_col(first_col(cols, ["escalated_by", "escalated_by_user_id"]), current_user_id(current_user))
        set_col(first_col(cols, ["escalation_reason", "escalation_notes"]), payload.get("escalation_reason") or payload.get("reason") or payload.get("notes"))
        set_col("escalation_level", payload.get("escalation_level") or payload.get("priority") or payload.get("severity"))
        if "escalated_at" in cols and "escalated_at" not in touched:
            updates.append("escalated_at = NOW()")
            touched.add("escalated_at")
    if payload.get("due_date") or payload.get("due_at"):
        set_col(first_col(cols, ["due_date", "due_at", "target_date", "action_due_date"]), payload.get("due_date") or payload.get("due_at"))
    if transition in {"complete", "completed", "management_sign_off", "sign_off", "close", "closed"} or status in {"completed", "closed"}:
        set_col(first_col(cols, ["completed_by", "completed_by_user_id"]), current_user_id(current_user))
        if "completed_at" in cols and "completed_at" not in touched:
            updates.append("completed_at = NOW()")
            touched.add("completed_at")
    if transition in {"approve", "approved", "approve_lock", "management_sign_off", "sign_off"} or status in {"approved", "locked"}:
        set_col(first_col(cols, ["approved_by", "reviewed_by", "signed_off_by"]), current_user_id(current_user))
        for timestamp_col in ["approved_at", "reviewed_at", "signed_off_at", "locked_at"]:
            if timestamp_col in cols and timestamp_col not in touched:
                updates.append(f"{quote_ident(timestamp_col)} = NOW()")
                touched.add(timestamp_col)
                if timestamp_col != "locked_at":
                    break
    if transition in {"reopen", "reopened"} or status == "reopened":
        for column in ["completed_at", "closed_at", "approved_at", "locked_at", "resolved_at", "signed_off_at"]:
            if column in cols and column not in touched:
                updates.append(f"{quote_ident(column)} = NULL")
                touched.add(column)
    set_col(first_col(cols, ["updated_by", "updated_by_user_id"]), current_user_id(current_user))
    if "updated_at" in cols and "updated_at" not in touched:
        updates.append("updated_at = NOW()")
        touched.add("updated_at")
    return updates, params


def transition_record(conn: Any, *, entity_type: str, record_id: str, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
    if not can_write_records(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to update workflow records.")

    transition = _normalise_transition(payload.get("transition") or payload.get("action") or payload.get("event_type"))
    if not transition:
        raise HTTPException(status_code=400, detail="Workflow transition is required.")
    if transition in MANAGER_TRANSITIONS and not is_manager(current_user):
        raise HTTPException(status_code=403, detail="This workflow transition requires manager permissions.")

    table_name, raw_id, before = _resolve_record(conn, entity_type=entity_type, record_id=record_id, payload=payload, current_user=current_user)
    cols = table_columns(conn, table_name)
    status = _status_for(entity_type, transition, payload)
    updates, params = _update_columns(cols=cols, transition=transition, status=status, payload=payload, current_user=current_user)
    if not updates:
        raise HTTPException(status_code=400, detail="No compatible workflow fields are available for this record.")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            UPDATE public.{quote_ident(table_name)}
            SET {", ".join(updates)}
            WHERE id::text = %s
            RETURNING *
            """,
            tuple(params + [raw_id]),
        )
        after_row = cur.fetchone()
    if not after_row:
        raise HTTPException(status_code=404, detail="Record not found.")

    after = dict(after_row)
    notes = payload.get("notes") or payload.get("comment")
    lifecycle_context = operational_lifecycle_service.build_transition_context(
        entity_type=entity_type,
        entity_id=record_id,
        transition=transition,
        status=status,
        payload=payload,
        current_user=current_user,
    )
    metadata = {
        **(payload.get("metadata") or {}),
        "transition": transition,
        "status": status,
        "entity_type": entity_type,
        "record_id": record_id,
        "lifecycle": lifecycle_context,
    }
    workflow_event_id = _insert_workflow_event(
        conn,
        entity_type=entity_type,
        raw_id=raw_id,
        transition=transition,
        status=status,
        table_name=table_name,
        row=after,
        notes=notes,
        current_user=current_user,
        metadata=metadata,
    )
    chronology_event_id = _insert_chronology_event(
        conn,
        event_type=f"{entity_type}.{transition}",
        title=f"{entity_type.replace('_', ' ').title()} {transition.replace('_', ' ')}",
        summary=notes or f"Workflow status changed to {status}.",
        table_name=table_name,
        raw_id=raw_id,
        row=after,
        current_user=current_user,
        metadata={**metadata, "workflow_event_id": workflow_event_id},
    )
    audit_event_id = _insert_audit_event(
        conn,
        action=f"{entity_type}.{transition}",
        table_name=table_name,
        raw_id=raw_id,
        before=_row_to_jsonable(before),
        after=_row_to_jsonable(after),
        notes=notes,
        current_user=current_user,
        metadata={**metadata, "workflow_event_id": workflow_event_id, "chronology_event_id": chronology_event_id},
    )
    operational_memory_ids: dict[str, str | None] = {}
    if table_exists(conn, "operational_lifecycle_history"):
        operational_memory_ids = operational_memory_repository.append_lifecycle_transition(
            conn,
            current_user=current_user,
            entity_type=entity_type,
            entity_id=record_id,
            previous_state=_row_to_jsonable(before),
            next_state=_row_to_jsonable(after),
            transition_type=transition,
            lifecycle_context=lifecycle_context,
            correlation_id=payload.get("correlation_id") or payload.get("request_id"),
        )
    home_id = after.get("home_id") or current_home_id(current_user)
    if home_id:
        try:
            awareness = operational_lifecycle_service.build_realtime_awareness_event(
                home_id=home_id,
                entity_type=entity_type,
                entity_id=record_id,
                status=status,
                transition=transition,
            ).model_dump(mode="json")
            realtime_event_bus.publish(
                event_type=awareness["event_type"],
                home_id=home_id,
                actor=current_user,
                payload=awareness,
                dedupe_key=awareness.get("dedupe_key"),
                throttle_key=f"{home_id}:operational_state.lifecycle",
            )
        except Exception:
            pass

    return {
        "entity_type": entity_type,
        "record_id": record_id,
        "source_table": table_name,
        "source_id": raw_id,
        "transition": transition,
        "status": status,
        "updated_record": _row_to_jsonable(after),
        "workflow_event_id": workflow_event_id,
        "chronology_event_id": chronology_event_id,
        "audit_event_id": audit_event_id,
        "operational_memory_ids": operational_memory_ids,
        "lifecycle": lifecycle_context,
    }


def create_comment(conn: Any, *, entity_type: str, record_id: str, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
    if not can_write_records(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to comment on records.")
    body = str(payload.get("body") or payload.get("comment") or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="Comment body is required.")

    table_name, raw_id, row = _resolve_record(conn, entity_type=entity_type, record_id=record_id, payload=payload, current_user=current_user)
    comment = {
        "entity_type": entity_type,
        "record_id": record_id,
        "body": body,
        "mentions": payload.get("mentions") or [],
        "created_by": current_user_id(current_user),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    workflow_event_id = _insert_workflow_event(
        conn,
        entity_type=entity_type,
        raw_id=raw_id,
        transition="comment_added",
        status=str(row.get("status") or "comment"),
        table_name=table_name,
        row=row,
        notes=body,
        current_user=current_user,
        metadata=comment,
    )
    audit_event_id = _insert_audit_event(
        conn,
        action=f"{entity_type}.comment_added",
        table_name=table_name,
        raw_id=raw_id,
        before=None,
        after=comment,
        notes=body,
        current_user=current_user,
        metadata={"workflow_event_id": workflow_event_id, "mentions": payload.get("mentions") or []},
    )
    return {**comment, "workflow_event_id": workflow_event_id, "audit_event_id": audit_event_id}


def create_review_request(conn: Any, *, entity_type: str, record_id: str, payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
    if not can_write_records(current_user):
        raise HTTPException(status_code=403, detail="You do not have permission to request reviews.")
    if not table_exists(conn, "universal_tasks"):
        raise HTTPException(status_code=400, detail="Universal task queue is not available in this schema.")

    table_name, raw_id, row = _resolve_record(conn, entity_type=entity_type, record_id=record_id, payload=payload, current_user=current_user)
    title = str(payload.get("title") or f"Review {entity_type.replace('_', ' ')}").strip()
    priority = normalise_priority(payload.get("priority") or "medium")
    if priority == "urgent":
        priority = "critical"
    insert = {
        "provider_id": row.get("provider_id") or current_provider_id(current_user),
        "home_id": row.get("home_id") or current_home_id(current_user),
        "young_person_id": row.get("young_person_id"),
        "task_type": "review_request",
        "title": title,
        "description": payload.get("description") or payload.get("notes"),
        "recommended_action": payload.get("recommended_action") or "Review the linked operational record and record your decision.",
        "priority": priority,
        "status": "open",
        "due_at": payload.get("due_at") or payload.get("due_date"),
        "assigned_to": safe_int(payload.get("assigned_to_user_id") or payload.get("assigned_to_staff_id")),
        "assigned_role": payload.get("assigned_role") or "manager",
        "manager_review_related": True,
        "source_table": table_name,
        "source_id": raw_id,
        "created_by": current_user_id(current_user),
        "metadata": {"entity_type": entity_type, "record_id": record_id, **(payload.get("metadata") or {})},
    }
    cols = table_columns(conn, "universal_tasks")
    columns = [column for column in insert if column in cols and insert[column] is not None]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"""
            INSERT INTO public.universal_tasks ({", ".join(quote_ident(col) for col in columns)})
            VALUES ({", ".join(["%s"] * len(columns))})
            RETURNING *
            """,
            tuple(Json(insert[col]) if col == "metadata" else insert[col] for col in columns),
        )
        task = dict(cur.fetchone())
    _insert_workflow_event(
        conn,
        entity_type=entity_type,
        raw_id=raw_id,
        transition="review_requested",
        status=str(row.get("status") or "open"),
        table_name=table_name,
        row=row,
        notes=insert["description"],
        current_user=current_user,
        metadata={"task_id": str(task.get("id"))},
    )
    return _row_to_jsonable(task) or {}


def list_audit_timeline(conn: Any, *, entity_type: str, record_id: str, current_user: dict[str, Any], limit: int = 100) -> list[dict[str, Any]]:
    if not table_exists(conn, "os_audit_events"):
        return []
    _, raw_id = _split_record_id(record_id)
    params: list[Any] = [raw_id, record_id, max(1, min(limit, 300))]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT *
            FROM public.os_audit_events
            WHERE entity_id IN (%s, %s)
            ORDER BY created_at DESC
            LIMIT %s
            """,
            tuple(params),
        )
        rows = [dict(row) for row in (cur.fetchall() or [])]
    return [_row_to_jsonable(row) or {} for row in rows]


def get_lifecycle_snapshot(conn: Any, *, entity_type: str, record_id: str, current_user: dict[str, Any], limit: int = 100) -> dict[str, Any]:
    table_name, raw_id, row = _resolve_record(conn, entity_type=entity_type, record_id=record_id, payload={}, current_user=current_user)
    history_rows: list[dict[str, Any]] = []
    if table_exists(conn, "record_workflow_events"):
        cols = table_columns(conn, "record_workflow_events")
        id_col = first_col(cols, ["entity_id", "record_id", "source_id"])
        type_col = first_col(cols, ["entity_type", "record_type", "source_table"])
        select_cols = [
            col
            for col in [
                "id",
                "entity_type",
                "entity_id",
                "record_type",
                "record_id",
                "source_table",
                "source_id",
                "event_type",
                "status",
                "workflow_status",
                "description",
                "summary",
                "notes",
                "event_at",
                "created_at",
                "created_by",
                "metadata",
            ]
            if col in cols
        ]
        if id_col and select_cols:
            params: list[Any] = [raw_id, record_id]
            where = [f"{quote_ident(id_col)}::text IN (%s, %s)"]
            if type_col:
                where.append(f"({quote_ident(type_col)}::text = %s OR {quote_ident(type_col)}::text = %s)")
                params.extend([entity_type, table_name])
            params.append(max(1, min(limit, 300)))
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT {", ".join(quote_ident(col) for col in select_cols)}
                    FROM public.record_workflow_events
                    WHERE {" AND ".join(where)}
                    ORDER BY {quote_ident(first_col(cols, ["event_at", "created_at", "id"]) or "id")} DESC NULLS LAST
                    LIMIT %s
                    """,
                    tuple(params),
                )
                history_rows = [dict(item) for item in (cur.fetchall() or [])]
    audit_rows = list_audit_timeline(conn, entity_type=entity_type, record_id=record_id, current_user=current_user, limit=limit)
    snapshot = operational_lifecycle_service.snapshot_from_record(
        entity_type=entity_type,
        entity_id=record_id,
        record=_row_to_jsonable(row) or {},
        history_rows=[_row_to_jsonable(item) or {} for item in history_rows],
        audit_rows=audit_rows,
    )
    return {
        **snapshot.model_dump(mode="json"),
        "source_table": table_name,
        "source_id": raw_id,
    }
