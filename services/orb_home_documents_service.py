"""Canonical ORB Home Documents — upload, extraction, indexing with memory fallback."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from psycopg2.extras import Json, RealDictCursor

from auth.security_guards import allowed_home_ids, is_role_group, user_home_id, user_provider_id
from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from schemas.orb_home_documents import (
    ALLOWED_HOME_DOCUMENT_EXTENSIONS,
    HOME_DOCUMENT_TYPE_LABELS,
    OrbHomeDocumentHealth,
    OrbHomeDocumentListRequest,
    OrbHomeDocumentRecord,
    OrbHomeDocumentSummary,
    OrbHomeDocumentUpdate,
)
from services.document_security_service import document_security_service, max_upload_bytes
from services.orb_document_ingestion_service import orb_document_ingestion_service
from services.orb_embedding_service import orb_embedding_service

logger = logging.getLogger("indicare.orb_home_documents")

MIGRATION_211_PATH = "sql/211_orb_home_documents.sql"
CHUNK_TARGET_CHARS = 4000
CHUNK_MIN_CHARS = 2500

MANAGEMENT_ROLES = frozenset({
    "admin",
    "manager",
    "registered_manager",
    "deputy_manager",
    "safeguarding_lead",
    "responsible_individual",
})


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any) -> str:
    return str(value or "").strip()


def _parse_json(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    return default


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return str(value)


def _citation_label(document_type: str, title: str | None = None) -> str:
    label = HOME_DOCUMENT_TYPE_LABELS.get(document_type, document_type.replace("_", " ").title())
    if title and title.lower() not in label.lower():
        return f"Home document: {label}"
    return f"Home document: {label}"


def _source_chip(document_type: str) -> str:
    return _citation_label(document_type)


def _embeddings_enabled() -> bool:
    return orb_embedding_service.is_available()


def _storage_root() -> Path:
    root = Path(os.getenv("INDICARE_DOCUMENT_STORAGE_ROOT", "/tmp/indicare-os/documents"))
    return root / "orb-home-documents"


class OrbHomeDocumentsService:
    def __init__(self) -> None:
        self._memory: dict[int, dict[str, dict[str, Any]]] = {}
        self._memory_chunks: dict[str, list[dict[str, Any]]] = {}
        self._storage_mode: str = "memory"

    def _resolve_user_id(self, user_id: int) -> int:
        resolved = int(user_id)
        if resolved <= 0:
            raise ValueError("user_id is required")
        return resolved

    def _user_memory(self, user_id: int) -> dict[str, dict[str, Any]]:
        return self._memory.setdefault(self._resolve_user_id(user_id), {})

    def _use_db(self) -> bool:
        try:
            conn = get_db_connection()
            release_db_connection(conn)
            return True
        except (DatabaseUnavailableError, Exception):
            return False

    def _db_table_exists(self) -> bool:
        if not self._use_db():
            return False
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'orb_home_documents'
                    """
                )
                return cur.fetchone() is not None
        except Exception:
            return False
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _detect_storage_mode(self) -> str:
        if not self._use_db():
            self._storage_mode = "memory"
            return self._storage_mode
        if self._db_table_exists():
            self._storage_mode = "database"
        else:
            self._storage_mode = "memory"
        return self._storage_mode

    def storage_mode(self) -> str:
        return self._detect_storage_mode()

    def health(self) -> OrbHomeDocumentHealth:
        return OrbHomeDocumentHealth(
            persistence_status=self._detect_storage_mode(),
            embeddings_enabled=_embeddings_enabled(),
        )

    def list_document_types(self) -> list[dict[str, str]]:
        return [{"value": k, "label": v} for k, v in HOME_DOCUMENT_TYPE_LABELS.items()]

    def _audit_entry(self, action: str, user_id: int, **extra: Any) -> dict[str, Any]:
        entry: dict[str, Any] = {
            "action": action,
            "actor_user_id": str(user_id),
            "at": _now_iso(),
        }
        entry.update(extra)
        return entry

    def _scope_from_user(self, current_user: dict[str, Any]) -> tuple[str | None, str | None]:
        home = user_home_id(current_user)
        org = user_provider_id(current_user)
        return (str(home) if home else None, str(org) if org else None)

    def _can_access_document(
        self,
        current_user: dict[str, Any],
        row: dict[str, Any],
        *,
        user_id: int,
    ) -> bool:
        owner = str(row.get("owner_user_id") or row.get("uploaded_by_user_id") or "")
        if owner == str(user_id):
            return True
        if is_role_group(current_user, "provider"):
            return True
        home_id = row.get("home_id")
        if home_id and str(home_id) in {str(h) for h in allowed_home_ids(current_user)}:
            return True
        org_id = row.get("organisation_id")
        user_org = user_provider_id(current_user)
        if org_id and user_org and str(org_id) == str(user_org):
            return True
        return False

    def _row_to_record(self, row: dict[str, Any]) -> OrbHomeDocumentRecord:
        doc_type = row.get("document_type") or "other_home_policy"
        text_status = row.get("text_extract_status") or "pending"
        index_status = row.get("indexing_status") or "pending"
        archived = bool(row.get("archived"))
        status = "archived" if archived else (
            "ready" if text_status == "ready" else "failed" if text_status == "failed" else "processing"
        )
        return OrbHomeDocumentRecord(
            document_id=str(row["id"]),
            home_id=row.get("home_id"),
            organisation_id=row.get("organisation_id"),
            uploaded_by_user_id=str(row.get("uploaded_by_user_id") or row.get("owner_user_id") or ""),
            owner_user_id=str(row.get("owner_user_id") or ""),
            document_type=doc_type,
            title=row["title"],
            filename=row.get("filename"),
            mime_type=row.get("mime_type"),
            storage_uri=row.get("storage_uri"),
            text_extract_status=text_status,
            indexing_status=index_status,
            version=int(row.get("version") or 1),
            archived=archived,
            status=status,
            permission=row.get("access_role_policy") or "home_manager",
            access_role_policy=row.get("access_role_policy") or "home_manager",
            privacy_classification=row.get("privacy_classification") or "home_operational",
            text_extracted=text_status == "ready",
            embeddings_enabled=_embeddings_enabled(),
            citation_label=_citation_label(doc_type, row.get("title")),
            ready_for_orb_use=(
                text_status == "ready"
                and index_status == "indexed"
                and not archived
            ),
            created_at=_iso(row.get("created_at")) or _now_iso(),
            updated_at=_iso(row.get("updated_at")) or _now_iso(),
            archived_at=_iso(row.get("archived_at")),
            audit_trail=_parse_json(row.get("audit_trail"), []),
            metadata=_parse_json(row.get("metadata"), {}),
        )

    def _validate_document_type(self, document_type: str) -> None:
        if document_type not in HOME_DOCUMENT_TYPE_LABELS:
            raise HTTPException(status_code=400, detail=f"Unsupported document type: {document_type}")

    def _validate_upload_file(self, upload: UploadFile) -> None:
        filename = upload.filename or "document"
        suffix = Path(filename).suffix.lower()
        if suffix not in ALLOWED_HOME_DOCUMENT_EXTENSIONS:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_HOME_DOCUMENT_EXTENSIONS))}",
            )
        document_security_service.validate_upload(upload)

    async def _save_file(
        self,
        upload: UploadFile,
        *,
        home_id: str | None,
        user_id: int,
    ) -> tuple[str, str, bytes]:
        bucket = home_id or f"user-{user_id}"
        target_dir = _storage_root() / bucket
        target_dir.mkdir(parents=True, exist_ok=True)

        original_name = Path(upload.filename or "document").name
        suffix = Path(original_name).suffix.lower()
        stored_name = f"{uuid4().hex}{suffix}"
        target_path = target_dir / stored_name

        size = 0
        chunks: list[bytes] = []
        while chunk := await upload.read(1024 * 1024):
            size += len(chunk)
            if size > max_upload_bytes():
                raise HTTPException(status_code=413, detail="Uploaded document is too large")
            chunks.append(chunk)

        content = b"".join(chunks)
        target_path.write_bytes(content)
        storage_uri = str(target_path)
        return storage_uri, original_name, content

    def _chunk_text(self, text: str, *, source_title: str, version: int) -> list[dict[str, Any]]:
        normalised = orb_document_ingestion_service.normalise_text(text)
        if not normalised:
            return []
        chunks: list[dict[str, Any]] = []
        start = 0
        index = 0
        while start < len(normalised):
            end = min(len(normalised), start + CHUNK_TARGET_CHARS)
            if end < len(normalised):
                boundary = normalised.rfind("\n\n", start + CHUNK_MIN_CHARS, end)
                if boundary > start:
                    end = boundary
            piece = normalised[start:end].strip()
            if piece:
                chunks.append({
                    "chunk_index": index,
                    "text": piece,
                    "source_title": source_title,
                    "version": version,
                })
                index += 1
            start = end if end > start else start + CHUNK_TARGET_CHARS
        return chunks

    def _index_document(
        self,
        document_id: str,
        *,
        home_id: str | None,
        document_type: str,
        title: str,
        extracted_text: str,
        version: int,
    ) -> str:
        if not extracted_text.strip():
            return "failed"
        if not _embeddings_enabled():
            return "disabled"

        chunks = self._chunk_text(extracted_text, source_title=title, version=version)
        if not chunks:
            return "failed"

        chunk_records: list[dict[str, Any]] = []
        texts = [c["text"] for c in chunks]
        embed_result = orb_embedding_service.embed_many(texts)

        for chunk in chunks:
            embedding = None
            embedding_model = None
            if embed_result.get("available"):
                embeddings = embed_result.get("embeddings") or []
                idx = chunk["chunk_index"]
                if idx < len(embeddings):
                    embedding = embeddings[idx]
                    embedding_model = embed_result.get("model")

            chunk_records.append({
                "id": f"{document_id}-chunk-{chunk['chunk_index']}",
                "document_id": document_id,
                "home_id": home_id,
                "document_type": document_type,
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"],
                "source_title": chunk["source_title"],
                "version": version,
                "embedding": embedding,
                "embedding_model": embedding_model,
            })

        if self._detect_storage_mode() == "database":
            conn = None
            try:
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM orb_home_document_chunks WHERE document_id = %s", (document_id,))
                    for rec in chunk_records:
                        cur.execute(
                            """
                            INSERT INTO orb_home_document_chunks
                                (id, document_id, home_id, document_type, chunk_index, text,
                                 source_title, version, embedding, embedding_model)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                rec["id"], rec["document_id"], rec["home_id"], rec["document_type"],
                                rec["chunk_index"], rec["text"], rec["source_title"], rec["version"],
                                Json(rec["embedding"]) if rec["embedding"] is not None else None,
                                rec["embedding_model"],
                            ),
                        )
                conn.commit()
            except Exception:
                logger.exception("Failed to persist home document chunks for %s", document_id)
                if conn:
                    conn.rollback()
                return "failed"
            finally:
                if conn is not None:
                    release_db_connection(conn)
        else:
            self._memory_chunks[document_id] = chunk_records

        if embed_result.get("available"):
            return "indexed"
        return "disabled"

    def _extract_text(
        self,
        filename: str,
        content: bytes,
        mime_type: str | None,
    ) -> tuple[str, str]:
        text, method = orb_document_ingestion_service.extract_text_from_file(
            filename, content, mime_type
        )
        return text, method

    async def upload_document(
        self,
        user_id: int,
        current_user: dict[str, Any],
        upload: UploadFile,
        *,
        title: str,
        document_type: str,
    ) -> OrbHomeDocumentRecord:
        uid = self._resolve_user_id(user_id)
        self._validate_document_type(document_type)
        self._validate_upload_file(upload)

        home_id, org_id = self._scope_from_user(current_user)
        doc_id = str(uuid4())
        audit = [self._audit_entry("upload_started", uid, document_type=document_type)]

        row: dict[str, Any] = {
            "id": doc_id,
            "owner_user_id": uid,
            "uploaded_by_user_id": uid,
            "home_id": home_id,
            "organisation_id": org_id,
            "title": title.strip(),
            "document_type": document_type,
            "filename": None,
            "mime_type": upload.content_type,
            "storage_uri": None,
            "extracted_text": None,
            "text_extract_status": "processing",
            "indexing_status": "pending",
            "version": 1,
            "archived": False,
            "privacy_classification": "home_operational",
            "access_role_policy": "home_manager",
            "audit_trail": audit,
            "metadata": {"virus_scan": "placeholder_not_configured"},
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
            "archived_at": None,
        }

        storage_uri, filename, content = await self._save_file(upload, home_id=home_id, user_id=uid)
        row["storage_uri"] = storage_uri
        row["filename"] = filename
        row["mime_type"] = upload.content_type or row["mime_type"]
        audit.append(self._audit_entry("file_stored", uid, storage_uri=storage_uri))

        text, method = self._extract_text(filename, content, row["mime_type"])
        row["metadata"]["extraction_method"] = method
        if text:
            row["extracted_text"] = text
            row["text_extract_status"] = "ready"
            audit.append(self._audit_entry("text_extracted", uid, method=method))
        else:
            row["text_extract_status"] = "failed"
            row["metadata"]["extraction_error"] = method
            audit.append(self._audit_entry("text_extraction_failed", uid, error=method))

        if row["text_extract_status"] == "ready":
            row["indexing_status"] = self._index_document(
                doc_id,
                home_id=home_id,
                document_type=document_type,
                title=row["title"],
                extracted_text=text,
                version=1,
            )
            audit.append(self._audit_entry("indexing_completed", uid, status=row["indexing_status"]))
        elif _embeddings_enabled() is False:
            row["indexing_status"] = "disabled"
        else:
            row["indexing_status"] = "failed"

        row["updated_at"] = _now_iso()
        row["audit_trail"] = audit

        if self._detect_storage_mode() == "database":
            conn = None
            try:
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO orb_home_documents
                            (id, owner_user_id, uploaded_by_user_id, home_id, organisation_id,
                             title, document_type, filename, mime_type, storage_uri, extracted_text,
                             text_extract_status, indexing_status, version, archived,
                             privacy_classification, access_role_policy, audit_trail, metadata,
                             created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        """,
                        (
                            row["id"], row["owner_user_id"], row["uploaded_by_user_id"],
                            row["home_id"], row["organisation_id"], row["title"], row["document_type"],
                            row["filename"], row["mime_type"], row["storage_uri"], row["extracted_text"],
                            row["text_extract_status"], row["indexing_status"], row["version"],
                            row["archived"], row["privacy_classification"], row["access_role_policy"],
                            Json(row["audit_trail"]), Json(row["metadata"]),
                        ),
                    )
                conn.commit()
            except Exception:
                logger.exception("DB insert failed for home document %s; using memory", doc_id)
                if conn:
                    conn.rollback()
                self._user_memory(uid)[doc_id] = row
            finally:
                if conn is not None:
                    release_db_connection(conn)
        else:
            self._user_memory(uid)[doc_id] = row

        return self._row_to_record(row)

    def list_documents(
        self,
        user_id: int,
        current_user: dict[str, Any],
        request: OrbHomeDocumentListRequest,
    ) -> list[OrbHomeDocumentRecord]:
        uid = self._resolve_user_id(user_id)
        rows = self._fetch_accessible_rows(uid, current_user, include_archived=request.include_archived)

        if request.document_type:
            rows = [r for r in rows if r.get("document_type") == request.document_type]

        rows.sort(key=lambda r: _iso(r.get("updated_at")) or "", reverse=True)
        sliced = rows[request.offset : request.offset + request.limit]
        return [self._row_to_record(r) for r in sliced]

    def _fetch_accessible_rows(
        self,
        user_id: int,
        current_user: dict[str, Any],
        *,
        include_archived: bool = False,
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []

        if self._detect_storage_mode() == "database":
            conn = None
            try:
                conn = get_db_connection()
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT * FROM orb_home_documents
                        WHERE archived = FALSE OR %s = TRUE
                        ORDER BY updated_at DESC
                        """,
                        (include_archived,),
                    )
                    for row in cur.fetchall():
                        if self._can_access_document(current_user, dict(row), user_id=user_id):
                            rows.append(dict(row))
            except Exception:
                logger.exception("Failed to list home documents from DB")
            finally:
                if conn is not None:
                    release_db_connection(conn)

        for row in self._user_memory(user_id).values():
            if not include_archived and row.get("archived"):
                continue
            if self._can_access_document(current_user, row, user_id=user_id):
                if not any(r.get("id") == row.get("id") for r in rows):
                    rows.append(row)

        return rows

    def get_document(
        self,
        user_id: int,
        current_user: dict[str, Any],
        document_id: str,
    ) -> OrbHomeDocumentRecord | None:
        row = self._get_row(user_id, current_user, document_id)
        if not row:
            return None
        audit = _parse_json(row.get("audit_trail"), [])
        audit.append(self._audit_entry("read", user_id, document_id=document_id))
        row["audit_trail"] = audit
        row["updated_at"] = _now_iso()
        self._persist_row_update(row)
        return self._row_to_record(row)

    def _get_row(
        self,
        user_id: int,
        current_user: dict[str, Any],
        document_id: str,
    ) -> dict[str, Any] | None:
        mem = self._user_memory(user_id).get(document_id)
        if mem and self._can_access_document(current_user, mem, user_id=user_id):
            return mem

        if self._detect_storage_mode() == "database":
            conn = None
            try:
                conn = get_db_connection()
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM orb_home_documents WHERE id = %s", (document_id,))
                    row = cur.fetchone()
                    if row and self._can_access_document(current_user, dict(row), user_id=user_id):
                        return dict(row)
            except Exception:
                logger.exception("Failed to get home document %s", document_id)
            finally:
                if conn is not None:
                    release_db_connection(conn)

        for rows in self._memory.values():
            row = rows.get(document_id)
            if row and self._can_access_document(current_user, row, user_id=user_id):
                return row
        return None

    def _persist_row_update(self, row: dict[str, Any]) -> None:
        doc_id = str(row["id"])
        owner = int(row.get("owner_user_id") or 0)
        self._user_memory(owner)[doc_id] = row

        if self._detect_storage_mode() != "database":
            return
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE orb_home_documents
                    SET audit_trail = %s, updated_at = NOW(), archived = %s, archived_at = %s,
                        title = %s, document_type = %s, text_extract_status = %s,
                        indexing_status = %s, access_role_policy = %s, privacy_classification = %s,
                        metadata = %s
                    WHERE id = %s
                    """,
                    (
                        Json(row.get("audit_trail")), row.get("archived"), row.get("archived_at"),
                        row.get("title"), row.get("document_type"), row.get("text_extract_status"),
                        row.get("indexing_status"), row.get("access_role_policy"),
                        row.get("privacy_classification"), Json(row.get("metadata")), doc_id,
                    ),
                )
            conn.commit()
        except Exception:
            logger.exception("Failed to update home document %s", doc_id)
            if conn:
                conn.rollback()
        finally:
            if conn is not None:
                release_db_connection(conn)

    def update_document(
        self,
        user_id: int,
        current_user: dict[str, Any],
        document_id: str,
        payload: OrbHomeDocumentUpdate,
    ) -> OrbHomeDocumentRecord | None:
        row = self._get_row(user_id, current_user, document_id)
        if not row:
            return None

        audit = _parse_json(row.get("audit_trail"), [])
        changes: dict[str, Any] = {}
        if payload.title is not None:
            row["title"] = payload.title.strip()
            changes["title"] = row["title"]
        if payload.document_type is not None:
            self._validate_document_type(payload.document_type)
            row["document_type"] = payload.document_type
            changes["document_type"] = payload.document_type
        if payload.access_role_policy is not None:
            row["access_role_policy"] = payload.access_role_policy
            changes["access_role_policy"] = payload.access_role_policy
        if payload.privacy_classification is not None:
            row["privacy_classification"] = payload.privacy_classification
            changes["privacy_classification"] = payload.privacy_classification

        if changes:
            audit.append(self._audit_entry("updated", user_id, changes=changes))
            row["audit_trail"] = audit
            row["updated_at"] = _now_iso()
            self._persist_row_update(row)

        return self._row_to_record(row)

    def archive_document(
        self,
        user_id: int,
        current_user: dict[str, Any],
        document_id: str,
    ) -> OrbHomeDocumentRecord | None:
        row = self._get_row(user_id, current_user, document_id)
        if not row:
            return None

        row["archived"] = True
        row["archived_at"] = _now_iso()
        row["updated_at"] = _now_iso()
        audit = _parse_json(row.get("audit_trail"), [])
        audit.append(self._audit_entry("archived", user_id))
        row["audit_trail"] = audit
        self._persist_row_update(row)
        return self._row_to_record(row)

    def summary(
        self,
        user_id: int,
        current_user: dict[str, Any],
    ) -> OrbHomeDocumentSummary:
        rows = self._fetch_accessible_rows(user_id, current_user, include_archived=True)
        by_type: dict[str, int] = {}
        by_extract: dict[str, int] = {}
        by_index: dict[str, int] = {}
        archived = 0
        ready = 0
        failed_extract = 0
        failed_index = 0

        for row in rows:
            if row.get("archived"):
                archived += 1
            doc_type = row.get("document_type") or "other_home_policy"
            by_type[doc_type] = by_type.get(doc_type, 0) + 1
            extract_status = row.get("text_extract_status") or "pending"
            index_status = row.get("indexing_status") or "pending"
            by_extract[extract_status] = by_extract.get(extract_status, 0) + 1
            by_index[index_status] = by_index.get(index_status, 0) + 1
            if extract_status == "failed":
                failed_extract += 1
            if index_status == "failed":
                failed_index += 1
            rec = self._row_to_record(row)
            if rec.ready_for_orb_use:
                ready += 1

        return OrbHomeDocumentSummary(
            total=len(rows),
            archived=archived,
            ready_for_orb_use=ready,
            by_document_type=by_type,
            by_text_extract_status=by_extract,
            by_indexing_status=by_index,
            failed_extraction_count=failed_extract,
            failed_indexing_count=failed_index,
        )

    def founder_analytics(self) -> dict[str, Any]:
        from services.orb_founder_analytics_foundation_service import orb_founder_analytics_foundation_service

        rows: list[dict[str, Any]] = []
        if self._detect_storage_mode() == "database":
            conn = None
            try:
                conn = get_db_connection()
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT document_type, text_extract_status, indexing_status,
                               organisation_id, archived
                        FROM orb_home_documents
                        """
                    )
                    rows = [dict(r) for r in cur.fetchall()]
            except Exception:
                logger.exception("Failed to load founder home document analytics")
            finally:
                if conn is not None:
                    release_db_connection(conn)

        for user_rows in self._memory.values():
            for row in user_rows.values():
                rows.append({
                    "document_type": row.get("document_type"),
                    "text_extract_status": row.get("text_extract_status"),
                    "indexing_status": row.get("indexing_status"),
                    "organisation_id": row.get("organisation_id"),
                    "archived": row.get("archived"),
                })

        by_type: dict[str, int] = {}
        by_extract: dict[str, int] = {}
        by_index: dict[str, int] = {}
        orgs: set[str] = set()
        failed_extract = 0
        failed_index = 0

        for row in rows:
            if row.get("archived"):
                continue
            doc_type = row.get("document_type") or "other_home_policy"
            by_type[doc_type] = by_type.get(doc_type, 0) + 1
            extract_status = row.get("text_extract_status") or "pending"
            index_status = row.get("indexing_status") or "pending"
            by_extract[extract_status] = by_extract.get(extract_status, 0) + 1
            by_index[index_status] = by_index.get(index_status, 0) + 1
            if extract_status == "failed":
                failed_extract += 1
            if index_status == "failed":
                failed_index += 1
            org = row.get("organisation_id")
            if org:
                orgs.add(str(org))

        payload = {
            "upload_count": sum(by_type.values()),
            "by_document_type": by_type,
            "by_text_extract_status": by_extract,
            "by_indexing_status": by_index,
            "failed_extraction_count": failed_extract,
            "failed_indexing_count": failed_index,
            "organisations_with_uploads": len(orgs),
            "identifiers_redacted": True,
            "disclaimer": orb_founder_analytics_foundation_service.disclaimer(),
        }
        return orb_founder_analytics_foundation_service.redact_identifiers_by_default(payload)

    def get_chunks_for_document(self, document_id: str) -> list[dict[str, Any]]:
        if document_id in self._memory_chunks:
            return list(self._memory_chunks[document_id])

        if self._detect_storage_mode() != "database":
            return []

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT * FROM orb_home_document_chunks
                    WHERE document_id = %s ORDER BY chunk_index
                    """,
                    (document_id,),
                )
                return [dict(r) for r in cur.fetchall()]
        except Exception:
            logger.exception("Failed to load chunks for %s", document_id)
            return []
        finally:
            if conn is not None:
                release_db_connection(conn)


orb_home_documents_service = OrbHomeDocumentsService()
