from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.dependencies import get_current_user
from db.connection import get_db_connection, release_db_connection
from services.workspace_orchestrator_service import WorkspaceOrchestratorService

router = APIRouter(prefix="/workspace", tags=["workspace"])


class DocumentActionRequest(BaseModel):
    document_id: int
    notes: str | None = None


class SubmitDocumentRequest(BaseModel):
    document_id: int


class WorkspaceRecordCreateRequest(BaseModel):
    record_type: str
    young_person_id: int | None = None
    home_id: int | None = None
    status: str | None = "submitted"
    fields: dict[str, Any] = {}


service = WorkspaceOrchestratorService()


@router.get("/child/{young_person_id}")
def get_child_workspace(
    young_person_id: int,
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.child_workspace(young_person_id=young_person_id, current_user=current_user, days=days)


@router.get("/home/{home_id}")
def get_home_workspace(
    home_id: int,
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.home_workspace(home_id=home_id, current_user=current_user, days=days)


@router.get("/manager")
def get_manager_workspace(
    days: int = 30,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.manager_workspace(current_user=current_user, days=days)


@router.get("/ofsted/{home_id}")
def get_ofsted_workspace(
    home_id: int,
    days: int = 90,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return service.ofsted_workspace(home_id=home_id, current_user=current_user, days=days)


# ----------------------
# Care record bridge
# ----------------------


def _current_user_id(current_user: dict[str, Any]) -> int | None:
    value = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
    try:
        return int(value) if value else None
    except Exception:
        return None


def _current_home_id(current_user: dict[str, Any]) -> int | None:
    value = current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id")
    try:
        return int(value) if value else None
    except Exception:
        return None


def _table_columns(conn, table_name: str) -> set[str]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s",
            (table_name,),
        )
        return {str(row["column_name"] if isinstance(row, dict) else row[0]) for row in cur.fetchall()}


def _home_for_child(conn, young_person_id: int | None) -> int | None:
    if not young_person_id:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT home_id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
            row = cur.fetchone()
            if not row:
                return None
            value = row["home_id"] if isinstance(row, dict) else row[0]
            return int(value) if value else None
    except Exception:
        return None


def _normalise_record_payload(payload: WorkspaceRecordCreateRequest, current_user: dict[str, Any], conn) -> tuple[str, dict[str, Any]]:
    record_type = str(payload.record_type or "").strip().lower()
    actor_id = _current_user_id(current_user)
    home_id = payload.home_id or _home_for_child(conn, payload.young_person_id) or _current_home_id(current_user)
    fields = dict(payload.fields or {})

    if record_type in {"daily", "daily_record", "daily_note"}:
        table = "daily_notes"
        values = {
            "young_person_id": payload.young_person_id,
            "home_id": home_id,
            "note_date": fields.get("note_date"),
            "presentation": fields.get("mood") or fields.get("presentation") or fields.get("summary"),
            "young_person_voice": fields.get("child_voice"),
            "positive_moments": fields.get("positive_moments"),
            "staff_response": fields.get("staff_response"),
            "therapeutic_reflection": fields.get("therapeutic_reflection"),
            "follow_up_required": fields.get("follow_up"),
            "created_by_user_id": actor_id,
            "user_id": actor_id,
            "manager_review_status": payload.status or "submitted",
            "workflow_status": payload.status or "submitted",
            "created_at": "NOW()",
            "updated_at": "NOW()",
        }
        return table, values

    if record_type in {"incident", "incident_record"}:
        table = "incidents"
        values = {
            "young_person_id": payload.young_person_id,
            "home_id": home_id,
            "incident_datetime": fields.get("incident_datetime"),
            "incident_type": fields.get("incident_type") or "other",
            "severity": fields.get("severity") or "medium",
            "risk_level": fields.get("risk_level") or "medium",
            "description": fields.get("facts") or fields.get("description"),
            "summary": fields.get("facts") or fields.get("description"),
            "antecedent": fields.get("antecedents"),
            "child_voice": fields.get("child_words") or fields.get("child_voice"),
            "staff_response": fields.get("staff_response"),
            "outcome": fields.get("learning") or fields.get("outcome"),
            "manager_review_status": payload.status or "submitted",
            "workflow_status": payload.status or "submitted",
            "created_by_user_id": actor_id,
            "user_id": actor_id,
            "created_at": "NOW()",
            "updated_at": "NOW()",
        }
        return table, values

    raise HTTPException(status_code=400, detail="Unsupported record type")


@router.post("/records")
def create_workspace_record(
    payload: WorkspaceRecordCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    actor_id = _current_user_id(current_user)
    if not actor_id:
        raise HTTPException(status_code=401, detail="Invalid user")

    conn = None
    try:
        conn = get_db_connection()
        table, raw_values = _normalise_record_payload(payload, current_user, conn)
        columns = _table_columns(conn, table)
        insert_values = {key: value for key, value in raw_values.items() if key in columns and value is not None}

        if "created_at" in columns and "created_at" not in insert_values:
            insert_values["created_at"] = "NOW()"
        if "updated_at" in columns and "updated_at" not in insert_values:
            insert_values["updated_at"] = "NOW()"

        if not insert_values:
            raise HTTPException(status_code=400, detail="No compatible fields were available for this record")

        column_sql = ", ".join(f'"{column}"' for column in insert_values.keys())
        placeholders = []
        params = []
        for value in insert_values.values():
            if value == "NOW()":
                placeholders.append("NOW()")
            elif isinstance(value, (dict, list)):
                placeholders.append("%s::jsonb")
                params.append(json.dumps(value))
            else:
                placeholders.append("%s")
                params.append(value)

        with conn.cursor() as cur:
            cur.execute(
                f'INSERT INTO public."{table}" ({column_sql}) VALUES ({", ".join(placeholders)}) RETURNING *',
                tuple(params),
            )
            record = cur.fetchone()

            if _table_columns(conn, "manager_review_queue"):
                queue_cols = _table_columns(conn, "manager_review_queue")
                queue_payload = {
                    "home_id": insert_values.get("home_id"),
                    "young_person_id": insert_values.get("young_person_id"),
                    "source_table": table,
                    "source_id": record.get("id") if isinstance(record, dict) else None,
                    "record_type": payload.record_type,
                    "status": "pending",
                    "priority": "medium",
                    "summary": f"New {payload.record_type} submitted for manager review",
                    "created_by_user_id": actor_id,
                    "created_at": "NOW()",
                    "updated_at": "NOW()",
                }
                queue_values = {key: value for key, value in queue_payload.items() if key in queue_cols and value is not None}
                if queue_values:
                    q_columns = ", ".join(f'"{column}"' for column in queue_values.keys())
                    q_placeholders = []
                    q_params = []
                    for value in queue_values.values():
                        if value == "NOW()":
                            q_placeholders.append("NOW()")
                        else:
                            q_placeholders.append("%s")
                            q_params.append(value)
                    cur.execute(
                        f'INSERT INTO public."manager_review_queue" ({q_columns}) VALUES ({", ".join(q_placeholders)})',
                        tuple(q_params),
                    )

        conn.commit()
        return {"ok": True, "table": table, "record": record}
    except HTTPException:
        if conn is not None:
            conn.rollback()
        raise
    except Exception as exc:
        if conn is not None:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not create workspace record: {exc}")
    finally:
        if conn is not None:
            release_db_connection(conn)


# ----------------------
# Document workflow layer
# ----------------------


@router.post("/documents/submit")
def submit_document_for_approval(
    payload: SubmitDocumentRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user")

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET approval_required = TRUE,
                    approval_status = 'pending',
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, young_person_id
                """,
                (payload.document_id,),
            )
            doc = cur.fetchone()
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")

            cur.execute(
                """
                INSERT INTO approvals (source_table, source_id, approval_type, requested_by, status)
                VALUES ('documents', %s, 'manager_approval', %s, 'pending')
                """,
                (payload.document_id, user_id),
            )

        conn.commit()
        return {"ok": True, "message": "Submitted for approval"}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("/documents/approve")
def approve_document(
    payload: DocumentActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET approval_status = 'approved', updated_at = NOW()
                WHERE id = %s
                """,
                (payload.document_id,),
            )

            cur.execute(
                """
                UPDATE approvals
                SET status = 'approved', approved_by = %s, approved_at = NOW(), notes = %s
                WHERE source_table = 'documents' AND source_id = %s AND status = 'pending'
                """,
                (user_id, payload.notes, payload.document_id),
            )

        conn.commit()
        return {"ok": True, "message": "Document approved"}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("/documents/reject")
def reject_document(
    payload: DocumentActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET approval_status = 'rejected', updated_at = NOW()
                WHERE id = %s
                """,
                (payload.document_id,),
            )

            cur.execute(
                """
                UPDATE approvals
                SET status = 'rejected', approved_by = %s, approved_at = NOW(), notes = %s
                WHERE source_table = 'documents' AND source_id = %s AND status = 'pending'
                """,
                (user_id, payload.notes, payload.document_id),
            )

        conn.commit()
        return {"ok": True, "message": "Document rejected"}
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.post("/documents/request-changes")
def request_document_changes(
    payload: DocumentActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    user_id = _current_user_id(current_user)
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE documents
                SET approval_status = 'changes_requested', updated_at = NOW()
                WHERE id = %s
                """,
                (payload.document_id,),
            )

            cur.execute(
                """
                UPDATE approvals
                SET status = 'changes_requested', approved_by = %s, approved_at = NOW(), notes = %s
                WHERE source_table = 'documents' AND source_id = %s AND status = 'pending'
                """,
                (user_id, payload.notes, payload.document_id),
            )

        conn.commit()
        return {"ok": True, "message": "Changes requested"}
    finally:
        if conn is not None:
            release_db_connection(conn)
