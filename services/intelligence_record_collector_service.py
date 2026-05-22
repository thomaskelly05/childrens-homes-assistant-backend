from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from psycopg2.extras import RealDictCursor

from repositories.os_repository_utils import table_columns, table_exists
from services.risk_intelligence_language import field

logger = logging.getLogger("indicare.intelligence_record_collector")

NO_LIVE_RECORDS_WARNING = (
    "No live records were found for this request. Intelligence is limited to supplied payload records."
)

CHILD_RECORD_SOURCES: tuple[dict[str, Any], ...] = (
    {"context_key": "daily_notes", "record_type": "daily_note", "tables": ("daily_notes", "young_person_daily_notes"), "date_columns": ("note_date", "created_at", "updated_at"), "limit": 120},
    {"context_key": "incidents", "record_type": "incident", "tables": ("incidents", "young_person_incidents"), "date_columns": ("incident_datetime", "created_at", "updated_at"), "limit": 120},
    {"context_key": "safeguarding", "record_type": "safeguarding_concern", "tables": ("safeguarding_records", "young_person_safeguarding", "young_people_safeguarding"), "date_columns": ("created_at", "updated_at", "event_at"), "limit": 100},
    {"context_key": "missing_episodes", "record_type": "missing_episode", "tables": ("missing_episodes", "young_person_missing_episodes"), "date_columns": ("missing_from", "created_at", "updated_at"), "limit": 80},
    {"context_key": "return_home_interviews", "record_type": "return_home_interview", "tables": ("return_home_interviews", "young_person_return_home_interviews"), "date_columns": ("interview_date", "created_at", "updated_at"), "limit": 80},
    {"context_key": "keywork", "record_type": "keywork", "tables": ("keywork_sessions", "young_person_keywork", "keywork"), "date_columns": ("session_date", "created_at", "updated_at"), "limit": 100},
    {"context_key": "education", "record_type": "education", "tables": ("education_records", "young_person_education"), "date_columns": ("created_at", "updated_at", "event_at"), "limit": 80},
    {"context_key": "health", "record_type": "health", "tables": ("health_records", "young_person_health"), "date_columns": ("created_at", "updated_at", "event_at"), "limit": 80},
    {"context_key": "family", "record_type": "family_contact", "tables": ("family_contacts", "young_person_family", "family_contact"), "date_columns": ("contact_date", "created_at", "updated_at"), "limit": 80},
    {"context_key": "risk", "record_type": "risk_assessment", "tables": ("risk_assessments", "young_person_risk"), "date_columns": ("created_at", "updated_at", "review_date"), "limit": 80},
    {"context_key": "chronology", "record_type": "chronology_event", "tables": ("young_people_chronology", "young_person_chronology", "chronology_events"), "date_columns": ("event_at", "created_at", "updated_at"), "limit": 160},
    {"context_key": "child_voice", "record_type": "child_voice", "tables": ("child_voice_records", "young_person_child_voice"), "date_columns": ("created_at", "updated_at"), "limit": 60},
)

HOME_TABLE_SOURCES: tuple[dict[str, Any], ...] = (
    {"record_type": "incident", "tables": ("incidents",), "limit": 120},
    {"record_type": "action", "tables": ("tasks", "actions", "quality_audit_actions", "reg44_actions", "reg45_actions", "inspection_improvement_actions"), "limit": 120},
    {"record_type": "reg44", "tables": ("reg44_visits", "reg44_reports"), "limit": 40},
    {"record_type": "reg45", "tables": ("reg45_reviews", "reg45_reports"), "limit": 40},
    {"record_type": "staff_supervision", "tables": ("supervision_records", "staff_supervisions"), "limit": 80},
    {"record_type": "training_record", "tables": ("training_records", "staff_training"), "limit": 80},
    {"record_type": "document", "tables": ("documents", "statutory_documents"), "limit": 80},
    {"record_type": "evidence_item", "tables": ("evidence", "evidence_items"), "limit": 80},
)


class IntelligenceRecordCollectorService:
    """Gather and normalise operational records for the intelligence spine."""

    def collect_home_records(
        self,
        home_id: int | str,
        *,
        conn: Any = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 500,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        warnings: list[str] = []
        records: list[dict[str, Any]] = []
        close_conn = False
        if conn is None:
            try:
                from db.connection import get_db_connection, release_db_connection

                conn = get_db_connection()
                close_conn = True
            except Exception as exc:
                return [], [f"Database connection unavailable: {exc.__class__.__name__}"]

        try:
            child_ids = [child_id] if child_id is not None else self._young_person_ids_for_home(conn, home_id)
            if staff_id is not None:
                records.extend(
                    self.collect_staff_records(
                        staff_id,
                        home_id=home_id,
                        conn=conn,
                        date_from=date_from,
                        date_to=date_to,
                        limit=min(limit, 300),
                    )[0]
                )
            for yp_id in child_ids[:50]:
                child_records, child_warnings = self.collect_child_records(
                    yp_id,
                    home_id=home_id,
                    conn=conn,
                    date_from=date_from,
                    date_to=date_to,
                    limit=min(limit, 300),
                )
                records.extend(child_records)
                warnings.extend(child_warnings)
            home_records, home_warnings = self._collect_home_tables(
                conn,
                home_id=home_id,
                date_from=date_from,
                date_to=date_to,
                limit=limit,
            )
            records.extend(home_records)
            warnings.extend(home_warnings)
        except Exception as exc:
            logger.exception("collect_home_records failed home_id=%s", home_id)
            warnings.append(f"Home record collection error: {exc.__class__.__name__}")
        finally:
            if close_conn and conn is not None:
                from db.connection import release_db_connection

                release_db_connection(conn)

        filtered = self._apply_date_filter(records, date_from=date_from, date_to=date_to)[:limit]
        if not filtered:
            warnings.append(NO_LIVE_RECORDS_WARNING)
        return filtered, warnings

    def collect_child_records(
        self,
        child_id: int | str,
        *,
        home_id: int | str | None = None,
        conn: Any = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 300,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        warnings: list[str] = []
        records: list[dict[str, Any]] = []
        close_conn = False
        if conn is None:
            try:
                from db.connection import get_db_connection

                conn = get_db_connection()
                close_conn = True
            except Exception as exc:
                return [], [f"Database connection unavailable: {exc.__class__.__name__}"]

        try:
            yp_id = int(child_id)
            for source in CHILD_RECORD_SOURCES:
                rows, warn = self._fetch_child_source(conn, source=source, young_person_id=yp_id)
                for row in rows:
                    records.append(
                        self.normalise_record(
                            source["context_key"],
                            row,
                            record_type=str(source["record_type"]),
                            home_id=home_id or row.get("home_id"),
                            child_id=yp_id,
                        )
                    )
                warnings.extend(warn)
        except Exception as exc:
            logger.exception("collect_child_records failed child_id=%s", child_id)
            warnings.append(f"Child record collection error: {exc.__class__.__name__}")
        finally:
            if close_conn and conn is not None:
                from db.connection import release_db_connection

                release_db_connection(conn)

        filtered = self._apply_date_filter(records, date_from=date_from, date_to=date_to)[:limit]
        if not filtered:
            warnings.append(NO_LIVE_RECORDS_WARNING)
        return filtered, warnings

    def collect_staff_records(
        self,
        staff_id: int | str,
        *,
        home_id: int | str | None = None,
        conn: Any = None,
        date_from: str | None = None,
        date_to: str | None = None,
        limit: int = 300,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        warnings: list[str] = []
        records: list[dict[str, Any]] = []
        close_conn = False
        if conn is None:
            try:
                from db.connection import get_db_connection

                conn = get_db_connection()
                close_conn = True
            except Exception as exc:
                return [], [f"Database connection unavailable: {exc.__class__.__name__}"]

        staff_tables = (
            ("supervision_records", "staff_supervision"),
            ("staff_supervisions", "staff_supervision"),
            ("training_records", "training_record"),
            ("staff_training", "training_record"),
            ("staff_journal_entries", "staff_journal"),
        )
        try:
            for table, record_type in staff_tables:
                if not table_exists(conn, table):
                    continue
                cols = table_columns(conn, table)
                if "staff_id" not in cols:
                    continue
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f'SELECT * FROM public."{table}" WHERE staff_id = %s ORDER BY id DESC LIMIT %s',
                        (int(staff_id), limit),
                    )
                    rows = [dict(r) for r in cur.fetchall() or []]
                for row in rows:
                    records.append(
                        self.normalise_record(
                            table,
                            row,
                            record_type=record_type,
                            home_id=home_id or row.get("home_id"),
                            staff_id=staff_id,
                        )
                    )
        except Exception as exc:
            warnings.append(f"Staff record collection error: {exc.__class__.__name__}")
        finally:
            if close_conn and conn is not None:
                from db.connection import release_db_connection

                release_db_connection(conn)

        filtered = self._apply_date_filter(records, date_from=date_from, date_to=date_to)[:limit]
        if not filtered:
            warnings.append(NO_LIVE_RECORDS_WARNING)
        return filtered, warnings

    def normalise_record(
        self,
        source: str,
        record: dict[str, Any],
        *,
        record_type: str | None = None,
        home_id: Any = None,
        child_id: Any = None,
        staff_id: Any = None,
    ) -> dict[str, Any]:
        rid = field(record, "id", "record_id", "uuid") or f"{source}-{hash(str(record)) % 10**8}"
        summary = field(record, "summary", "description", "notes", "content", "body", "narrative", "title") or ""
        body = field(record, "body", "content", "notes", "full_text", "narrative") or summary
        date_value = field(
            record,
            "date",
            "event_date",
            "incident_datetime",
            "note_date",
            "session_date",
            "contact_date",
            "created_at",
            "updated_at",
            "missing_from",
        )
        manager_reviewed = field(
            record,
            "manager_reviewed",
            "manager_review_complete",
            "manager_review",
        )
        manager_status = str(field(record, "manager_review_status", "review_status") or "").lower()
        manager_completed = bool(
            manager_reviewed is True or manager_status in {"complete", "completed", "reviewed", "signed_off"}
        )
        child_voice = field(record, "child_voice", "child_voice_text", "young_person_voice") or ""
        return {
            "id": str(rid),
            "record_type": record_type or str(field(record, "record_type", "type", "event_type") or "record"),
            "source": source,
            "title": str(field(record, "title", "name", "subject") or record_type or "Record"),
            "summary": str(summary)[:2000],
            "body": str(body)[:4000],
            "date": str(date_value) if date_value else None,
            "home_id": home_id if home_id is not None else field(record, "home_id"),
            "child_id": child_id if child_id is not None else field(record, "young_person_id", "child_id", "yp_id"),
            "staff_id": staff_id if staff_id is not None else field(record, "staff_id"),
            "category": field(record, "category", "event_type", "type"),
            "status": field(record, "status", "workflow_status"),
            "manager_review_required": field(record, "manager_review_required") is True
            or str(record_type or "") in {"incident", "safeguarding_concern", "missing_episode", "restraint"},
            "manager_review_completed": manager_completed,
            "manager_reviewed": manager_completed,
            "child_voice": str(child_voice) if child_voice else "",
            "child_voice_present": bool(child_voice) or field(record, "child_voice_present") is True,
            "actions": list(field(record, "actions", "linked_actions") or []),
            "linked_records": [str(x) for x in (field(record, "linked_record_ids", "linked_records") or []) if x],
            "regulatory_links": [str(x) for x in (field(record, "regulatory_links") or []) if x],
            "sccif_links": [str(x) for x in (field(record, "sccif_links") or []) if x],
            "quality_standard_links": [str(x) for x in (field(record, "quality_standard_links") or []) if x],
            "metadata": {"source_table": field(record, "_source_table"), "raw_type": field(record, "type")},
        }

    def _young_person_ids_for_home(self, conn: Any, home_id: int | str) -> list[int]:
        if not table_exists(conn, "young_people"):
            return []
        cols = table_columns(conn, "young_people")
        if "home_id" not in cols:
            return []
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                'SELECT id FROM public."young_people" WHERE home_id = %s ORDER BY id DESC LIMIT 80',
                (int(home_id),),
            )
            return [int(row["id"]) for row in cur.fetchall() or [] if row.get("id")]

    def _fetch_child_source(
        self,
        conn: Any,
        *,
        source: dict[str, Any],
        young_person_id: int,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        warnings: list[str] = []
        for table in source["tables"]:
            if not table_exists(conn, table):
                continue
            cols = table_columns(conn, table)
            if "young_person_id" not in cols:
                continue
            date_column = next((c for c in source["date_columns"] if c in cols), None)
            order = f'ORDER BY "{date_column}" DESC NULLS LAST' if date_column else "ORDER BY id DESC"
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f'SELECT * FROM public."{table}" WHERE young_person_id = %s {order} LIMIT %s',
                        (young_person_id, int(source.get("limit") or 80)),
                    )
                    rows = [dict(r) for r in cur.fetchall() or []]
                for row in rows:
                    row["_source_table"] = table
                return rows, warnings
            except Exception as exc:
                warnings.append(f"Skipped {table} for child {young_person_id}: {exc.__class__.__name__}")
        return [], warnings

    def _collect_home_tables(
        self,
        conn: Any,
        *,
        home_id: int | str,
        date_from: str | None,
        date_to: str | None,
        limit: int,
    ) -> tuple[list[dict[str, Any]], list[str]]:
        warnings: list[str] = []
        records: list[dict[str, Any]] = []
        for source in HOME_TABLE_SOURCES:
            for table in source["tables"]:
                if not table_exists(conn, table):
                    continue
                cols = table_columns(conn, table)
                has_home = "home_id" in cols
                order_col = "updated_at" if "updated_at" in cols else ("created_at" if "created_at" in cols else "id")
                try:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        if has_home:
                            cur.execute(
                                f'SELECT * FROM public."{table}" WHERE home_id = %s ORDER BY "{order_col}" DESC NULLS LAST LIMIT %s',
                                (int(home_id), int(source.get("limit") or 80)),
                            )
                        else:
                            cur.execute(
                                f'SELECT * FROM public."{table}" ORDER BY "{order_col}" DESC NULLS LAST LIMIT %s',
                                (int(source.get("limit") or 80),),
                            )
                        rows = [dict(r) for r in cur.fetchall() or []]
                    for row in rows:
                        records.append(
                            self.normalise_record(
                                table,
                                row,
                                record_type=str(source["record_type"]),
                                home_id=home_id,
                                child_id=row.get("young_person_id"),
                            )
                        )
                    break
                except Exception as exc:
                    warnings.append(f"Skipped home table {table}: {exc.__class__.__name__}")
        return records[:limit], warnings

    def _apply_date_filter(
        self,
        records: list[dict[str, Any]],
        *,
        date_from: str | None,
        date_to: str | None,
    ) -> list[dict[str, Any]]:
        if not date_from and not date_to:
            return records
        start = self._parse_iso(date_from)
        end = self._parse_iso(date_to)
        if not start and not end:
            return records
        filtered: list[dict[str, Any]] = []
        for record in records:
            when = self._parse_iso(record.get("date"))
            if when is None:
                filtered.append(record)
                continue
            if start and when < start:
                continue
            if end and when > end:
                continue
            filtered.append(record)
        return filtered

    def _parse_iso(self, value: Any) -> datetime | None:
        if not value:
            return None
        try:
            text = str(value).replace("Z", "+00:00")
            parsed = datetime.fromisoformat(text)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=UTC)
            return parsed
        except Exception:
            return None


intelligence_record_collector_service = IntelligenceRecordCollectorService()
