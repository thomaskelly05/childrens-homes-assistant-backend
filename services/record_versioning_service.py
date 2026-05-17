from __future__ import annotations

import json
import logging
from typing import Any

from psycopg2.extras import Json

logger = logging.getLogger("indicare.record.versioning")


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


class RecordVersioningService:
    """Best-effort version capture for material care-record changes.

    The service is schema-tolerant: it writes to the first supported version/audit
    table present in the deployment and never blocks the source update.
    """

    def capture_version(
        self,
        conn,
        *,
        source_table: str,
        source_id: int | str,
        before: dict[str, Any] | None,
        after: dict[str, Any] | None,
        changed_by: int | None = None,
        change_reason: str | None = None,
    ) -> bool:
        if not source_table or source_id is None:
            return False
        before = before or {}
        after = after or {}
        diff = self._diff(before, after)
        metadata = {
            "source_table": source_table,
            "source_id": source_id,
            "changed_by": changed_by,
            "change_reason": change_reason or "record_updated",
            "diff_keys": sorted(diff.keys()),
        }
        try:
            written = (
                self._insert_record_versions(conn, source_table=source_table, source_id=source_id, before=before, after=after, diff=diff, metadata=metadata)
                or self._insert_specific_version(conn, source_table=source_table, source_id=source_id, before=before, after=after, diff=diff, metadata=metadata)
                or self._insert_admin_audit(conn, source_table=source_table, source_id=source_id, before=before, after=after, diff=diff, metadata=metadata)
            )
            if written:
                conn.commit()
            return written
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            logger.exception("record_version_capture_failed table=%s id=%s", source_table, source_id)
            return False

    def _diff(self, before: dict[str, Any], after: dict[str, Any]) -> dict[str, dict[str, Any]]:
        keys = set(before.keys()) | set(after.keys())
        ignored = {"updated_at", "created_at"}
        diff: dict[str, dict[str, Any]] = {}
        for key in keys - ignored:
            if before.get(key) != after.get(key):
                diff[key] = {"before": before.get(key), "after": after.get(key)}
        return diff

    def _table_exists(self, conn, table_name: str) -> bool:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = %s
                )
                """,
                (table_name,),
            )
            row = cur.fetchone()
            return bool((row.get("exists") if isinstance(row, dict) else row[0]) if row else False)

    def _columns(self, conn, table_name: str) -> set[str]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                """,
                (table_name,),
            )
            return {str(row.get("column_name") if isinstance(row, dict) else row[0]) for row in cur.fetchall() or []}

    def _insert_record_versions(self, conn, *, source_table: str, source_id: int | str, before: dict[str, Any], after: dict[str, Any], diff: dict[str, Any], metadata: dict[str, Any]) -> bool:
        return self._insert_dynamic(
            conn,
            "record_versions",
            {
                "source_table": source_table,
                "source_id": source_id,
                "record_table": source_table,
                "record_id": source_id,
                "before_snapshot": Json(before),
                "after_snapshot": Json(after),
                "diff": Json(diff),
                "metadata": Json(metadata),
                "changed_by": metadata.get("changed_by"),
                "change_reason": metadata.get("change_reason"),
                "created_at": "NOW()",
            },
        )

    def _insert_specific_version(self, conn, *, source_table: str, source_id: int | str, before: dict[str, Any], after: dict[str, Any], diff: dict[str, Any], metadata: dict[str, Any]) -> bool:
        table = "support_plan_versions" if source_table == "support_plans" else "risk_assessment_versions" if source_table == "risk_assessments" else ""
        if not table:
            return False
        return self._insert_dynamic(
            conn,
            table,
            {
                "source_id": source_id,
                "plan_id": source_id,
                "risk_id": source_id,
                "before_snapshot": Json(before),
                "after_snapshot": Json(after),
                "diff": Json(diff),
                "metadata": Json(metadata),
                "changed_by": metadata.get("changed_by"),
                "change_reason": metadata.get("change_reason"),
                "created_at": "NOW()",
            },
        )

    def _insert_admin_audit(self, conn, *, source_table: str, source_id: int | str, before: dict[str, Any], after: dict[str, Any], diff: dict[str, Any], metadata: dict[str, Any]) -> bool:
        return self._insert_dynamic(
            conn,
            "admin_audit_log",
            {
                "admin_user_id": metadata.get("changed_by"),
                "action": f"{source_table}_updated",
                "target_type": source_table,
                "target_id": str(source_id),
                "details": Json({"before": before, "after": after, "diff": diff, "metadata": metadata}),
                "created_at": "NOW()",
            },
        )

    def _insert_dynamic(self, conn, table_name: str, values: dict[str, Any]) -> bool:
        if not self._table_exists(conn, table_name):
            return False
        cols = self._columns(conn, table_name)
        filtered = [(key, value) for key, value in values.items() if key in cols]
        if not filtered:
            return False
        names = [item[0] for item in filtered]
        params: list[Any] = []
        placeholders: list[str] = []
        for _, value in filtered:
            if value == "NOW()":
                placeholders.append("NOW()")
            else:
                placeholders.append("%s")
                params.append(value)
        with conn.cursor() as cur:
            cur.execute(f"INSERT INTO {table_name} ({', '.join(names)}) VALUES ({', '.join(placeholders)})", tuple(params))
        return True


record_versioning_service = RecordVersioningService()
