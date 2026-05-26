"""LifeEcho memory suggestions and approved memories — review before publish."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from schemas.child_archive import ChildArchiveRecord
from schemas.lifeecho import (
    LifeEchoListResponse,
    LifeEchoMemory,
    LifeEchoMemoryFilter,
    LifeEchoMemorySuggestion,
    LifeEchoUploadRequest,
)
from schemas.recording_drafts import RecordingDraftRecord

logger = logging.getLogger("indicare.lifeecho_memory")

POSITIVE_TRIGGERS = frozenset(
    {
        "daily-note",
        "keywork",
        "education-note",
        "family-time",
        "child-voice",
        "achievement",
        "birthday",
        "hobby",
        "pep",
    }
)

NEGATIVE_TRIGGERS = frozenset(
    {
        "safeguarding-concern",
        "incident",
        "physical-intervention",
        "restraint",
        "injury-body-map",
        "missing",
        "medication-error",
        "allegation",
        "disclosure",
    }
)


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_display_name(current_user: dict[str, Any]) -> str:
    first = _text(current_user.get("first_name"))
    last = _text(current_user.get("last_name"))
    if first or last:
        return f"{first} {last}".strip()
    return _text(current_user.get("email"), "User")


class LifeEchoMemoryService:
    def __init__(self) -> None:
        self._memories: dict[str, dict[str, Any]] = {}
        self._suggestions: dict[str, dict[str, Any]] = {}
        self._storage_mode: str = "memory"

    def _detect_storage_mode(self) -> str:
        try:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'lifeecho_memories'
                        """
                    )
                    self._storage_mode = "postgresql" if cur.fetchone() else "memory"
            finally:
                release_db_connection(conn)
        except (DatabaseUnavailableError, Exception):
            self._storage_mode = "memory"
        return self._storage_mode

    def should_suggest_from_archive(self, archive_record: ChildArchiveRecord) -> bool:
        if archive_record.safeguarding_sensitive:
            return False
        key = archive_record.source_type.replace("_", "-").lower()
        if key in NEGATIVE_TRIGGERS:
            return False
        if key in POSITIVE_TRIGGERS:
            return True
        body_hint = (archive_record.safe_summary or "").lower()
        return any(word in body_hint for word in ("achievement", "proud", "enjoyed", "smiled", "success", "birthday"))

    def suggest_from_archive(
        self,
        archive_record: ChildArchiveRecord,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> LifeEchoMemorySuggestion | None:
        if not self.should_suggest_from_archive(archive_record):
            return None
        suggestion = LifeEchoMemorySuggestion(
            id=f"lifeecho_sug_{uuid4().hex[:14]}",
            child_id=archive_record.child_id,
            home_id=archive_record.home_id,
            title=archive_record.title,
            safe_summary=archive_record.safe_summary[:400],
            kind="positive_moment",
            archive_record_id=archive_record.id,
            source_type=archive_record.source_type,
            source_id=archive_record.source_id,
            status="suggested",
            review_required=True,
        )
        return self._store_suggestion(suggestion, conn=conn)

    def suggest_from_draft(
        self,
        draft: RecordingDraftRecord,
        archive_record_id: str | None,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> LifeEchoMemorySuggestion | None:
        if draft.safeguarding_sensitive:
            return None
        key = draft.recording_type.replace("_", "-").lower()
        if key in NEGATIVE_TRIGGERS:
            return None
        if key not in POSITIVE_TRIGGERS and draft.child_id is None:
            return None
        from services.child_archive_service import child_archive_service

        safe = child_archive_service.build_safe_summary(
            title=draft.title,
            recording_type=draft.recording_type,
            structured_summary=(draft.metadata or {}).get("structured_summary"),
            safeguarding_sensitive=False,
        )
        suggestion = LifeEchoMemorySuggestion(
            id=f"lifeecho_sug_{uuid4().hex[:14]}",
            child_id=int(draft.child_id),
            home_id=draft.home_id,
            title=_text(draft.title, "LifeEcho moment"),
            safe_summary=safe[:400],
            kind="achievement" if "education" in key else "positive_moment",
            archive_record_id=archive_record_id,
            source_type=draft.recording_type,
            source_id=draft.id,
            status="suggested",
            review_required=True,
        )
        return self._store_suggestion(suggestion, conn=conn)

    def _store_suggestion(
        self,
        suggestion: LifeEchoMemorySuggestion,
        *,
        conn: Any | None,
    ) -> LifeEchoMemorySuggestion:
        payload = suggestion.model_dump()
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO lifeecho_memory_suggestions (
                        id, child_id, home_id, title, safe_summary, kind,
                        archive_record_id, source_type, source_id, status, review_required, metadata
                    ) VALUES (
                        %(id)s, %(child_id)s, %(home_id)s, %(title)s, %(safe_summary)s, %(kind)s,
                        %(archive_record_id)s, %(source_type)s, %(source_id)s, %(status)s,
                        %(review_required)s, '{}'::jsonb
                    )
                    ON CONFLICT (id) DO NOTHING
                    """,
                    payload,
                )
            conn.commit()
        else:
            self._suggestions[suggestion.id] = payload
        return suggestion

    def list_for_child(
        self,
        filters: LifeEchoMemoryFilter,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> LifeEchoListResponse:
        _ = current_user
        memories: list[LifeEchoMemory] = []
        suggestions: list[LifeEchoMemorySuggestion] = []
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM lifeecho_memories WHERE child_id = %s ORDER BY created_at DESC",
                    (filters.child_id,),
                )
                for row in cur.fetchall():
                    memories.append(LifeEchoMemory.model_validate(dict(row)))
                if filters.include_suggestions:
                    cur.execute(
                        "SELECT * FROM lifeecho_memory_suggestions WHERE child_id = %s AND status = 'suggested'",
                        (filters.child_id,),
                    )
                    for row in cur.fetchall():
                        suggestions.append(LifeEchoMemorySuggestion.model_validate(dict(row)))
        else:
            for row in self._memories.values():
                if row.get("child_id") == filters.child_id:
                    memories.append(LifeEchoMemory.model_validate(row))
            if filters.include_suggestions:
                for row in self._suggestions.values():
                    if row.get("child_id") == filters.child_id and row.get("status") == "suggested":
                        suggestions.append(LifeEchoMemorySuggestion.model_validate(row))
        return LifeEchoListResponse(
            memories=memories,
            suggestions=suggestions,
            total=len(memories) + len(suggestions),
        )

    def approve_suggestion(
        self,
        suggestion_id: str,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> LifeEchoMemory | None:
        suggestion = self._get_suggestion(suggestion_id, conn=conn)
        if not suggestion:
            return None
        memory = LifeEchoMemory(
            id=f"lifeecho_mem_{uuid4().hex[:14]}",
            child_id=suggestion.child_id,
            home_id=suggestion.home_id,
            title=suggestion.title,
            safe_summary=suggestion.safe_summary,
            kind=suggestion.kind,
            status="approved",
            archive_record_id=suggestion.archive_record_id,
            approved_by_user_id=_user_id(current_user),
            approved_at=_now_iso(),
            created_by_user_id=_user_id(current_user),
            created_by_name=_user_display_name(current_user),
        )
        self._store_memory(memory, conn=conn)
        suggestion.status = "approved"
        self._store_suggestion(suggestion, conn=conn)
        return memory

    def reject_suggestion(
        self,
        suggestion_id: str,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> LifeEchoMemorySuggestion | None:
        _ = current_user
        suggestion = self._get_suggestion(suggestion_id, conn=conn)
        if not suggestion:
            return None
        suggestion.status = "rejected"
        return self._store_suggestion(suggestion, conn=conn)

    def upload_memory(
        self,
        child_id: int,
        request: LifeEchoUploadRequest,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> LifeEchoMemory:
        memory = LifeEchoMemory(
            id=f"lifeecho_mem_{uuid4().hex[:14]}",
            child_id=child_id,
            title=request.title,
            safe_summary=request.safe_summary or request.title,
            kind=request.kind,
            status="approved",
            photo_path=request.photo_path,
            event_date=request.event_date,
            tags=list(request.tags),
            created_by_user_id=_user_id(current_user),
            created_by_name=_user_display_name(current_user),
            approved_by_user_id=_user_id(current_user),
            approved_at=_now_iso(),
        )
        return self._store_memory(memory, conn=conn)

    def _get_suggestion(self, suggestion_id: str, conn: Any | None) -> LifeEchoMemorySuggestion | None:
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM lifeecho_memory_suggestions WHERE id = %s", (suggestion_id,))
                row = cur.fetchone()
                return LifeEchoMemorySuggestion.model_validate(dict(row)) if row else None
        row = self._suggestions.get(suggestion_id)
        return LifeEchoMemorySuggestion.model_validate(row) if row else None

    def _store_memory(self, memory: LifeEchoMemory, conn: Any | None) -> LifeEchoMemory:
        payload = memory.model_dump()
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO lifeecho_memories (
                        id, child_id, home_id, title, safe_summary, kind, status,
                        archive_record_id, photo_path, event_date, created_by_user_id,
                        created_by_name, approved_by_user_id, approved_at, tags, metadata
                    ) VALUES (
                        %(id)s, %(child_id)s, %(home_id)s, %(title)s, %(safe_summary)s,
                        %(kind)s, %(status)s, %(archive_record_id)s, %(photo_path)s,
                        %(event_date)s, %(created_by_user_id)s, %(created_by_name)s,
                        %(approved_by_user_id)s, %(approved_at)s, %(tags)s, '{}'::jsonb
                    )
                    ON CONFLICT (id) DO NOTHING
                    """,
                    {**payload, "tags": Json(payload["tags"])},
                )
            conn.commit()
        else:
            self._memories[memory.id] = payload
        return memory


lifeecho_memory_service = LifeEchoMemoryService()
