from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import Json, RealDictCursor

from auth.dependencies import get_current_user
from backend.db.migration_runner import run_pending
from db.connection import get_db
from schemas.document_templates import DocumentCreateRequest, DocumentUpdateRequest
from schemas.document_review import DocumentReviewAction
from schemas.document_signatures import DocumentSignatureRequest
from services.audit_event_service import record_audit_event
from services.document_autosave_service import document_autosave_service
from services.document_export_service import document_export_service
from services.document_intelligence_service import document_intelligence_service
from services.document_linking_service import document_linking_service
from services.document_permission_service import document_permission_service
from services.document_prompt_service import document_prompt_service
from services.document_rendering_service import document_rendering_service
from services.document_review_service import document_review_service
from services.document_signature_service import document_signature_service
from services.document_template_service import document_template_service
from services.document_version_service import document_version_service


router = APIRouter(prefix="/api/document-system", tags=["document-system"])


CREATE_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS document_instances (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    title TEXT NOT NULL,
    scope TEXT NOT NULL,
    child_id TEXT NULL,
    home_id TEXT NULL,
    staff_id TEXT NULL,
    provider_id TEXT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    sections JSONB NOT NULL DEFAULT '{}'::jsonb,
    links JSONB NOT NULL DEFAULT '[]'::jsonb,
    review JSONB NOT NULL DEFAULT '{}'::jsonb,
    signatures JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NULL,
    updated_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_instances_scope ON document_instances (scope, child_id, home_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_document_instances_status ON document_instances (status);

CREATE TABLE IF NOT EXISTS document_instance_versions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES document_instances(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    reason TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    content_hash TEXT NOT NULL,
    created_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_instance_versions_doc ON document_instance_versions (document_id, version_number DESC);

CREATE TABLE IF NOT EXISTS document_instance_autosaves (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES document_instances(id) ON DELETE CASCADE,
    envelope JSONB NOT NULL,
    created_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_instance_autosaves_doc ON document_instance_autosaves (document_id, created_at DESC);
"""


def ensure_schema(conn: Any) -> None:
    run_pending(conn)


def _user_id(current_user: dict[str, Any]) -> str | None:
    value = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
    return str(value) if value is not None else None


def _normalise(row: dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    data["document_id"] = data.pop("id")
    for key in ["sections", "links", "review", "signatures", "metadata"]:
        if isinstance(data.get(key), str):
            data[key] = json.loads(data[key])
    return data


def _load_document(conn: Any, document_id: str, current_user: dict[str, Any]) -> dict[str, Any]:
    ensure_schema(conn)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM document_instances WHERE id = %s", (document_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    document = _normalise(dict(row))
    document_permission_service.assert_can_read(current_user=current_user, document=document)
    return document


def _insert_version(conn: Any, document: dict[str, Any], reason: str, current_user: dict[str, Any]) -> dict[str, Any]:
    version = document_version_service.snapshot(
        document=document,
        reason=reason,
        current_user=current_user,
        version_number=int(document.get("version_number") or 1),
    )
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO document_instance_versions (id, document_id, version_number, reason, snapshot, content_hash, created_by)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            """,
            (version["version_id"], version["document_id"], version["version_number"], reason, Json(version["snapshot"]), version["content_hash"], _user_id(current_user)),
        )
    return version


@router.get("/templates")
def list_templates(scope: str | None = None, category: str | None = None) -> dict[str, Any]:
    templates = document_template_service.list_templates(scope=scope, category=category)
    return {"ok": True, "templates": [template.model_dump() for template in templates]}


@router.get("/templates/{template_id}")
def get_template(template_id: str) -> dict[str, Any]:
    try:
        return {"ok": True, "template": document_template_service.get_template(template_id).model_dump()}
    except KeyError:
        raise HTTPException(status_code=404, detail="Document template not found")


@router.post("/documents")
def create_document(payload: DocumentCreateRequest, conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    ensure_schema(conn)
    try:
        template = document_template_service.get_template(payload.template_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Document template not found")
    document_permission_service.assert_can_create(current_user=current_user, template=template, payload=payload.model_dump())
    instance = document_rendering_service.new_instance(
        template=template,
        current_user=current_user,
        title=payload.title,
        child_id=payload.child_id,
        home_id=payload.home_id,
        staff_id=payload.staff_id,
        sections=payload.sections,
        metadata=payload.metadata,
    ).model_dump(mode="json")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO document_instances (id, template_id, title, scope, child_id, home_id, staff_id, provider_id, status, sections, links, review, signatures, metadata, created_by, updated_by)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING *
            """,
            (
                instance["document_id"],
                instance["template_id"],
                instance["title"],
                instance["scope"],
                instance.get("child_id"),
                instance.get("home_id"),
                instance.get("staff_id"),
                current_user.get("provider_id"),
                instance["status"],
                Json(instance["sections"]),
                Json(instance["links"]),
                Json(instance["review"]),
                Json(instance["signatures"]),
                Json(instance["metadata"]),
                _user_id(current_user),
                _user_id(current_user),
            ),
        )
        row = _normalise(dict(cur.fetchone()))
    _insert_version(conn, row, "created", current_user)
    record_audit_event(event_type="document.engine", action="document_created", actor=current_user, resource_type="document", resource_id=row["document_id"], metadata={"template_id": row["template_id"], "scope": row["scope"]})
    return {"ok": True, "document": document_rendering_service.render_editor_payload(instance=row, template=template)}


@router.get("/documents")
def list_documents(scope: str | None = None, child_id: str | None = None, home_id: str | None = None, staff_id: str | None = None, conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    ensure_schema(conn)
    where = []
    params: list[Any] = []
    for key, value in {"scope": scope, "child_id": child_id, "home_id": home_id, "staff_id": staff_id}.items():
        if value:
            where.append(f"{key} = %s")
            params.append(value)
    sql = "SELECT * FROM document_instances"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY updated_at DESC LIMIT 250"
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql, tuple(params))
        rows = [_normalise(dict(row)) for row in cur.fetchall()]
    readable = [row for row in rows if document_permission_service.can_read(current_user=current_user, document=row)]
    return {"ok": True, "documents": readable}


@router.get("/documents/{document_id}")
def get_document(document_id: str, conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    document = _load_document(conn, document_id, current_user)
    template = document_template_service.get_template(document["template_id"])
    return {"ok": True, "document": document_rendering_service.render_editor_payload(instance=document, template=template)}


@router.patch("/documents/{document_id}")
def update_document(document_id: str, payload: DocumentUpdateRequest, conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    document = _load_document(conn, document_id, current_user)
    document_permission_service.assert_can_write(current_user=current_user, document=document)
    before = dict(document)
    if payload.title is not None:
        document["title"] = payload.title
    if payload.sections is not None:
        document["sections"] = payload.sections
    if payload.links is not None:
        for link in payload.links:
            document_permission_service.validate_link_scope(document=document, link=link)
        document["links"] = payload.links
    if payload.metadata is not None:
        document["metadata"] = {**(document.get("metadata") or {}), **payload.metadata}
    if payload.status is not None:
        document["status"] = payload.status.value
    if document_version_service.changed(before=before, after=document):
        _insert_version(conn, before, payload.version_reason, current_user)
        document["version_number"] = int(document.get("version_number") or 1) + 1
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE document_instances
            SET title=%s, status=%s, sections=%s, links=%s, metadata=%s, version_number=%s, updated_by=%s, updated_at=NOW()
            WHERE id=%s
            RETURNING *
            """,
            (document["title"], document["status"], Json(document["sections"]), Json(document["links"]), Json(document["metadata"]), document["version_number"], _user_id(current_user), document_id),
        )
        row = _normalise(dict(cur.fetchone()))
    record_audit_event(event_type="document.engine", action="document_saved", actor=current_user, resource_type="document", resource_id=document_id, metadata={"version_number": row["version_number"]})
    return {"ok": True, "document": document_rendering_service.render_editor_payload(instance=row, template=document_template_service.get_template(row["template_id"]))}


@router.post("/documents/{document_id}/autosave")
def autosave_document(document_id: str, payload: dict[str, Any], conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    document = _load_document(conn, document_id, current_user)
    document_permission_service.assert_can_write(current_user=current_user, document=document)
    envelope = document_autosave_service.build_autosave(
        document=document,
        sections=payload.get("sections") or {},
        current_user=current_user,
        client_token=str(payload.get("client_token") or ""),
        base_version=payload.get("base_version"),
    )
    if envelope.get("ok"):
        with conn.cursor() as cur:
            cur.execute("INSERT INTO document_instance_autosaves (id, document_id, envelope, created_by) VALUES (%s,%s,%s,%s)", (envelope["autosave_id"], document_id, Json(envelope), _user_id(current_user)))
            cur.execute("UPDATE document_instances SET status='autosaved', sections=%s, updated_by=%s, updated_at=NOW() WHERE id=%s", (Json(envelope["sections"]), _user_id(current_user), document_id))
    return envelope


@router.post("/documents/{document_id}/links")
def link_record(document_id: str, payload: dict[str, Any], conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    document = _load_document(conn, document_id, current_user)
    link = document_linking_service.prepare_link(document=document, link=payload, current_user=current_user)
    links = [*(document.get("links") or []), link]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("UPDATE document_instances SET links=%s, updated_by=%s, updated_at=NOW() WHERE id=%s RETURNING *", (Json(links), _user_id(current_user), document_id))
        row = _normalise(dict(cur.fetchone()))
    return {"ok": True, "document": row, "link": link}


@router.post("/documents/{document_id}/review")
def review_document(document_id: str, payload: DocumentReviewAction, conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    document = _load_document(conn, document_id, current_user)
    transition = document_review_service.transition(document=document, target_status=payload.action, current_user=current_user, comment=payload.comment)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("UPDATE document_instances SET status=%s, review=%s, updated_by=%s, updated_at=NOW() WHERE id=%s RETURNING *", (transition["status"], Json(transition["review"]), _user_id(current_user), document_id))
        row = _normalise(dict(cur.fetchone()))
    record_audit_event(event_type="document.review", action=transition["status"], actor=current_user, resource_type="document", resource_id=document_id, metadata=transition["event"])
    return {"ok": True, "document": row, "event": transition["event"]}


@router.post("/documents/{document_id}/signatures")
def sign_document(document_id: str, payload: DocumentSignatureRequest, conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    document = _load_document(conn, document_id, current_user)
    document_permission_service.assert_can_sign(current_user=current_user, document=document)
    signature = document_signature_service.sign(document=document, payload=payload.model_dump(), current_user=current_user)
    signatures = [*(document.get("signatures") or []), signature]
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("UPDATE document_instances SET signatures=%s, updated_by=%s, updated_at=NOW() WHERE id=%s RETURNING *", (Json(signatures), _user_id(current_user), document_id))
        row = _normalise(dict(cur.fetchone()))
    record_audit_event(event_type="document.signature", action="document_signed", actor=current_user, resource_type="document", resource_id=document_id, metadata={"signature_id": signature["signature_id"], "content_hash": signature["content_hash"]})
    return {"ok": True, "document": row, "signature": signature}


@router.get("/documents/{document_id}/versions")
def versions(document_id: str, conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    _load_document(conn, document_id, current_user)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM document_instance_versions WHERE document_id=%s ORDER BY version_number DESC LIMIT 50", (document_id,))
        rows = [dict(row) for row in cur.fetchall()]
    return {"ok": True, "versions": rows}


@router.post("/documents/{document_id}/export")
def export_document(document_id: str, payload: dict[str, Any], conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    document = _load_document(conn, document_id, current_user)
    document_permission_service.assert_can_export(current_user=current_user, document=document)
    result = document_export_service.export(document=document, profile=payload.get("profile") or "print_html")
    record_audit_event(event_type="document.export", action="document_export_requested", outcome="success" if result.get("ok") else "limited", actor=current_user, resource_type="document", resource_id=document_id, metadata={"profile": result.get("profile"), "status": result.get("status")})
    return result


@router.post("/documents/{document_id}/orb-suggestions")
def orb_suggestions(document_id: str, payload: dict[str, Any], conn: Any = Depends(get_db), current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    document = _load_document(conn, document_id, current_user)
    draft_text = "\n".join(str(value) for value in (document.get("sections") or {}).values())
    quality = document_intelligence_service.analyse_quality(text=draft_text, document_type=str(document.get("template_id")), evidence_links=document.get("links") or [])
    suggestion = document_prompt_service.suggestion(request=str(payload.get("request") or "prepare for manager review"), draft_text=draft_text, template_id=str(document.get("template_id")))
    return {"ok": True, "draft_modified": False, "quality": quality, "suggestion": suggestion}


@router.get("/assistant-boundary")
def assistant_boundary() -> dict[str, Any]:
    return {
        "ok": True,
        "standalone_assistant_document_access": "blocked",
        "message": "Standalone assistant cannot access OS documents. Use embedded Orb inside a scoped record workspace.",
        "allowed_static_help": ["general writing guidance", "sector guidance", "template explanations"],
    }
