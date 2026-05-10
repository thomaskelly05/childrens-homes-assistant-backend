from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from db.connection import get_db_connection, release_db_connection


VALID_STATUS = {"open", "completed", "cancelled", "overdue"}
VALID_SEVERITY = {"low", "medium", "high", "critical"}


def _normalise_status(value: str | None) -> str:
    cleaned = (value or "open").strip().lower()
    return cleaned if cleaned in VALID_STATUS else "open"


def _normalise_severity(value: str | None) -> str:
    cleaned = (value or "medium").strip().lower()
    return cleaned if cleaned in VALID_SEVERITY else "medium"


def _coerce_date(value: date | datetime | str | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        try:
            return datetime.fromisoformat(raw).date()
        except ValueError:
            try:
                return date.fromisoformat(raw)
            except ValueError:
                return None
    return None


def _read_row_value(row: Any, *, key: str, index: int) -> Any:
    if row is None:
        return None
    if isinstance(row, dict):
        return row.get(key)
    return row[index]


@dataclass(slots=True)
class ComplianceItemInput:
    young_person_id: int
    rule_id: int | None
    record_type: str
    source_table: str
    source_id: int
    title: str

    owner_id: int | None = None
    due_date: date | datetime | str | None = None
    completed_date: date | datetime | str | None = None
    status: str = "open"
    severity: str = "medium"
    escalation_level: int = 0
    metadata_json: dict[str, Any] | None = None


class ComplianceEngine:
    def upsert_item(self, payload: ComplianceItemInput) -> int:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id
                    FROM compliance_items
                    WHERE young_person_id = %s
                      AND source_table = %s
                      AND source_id = %s
                      AND title = %s
                    LIMIT 1
                    """,
                    (
                        payload.young_person_id,
                        payload.source_table,
                        payload.source_id,
                        payload.title,
                    ),
                )
                existing = cur.fetchone()

                if existing:
                    item_id = int(_read_row_value(existing, key="id", index=0))
                    cur.execute(
                        """
                        UPDATE compliance_items
                        SET
                            rule_id = %s,
                            record_type = %s,
                            owner_id = %s,
                            due_date = %s,
                            completed_date = %s,
                            status = %s,
                            severity = %s,
                            escalation_level = %s,
                            metadata_json = %s,
                            updated_at = NOW()
                        WHERE id = %s
                        """,
                        (
                            payload.rule_id,
                            payload.record_type,
                            payload.owner_id,
                            _coerce_date(payload.due_date),
                            _coerce_date(payload.completed_date),
                            _normalise_status(payload.status),
                            _normalise_severity(payload.severity),
                            payload.escalation_level,
                            payload.metadata_json or {},
                            item_id,
                        ),
                    )
                    conn.commit()
                    return item_id

                cur.execute(
                    """
                    INSERT INTO compliance_items (
                        young_person_id,
                        rule_id,
                        record_type,
                        source_table,
                        source_id,
                        title,
                        owner_id,
                        due_date,
                        completed_date,
                        status,
                        severity,
                        escalation_level,
                        metadata_json,
                        created_at,
                        updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    RETURNING id
                    """,
                    (
                        payload.young_person_id,
                        payload.rule_id,
                        payload.record_type,
                        payload.source_table,
                        payload.source_id,
                        payload.title,
                        payload.owner_id,
                        _coerce_date(payload.due_date),
                        _coerce_date(payload.completed_date),
                        _normalise_status(payload.status),
                        _normalise_severity(payload.severity),
                        payload.escalation_level,
                        payload.metadata_json or {},
                    ),
                )
                row = cur.fetchone()
            conn.commit()
            return int(_read_row_value(row, key="id", index=0))
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def mark_completed(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        title: str,
        completed_date: date | None = None,
    ) -> None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE compliance_items
                    SET
                        status = 'completed',
                        completed_date = %s,
                        updated_at = NOW()
                    WHERE young_person_id = %s
                      AND source_table = %s
                      AND source_id = %s
                      AND title = %s
                    """,
                    (
                        completed_date or date.today(),
                        young_person_id,
                        source_table,
                        source_id,
                        title,
                    ),
                )
            conn.commit()
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def create_incident_follow_up_if_needed(self, incident: dict) -> None:
        if not incident.get("follow_up_required"):
            return

        self.upsert_item(
            ComplianceItemInput(
                young_person_id=incident["young_person_id"],
                rule_id=None,
                record_type="incident",
                source_table="incidents",
                source_id=incident["id"],
                title="Incident follow-up required",
                owner_id=incident.get("staff_id"),
                due_date=date.today() + timedelta(days=1),
                status="open",
                severity="high" if incident.get("safeguarding_flag") else "medium",
                metadata_json={
                    "incident_type": incident.get("incident_type"),
                    "manager_review_required": incident.get("manager_review_required"),
                },
            )
        )

    def create_missing_episode_return_interview_if_needed(self, episode: dict) -> None:
        if episode.get("return_interview_completed"):
            return
        if not episode.get("return_datetime"):
            return

        due = _coerce_date(episode.get("return_datetime"))
        if due is None:
            return

        self.upsert_item(
            ComplianceItemInput(
                young_person_id=episode["young_person_id"],
                rule_id=None,
                record_type="missing_episode",
                source_table="missing_episodes",
                source_id=episode["id"],
                title="Return interview required",
                owner_id=episode.get("created_by"),
                due_date=due + timedelta(days=1),
                status="open",
                severity="high",
                metadata_json={
                    "police_reference": episode.get("police_reference"),
                    "review_required": episode.get("review_required"),
                },
            )
        )

    def create_risk_review_due_item(self, risk: dict) -> None:
        review_date = _coerce_date(risk.get("review_date"))
        if review_date is None:
            return

        self.upsert_item(
            ComplianceItemInput(
                young_person_id=risk["young_person_id"],
                rule_id=None,
                record_type="risk_assessment",
                source_table="risk_assessments",
                source_id=risk["id"],
                title="Risk assessment review due",
                owner_id=risk.get("owner_id"),
                due_date=review_date,
                status="open",
                severity="high" if str(risk.get("severity") or "").lower() in {"high", "critical"} else "medium",
                metadata_json={
                    "category": risk.get("category"),
                    "approval_status": risk.get("approval_status"),
                },
            )
        )

    def create_yp_appointment_follow_up_if_needed(self, appointment: dict) -> None:
        follow_up = appointment.get("follow_up_actions")
        if not follow_up:
            return

        base_date = _coerce_date(appointment.get("appointment_date")) or date.today()

        self.upsert_item(
            ComplianceItemInput(
                young_person_id=appointment["young_person_id"],
                rule_id=None,
                record_type="young_person_appointment",
                source_table="young_person_appointments",
                source_id=appointment["id"],
                title="Appointment follow-up actions required",
                owner_id=appointment.get("created_by"),
                due_date=base_date + timedelta(days=1),
                status="open",
                severity="medium",
                metadata_json={
                    "appointment_type": appointment.get("appointment_type"),
                    "professional_name": appointment.get("professional_name"),
                },
            )
        )
