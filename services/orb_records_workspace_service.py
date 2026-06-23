"""Canonical ORB Records Workspace — server-backed persistence with memory fallback."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from schemas.orb_records_workspace import (
    OrbRecordItemStatus,
    OrbRecordWorkspaceCreate,
    OrbRecordWorkspaceHealth,
    OrbRecordWorkspaceItem,
    OrbRecordWorkspaceListRequest,
    OrbRecordWorkspaceListResponse,
    OrbRecordWorkspaceSummary,
    OrbRecordWorkspaceUpdate,
)

logger = logging.getLogger("indicare.orb_records_workspace")

MIGRATION_210_PATH = "sql/210_orb_records_workspace.sql"

MANAGEMENT_OVERSIGHT_ROLES = frozenset(
    {
        "admin",
        "manager",
        "registered_manager",
        "deputy_manager",
        "safeguarding_lead",
        "senior",
        "responsible_individual",
    }
)

VALID_TRANSITIONS: dict[str, frozenset[str]] = {
    "draft": frozenset({"reviewed", "archived"}),
    "reviewed": frozenset({"finalised", "draft", "archived"}),
    "finalised": frozenset({"archived"}),
    "archived": frozenset(),
}

REVIEW_BEFORE_USE_DISCLAIMER = (
    "ORB drafts are for adult review before use. They do not guarantee compliance "
    "and are not automatically added to IndiCare OS care records."
)


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


class OrbRecordsWorkspaceService:
    def __init__(self) -> None:
        self._memory: dict[int, dict[str, dict[str, Any]]] = {}
        self._storage_mode: str = "memory"

    @staticmethod
    def _resolve_user_id(user_id: int) -> int:
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
                    WHERE table_schema = 'public' AND table_name = 'orb_records_workspace'
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

    def health(self) -> OrbRecordWorkspaceHealth:
        mode = self._detect_storage_mode()
        return OrbRecordWorkspaceHealth(
            status="live",
            persistence_status=mode,
            review_before_use_disclaimer=REVIEW_BEFORE_USE_DISCLAIMER,
        )

    @staticmethod
    def can_view_other_users_items(role: str | None) -> bool:
        return _text(role).lower() in MANAGEMENT_OVERSIGHT_ROLES

    def _audit_entry(self, action: str, user_id: int, **extra: Any) -> dict[str, Any]:
        entry: dict[str, Any] = {
            "action": action,
            "actor_user_id": str(user_id),
            "at": _now_iso(),
        }
        entry.update(extra)
        return entry

    def _row_to_item(self, row: dict[str, Any]) -> OrbRecordWorkspaceItem:
        return OrbRecordWorkspaceItem(
            id=str(row["id"]),
            owner_user_id=str(row["owner_user_id"]),
            home_id=row.get("home_id"),
            organisation_id=row.get("organisation_id"),
            child_id=row.get("child_id"),
            workspace_section=row.get("workspace_section") or "my_drafts",
            category=row.get("category"),
            template_id=row.get("template_id"),
            source_station=row.get("source_station") or "manual",
            title=row["title"],
            body=row.get("body"),
            status=row.get("status") or "draft",
            privacy_classification=row.get("privacy_classification") or "standard",
            retention_policy=row.get("retention_policy") or "operational_draft",
            created_at=_iso(row.get("created_at")) or _now_iso(),
            updated_at=_iso(row.get("updated_at")) or _now_iso(),
            reviewed_at=_iso(row.get("reviewed_at")),
            finalised_at=_iso(row.get("finalised_at")),
            exported_at=_iso(row.get("exported_at")),
            audit_trail=_parse_json(row.get("audit_trail"), []),
            retention_metadata=_parse_json(row.get("retention_metadata"), {}),
            metadata=_parse_json(row.get("metadata"), {}),
        )

    def _memory_row(self, user_id: int, item_id: str) -> dict[str, Any] | None:
        return self._user_memory(user_id).get(item_id)

    def _save_memory_row(self, user_id: int, row: dict[str, Any]) -> OrbRecordWorkspaceItem:
        self._user_memory(user_id)[str(row["id"])] = row
        return self._row_to_item(row)

    def create_item(
        self,
        user_id: int,
        payload: OrbRecordWorkspaceCreate,
        *,
        role: str | None = None,
    ) -> OrbRecordWorkspaceItem:
        uid = self._resolve_user_id(user_id)
        now = _now_iso()
        item_id = str(uuid4())
        metadata = dict(payload.metadata or {})
        metadata.setdefault("review_before_use_disclaimer", REVIEW_BEFORE_USE_DISCLAIMER)
        # Preserve source metadata without embedding source chips as visible prose.
        if metadata.get("source_chips"):
            metadata["source_chips_metadata"] = metadata.pop("source_chips")

        row: dict[str, Any] = {
            "id": item_id,
            "owner_user_id": str(uid),
            "home_id": payload.home_id,
            "organisation_id": payload.organisation_id,
            "child_id": payload.child_id,
            "workspace_section": payload.workspace_section,
            "category": payload.category,
            "template_id": payload.template_id,
            "source_station": payload.source_station,
            "title": payload.title,
            "body": payload.body,
            "status": payload.status,
            "privacy_classification": payload.privacy_classification,
            "retention_policy": payload.retention_policy,
            "created_at": now,
            "updated_at": now,
            "reviewed_at": None,
            "finalised_at": None,
            "exported_at": None,
            "audit_trail": [self._audit_entry("create", uid, source_station=payload.source_station)],
            "retention_metadata": {},
            "metadata": metadata,
        }

        if self._detect_storage_mode() == "database":
            return self._create_db(uid, row)
        return self._save_memory_row(uid, row)

    def _create_db(self, user_id: int, row: dict[str, Any]) -> OrbRecordWorkspaceItem:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO orb_records_workspace (
                        id, owner_user_id, home_id, organisation_id, child_id,
                        workspace_section, category, template_id, source_station,
                        title, body, status, privacy_classification, retention_policy,
                        created_at, updated_at, reviewed_at, finalised_at, exported_at,
                        audit_trail, retention_metadata, metadata
                    ) VALUES (
                        %(id)s, %(owner_user_id)s, %(home_id)s, %(organisation_id)s, %(child_id)s,
                        %(workspace_section)s, %(category)s, %(template_id)s, %(source_station)s,
                        %(title)s, %(body)s, %(status)s, %(privacy_classification)s, %(retention_policy)s,
                        %(created_at)s, %(updated_at)s, %(reviewed_at)s, %(finalised_at)s, %(exported_at)s,
                        %(audit_trail)s, %(retention_metadata)s, %(metadata)s
                    )
                    RETURNING *
                    """,
                    {
                        **row,
                        "owner_user_id": user_id,
                        "audit_trail": Json(row["audit_trail"]),
                        "retention_metadata": Json(row["retention_metadata"]),
                        "metadata": Json(row["metadata"]),
                    },
                )
                created = cur.fetchone()
            conn.commit()
            return self._row_to_item(dict(created))
        except Exception:
            if conn is not None:
                conn.rollback()
            logger.exception("orb_records_workspace create failed; falling back to memory")
            self._storage_mode = "memory"
            return self._save_memory_row(user_id, row)
        finally:
            if conn is not None:
                release_db_connection(conn)

    def get_item(
        self,
        user_id: int,
        item_id: str,
        *,
        role: str | None = None,
        allow_oversight: bool = False,
    ) -> OrbRecordWorkspaceItem | None:
        uid = self._resolve_user_id(user_id)
        if self._detect_storage_mode() == "database":
            item = self._get_db(item_id, viewer_id=uid, role=role, allow_oversight=allow_oversight)
            if item:
                return item
        row = self._memory_row(uid, item_id)
        if row and str(row.get("owner_user_id")) == str(uid):
            return self._row_to_item(row)
        if allow_oversight and self.can_view_other_users_items(role):
            for store in self._memory.values():
                if item_id in store:
                    return self._row_to_item(store[item_id])
        return None

    def _get_db(
        self,
        item_id: str,
        *,
        viewer_id: int,
        role: str | None,
        allow_oversight: bool,
    ) -> OrbRecordWorkspaceItem | None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                if allow_oversight and self.can_view_other_users_items(role):
                    cur.execute("SELECT * FROM orb_records_workspace WHERE id = %s", (item_id,))
                else:
                    cur.execute(
                        "SELECT * FROM orb_records_workspace WHERE id = %s AND owner_user_id = %s",
                        (item_id, viewer_id),
                    )
                row = cur.fetchone()
            return self._row_to_item(dict(row)) if row else None
        except Exception:
            logger.exception("orb_records_workspace get failed")
            return None
        finally:
            if conn is not None:
                release_db_connection(conn)

    def list_items(
        self,
        user_id: int,
        request: OrbRecordWorkspaceListRequest,
        *,
        role: str | None = None,
        allow_oversight: bool = False,
    ) -> OrbRecordWorkspaceListResponse:
        uid = self._resolve_user_id(user_id)
        if self._detect_storage_mode() == "database":
            result = self._list_db(uid, request, role=role, allow_oversight=allow_oversight)
            if result.total > 0 or not self._user_memory(uid):
                return result

        rows = list(self._user_memory(uid).values())
        filtered = self._filter_rows(rows, request)
        total = len(filtered)
        page = filtered[request.offset : request.offset + request.limit]
        return OrbRecordWorkspaceListResponse(
            items=[self._row_to_item(r) for r in page],
            total=total,
            limit=request.limit,
            offset=request.offset,
        )

    def _filter_rows(self, rows: list[dict[str, Any]], request: OrbRecordWorkspaceListRequest) -> list[dict[str, Any]]:
        items = rows
        if request.section:
            items = [r for r in items if r.get("workspace_section") == request.section]
        if request.status:
            items = [r for r in items if r.get("status") == request.status]
        if request.template_id:
            items = [r for r in items if r.get("template_id") == request.template_id]
        if request.source_station:
            items = [r for r in items if r.get("source_station") == request.source_station]
        if request.search:
            q = request.search.lower()
            items = [
                r
                for r in items
                if q in _text(r.get("title")).lower()
                or q in _text(r.get("body")).lower()
                or q in _text(r.get("category")).lower()
            ]
        items.sort(key=lambda r: _text(r.get("updated_at")), reverse=True)
        return items

    def _list_db(
        self,
        user_id: int,
        request: OrbRecordWorkspaceListRequest,
        *,
        role: str | None,
        allow_oversight: bool,
    ) -> OrbRecordWorkspaceListResponse:
        clauses = ["1=1"]
        params: list[Any] = []
        if not (allow_oversight and self.can_view_other_users_items(role)):
            clauses.append("owner_user_id = %s")
            params.append(user_id)
        if request.section:
            clauses.append("workspace_section = %s")
            params.append(request.section)
        if request.status:
            clauses.append("status = %s")
            params.append(request.status)
        if request.template_id:
            clauses.append("template_id = %s")
            params.append(request.template_id)
        if request.source_station:
            clauses.append("source_station = %s")
            params.append(request.source_station)
        if request.search:
            clauses.append("(title ILIKE %s OR body ILIKE %s OR category ILIKE %s)")
            pattern = f"%{request.search}%"
            params.extend([pattern, pattern, pattern])

        where = " AND ".join(clauses)
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(f"SELECT COUNT(*) AS c FROM orb_records_workspace WHERE {where}", params)
                total = int(cur.fetchone()["c"])
                cur.execute(
                    f"""
                    SELECT * FROM orb_records_workspace
                    WHERE {where}
                    ORDER BY updated_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    [*params, request.limit, request.offset],
                )
                rows = cur.fetchall()
            return OrbRecordWorkspaceListResponse(
                items=[self._row_to_item(dict(r)) for r in rows],
                total=total,
                limit=request.limit,
                offset=request.offset,
            )
        except Exception:
            logger.exception("orb_records_workspace list failed")
            return OrbRecordWorkspaceListResponse(limit=request.limit, offset=request.offset)
        finally:
            if conn is not None:
                release_db_connection(conn)

    def update_item(
        self,
        user_id: int,
        item_id: str,
        payload: OrbRecordWorkspaceUpdate,
    ) -> OrbRecordWorkspaceItem | None:
        uid = self._resolve_user_id(user_id)
        existing = self.get_item(uid, item_id)
        if not existing:
            return None

        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            return existing

        if updates.get("status") and updates["status"] != existing.status:
            allowed = VALID_TRANSITIONS.get(existing.status, frozenset())
            if updates["status"] not in allowed and updates["status"] != existing.status:
                raise ValueError(f"Invalid status transition: {existing.status} → {updates['status']}")

        now = _now_iso()
        audit = list(existing.audit_trail)
        audit.append(self._audit_entry("update", uid, fields=sorted(updates.keys())))

        if self._detect_storage_mode() == "database":
            updated = self._update_db(uid, item_id, updates, audit, now)
            if updated:
                return updated

        row = self._memory_row(uid, item_id)
        if not row:
            return None
        row.update(updates)
        row["updated_at"] = now
        row["audit_trail"] = audit
        if updates.get("status") == "reviewed":
            row["reviewed_at"] = now
        if updates.get("status") == "finalised":
            row["finalised_at"] = now
        return self._save_memory_row(uid, row)

    def _update_db(
        self,
        user_id: int,
        item_id: str,
        updates: dict[str, Any],
        audit: list[dict[str, Any]],
        now: str,
    ) -> OrbRecordWorkspaceItem | None:
        set_parts = ["updated_at = %s", "audit_trail = %s"]
        params: list[Any] = [now, Json(audit)]
        for key, value in updates.items():
            if key == "metadata" and isinstance(value, dict):
                set_parts.append("metadata = metadata || %s::jsonb")
                params.append(Json(value))
            else:
                set_parts.append(f"{key} = %s")
                params.append(value)
        if updates.get("status") == "reviewed":
            set_parts.append("reviewed_at = %s")
            params.append(now)
        if updates.get("status") == "finalised":
            set_parts.append("finalised_at = %s")
            params.append(now)

        params.extend([item_id, user_id])
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    UPDATE orb_records_workspace
                    SET {', '.join(set_parts)}
                    WHERE id = %s AND owner_user_id = %s
                    RETURNING *
                    """,
                    params,
                )
                row = cur.fetchone()
            conn.commit()
            return self._row_to_item(dict(row)) if row else None
        except Exception:
            if conn is not None:
                conn.rollback()
            logger.exception("orb_records_workspace update failed")
            return None
        finally:
            if conn is not None:
                release_db_connection(conn)

    def review_item(self, user_id: int, item_id: str) -> OrbRecordWorkspaceItem | None:
        return self.update_item(
            user_id,
            item_id,
            OrbRecordWorkspaceUpdate(status="reviewed", workspace_section="needs_review"),
        )

    def finalise_item(self, user_id: int, item_id: str) -> OrbRecordWorkspaceItem | None:
        existing = self.get_item(user_id, item_id)
        if not existing:
            return None
        if existing.status not in {"reviewed", "draft"}:
            raise ValueError("Only reviewed or draft items can be finalised by an adult")
        return self.update_item(
            user_id,
            item_id,
            OrbRecordWorkspaceUpdate(status="finalised", workspace_section="finalised"),
        )

    def archive_item(self, user_id: int, item_id: str) -> OrbRecordWorkspaceItem | None:
        return self.update_item(
            user_id,
            item_id,
            OrbRecordWorkspaceUpdate(status="archived", workspace_section="archived"),
        )

    def delete_item(self, user_id: int, item_id: str) -> bool:
        """Hard delete — prefer archive_item for retention."""
        uid = self._resolve_user_id(user_id)
        if self._detect_storage_mode() == "database":
            conn = None
            try:
                conn = get_db_connection()
                with conn.cursor() as cur:
                    cur.execute(
                        "DELETE FROM orb_records_workspace WHERE id = %s AND owner_user_id = %s",
                        (item_id, uid),
                    )
                    deleted = cur.rowcount > 0
                conn.commit()
                if deleted:
                    return True
            except Exception:
                if conn is not None:
                    conn.rollback()
                logger.exception("orb_records_workspace delete failed")
            finally:
                if conn is not None:
                    release_db_connection(conn)

        if item_id in self._user_memory(uid):
            del self._user_memory(uid)[item_id]
            return True
        return False

    def summary(self, user_id: int, *, role: str | None = None) -> OrbRecordWorkspaceSummary:
        listed = self.list_items(user_id, OrbRecordWorkspaceListRequest(limit=200))
        by_status: dict[str, int] = {}
        by_source: dict[str, int] = {}
        by_section: dict[str, int] = {}
        needs_review = 0
        for item in listed.items:
            by_status[item.status] = by_status.get(item.status, 0) + 1
            by_source[item.source_station] = by_source.get(item.source_station, 0) + 1
            by_section[item.workspace_section] = by_section.get(item.workspace_section, 0) + 1
            if item.status == "draft":
                needs_review += 1
        return OrbRecordWorkspaceSummary(
            total=listed.total,
            by_status=by_status,
            by_source_station=by_source,
            by_section=by_section,
            needs_review=needs_review,
            recent_count=min(listed.total, 10),
        )


orb_records_workspace_service = OrbRecordsWorkspaceService()
