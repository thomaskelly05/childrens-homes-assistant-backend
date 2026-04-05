from __future__ import annotations

from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.child_record_sync_service import ChildRecordSyncService


class YoungPersonOSSync:
    """
    Thin adapter between domain service saves and the shared child record OS sync layer.

    Domain services call methods like:
        sync_daily_note(...)
        sync_incident(...)
        sync_risk_assessment(...)
        sync_support_plan(...)
        sync_young_person_appointment(...)
        sync_keywork_session(...)
        sync_health_record(...)
        sync_education_record(...)
        sync_family_contact_record(...)

    This service opens its own DB connection and forwards the record into the
    shared sync engine.

    It is intentionally tolerant:
    - empty records are ignored
    - unsupported sync engine signatures are tried in several safe ways
    - failures are raised so the hook layer can decide whether to swallow them
    """

    def __init__(self) -> None:
        self.child_sync_service = ChildRecordSyncService()

    # ---------------------------------------------------------------------
    # Public sync entry points
    # ---------------------------------------------------------------------

    def sync_daily_note(self, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        return self._sync("daily_notes", record, recorded_by_name=recorded_by_name)

    def sync_incident(self, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        return self._sync("incidents", record, recorded_by_name=recorded_by_name)

    def sync_risk_assessment(self, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        return self._sync("risk_assessments", record, recorded_by_name=recorded_by_name)

    def sync_support_plan(self, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        return self._sync("support_plans", record, recorded_by_name=recorded_by_name)

    def sync_young_person_appointment(self, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        return self._sync("young_person_appointments", record, recorded_by_name=recorded_by_name)

    def sync_keywork_session(self, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        return self._sync("keywork_sessions", record, recorded_by_name=recorded_by_name)

    def sync_health_record(self, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        return self._sync("health_records", record, recorded_by_name=recorded_by_name)

    def sync_education_record(self, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        return self._sync("education_records", record, recorded_by_name=recorded_by_name)

    def sync_family_contact_record(self, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        return self._sync("family_contact_records", record, recorded_by_name=recorded_by_name)

    # ---------------------------------------------------------------------
    # Core sync wrapper
    # ---------------------------------------------------------------------

    def _sync(self, source_table: str, record: dict[str, Any], recorded_by_name: str | None = None) -> bool:
        prepared = self._prepare_record(source_table=source_table, record=record, recorded_by_name=recorded_by_name)
        if not prepared:
            return False

        conn = None
        try:
            conn = get_db_connection()
            synced = self._dispatch_to_child_sync_service(conn=conn, source_table=source_table, record=prepared)
            conn.commit()
            return bool(synced)
        except Exception:
            if conn is not None:
                try:
                    conn.rollback()
                except Exception:
                    pass
            raise
        finally:
            release_db_connection(conn)

    # ---------------------------------------------------------------------
    # Record preparation
    # ---------------------------------------------------------------------

    def _prepare_record(
        self,
        *,
        source_table: str,
        record: dict[str, Any] | None,
        recorded_by_name: str | None,
    ) -> dict[str, Any] | None:
        if not isinstance(record, dict) or not record:
            return None

        source_id = record.get("id") or record.get("record_id") or record.get("source_id")
        young_person_id = record.get("young_person_id")

        if not source_id or not young_person_id:
            return None

        prepared = dict(record)
        prepared["id"] = source_id
        prepared["young_person_id"] = young_person_id
        prepared["source_table"] = source_table

        if recorded_by_name and not prepared.get("recorded_by_name"):
            prepared["recorded_by_name"] = recorded_by_name

        if not prepared.get("recorded_by_name"):
            prepared["recorded_by_name"] = (
                prepared.get("author_name")
                or prepared.get("staff_name")
                or prepared.get("worker_name")
                or prepared.get("worker_name")
                or prepared.get("created_by_name")
                or prepared.get("owner_name")
            )

        # Keep a stable primary record type for chronology / downstream logic.
        if not prepared.get("primary_record_type"):
            prepared["primary_record_type"] = self._primary_record_type_for_table(source_table)

        if not prepared.get("record_type"):
            prepared["record_type"] = prepared["primary_record_type"]

        if not prepared.get("event_type"):
            prepared["event_type"] = prepared["primary_record_type"]

        # Backfill a reasonable occurred/recorded datetime field for downstream sync logic.
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

        if not prepared.get("workflow_status"):
            prepared["workflow_status"] = (
                prepared.get("status")
                or prepared.get("approval_status")
                or prepared.get("manager_review_status")
                or "recorded"
            )

        if not prepared.get("summary"):
            prepared["summary"] = (
                prepared.get("narrative")
                or prepared.get("description")
                or prepared.get("concern_summary")
                or prepared.get("title")
                or prepared.get("topic")
                or prepared.get("contact_person")
                or prepared.get("professional_name")
                or "Record updated"
            )

        if not prepared.get("title"):
            prepared["title"] = self._default_title(source_table=source_table, record=prepared)

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
            incident_type = str(record.get("incident_type") or "incident").replace("_", " ").title()
            return incident_type

        if source_table == "risk_assessments":
            return record.get("title") or "Risk assessment"

        if source_table == "support_plans":
            return record.get("title") or "Support plan"

        if source_table == "young_person_appointments":
            return record.get("title") or "Appointment"

        if source_table == "keywork_sessions":
            topic = record.get("topic") or "Session"
            return f"Keywork: {topic}"

        if source_table == "health_records":
            return record.get("title") or "Health record"

        if source_table == "education_records":
            return record.get("title") or record.get("provision_name") or "Education record"

        if source_table == "family_contact_records":
            return record.get("title") or record.get("contact_person") or "Family contact"

        return record.get("title") or "Record"

    # ---------------------------------------------------------------------
    # Sync engine dispatch
    # ---------------------------------------------------------------------

    def _dispatch_to_child_sync_service(
        self,
        *,
        conn,
        source_table: str,
        record: dict[str, Any],
    ) -> bool:
        """
        Try a few supported call patterns so this adapter remains compatible
        with slightly different internal implementations.
        """

        service = self.child_sync_service

        candidates = [
            ("sync_record", self._call_sync_record),
            ("sync_child_record", self._call_sync_child_record),
            ("sync", self._call_sync_generic),
            ("process_record", self._call_process_record),
        ]

        last_error: Exception | None = None

        for method_name, caller in candidates:
            if not hasattr(service, method_name):
                continue
            try:
                return bool(caller(conn=conn, source_table=source_table, record=record))
            except TypeError as exc:
                last_error = exc
                continue

        if last_error is not None:
            raise last_error

        raise AttributeError(
            "ChildRecordSyncService does not expose a supported sync method. "
            "Expected one of: sync_record, sync_child_record, sync, process_record."
        )

    def _call_sync_record(self, *, conn, source_table: str, record: dict[str, Any]) -> Any:
        method = getattr(self.child_sync_service, "sync_record")
        try:
            return method(conn=conn, source_table=source_table, record=record)
        except TypeError:
            return method(conn, source_table, record)

    def _call_sync_child_record(self, *, conn, source_table: str, record: dict[str, Any]) -> Any:
        method = getattr(self.child_sync_service, "sync_child_record")
        try:
            return method(conn=conn, source_table=source_table, record=record)
        except TypeError:
            try:
                return method(conn=conn, record=record, source_table=source_table)
            except TypeError:
                return method(conn, record, source_table)

    def _call_sync_generic(self, *, conn, source_table: str, record: dict[str, Any]) -> Any:
        method = getattr(self.child_sync_service, "sync")
        try:
            return method(conn=conn, source_table=source_table, record=record)
        except TypeError:
            try:
                return method(conn=conn, record=record)
            except TypeError:
                return method(conn, record)

    def _call_process_record(self, *, conn, source_table: str, record: dict[str, Any]) -> Any:
        method = getattr(self.child_sync_service, "process_record")
        try:
            return method(conn=conn, source_table=source_table, record=record)
        except TypeError:
            try:
                return method(conn=conn, record=record, source_table=source_table)
            except TypeError:
                return method(conn, record, source_table)
