from __future__ import annotations

from datetime import date, datetime
from typing import Any

from services.chronology_writer import ChronologyWriter
from services.compliance_engine import ComplianceEngine
from services.record_link_service import RecordLinkService
from services.standards_link_service import StandardsLinkService


class ChildRecordSyncService:
    """
    Shared child record sync engine.

    This service receives a normalised domain record and makes sure the OS layer
    stays updated by syncing:
    - chronology_events
    - record_standard_links
    - compliance_items
    - record_links

    It is intentionally tolerant:
    - missing optional fields are acceptable
    - sync is idempotent where possible
    - callers may use any of:
        sync_record(...)
        sync_child_record(...)
        sync(...)
        process_record(...)
    """

    SUPPORTED_TABLES = {
        "daily_notes",
        "incidents",
        "risk_assessments",
        "support_plans",
        "young_person_appointments",
        "keywork_sessions",
        "health_records",
        "education_records",
        "family_contact_records",
    }

    def __init__(self) -> None:
        self.chronology_writer = ChronologyWriter()
        self.standards_link_service = StandardsLinkService()
        self.compliance_engine = ComplianceEngine()
        self.record_link_service = RecordLinkService()

    # ------------------------------------------------------------------
    # Public entry points
    # ------------------------------------------------------------------

    def sync_record(self, conn, source_table: str, record: dict[str, Any]) -> dict[str, Any]:
        return self._sync(conn=conn, source_table=source_table, record=record)

    def sync_child_record(self, conn, source_table: str, record: dict[str, Any]) -> dict[str, Any]:
        return self._sync(conn=conn, source_table=source_table, record=record)

    def sync(self, conn, source_table: str, record: dict[str, Any]) -> dict[str, Any]:
        return self._sync(conn=conn, source_table=source_table, record=record)

    def process_record(self, conn, source_table: str, record: dict[str, Any]) -> dict[str, Any]:
        return self._sync(conn=conn, source_table=source_table, record=record)

    # ------------------------------------------------------------------
    # Core sync
    # ------------------------------------------------------------------

    def _sync(self, *, conn, source_table: str, record: dict[str, Any]) -> dict[str, Any]:
        table = str(source_table or "").strip().lower()
        prepared = self._prepare_record(source_table=table, record=record)

        if not prepared:
            return {
                "ok": False,
                "ignored": True,
                "reason": "invalid_record",
            }

        if table not in self.SUPPORTED_TABLES:
            return {
                "ok": False,
                "ignored": True,
                "reason": f"unsupported_source_table:{table}",
            }

        chronology_result = self._sync_chronology(conn=conn, source_table=table, record=prepared)
        standards_result = self._sync_standards(conn=conn, source_table=table, record=prepared)
        compliance_result = self._sync_compliance(conn=conn, source_table=table, record=prepared)
        links_result = self._sync_links(conn=conn, source_table=table, record=prepared)

        return {
            "ok": True,
            "ignored": False,
            "source_table": table,
            "source_id": prepared["id"],
            "young_person_id": prepared["young_person_id"],
            "chronology": chronology_result,
            "standards": standards_result,
            "compliance": compliance_result,
            "links": links_result,
        }

    # ------------------------------------------------------------------
    # Preparation
    # ------------------------------------------------------------------

    def _prepare_record(self, *, source_table: str, record: dict[str, Any] | None) -> dict[str, Any] | None:
        if not isinstance(record, dict) or not record:
            return None

        source_id = record.get("id") or record.get("source_id") or record.get("record_id")
        young_person_id = record.get("young_person_id")

        if not source_id or not young_person_id:
            return None

        prepared = dict(record)

        prepared["id"] = source_id
        prepared["young_person_id"] = young_person_id
        prepared["source_table"] = source_table

        if not prepared.get("primary_record_type"):
            prepared["primary_record_type"] = self._primary_record_type_for_table(source_table)

        if not prepared.get("record_type"):
            prepared["record_type"] = prepared["primary_record_type"]

        if not prepared.get("event_type"):
            prepared["event_type"] = prepared["primary_record_type"]

        if not prepared.get("title"):
            prepared["title"] = self._default_title(source_table=source_table, record=prepared)

        if not prepared.get("summary"):
            prepared["summary"] = self._default_summary(prepared)

        if not prepared.get("narrative"):
            prepared["narrative"] = prepared["summary"]

        if not prepared.get("workflow_status"):
            prepared["workflow_status"] = (
                prepared.get("approval_status")
                or prepared.get("manager_review_status")
                or prepared.get("status")
                or "recorded"
            )

        if not prepared.get("occurred_at"):
            prepared["occurred_at"] = (
                prepared.get("event_datetime")
                or prepared.get("incident_datetime")
                or prepared.get("appointment_date")
                or prepared.get("contact_datetime")
                or prepared.get("session_date")
                or prepared.get("record_date")
                or prepared.get("note_date")
                or prepared.get("created_at")
            )

        if not prepared.get("recorded_at"):
            prepared["recorded_at"] = prepared.get("occurred_at") or prepared.get("created_at")

        if not prepared.get("severity"):
            prepared["severity"] = self._default_severity(source_table=source_table, record=prepared)

        if not prepared.get("significance"):
            prepared["significance"] = prepared["severity"]

        if not prepared.get("quality_standards"):
            prepared["quality_standards"] = self._default_quality_standards(source_table)

        if not prepared.get("judgement_areas"):
            prepared["judgement_areas"] = self._default_judgement_areas(source_table)

        return prepared

    def _primary_record_type_for_table(self, source_table: str) -> str:
        mapping = {
            "daily_notes": "daily_note",
            "incidents": "incident",
            "risk_assessments": "risk",
            "support_plans": "support_plan",
            "young_person_appointments": "appointment",
            "keywork_sessions": "keywork",
            "health_records": "health",
            "education_records": "education",
            "family_contact_records": "family",
        }
        return mapping.get(source_table, source_table.rstrip("s"))

    def _default_title(self, *, source_table: str, record: dict[str, Any]) -> str:
        if source_table == "daily_notes":
            shift = str(record.get("shift_type") or "Shift").replace("_", " ").title()
            return f"{shift} daily note"
        if source_table == "incidents":
            return str(record.get("incident_type") or "Incident").replace("_", " ").title()
        if source_table == "risk_assessments":
            return record.get("title") or "Risk assessment"
        if source_table == "support_plans":
            return record.get("title") or "Support plan"
        if source_table == "young_person_appointments":
            return record.get("title") or "Appointment"
        if source_table == "keywork_sessions":
            return f"Keywork: {record.get('topic') or 'Session'}"
        if source_table == "health_records":
            return record.get("title") or "Health record"
        if source_table == "education_records":
            return record.get("title") or record.get("provision_name") or "Education record"
        if source_table == "family_contact_records":
            return record.get("title") or record.get("contact_person") or "Family contact"
        return record.get("title") or "Record"

    def _default_summary(self, record: dict[str, Any]) -> str:
        for key in (
            "summary",
            "narrative",
            "description",
            "concern_summary",
            "achievement_note",
            "behaviour_summary",
            "child_voice",
            "outcome",
            "post_contact_presentation",
            "actions_agreed",
            "actions_required",
            "response_actions",
        ):
            value = record.get(key)
            if value:
                return str(value)
        return record.get("title") or "Record updated"

    def _default_severity(self, *, source_table: str, record: dict[str, Any]) -> str:
        if source_table == "incidents":
            return str(record.get("severity") or "medium").lower()
        if source_table == "risk_assessments":
            return str(record.get("severity") or "medium").lower()
        if source_table in {"daily_notes", "support_plans", "keywork_sessions", "health_records", "education_records", "family_contact_records", "young_person_appointments"}:
            return "medium"
        return "medium"

    def _default_quality_standards(self, source_table: str) -> list[str]:
        mapping = {
            "daily_notes": ["quality_and_purpose_of_care"],
            "incidents": ["protection_of_children"],
            "risk_assessments": ["protection_of_children"],
            "support_plans": ["protection_of_children"],
            "young_person_appointments": ["health_and_wellbeing"],
            "keywork_sessions": ["positive_relationships", "wishes_and_feelings"],
            "health_records": ["health_and_wellbeing"],
            "education_records": ["education"],
            "family_contact_records": ["positive_relationships", "wishes_and_feelings"],
        }
        return mapping.get(source_table, [])

    def _default_judgement_areas(self, source_table: str) -> list[str]:
        if source_table in {"incidents", "risk_assessments", "support_plans"}:
            return ["helped_and_protected"]
        return ["experiences_and_progress"]

    # ------------------------------------------------------------------
    # Chronology sync
    # ------------------------------------------------------------------

    def _sync_chronology(self, *, conn, source_table: str, record: dict[str, Any]) -> dict[str, Any]:
        chronology_payload = {
            "young_person_id": record["young_person_id"],
            "event_datetime": record.get("occurred_at") or record.get("recorded_at") or record.get("created_at"),
            "category": self._chronology_category_for_table(source_table),
            "subcategory": self._chronology_subcategory_for_table(source_table, record),
            "title": record.get("title"),
            "summary": record.get("summary"),
            "significance": record.get("significance") or record.get("severity") or "medium",
            "source_table": source_table,
            "source_id": record["id"],
            "created_by": record.get("created_by") or record.get("author_id") or record.get("worker_id") or record.get("owner_id"),
            "auto_generated": False,
            "is_visible": not self._is_archivedish(record),
            "metadata_json": self._build_chronology_metadata(record),
            "event_status": self._event_status(record),
            "linked_standard": self._first_standard(record),
            "linked_judgement_area": self._first_judgement_area(record),
            "tags_json": self._build_tags(record),
            "home_id": record.get("home_id"),
            "recorded_by_name": record.get("recorded_by_name")
            or record.get("author_name")
            or record.get("staff_name")
            or record.get("worker_name")
            or record.get("created_by_name")
            or record.get("owner_name"),
            "workflow_status": record.get("workflow_status"),
            "safeguarding_flag": self._is_safeguarding_record(source_table, record),
            "child_voice_present": bool(record.get("child_voice") or record.get("young_person_voice")),
            "severity": record.get("severity") or record.get("significance") or "medium",
            "primary_record_type": record.get("primary_record_type"),
        }

        chronology_id = self._upsert_chronology_event(conn=conn, payload=chronology_payload)

        return {
            "ok": True,
            "chronology_event_id": chronology_id,
        }

    def _upsert_chronology_event(self, *, conn, payload: dict[str, Any]) -> int:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM chronology_events
                WHERE source_table = %s
                  AND source_id = %s
                  AND young_person_id = %s
                LIMIT 1
                """,
                (
                    payload["source_table"],
                    payload["source_id"],
                    payload["young_person_id"],
                ),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE chronology_events
                    SET
                        event_datetime = %s,
                        category = %s,
                        subcategory = %s,
                        title = %s,
                        summary = %s,
                        significance = %s,
                        created_by = %s,
                        auto_generated = %s,
                        is_visible = %s,
                        metadata_json = %s,
                        event_status = %s,
                        linked_standard = %s,
                        linked_judgement_area = %s,
                        tags_json = %s,
                        updated_at = NOW(),
                        home_id = %s,
                        recorded_by_name = %s,
                        workflow_status = %s,
                        safeguarding_flag = %s,
                        child_voice_present = %s,
                        severity = %s,
                        primary_record_type = %s
                    WHERE id = %s
                    RETURNING id
                    """,
                    (
                        payload["event_datetime"],
                        payload["category"],
                        payload["subcategory"],
                        payload["title"],
                        payload["summary"],
                        payload["significance"],
                        payload.get("created_by"),
                        payload["auto_generated"],
                        payload["is_visible"],
                        payload["metadata_json"],
                        payload["event_status"],
                        payload.get("linked_standard"),
                        payload.get("linked_judgement_area"),
                        payload["tags_json"],
                        payload.get("home_id"),
                        payload.get("recorded_by_name"),
                        payload.get("workflow_status"),
                        payload.get("safeguarding_flag", False),
                        payload.get("child_voice_present", False),
                        payload.get("severity"),
                        payload.get("primary_record_type"),
                        existing["id"],
                    ),
                )
                updated = cur.fetchone()
                return int(updated["id"])

            cur.execute(
                """
                INSERT INTO chronology_events (
                    young_person_id,
                    event_datetime,
                    category,
                    subcategory,
                    title,
                    summary,
                    significance,
                    source_table,
                    source_id,
                    created_by,
                    auto_generated,
                    is_visible,
                    metadata_json,
                    created_at,
                    event_status,
                    linked_standard,
                    linked_judgement_area,
                    tags_json,
                    updated_at,
                    home_id,
                    recorded_by_name,
                    workflow_status,
                    safeguarding_flag,
                    child_voice_present,
                    severity,
                    primary_record_type
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(),
                    %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    payload["young_person_id"],
                    payload["event_datetime"],
                    payload["category"],
                    payload["subcategory"],
                    payload["title"],
                    payload["summary"],
                    payload["significance"],
                    payload["source_table"],
                    payload["source_id"],
                    payload.get("created_by"),
                    payload["auto_generated"],
                    payload["is_visible"],
                    payload["metadata_json"],
                    payload["event_status"],
                    payload.get("linked_standard"),
                    payload.get("linked_judgement_area"),
                    payload["tags_json"],
                    payload.get("home_id"),
                    payload.get("recorded_by_name"),
                    payload.get("workflow_status"),
                    payload.get("safeguarding_flag", False),
                    payload.get("child_voice_present", False),
                    payload.get("severity"),
                    payload.get("primary_record_type"),
                ),
            )
            created = cur.fetchone()
            return int(created["id"])

    def _chronology_category_for_table(self, source_table: str) -> str:
        mapping = {
            "daily_notes": "daily_note",
            "incidents": "incident",
            "risk_assessments": "risk",
            "support_plans": "support_plan",
            "young_person_appointments": "appointment",
            "keywork_sessions": "keywork",
            "health_records": "health",
            "education_records": "education",
            "family_contact_records": "family",
        }
        return mapping.get(source_table, "record")

    def _chronology_subcategory_for_table(self, source_table: str, record: dict[str, Any]) -> str:
        if source_table == "daily_notes":
            return record.get("shift_type") or "daily_note"
        if source_table == "incidents":
            return record.get("incident_type") or "incident"
        if source_table == "risk_assessments":
            return record.get("category") or "risk"
        if source_table == "support_plans":
            return record.get("plan_type") or "support_plan"
        if source_table == "young_person_appointments":
            return record.get("appointment_type") or "appointment"
        if source_table == "keywork_sessions":
            return record.get("topic") or "keywork"
        if source_table == "health_records":
            return record.get("record_type") or "health"
        if source_table == "education_records":
            return record.get("attendance_status") or "education"
        if source_table == "family_contact_records":
            return record.get("contact_type") or "family_contact"
        return "record"

    def _build_chronology_metadata(self, record: dict[str, Any]) -> dict[str, Any]:
        return {
            "workflow_status": record.get("workflow_status"),
            "record_type": record.get("record_type") or record.get("primary_record_type"),
            "event_type": record.get("event_type"),
            "severity": record.get("severity"),
            "status": record.get("status"),
            "approval_status": record.get("approval_status"),
            "review_date": self._serialise_value(record.get("review_date")),
            "due_date": self._serialise_value(
                record.get("review_due_at")
                or record.get("next_action_date")
                or record.get("next_session_date")
            ),
        }

    def _build_tags(self, record: dict[str, Any]) -> list[str]:
        tags: list[str] = []

        for key in ("primary_record_type", "event_type", "record_type", "workflow_status", "severity"):
            value = record.get(key)
            if value:
                tags.append(str(value).strip().lower())

        for item in record.get("quality_standards") or []:
            if item:
                tags.append(str(item).strip().lower())

        # de-duplicate while preserving order
        seen: set[str] = set()
        out: list[str] = []
        for tag in tags:
            if tag not in seen:
                seen.add(tag)
                out.append(tag)
        return out

    def _event_status(self, record: dict[str, Any]) -> str:
        if self._is_archivedish(record):
            return "archived"
        return str(record.get("workflow_status") or record.get("status") or "recorded").lower()

    def _is_archivedish(self, record: dict[str, Any]) -> bool:
        values = {
            str(record.get("workflow_status") or "").lower(),
            str(record.get("status") or "").lower(),
            str(record.get("approval_status") or "").lower(),
        }
        return bool(record.get("archived")) or any(v in {"archived", "completed", "closed"} for v in values)

    def _is_safeguarding_record(self, source_table: str, record: dict[str, Any]) -> bool:
        if source_table == "incidents":
            return bool(record.get("safeguarding_flag")) or str(record.get("incident_type") or "").lower() == "safeguarding_concern"
        if source_table == "risk_assessments":
            return str(record.get("severity") or "").lower() in {"high", "critical"}
        if source_table == "family_contact_records":
            return bool(record.get("concerns"))
        return False

    def _first_standard(self, record: dict[str, Any]) -> str | None:
        standards = record.get("quality_standards") or []
        return str(standards[0]) if standards else None

    def _first_judgement_area(self, record: dict[str, Any]) -> str | None:
        items = record.get("judgement_areas") or []
        return str(items[0]) if items else None

    # ------------------------------------------------------------------
    # Standards sync
    # ------------------------------------------------------------------

    def _sync_standards(self, *, conn, source_table: str, record: dict[str, Any]) -> dict[str, Any]:
        linked_codes: list[str] = []

        standards = record.get("quality_standards") or []
        if not standards:
            return {"ok": True, "linked_codes": linked_codes}

        for standard_code in standards:
            standard_code = str(standard_code).strip()
            if not standard_code:
                continue

            self._upsert_record_standard_link(
                conn=conn,
                young_person_id=record["young_person_id"],
                source_table=source_table,
                source_id=record["id"],
                standard_code=standard_code,
                rationale=self._standard_rationale(source_table, record),
                evidence_strength=self._evidence_strength(source_table, record),
                linked_by=record.get("created_by") or record.get("author_id") or record.get("worker_id") or record.get("owner_id"),
                auto_linked=True,
            )
            linked_codes.append(standard_code)

        return {
            "ok": True,
            "linked_codes": linked_codes,
        }

    def _upsert_record_standard_link(
        self,
        *,
        conn,
        young_person_id: int,
        source_table: str,
        source_id: int,
        standard_code: str,
        rationale: str,
        evidence_strength: str,
        linked_by: int | None,
        auto_linked: bool,
    ) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM record_standard_links
                WHERE young_person_id = %s
                  AND source_table = %s
                  AND source_id = %s
                  AND standard_code = %s
                LIMIT 1
                """,
                (young_person_id, source_table, source_id, standard_code),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE record_standard_links
                    SET
                        evidence_strength = %s,
                        rationale = %s,
                        linked_by = %s,
                        auto_linked = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (
                        evidence_strength,
                        rationale,
                        linked_by,
                        auto_linked,
                        existing["id"],
                    ),
                )
                return

            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id,
                    source_table,
                    source_id,
                    standard_code,
                    evidence_strength,
                    rationale,
                    linked_by,
                    auto_linked,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """,
                (
                    young_person_id,
                    source_table,
                    source_id,
                    standard_code,
                    evidence_strength,
                    rationale,
                    linked_by,
                    auto_linked,
                ),
            )

    def _standard_rationale(self, source_table: str, record: dict[str, Any]) -> str:
        return (
            record.get("standards_rationale")
            or f"Auto-linked from {source_table} record sync"
        )

    def _evidence_strength(self, source_table: str, record: dict[str, Any]) -> str:
        if record.get("evidence_strength"):
            return str(record["evidence_strength"])
        if source_table in {"incidents", "risk_assessments", "support_plans"}:
            return "strong"
        return "medium"

    # ------------------------------------------------------------------
    # Compliance sync
    # ------------------------------------------------------------------

    def _sync_compliance(self, *, conn, source_table: str, record: dict[str, Any]) -> dict[str, Any]:
        rule_name = self._compliance_rule_name(source_table, record)
        due_date = self._compliance_due_date(source_table, record)

        if not rule_name or not due_date:
            return {"ok": True, "created_or_updated": False}

        item_id = self._upsert_compliance_item(
            conn=conn,
            young_person_id=record["young_person_id"],
            record_type=record.get("primary_record_type") or source_table,
            source_table=source_table,
            source_id=record["id"],
            title=rule_name,
            owner_id=record.get("owner_id") or record.get("created_by") or record.get("author_id") or record.get("worker_id"),
            due_date=due_date,
            status=self._compliance_status(record, due_date),
            severity=self._compliance_severity(source_table, record),
            metadata_json={
                "workflow_status": record.get("workflow_status"),
                "title": record.get("title"),
                "source_table": source_table,
            },
        )

        return {
            "ok": True,
            "created_or_updated": True,
            "compliance_item_id": item_id,
        }

    def _upsert_compliance_item(
        self,
        *,
        conn,
        young_person_id: int,
        record_type: str,
        source_table: str,
        source_id: int,
        title: str,
        owner_id: int | None,
        due_date: date | datetime | str,
        status: str,
        severity: str,
        metadata_json: dict[str, Any],
    ) -> int:
        serialised_due = self._coerce_date(due_date)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM compliance_items
                WHERE young_person_id = %s
                  AND source_table = %s
                  AND source_id = %s
                LIMIT 1
                """,
                (young_person_id, source_table, source_id),
            )
            existing = cur.fetchone()

            if existing:
                cur.execute(
                    """
                    UPDATE compliance_items
                    SET
                        record_type = %s,
                        title = %s,
                        owner_id = %s,
                        due_date = %s,
                        status = %s,
                        severity = %s,
                        metadata_json = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING id
                    """,
                    (
                        record_type,
                        title,
                        owner_id,
                        serialised_due,
                        status,
                        severity,
                        metadata_json,
                        existing["id"],
                    ),
                )
                row = cur.fetchone()
                return int(row["id"])

            cur.execute(
                """
                INSERT INTO compliance_items (
                    young_person_id,
                    record_type,
                    source_table,
                    source_id,
                    title,
                    owner_id,
                    due_date,
                    status,
                    severity,
                    escalation_level,
                    metadata_json,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id
                """,
                (
                    young_person_id,
                    record_type,
                    source_table,
                    source_id,
                    title,
                    owner_id,
                    serialised_due,
                    status,
                    severity,
                    0,
                    metadata_json,
                ),
            )
            row = cur.fetchone()
            return int(row["id"])

    def _compliance_rule_name(self, source_table: str, record: dict[str, Any]) -> str | None:
        if source_table in {"risk_assessments", "support_plans"} and record.get("review_date"):
            return f"Review due: {record.get('title') or self._default_title(source_table=source_table, record=record)}"
        if source_table == "young_person_appointments" and record.get("appointment_date"):
            return f"Appointment due: {record.get('title') or 'Appointment'}"
        if source_table == "health_records" and record.get("next_action_date"):
            return f"Health follow-up due: {record.get('title') or 'Health record'}"
        if source_table == "keywork_sessions" and record.get("next_session_date"):
            return "Next keywork session due"
        if source_table == "daily_notes" and record.get("actions_required"):
            return "Daily note follow-up required"
        if source_table == "family_contact_records" and record.get("follow_up_required"):
            return "Family contact follow-up required"
        if source_table == "education_records" and (record.get("issue_raised") or record.get("action_taken")):
            return "Education action follow-up"
        return None

    def _compliance_due_date(self, source_table: str, record: dict[str, Any]) -> date | datetime | str | None:
        if source_table in {"risk_assessments", "support_plans"}:
            return record.get("review_date")
        if source_table == "young_person_appointments":
            return record.get("appointment_date")
        if source_table == "health_records":
            return record.get("next_action_date") or record.get("event_datetime")
        if source_table == "keywork_sessions":
            return record.get("next_session_date")
        if source_table == "daily_notes":
            return record.get("note_date") or record.get("recorded_at")
        if source_table == "family_contact_records":
            return record.get("contact_datetime")
        if source_table == "education_records":
            return record.get("record_date")
        return None

    def _compliance_status(self, record: dict[str, Any], due_date: date | datetime | str | None) -> str:
        if self._is_archivedish(record):
            return "completed"

        due = self._coerce_date(due_date)
        if due is None:
            return "open"

        today = datetime.utcnow().date()
        if due < today:
            return "overdue"
        if due == today:
            return "due_soon"
        return "ok"

    def _compliance_severity(self, source_table: str, record: dict[str, Any]) -> str:
        if source_table in {"incidents", "risk_assessments"}:
            return str(record.get("severity") or "medium")
        return "medium"

    # ------------------------------------------------------------------
    # Record linking
    # ------------------------------------------------------------------

    def _sync_links(self, *, conn, source_table: str, record: dict[str, Any]) -> dict[str, Any]:
        created_links = 0

        if source_table == "young_person_appointments":
            linked_plan_id = record.get("linked_plan_id")
            if linked_plan_id:
                self._upsert_record_link(
                    conn=conn,
                    young_person_id=record["young_person_id"],
                    from_table="young_person_appointments",
                    from_id=record["id"],
                    to_table="support_plans",
                    to_id=linked_plan_id,
                    relationship_type="appointment_linked_to_plan",
                    created_by=record.get("created_by"),
                )
                created_links += 1

        return {
            "ok": True,
            "created_links": created_links,
        }

    def _upsert_record_link(
        self,
        *,
        conn,
        young_person_id: int,
        from_table: str,
        from_id: int,
        to_table: str,
        to_id: int,
        relationship_type: str,
        created_by: int | None,
    ) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id
                FROM record_links
                WHERE young_person_id = %s
                  AND from_table = %s
                  AND from_id = %s
                  AND to_table = %s
                  AND to_id = %s
                  AND relationship_type = %s
                LIMIT 1
                """,
                (
                    young_person_id,
                    from_table,
                    from_id,
                    to_table,
                    to_id,
                    relationship_type,
                ),
            )
            existing = cur.fetchone()

            if existing:
                return

            cur.execute(
                """
                INSERT INTO record_links (
                    young_person_id,
                    from_table,
                    from_id,
                    to_table,
                    to_id,
                    relationship_type,
                    created_by,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    young_person_id,
                    from_table,
                    from_id,
                    to_table,
                    to_id,
                    relationship_type,
                    created_by,
                ),
            )

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def _coerce_date(self, value: Any) -> date | None:
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            try:
                if "T" in text:
                    return datetime.fromisoformat(text).date()
                return datetime.fromisoformat(text).date()
            except Exception:
                try:
                    return datetime.strptime(text, "%Y-%m-%d").date()
                except Exception:
                    return None
        return None

    def _serialise_value(self, value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, date):
            return value.isoformat()
        return value
