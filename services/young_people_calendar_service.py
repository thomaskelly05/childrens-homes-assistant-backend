from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, timedelta
from typing import Any

from db.connection import get_db_connection, release_db_connection


class YoungPeopleCalendarService:
    @staticmethod
    def get_calendar_summary(
        *,
        young_person_id: int,
        year: int,
        month: int,
    ) -> dict[str, Any]:
        start_date = date(year, month, 1)
        end_date = date(year, month, monthrange(year, month)[1])

        conn = get_db_connection()
        try:
            items = YoungPeopleCalendarService._fetch_calendar_items(
                conn=conn,
                young_person_id=young_person_id,
                start_date=start_date,
                end_date=end_date,
            )

            by_day: dict[str, dict[str, Any]] = {}

            current = start_date
            while current <= end_date:
                key = current.isoformat()
                by_day[key] = {
                    "date": key,
                    "record_count": 0,
                    "record_types": [],
                    "types": [],
                    "has_daily_note": False,
                    "has_incident": False,
                    "has_risk": False,
                    "has_health": False,
                    "has_education": False,
                    "has_family": False,
                    "has_keywork": False,
                    "has_support_plan": False,
                }
                current += timedelta(days=1)

            for item in items:
                day_key = item["record_date"]
                row = by_day.get(day_key)
                if not row:
                    continue

                record_type = item["record_type"]
                row["record_count"] += 1

                if record_type not in row["record_types"]:
                    row["record_types"].append(record_type)

                if record_type not in row["types"]:
                    row["types"].append(record_type)

                if record_type == "daily_note":
                    row["has_daily_note"] = True
                elif record_type == "incident":
                    row["has_incident"] = True
                elif record_type == "risk":
                    row["has_risk"] = True
                elif record_type == "health":
                    row["has_health"] = True
                elif record_type == "education":
                    row["has_education"] = True
                elif record_type == "family":
                    row["has_family"] = True
                elif record_type == "keywork":
                    row["has_keywork"] = True
                elif record_type == "support_plan":
                    row["has_support_plan"] = True

            days = list(by_day.values())

            return {
                "young_person_id": young_person_id,
                "year": year,
                "month": month,
                "days": days,
                "items": days,
            }
        finally:
            release_db_connection(conn)

    @staticmethod
    def get_records_by_date(
        *,
        young_person_id: int,
        selected_date: date,
    ) -> dict[str, Any]:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                results: list[dict[str, Any]] = []

                results.extend(
                    YoungPeopleCalendarService._fetch_daily_notes(
                        cur=cur,
                        young_person_id=young_person_id,
                        selected_date=selected_date,
                    )
                )
                results.extend(
                    YoungPeopleCalendarService._fetch_incidents(
                        cur=cur,
                        young_person_id=young_person_id,
                        selected_date=selected_date,
                    )
                )
                results.extend(
                    YoungPeopleCalendarService._fetch_risks(
                        cur=cur,
                        young_person_id=young_person_id,
                        selected_date=selected_date,
                    )
                )
                results.extend(
                    YoungPeopleCalendarService._fetch_health_records(
                        cur=cur,
                        young_person_id=young_person_id,
                        selected_date=selected_date,
                    )
                )
                results.extend(
                    YoungPeopleCalendarService._fetch_medication_records(
                        cur=cur,
                        young_person_id=young_person_id,
                        selected_date=selected_date,
                    )
                )
                results.extend(
                    YoungPeopleCalendarService._fetch_education_records(
                        cur=cur,
                        young_person_id=young_person_id,
                        selected_date=selected_date,
                    )
                )
                results.extend(
                    YoungPeopleCalendarService._fetch_family_records(
                        cur=cur,
                        young_person_id=young_person_id,
                        selected_date=selected_date,
                    )
                )
                results.extend(
                    YoungPeopleCalendarService._fetch_keywork_records(
                        cur=cur,
                        young_person_id=young_person_id,
                        selected_date=selected_date,
                    )
                )
                results.extend(
                    YoungPeopleCalendarService._fetch_plan_records(
                        cur=cur,
                        young_person_id=young_person_id,
                        selected_date=selected_date,
                    )
                )

            results.sort(
                key=lambda x: (
                    YoungPeopleCalendarService._sort_datetime_value(x.get("recorded_at")),
                    str(x.get("record_type") or ""),
                    int(x.get("record_id") or 0),
                ),
                reverse=True,
            )

            return {
                "young_person_id": young_person_id,
                "date": selected_date.isoformat(),
                "items": results,
                "count": len(results),
            }
        finally:
            release_db_connection(conn)

    @staticmethod
    def _fetch_calendar_items(
        *,
        conn,
        young_person_id: int,
        start_date: date,
        end_date: date,
    ) -> list[dict[str, Any]]:
        with conn.cursor() as cur:
            union_sql = """
                SELECT record_date, record_type
                FROM (
                    SELECT dn.note_date::date AS record_date, 'daily_note' AS record_type
                    FROM daily_notes dn
                    WHERE dn.young_person_id = %s
                      AND dn.note_date IS NOT NULL
                      AND dn.note_date BETWEEN %s AND %s
                      AND COALESCE(dn.archived, FALSE) = FALSE

                    UNION ALL

                    SELECT i.incident_datetime::date AS record_date, 'incident' AS record_type
                    FROM incidents i
                    WHERE i.young_person_id = %s
                      AND i.incident_datetime IS NOT NULL
                      AND i.incident_datetime::date BETWEEN %s AND %s
                      AND COALESCE(i.archived, FALSE) = FALSE

                    UNION ALL

                    SELECT ra.review_date::date AS record_date, 'risk' AS record_type
                    FROM risk_assessments ra
                    WHERE ra.young_person_id = %s
                      AND ra.review_date IS NOT NULL
                      AND ra.review_date BETWEEN %s AND %s
                      AND COALESCE(ra.archived, FALSE) = FALSE

                    UNION ALL

                    SELECT hr.event_datetime::date AS record_date, 'health' AS record_type
                    FROM health_records hr
                    WHERE hr.young_person_id = %s
                      AND hr.event_datetime IS NOT NULL
                      AND hr.event_datetime::date BETWEEN %s AND %s

                    UNION ALL

                    SELECT COALESCE(mr.administered_time::date, mr.scheduled_time::date, mr.created_at::date) AS record_date, 'health' AS record_type
                    FROM medication_records mr
                    WHERE mr.young_person_id = %s
                      AND COALESCE(mr.administered_time::date, mr.scheduled_time::date, mr.created_at::date) BETWEEN %s AND %s

                    UNION ALL

                    SELECT er.record_date::date AS record_date, 'education' AS record_type
                    FROM education_records er
                    WHERE er.young_person_id = %s
                      AND er.record_date IS NOT NULL
                      AND er.record_date BETWEEN %s AND %s

                    UNION ALL

                    SELECT fcr.contact_datetime::date AS record_date, 'family' AS record_type
                    FROM family_contact_records fcr
                    WHERE fcr.young_person_id = %s
                      AND fcr.contact_datetime IS NOT NULL
                      AND fcr.contact_datetime::date BETWEEN %s AND %s

                    UNION ALL

                    SELECT ks.session_date::date AS record_date, 'keywork' AS record_type
                    FROM keywork_sessions ks
                    WHERE ks.young_person_id = %s
                      AND ks.session_date IS NOT NULL
                      AND ks.session_date BETWEEN %s AND %s
                      AND COALESCE(ks.archived, FALSE) = FALSE

                    UNION ALL

                    SELECT sp.review_date::date AS record_date, 'support_plan' AS record_type
                    FROM support_plans sp
                    WHERE sp.young_person_id = %s
                      AND sp.review_date IS NOT NULL
                      AND sp.review_date BETWEEN %s AND %s
                      AND COALESCE(sp.archived, FALSE) = FALSE
                ) t
                WHERE record_date IS NOT NULL
                ORDER BY record_date ASC
            """
            params = [
                young_person_id, start_date, end_date,
                young_person_id, start_date, end_date,
                young_person_id, start_date, end_date,
                young_person_id, start_date, end_date,
                young_person_id, start_date, end_date,
                young_person_id, start_date, end_date,
                young_person_id, start_date, end_date,
                young_person_id, start_date, end_date,
                young_person_id, start_date, end_date,
            ]
            cur.execute(union_sql, params)
            rows = cur.fetchall() or []

        return [
            {
                "record_date": row["record_date"].isoformat()
                if hasattr(row["record_date"], "isoformat")
                else str(row["record_date"]),
                "record_type": row["record_type"],
            }
            for row in rows
        ]

    @staticmethod
    def _fetch_daily_notes(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                dn.id,
                dn.note_date,
                dn.shift_type,
                dn.mood,
                dn.presentation,
                dn.activities,
                dn.behaviour_update,
                dn.young_person_voice,
                dn.positives,
                dn.actions_required,
                dn.workflow_status,
                dn.significance,
                dn.author_id,
                dn.created_at,
                u.first_name,
                u.last_name
            FROM daily_notes dn
            LEFT JOIN users u ON dn.author_id = u.id
            WHERE dn.young_person_id = %s
              AND dn.note_date = %s
              AND COALESCE(dn.archived, FALSE) = FALSE
            ORDER BY dn.created_at DESC, dn.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        items = []
        for row in rows:
            summary_parts = [
                row.get("mood"),
                row.get("presentation"),
                row.get("activities"),
                row.get("behaviour_update"),
                row.get("positives"),
                row.get("actions_required"),
            ]
            summary = " | ".join(
                [str(x).strip() for x in summary_parts if x and str(x).strip()]
            )

            items.append(
                {
                    "record_type": "daily_note",
                    "event_type": "daily_note",
                    "record_id": row["id"],
                    "id": row["id"],
                    "title": f"{(row.get('shift_type') or 'Shift').replace('_', ' ').title()} daily note",
                    "summary": summary or "Daily note recorded",
                    "recorded_at": row.get("created_at"),
                    "recorded_by_name": YoungPeopleCalendarService._full_name(
                        row.get("first_name"), row.get("last_name")
                    ),
                    "workflow_status": row.get("workflow_status") or "draft",
                    "severity": row.get("significance") or "medium",
                }
            )
        return items

    @staticmethod
    def _fetch_incidents(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                i.id,
                i.incident_datetime,
                i.incident_type,
                i.description,
                i.outcome,
                i.manager_review_status,
                i.severity,
                i.staff_id,
                i.created_at,
                u.first_name,
                u.last_name
            FROM incidents i
            LEFT JOIN users u ON i.staff_id = u.id
            WHERE i.young_person_id = %s
              AND i.incident_datetime IS NOT NULL
              AND i.incident_datetime::date = %s
              AND COALESCE(i.archived, FALSE) = FALSE
            ORDER BY i.incident_datetime DESC NULLS LAST, i.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        items = []
        for row in rows:
            summary = row.get("description") or "Incident recorded"
            if row.get("outcome"):
                summary = f"{summary} | Outcome: {row.get('outcome')}"

            items.append(
                {
                    "record_type": "incident",
                    "event_type": "incident",
                    "record_id": row["id"],
                    "id": row["id"],
                    "title": (row.get("incident_type") or "Incident").replace("_", " ").title(),
                    "summary": summary,
                    "recorded_at": row.get("incident_datetime") or row.get("created_at"),
                    "recorded_by_name": YoungPeopleCalendarService._full_name(
                        row.get("first_name"), row.get("last_name")
                    ),
                    "workflow_status": row.get("manager_review_status") or "draft",
                    "severity": row.get("severity") or "medium",
                }
            )
        return items

    @staticmethod
    def _fetch_risks(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                ra.id,
                ra.title,
                ra.category,
                ra.concern_summary,
                ra.review_date,
                ra.approval_status,
                ra.status,
                ra.severity,
                ra.created_by,
                ra.updated_at,
                u.first_name,
                u.last_name
            FROM risk_assessments ra
            LEFT JOIN users u ON ra.created_by = u.id
            WHERE ra.young_person_id = %s
              AND ra.review_date = %s
              AND COALESCE(ra.archived, FALSE) = FALSE
            ORDER BY ra.updated_at DESC, ra.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        return [
            {
                "record_type": "risk",
                "event_type": "risk",
                "record_id": row["id"],
                "id": row["id"],
                "title": row.get("title") or "Risk assessment",
                "summary": row.get("concern_summary") or "Risk assessment updated",
                "recorded_at": row.get("updated_at") or row.get("review_date"),
                "recorded_by_name": YoungPeopleCalendarService._full_name(
                    row.get("first_name"), row.get("last_name")
                ),
                "workflow_status": row.get("approval_status") or row.get("status") or "draft",
                "severity": row.get("severity") or "medium",
                "category": row.get("category"),
            }
            for row in rows
        ]

    @staticmethod
    def _fetch_health_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                hr.id,
                hr.record_type,
                hr.title,
                hr.summary,
                hr.follow_up_required,
                hr.event_datetime,
                hr.created_by,
                hr.created_at,
                u.first_name,
                u.last_name
            FROM health_records hr
            LEFT JOIN users u ON hr.created_by = u.id
            WHERE hr.young_person_id = %s
              AND hr.event_datetime IS NOT NULL
              AND hr.event_datetime::date = %s
            ORDER BY hr.event_datetime DESC NULLS LAST, hr.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        items = []
        for row in rows:
            items.append(
                {
                    "record_type": "health",
                    "event_type": "health",
                    "record_id": row["id"],
                    "id": row["id"],
                    "title": row.get("title") or row.get("record_type") or "Health record",
                    "summary": row.get("summary") or "Health record recorded",
                    "recorded_at": row.get("event_datetime") or row.get("created_at"),
                    "recorded_by_name": YoungPeopleCalendarService._full_name(
                        row.get("first_name"), row.get("last_name")
                    ),
                    "workflow_status": "recorded",
                    "severity": "high" if row.get("follow_up_required") else "medium",
                }
            )
        return items

    @staticmethod
    def _fetch_medication_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                mr.id,
                mr.medication_name,
                mr.status,
                mr.error_flag,
                mr.error_details,
                mr.scheduled_time,
                mr.administered_time,
                mr.administered_by,
                mr.created_at,
                u.first_name,
                u.last_name
            FROM medication_records mr
            LEFT JOIN users u ON mr.administered_by = u.id
            WHERE mr.young_person_id = %s
              AND COALESCE(mr.administered_time::date, mr.scheduled_time::date, mr.created_at::date) = %s
            ORDER BY COALESCE(mr.administered_time, mr.scheduled_time, mr.created_at) DESC, mr.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        items = []
        for row in rows:
            summary = f"Status: {row.get('status') or 'recorded'}"
            if row.get("error_flag") and row.get("error_details"):
                summary = f"{summary} | Error: {row.get('error_details')}"

            items.append(
                {
                    "record_type": "health",
                    "event_type": "health",
                    "record_subtype": "medication",
                    "record_id": row["id"],
                    "id": row["id"],
                    "title": f"Medication: {row.get('medication_name') or 'Medication'}",
                    "summary": summary,
                    "recorded_at": row.get("administered_time") or row.get("scheduled_time") or row.get("created_at"),
                    "recorded_by_name": YoungPeopleCalendarService._full_name(
                        row.get("first_name"), row.get("last_name")
                    ),
                    "workflow_status": "recorded",
                    "severity": "high" if row.get("error_flag") else "medium",
                }
            )
        return items

    @staticmethod
    def _fetch_education_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                er.id,
                er.provision_name,
                er.attendance_status,
                er.behaviour_summary,
                er.achievement_note,
                er.action_taken,
                er.record_date,
                er.created_by,
                er.created_at,
                u.first_name,
                u.last_name
            FROM education_records er
            LEFT JOIN users u ON er.created_by = u.id
            WHERE er.young_person_id = %s
              AND er.record_date = %s
            ORDER BY er.created_at DESC, er.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        items = []
        for row in rows:
            summary_parts = [
                row.get("attendance_status"),
                row.get("achievement_note"),
                row.get("behaviour_summary"),
                row.get("action_taken"),
            ]
            summary = " | ".join(
                [str(x).strip() for x in summary_parts if x and str(x).strip()]
            )

            items.append(
                {
                    "record_type": "education",
                    "event_type": "education",
                    "record_id": row["id"],
                    "id": row["id"],
                    "title": row.get("provision_name") or "Education record",
                    "summary": summary or "Education record recorded",
                    "recorded_at": row.get("created_at") or row.get("record_date"),
                    "recorded_by_name": YoungPeopleCalendarService._full_name(
                        row.get("first_name"), row.get("last_name")
                    ),
                    "workflow_status": "recorded",
                    "severity": "medium",
                }
            )
        return items

    @staticmethod
    def _fetch_family_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                fcr.id,
                fcr.contact_person,
                fcr.contact_type,
                fcr.post_contact_presentation,
                fcr.child_voice,
                fcr.concerns,
                fcr.follow_up_required,
                fcr.contact_datetime,
                fcr.created_by,
                fcr.created_at,
                u.first_name,
                u.last_name
            FROM family_contact_records fcr
            LEFT JOIN users u ON fcr.created_by = u.id
            WHERE fcr.young_person_id = %s
              AND fcr.contact_datetime IS NOT NULL
              AND fcr.contact_datetime::date = %s
            ORDER BY fcr.contact_datetime DESC NULLS LAST, fcr.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        items = []
        for row in rows:
            summary_parts = [
                row.get("child_voice"),
                row.get("post_contact_presentation"),
                row.get("concerns"),
            ]
            summary = " | ".join(
                [str(x).strip() for x in summary_parts if x and str(x).strip()]
            )

            items.append(
                {
                    "record_type": "family",
                    "event_type": "family",
                    "record_id": row["id"],
                    "id": row["id"],
                    "title": row.get("contact_person") or row.get("contact_type") or "Family contact",
                    "summary": summary or "Family contact recorded",
                    "recorded_at": row.get("contact_datetime") or row.get("created_at"),
                    "recorded_by_name": YoungPeopleCalendarService._full_name(
                        row.get("first_name"), row.get("last_name")
                    ),
                    "workflow_status": "recorded",
                    "severity": "high" if row.get("follow_up_required") else "medium",
                }
            )
        return items

    @staticmethod
    def _fetch_keywork_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                ks.id,
                ks.topic,
                ks.summary,
                ks.actions_agreed,
                ks.session_date,
                ks.status,
                ks.worker_id,
                ks.created_at,
                u.first_name,
                u.last_name
            FROM keywork_sessions ks
            LEFT JOIN users u ON ks.worker_id = u.id
            WHERE ks.young_person_id = %s
              AND ks.session_date = %s
              AND COALESCE(ks.archived, FALSE) = FALSE
            ORDER BY ks.created_at DESC, ks.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        items = []
        for row in rows:
            summary = row.get("summary") or "Keywork session recorded"
            if row.get("actions_agreed"):
                summary = f"{summary} | Actions agreed: {row.get('actions_agreed')}"

            items.append(
                {
                    "record_type": "keywork",
                    "event_type": "keywork",
                    "record_id": row["id"],
                    "id": row["id"],
                    "title": f"Keywork: {row.get('topic') or 'Session'}",
                    "summary": summary,
                    "recorded_at": row.get("created_at") or row.get("session_date"),
                    "recorded_by_name": YoungPeopleCalendarService._full_name(
                        row.get("first_name"), row.get("last_name")
                    ),
                    "workflow_status": row.get("status") or "draft",
                    "severity": "medium",
                }
            )
        return items

    @staticmethod
    def _fetch_plan_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        cur.execute(
            """
            SELECT
                sp.id,
                sp.title,
                sp.plan_type,
                sp.summary,
                sp.review_date,
                sp.approval_status,
                sp.status,
                sp.owner_id,
                sp.updated_at,
                u.first_name,
                u.last_name
            FROM support_plans sp
            LEFT JOIN users u ON sp.owner_id = u.id
            WHERE sp.young_person_id = %s
              AND sp.review_date = %s
              AND COALESCE(sp.archived, FALSE) = FALSE
            ORDER BY sp.updated_at DESC, sp.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        return [
            {
                "record_type": "support_plan",
                "event_type": "support_plan",
                "record_id": row["id"],
                "id": row["id"],
                "title": row.get("title") or "Support plan",
                "summary": row.get("summary") or "Support plan updated",
                "recorded_at": row.get("updated_at") or row.get("review_date"),
                "recorded_by_name": YoungPeopleCalendarService._full_name(
                    row.get("first_name"), row.get("last_name")
                ),
                "workflow_status": row.get("approval_status") or row.get("status") or "draft",
                "severity": "medium",
                "category": row.get("plan_type") or "support_plan",
            }
            for row in rows
        ]

    @staticmethod
    def _full_name(first_name: str | None, last_name: str | None) -> str | None:
        return " ".join([x for x in [first_name, last_name] if x]).strip() or None

    @staticmethod
    def _sort_datetime_value(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except Exception:
                return datetime.min
        return datetime.min
