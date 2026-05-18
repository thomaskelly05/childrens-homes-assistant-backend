from __future__ import annotations

import logging
from typing import Any

from psycopg2.extras import Json

logger = logging.getLogger("indicare.staff.linking")

STAFF_TABLES = {
    "staff_supervisions",
    "workforce_supervision_records",
    "staff_training_matrix",
    "staff_training_records",
    "staff_induction_checklist_items",
    "staff_probation_reviews",
    "staff_profile",
    "workforce_evidence",
    "staff",
}

STAFF_REGULATION_LINKS = {
    "staff_supervisions": ["reg_13_leadership_and_management"],
    "workforce_supervision_records": ["reg_13_leadership_and_management"],
    "staff_training_matrix": ["reg_13_leadership_and_management"],
    "staff_training_records": ["reg_13_leadership_and_management"],
    "staff_induction_checklist_items": ["reg_13_leadership_and_management"],
    "staff_probation_reviews": ["reg_13_leadership_and_management"],
    "staff_profile": ["reg_13_leadership_and_management"],
    "workforce_evidence": ["reg_13_leadership_and_management"],
    "staff": ["reg_13_leadership_and_management"],
}


def _safe_str(value: Any, fallback: str = "") -> str:
    return fallback if value is None else str(value)


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


class StaffLinkingService:
    """Best-effort workforce evidence linker.

    It mirrors the child-record linker but remains table-tolerant. It should
    never block a staff workflow if optional evidence/audit tables are not
    present in a deployment.
    """

    def sync_staff_record(
        self,
        conn,
        *,
        source_table: str,
        record: dict[str, Any],
        recorded_by_name: str | None = None,
    ) -> bool:
        table = str(source_table or "").strip().lower()
        if table not in STAFF_TABLES or not record:
            return False

        staff_id = _safe_int(record.get("staff_id") or record.get("id") or record.get("user_id"))
        home_id = _safe_int(record.get("home_id"))
        source_id = _safe_int(record.get("id"))
        title = self._title_for(table, record)
        summary = self._summary_for(table, record)
        metadata = {
            "source_table": table,
            "source_id": source_id,
            "staff_id": staff_id,
            "home_id": home_id,
            "recorded_by_name": recorded_by_name,
            "quality_standards": STAFF_REGULATION_LINKS.get(table, ["reg_13_leadership_and_management"]),
            "judgement_areas": ["leadership_and_management"],
            "evidence_strength": "medium",
            "standards_rationale": f"Workforce evidence linked from {table}",
        }

        created_any = False
        created_any = self._insert_workforce_evidence(conn, table=table, record=record, title=title, summary=summary, metadata=metadata) or created_any
        created_any = self._insert_staff_audit_event(conn, table=table, record=record, title=title, summary=summary, metadata=metadata) or created_any
        created_any = self._insert_standard_links(conn, table=table, record=record, metadata=metadata) or created_any
        try:
            conn.commit()
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            logger.exception("staff_linking_commit_failed table=%s source_id=%s", table, source_id)
            return False
        return created_any

    def _title_for(self, table: str, record: dict[str, Any]) -> str:
        if record.get("title"):
            return _safe_str(record.get("title"))
        if table == "staff_supervisions":
            return "Staff supervision record"
        if table == "staff_training_matrix":
            return "Staff training evidence"
        if table == "staff_probation_reviews":
            return "Staff probation review"
        return "Staff profile evidence"

    def _summary_for(self, table: str, record: dict[str, Any]) -> str:
        keys = ["summary", "notes", "reflection", "outcome", "training_name", "competency_area", "review_note", "role", "status"]
        value = " ".join(_safe_str(record.get(key)) for key in keys if record.get(key)).strip()
        return value or self._title_for(table, record)

    def _table_exists(self, conn, table_name: str) -> bool:
        try:
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
        except Exception:
            return False

    def _columns(self, conn, table_name: str) -> set[str]:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT column_name FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = %s
                    """,
                    (table_name,),
                )
                return {str(row.get("column_name") if isinstance(row, dict) else row[0]) for row in cur.fetchall() or []}
        except Exception:
            return set()

    def _insert_workforce_evidence(self, conn, *, table: str, record: dict[str, Any], title: str, summary: str, metadata: dict[str, Any]) -> bool:
        target = "workforce_evidence"
        if not self._table_exists(conn, target):
            return False
        cols = self._columns(conn, target)
        values = {
            "source_table": table,
            "source_id": record.get("id"),
            "staff_id": metadata.get("staff_id"),
            "home_id": metadata.get("home_id"),
            "title": title,
            "summary": summary,
            "evidence_type": table,
            "metadata": Json(metadata),
            "created_at": "NOW()",
            "updated_at": "NOW()",
        }
        return self._insert_dynamic(conn, target, cols, values, conflict_cols=("source_table", "source_id"))

    def _insert_staff_audit_event(self, conn, *, table: str, record: dict[str, Any], title: str, summary: str, metadata: dict[str, Any]) -> bool:
        for target in ("staff_audit_events", "workforce_audit_events", "operational_audit_events"):
            if not self._table_exists(conn, target):
                continue
            cols = self._columns(conn, target)
            values = {
                "source_table": table,
                "source_id": record.get("id"),
                "staff_id": metadata.get("staff_id"),
                "home_id": metadata.get("home_id"),
                "event_type": table,
                "title": title,
                "summary": summary,
                "metadata": Json(metadata),
                "created_at": "NOW()",
            }
            if self._insert_dynamic(conn, target, cols, values):
                return True
        return False

    def _insert_standard_links(self, conn, *, table: str, record: dict[str, Any], metadata: dict[str, Any]) -> bool:
        target = "record_standard_links"
        if not self._table_exists(conn, target):
            return False
        cols = self._columns(conn, target)
        created = False
        for standard in metadata.get("quality_standards", []):
            values = {
                "source_table": table,
                "source_id": record.get("id"),
                "standard_code": standard,
                "regulation": standard,
                "judgement_area": "leadership_and_management",
                "rationale": metadata.get("standards_rationale"),
                "evidence_strength": metadata.get("evidence_strength"),
                "metadata": Json(metadata),
                "created_at": "NOW()",
            }
            created = self._insert_dynamic(conn, target, cols, values, conflict_cols=("source_table", "source_id", "standard_code")) or created
        return created

    def _insert_dynamic(self, conn, table_name: str, cols: set[str], values: dict[str, Any], conflict_cols: tuple[str, ...] | None = None) -> bool:
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
        conflict = ""
        if conflict_cols and all(col in cols for col in conflict_cols):
            conflict = f" ON CONFLICT ({', '.join(conflict_cols)}) DO NOTHING"
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"INSERT INTO {table_name} ({', '.join(names)}) VALUES ({', '.join(placeholders)}){conflict}",
                    tuple(params),
                )
            return True
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            logger.exception("staff_linking_insert_failed table=%s", table_name)
            return False


staff_linking_service = StaffLinkingService()
