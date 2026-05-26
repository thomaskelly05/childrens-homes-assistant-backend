"""Formal child archive for signed-off records — safe summaries only."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.child_archive import (
    ChildArchiveFilter,
    ChildArchiveHealth,
    ChildArchiveListResponse,
    ChildArchiveRecord,
)
from schemas.recording_drafts import RecordingDraftRecord

logger = logging.getLogger("indicare.child_archive")

SAFEGUARDING_PLACEHOLDER = (
    "Safeguarding-related record signed off. Review the formal record for full detail."
)


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_display_name(current_user: dict[str, Any]) -> str:
    first = _text(current_user.get("first_name"))
    last = _text(current_user.get("last_name"))
    if first or last:
        return f"{first} {last}".strip()
    return _text(current_user.get("email"), "User")


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _is_manager_role(current_user: dict[str, Any]) -> bool:
    return _user_role(current_user) in {r.lower() for r in MANAGER_ROLES}


class ChildArchiveService:
    def __init__(self) -> None:
        self._memory: dict[str, dict[str, Any]] = {}
        self._storage_mode: str = "memory"

    def _detect_storage_mode(self) -> str:
        try:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'child_archive_records'
                        """
                    )
                    self._storage_mode = "postgresql" if cur.fetchone() else "memory"
            finally:
                release_db_connection(conn)
        except (DatabaseUnavailableError, Exception):
            self._storage_mode = "memory"
        return self._storage_mode

    def get_health(self, conn: Any | None = None) -> ChildArchiveHealth:
        mode = self._detect_storage_mode()
        if mode == "postgresql" and conn is not None:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM child_archive_records")
                row = cur.fetchone()
                count = int(row[0]) if row else 0
        else:
            count = len(self._memory)
        return ChildArchiveHealth(
            status="ready",
            storage_mode=mode,
            record_count=count,
            persistence_available=mode == "postgresql",
        )

    def enforce_access(
        self,
        child_id: int | None,
        home_id: int | None,
        current_user: dict[str, Any],
    ) -> bool:
        if not current_user:
            return False
        if _is_manager_role(current_user):
            return True
        if child_id is None and home_id is None:
            return False
        user_home = current_user.get("home_id")
        allowed = current_user.get("allowed_home_ids") or []
        try:
            allowed_set = {int(h) for h in allowed if h is not None}
        except (TypeError, ValueError):
            allowed_set = set()
        if user_home is not None:
            try:
                allowed_set.add(int(user_home))
            except (TypeError, ValueError):
                pass
        if home_id is not None and int(home_id) in allowed_set:
            return True
        return bool(child_id)

    def build_safe_summary(
        self,
        *,
        title: str = "",
        recording_type: str = "",
        structured_summary: Any = None,
        body_excerpt: str = "",
        safeguarding_sensitive: bool = False,
    ) -> str:
        if safeguarding_sensitive:
            base = _text(title) or _text(recording_type, "Record")
            return f"{base}. {SAFEGUARDING_PLACEHOLDER}"
        parts: list[str] = []
        if title:
            parts.append(_text(title))
        if isinstance(structured_summary, dict):
            text_block = structured_summary.get("text") or structured_summary.get("lines")
            if isinstance(text_block, str) and text_block.strip():
                parts.append(text_block.strip()[:400])
            elif isinstance(text_block, list):
                parts.append("; ".join(str(line) for line in text_block[:5])[:400])
        elif isinstance(structured_summary, str) and structured_summary.strip():
            parts.append(structured_summary.strip()[:400])
        if body_excerpt and not safeguarding_sensitive:
            clean = re.sub(r"\s+", " ", body_excerpt.strip())[:280]
            if clean:
                parts.append(clean)
        summary = ". ".join(p for p in parts if p) or _text(recording_type, "Signed-off record")
        return summary[:500]

    def _row_to_record(self, row: dict[str, Any]) -> ChildArchiveRecord:
        return ChildArchiveRecord(
            id=_text(row.get("id")),
            child_id=int(row["child_id"]),
            home_id=row.get("home_id"),
            title=_text(row.get("title")),
            safe_summary=_text(row.get("safe_summary")),
            record_type=row.get("record_type") or "recording",
            source_type=_text(row.get("source_type")),
            source_id=row.get("source_id"),
            source_route=row.get("source_route"),
            event_date=str(row["event_date"]) if row.get("event_date") else None,
            recorded_at=str(row["recorded_at"]) if row.get("recorded_at") else None,
            signed_off_at=str(row["signed_off_at"]) if row.get("signed_off_at") else None,
            signed_off_by_user_id=row.get("signed_off_by_user_id"),
            signed_off_by_name=row.get("signed_off_by_name"),
            author_user_id=row.get("author_user_id"),
            author_name=row.get("author_name"),
            author_role=row.get("author_role"),
            manager_review_required=bool(row.get("manager_review_required")),
            safeguarding_sensitive=bool(row.get("safeguarding_sensitive")),
            privacy_sensitive=bool(row.get("privacy_sensitive")),
            chronology_event_id=row.get("chronology_event_id"),
            lifeecho_memory_id=row.get("lifeecho_memory_id"),
            plan_impact_ids=_parse_json(row.get("plan_impact_ids"), []),
            action_ids=_parse_json(row.get("action_ids"), []),
            tags=_parse_json(row.get("tags"), []),
            status=row.get("status") or "signed_off",
            metadata=_parse_json(row.get("metadata"), {}),
        )

    def _find_by_source(self, source_type: str, source_id: str, conn: Any | None) -> ChildArchiveRecord | None:
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT * FROM child_archive_records
                    WHERE source_type = %s AND source_id = %s LIMIT 1
                    """,
                    (source_type, source_id),
                )
                row = cur.fetchone()
                return self._row_to_record(dict(row)) if row else None
        for row in self._memory.values():
            if row.get("source_type") == source_type and row.get("source_id") == source_id:
                return self._row_to_record(row)
        return None

    def create_from_signed_off_record(
        self,
        draft: RecordingDraftRecord,
        formal_record: dict[str, Any] | None,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChildArchiveRecord | None:
        if draft.child_id is None:
            return None
        if not formal_record or formal_record.get("id") is None:
            return None
        if draft.review_status in {
            "manager_review_required",
            "safeguarding_review_required",
            "awaiting_review",
        }:
            return None

        child_id = int(draft.child_id)
        if not self.enforce_access(child_id, draft.home_id, current_user):
            return None

        source_type = _text(draft.recording_type, "recording")
        source_id = str(formal_record.get("id"))
        existing = self._find_by_source(source_type, source_id, conn)
        if existing:
            return existing

        workflow = formal_record.get("workflow") if isinstance(formal_record.get("workflow"), dict) else {}
        chronology_id = workflow.get("chronology_event_id")
        structured = draft.structured_summary if hasattr(draft, "structured_summary") else None
        if structured is None:
            structured = (draft.metadata or {}).get("structured_summary")

        record = ChildArchiveRecord(
            id=f"archive_{uuid4().hex[:16]}",
            child_id=child_id,
            home_id=draft.home_id,
            title=_text(draft.title, source_type.replace("-", " ").title()),
            safe_summary=self.build_safe_summary(
                title=draft.title,
                recording_type=draft.recording_type,
                structured_summary=structured,
                body_excerpt="",
                safeguarding_sensitive=bool(draft.safeguarding_sensitive),
            ),
            record_type="incident" if "incident" in source_type else "recording",
            source_type=source_type,
            source_id=source_id,
            source_route=f"/young-people/{child_id}",
            event_date=_text((draft.metadata or {}).get("event_date")) or None,
            recorded_at=draft.updated_at or draft.created_at,
            signed_off_at=_now_iso(),
            signed_off_by_user_id=_user_id(current_user),
            signed_off_by_name=_user_display_name(current_user),
            author_user_id=draft.created_by_user_id,
            author_name=draft.created_by_name,
            author_role=draft.created_by_role,
            manager_review_required=bool(draft.manager_review_required),
            safeguarding_sensitive=bool(draft.safeguarding_sensitive),
            privacy_sensitive=bool(draft.privacy_sensitive),
            chronology_event_id=str(chronology_id) if chronology_id else None,
            tags=[source_type],
            status="signed_off",
            metadata={"draft_id": draft.id, "formal_record_type": formal_record.get("formal_record_type")},
        )
        return self.upsert_archive_record(record, current_user, conn=conn)

    def create_from_document(
        self,
        document: dict[str, Any],
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChildArchiveRecord | None:
        child_id = document.get("young_person_id") or document.get("child_id")
        if child_id is None:
            return None
        child_id = int(child_id)
        status = _text(document.get("status")).lower()
        if status in {"draft", "awaiting_review"}:
            return None
        if not self.enforce_access(child_id, document.get("home_id"), current_user):
            return None

        doc_type = _text(document.get("document_type") or document.get("type"), "document")
        source_id = str(document.get("id") or document.get("document_id") or "")
        if source_id:
            existing = self._find_by_source(doc_type, source_id, conn)
            if existing:
                return existing

        record = ChildArchiveRecord(
            id=f"archive_{uuid4().hex[:16]}",
            child_id=child_id,
            home_id=document.get("home_id"),
            title=_text(document.get("title"), doc_type),
            safe_summary=_text(document.get("summary") or document.get("safe_summary"), f"{doc_type} signed off."),
            record_type="document",
            source_type=doc_type,
            source_id=source_id or None,
            source_route=f"/young-people/{child_id}/documents/{source_id}" if source_id else None,
            signed_off_at=_now_iso(),
            signed_off_by_user_id=_user_id(current_user),
            signed_off_by_name=_user_display_name(current_user),
            status="signed_off",
            tags=[doc_type],
            metadata={"document": True},
        )
        return self.upsert_archive_record(record, current_user, conn=conn)

    def upsert_archive_record(
        self,
        record: ChildArchiveRecord,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChildArchiveRecord:
        if not self.enforce_access(record.child_id, record.home_id, current_user):
            raise PermissionError("Archive access denied for this child/home scope.")

        payload = record.model_dump()
        mode = self._detect_storage_mode()
        if mode == "postgresql" and conn is not None and hasattr(conn, "cursor"):
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO child_archive_records (
                            id, child_id, home_id, title, safe_summary, record_type, source_type,
                            source_id, source_route, event_date, recorded_at, signed_off_at,
                            signed_off_by_user_id, signed_off_by_name, author_user_id, author_name,
                            author_role, manager_review_required, safeguarding_sensitive,
                            privacy_sensitive, chronology_event_id, lifeecho_memory_id,
                            plan_impact_ids, action_ids, tags, status, metadata, updated_at
                        ) VALUES (
                            %(id)s, %(child_id)s, %(home_id)s, %(title)s, %(safe_summary)s,
                            %(record_type)s, %(source_type)s, %(source_id)s, %(source_route)s,
                            %(event_date)s, %(recorded_at)s, %(signed_off_at)s,
                            %(signed_off_by_user_id)s, %(signed_off_by_name)s, %(author_user_id)s,
                            %(author_name)s, %(author_role)s, %(manager_review_required)s,
                            %(safeguarding_sensitive)s, %(privacy_sensitive)s, %(chronology_event_id)s,
                            %(lifeecho_memory_id)s, %(plan_impact_ids)s, %(action_ids)s, %(tags)s,
                            %(status)s, %(metadata)s, NOW()
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            chronology_event_id = EXCLUDED.chronology_event_id,
                            lifeecho_memory_id = EXCLUDED.lifeecho_memory_id,
                            plan_impact_ids = EXCLUDED.plan_impact_ids,
                            action_ids = EXCLUDED.action_ids,
                            safe_summary = EXCLUDED.safe_summary,
                            updated_at = NOW()
                        """,
                        {
                            **payload,
                            "plan_impact_ids": Json(payload["plan_impact_ids"]),
                            "action_ids": Json(payload["action_ids"]),
                            "tags": Json(payload["tags"]),
                            "metadata": Json(payload["metadata"]),
                        },
                    )
                if hasattr(conn, "commit"):
                    conn.commit()
            except Exception:
                logger.debug("Archive DB upsert failed; using memory", exc_info=True)
                self._memory[record.id] = payload
        else:
            self._memory[record.id] = payload
        return record

    def _matches_filters(self, rec: ChildArchiveRecord, filters: ChildArchiveFilter) -> bool:
        if rec.status in {"draft", "awaiting_review"}:
            return False
        if filters.child_id is not None and rec.child_id != filters.child_id:
            return False
        if filters.home_id is not None and rec.home_id != filters.home_id:
            return False
        if filters.record_type and rec.record_type != filters.record_type:
            return False
        if filters.source_type and rec.source_type != filters.source_type:
            return False
        if filters.author_user_id and rec.author_user_id != filters.author_user_id:
            return False
        if filters.signed_off_by_user_id and rec.signed_off_by_user_id != filters.signed_off_by_user_id:
            return False
        if filters.search and filters.search.lower() not in f"{rec.title} {rec.safe_summary}".lower():
            return False
        if filters.tags:
            tag_set = {t.lower() for t in filters.tags}
            record_tags = {t.lower() for t in (rec.tags or [])}
            if not tag_set.intersection(record_tags):
                return False
        compare_date = rec.event_date or rec.signed_off_at or rec.recorded_at or ""
        if filters.date_from and compare_date and compare_date[:10] < filters.date_from[:10]:
            return False
        if filters.date_to and compare_date and compare_date[:10] > filters.date_to[:10]:
            return False
        return True

    def list_archive(
        self,
        filters: ChildArchiveFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChildArchiveListResponse:
        page = max(1, filters.page)
        page_size = min(max(1, filters.page_size), 200)
        filters = filters.model_copy(update={"page": page, "page_size": page_size})

        records: list[ChildArchiveRecord] = []
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            clauses = ["status NOT IN ('draft', 'awaiting_review')"]
            params: list[Any] = []
            if filters.child_id is not None:
                clauses.append("child_id = %s")
                params.append(filters.child_id)
            if filters.home_id is not None:
                clauses.append("home_id = %s")
                params.append(filters.home_id)
            if filters.record_type:
                clauses.append("record_type = %s")
                params.append(filters.record_type)
            if filters.source_type:
                clauses.append("source_type = %s")
                params.append(filters.source_type)
            if filters.author_user_id:
                clauses.append("author_user_id = %s")
                params.append(filters.author_user_id)
            if filters.signed_off_by_user_id:
                clauses.append("signed_off_by_user_id = %s")
                params.append(filters.signed_off_by_user_id)
            if filters.date_from:
                clauses.append(
                    "COALESCE(event_date::text, signed_off_at::text, recorded_at::text, '') >= %s"
                )
                params.append(filters.date_from[:10])
            if filters.date_to:
                clauses.append(
                    "COALESCE(event_date::text, signed_off_at::text, recorded_at::text, '') <= %s"
                )
                params.append(filters.date_to[:10])
            if filters.search:
                clauses.append("(title ILIKE %s OR safe_summary ILIKE %s)")
                params.extend([f"%{filters.search}%", f"%{filters.search}%"])
            where = " AND ".join(clauses)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"SELECT * FROM child_archive_records WHERE {where} ORDER BY signed_off_at DESC NULLS LAST",
                    params,
                )
                for row in cur.fetchall():
                    rec = self._row_to_record(dict(row))
                    if not self._matches_filters(rec, filters):
                        continue
                    if self.enforce_access(rec.child_id, rec.home_id, current_user):
                        records.append(rec)
        else:
            for row in self._memory.values():
                rec = self._row_to_record(row)
                if not self._matches_filters(rec, filters):
                    continue
                if self.enforce_access(rec.child_id, rec.home_id, current_user):
                    records.append(rec)
            records.sort(key=lambda r: r.signed_off_at or "", reverse=True)

        total = len(records)
        start = (filters.page - 1) * filters.page_size
        page_records = records[start : start + filters.page_size]
        return ChildArchiveListResponse(
            records=page_records,
            total=total,
            page=filters.page,
            page_size=filters.page_size,
        )

    def get_archive_record(
        self,
        record_id: str,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChildArchiveRecord | None:
        row: dict[str, Any] | None = None
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM child_archive_records WHERE id = %s", (record_id,))
                fetched = cur.fetchone()
                row = dict(fetched) if fetched else None
        else:
            row = self._memory.get(record_id)
        if not row:
            return None
        rec = self._row_to_record(row)
        if not self.enforce_access(rec.child_id, rec.home_id, current_user):
            return None
        return rec

    def link_chronology(
        self,
        record_id: str,
        chronology_event_id: str,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChildArchiveRecord | None:
        rec = self.get_archive_record(record_id, current_user, conn=conn)
        if not rec:
            return None
        rec.chronology_event_id = chronology_event_id
        return self.upsert_archive_record(rec, current_user, conn=conn)

    def link_lifeecho(
        self,
        record_id: str,
        memory_id: str,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChildArchiveRecord | None:
        rec = self.get_archive_record(record_id, current_user, conn=conn)
        if not rec:
            return None
        rec.lifeecho_memory_id = memory_id
        return self.upsert_archive_record(rec, current_user, conn=conn)

    def link_plan_impacts(
        self,
        record_id: str,
        impact_ids: list[str],
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> ChildArchiveRecord | None:
        rec = self.get_archive_record(record_id, current_user, conn=conn)
        if not rec:
            return None
        rec.plan_impact_ids = list(impact_ids)
        return self.upsert_archive_record(rec, current_user, conn=conn)


child_archive_service = ChildArchiveService()
