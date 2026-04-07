from __future__ import annotations

from typing import Any


class AuditService:
    @staticmethod
    def _normalise(value: Any) -> Any:
        if isinstance(value, dict):
            return {k: AuditService._normalise(v) for k, v in value.items()}
        if isinstance(value, list):
            return [AuditService._normalise(v) for v in value]
        return value

    @staticmethod
    def changed_fields(
        before: dict[str, Any] | None,
        after: dict[str, Any] | None,
    ) -> list[str]:
        before = before or {}
        after = after or {}

        keys = set(before.keys()) | set(after.keys())
        changed: list[str] = []

        for key in sorted(keys):
            if AuditService._normalise(before.get(key)) != AuditService._normalise(after.get(key)):
                changed.append(key)

        return changed

    @staticmethod
    def write(
        conn,
        *,
        table_name: str,
        record_id: int,
        action: str,
        changed_by: int | None,
        before_data: dict[str, Any] | None,
        after_data: dict[str, Any] | None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_log (
                    table_name,
                    record_id,
                    action,
                    changed_by,
                    before_data,
                    after_data,
                    changed_fields,
                    metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    table_name,
                    record_id,
                    action,
                    changed_by,
                    before_data,
                    after_data,
                    AuditService.changed_fields(before_data, after_data),
                    metadata or {},
                ),
            )

    @staticmethod
    def list_for_record(
        conn,
        *,
        table_name: str,
        record_id: int,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    table_name,
                    record_id,
                    action,
                    changed_by,
                    changed_at,
                    before_data,
                    after_data,
                    changed_fields,
                    metadata
                FROM audit_log
                WHERE table_name = %s
                  AND record_id = %s
                ORDER BY changed_at DESC, id DESC
                LIMIT %s
                """,
                (table_name, record_id, limit),
            )
            return cur.fetchall() or []
