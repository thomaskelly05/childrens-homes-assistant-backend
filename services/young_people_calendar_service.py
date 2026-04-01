from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta
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
                    str(x.get("recorded_at") or ""),
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
    def _table_exists(cur, table_name: str) -> bool:
        cur.execute(
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
            LIMIT 1
            """,
            (table_name,),
        )
        return bool(cur.fetchone())

    @staticmethod
    def _fetch_calendar_items(
        *,
        conn,
        young_person_id: int,
        start_date: date,
        end_date: date,
    ) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []

        with conn.cursor() as cur:
            if YoungPeopleCalendarService._table_exists(cur, "daily_notes"):
                cur.execute(
                    """
                    SELECT dn.note_date::date AS record_date, 'daily_note' AS record_type
                    FROM daily_notes dn
                    WHERE dn.young_person_id = %s
                      AND dn.note_date IS NOT NULL
                      AND dn.note_date BETWEEN %s AND %s
                    ORDER BY dn.note_date ASC
                    """,
                    (young_person_id, start_date, end_date),
                )
                items.extend(cur.fetchall() or [])

            if YoungPeopleCalendarService._table_exists(cur, "incidents"):
                cur.execute(
                    """
                    SELECT i.incident_datetime::date AS record_date, 'incident' AS record_type
                    FROM incidents i
                    WHERE i.young_person_id = %s
                      AND i.incident_datetime IS NOT NULL
                      AND i.incident_datetime::date BETWEEN %s AND %s
                    ORDER BY i.incident_datetime ASC
                    """,
                    (young_person_id, start_date, end_date),
                )
                items.extend(cur.fetchall() or [])

            if YoungPeopleCalendarService._table_exists(cur, "risk_assessments"):
                cur.execute(
                    """
                    SELECT ra.review_date::date AS record_date, 'risk' AS record_type
                    FROM risk_assessments ra
                    WHERE ra.young_person_id = %s
                      AND ra.review_date IS NOT NULL
                      AND ra.review_date BETWEEN %s AND %s
                    ORDER BY ra.review_date ASC
                    """,
                    (young_person_id, start_date, end_date),
                )
                items.extend(cur.fetchall() or [])

            if YoungPeopleCalendarService._table_exists(cur, "health_records"):
                cur.execute(
                    """
                    SELECT hr.event_datetime::date AS record_date, 'health' AS record_type
                    FROM health_records hr
                    WHERE hr.young_person_id = %s
                      AND hr.event_datetime IS NOT NULL
                      AND hr.event_datetime::date BETWEEN %s AND %s
                    ORDER BY hr.event_datetime ASC
                    """,
                    (young_person_id, start_date, end_date),
                )
                items.extend(cur.fetchall() or [])

            if YoungPeopleCalendarService._table_exists(cur, "medication_records"):
                cur.execute(
                    """
                    SELECT mr.scheduled_time::date AS record_date, 'health' AS record_type
                    FROM medication_records mr
                    WHERE mr.young_person_id = %s
                      AND mr.scheduled_time IS NOT NULL
                      AND mr.scheduled_time::date BETWEEN %s AND %s
                    ORDER BY mr.scheduled_time ASC
                    """,
                    (young_person_id, start_date, end_date),
                )
                items.extend(cur.fetchall() or [])

            if YoungPeopleCalendarService._table_exists(cur, "education_records"):
                cur.execute(
                    """
                    SELECT er.record_date::date AS record_date, 'education' AS record_type
                    FROM education_records er
                    WHERE er.young_person_id = %s
                      AND er.record_date IS NOT NULL
                      AND er.record_date BETWEEN %s AND %s
                    ORDER BY er.record_date ASC
                    """,
                    (young_person_id, start_date, end_date),
                )
                items.extend(cur.fetchall() or [])

            if YoungPeopleCalendarService._table_exists(cur, "family_contact_records"):
                cur.execute(
                    """
                    SELECT fcr.contact_datetime::date AS record_date, 'family' AS record_type
                    FROM family_contact_records fcr
                    WHERE fcr.young_person_id = %s
                      AND fcr.contact_datetime IS NOT NULL
                      AND fcr.contact_datetime::date BETWEEN %s AND %s
                    ORDER BY fcr.contact_datetime ASC
                    """,
                    (young_person_id, start_date, end_date),
                )
                items.extend(cur.fetchall() or [])

            if YoungPeopleCalendarService._table_exists(cur, "keywork_sessions"):
                cur.execute(
                    """
                    SELECT ks.session_date::date AS record_date, 'keywork' AS record_type
                    FROM keywork_sessions ks
                    WHERE ks.young_person_id = %s
                      AND ks.session_date IS NOT NULL
                      AND ks.session_date BETWEEN %s AND %s
                    ORDER BY ks.session_date ASC
                    """,
                    (young_person_id, start_date, end_date),
                )
                items.extend(cur.fetchall() or [])

            if YoungPeopleCalendarService._table_exists(cur, "support_plans"):
                cur.execute(
                    """
                    SELECT sp.review_date::date AS record_date, 'support_plan' AS record_type
                    FROM support_plans sp
                    WHERE sp.young_person_id = %s
                      AND sp.review_date IS NOT NULL
                      AND sp.review_date BETWEEN %s AND %s
                    ORDER BY sp.review_date ASC
                    """,
                    (young_person_id, start_date, end_date),
                )
                items.extend(cur.fetchall() or [])

        return [
            {
                "record_date": row["record_date"].isoformat()
                if row.get("record_date") and hasattr(row["record_date"], "isoformat")
                else str(row.get("record_date")),
                "record_type": row.get("record_type"),
            }
            for row in items
            if row.get("record_date") is not None and row.get("record_type")
        ]

    @staticmethod
    def _fetch_daily_notes(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        if not YoungPeopleCalendarService._table_exists(cur, "daily_notes"):
            return []

        cur.execute(
            """
            SELECT
                dn.id,
                dn.note_date,
                dn.shift_type,
                dn.presentation,
                dn.behaviour_update,
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
            ORDER BY dn.created_at DESC, dn.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        items = []
        for row in rows:
            summary_parts = [
                row.get("positives"),
                row.get("presentation"),
                row.get("behaviour_update"),
                row.get("actions_required"),
            ]
            summary = " | ".join([str(x).strip() for x in summary_parts if x and str(x).strip()])
            items.append(
                {
                    "record_type": "daily_note",
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
        if not YoungPeopleCalendarService._table_exists(cur, "incidents"):
            return []

        cur.execute(
            """
            SELECT
                i.id,
                i.incident_datetime,
                i.incident_type,
                i.description,
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
            ORDER BY i.incident_datetime DESC NULLS LAST, i.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        return [
            {
                "record_type": "incident",
                "record_id": row["id"],
                "id": row["id"],
                "title": (row.get("incident_type") or "Incident").replace("_", " ").title(),
                "summary": row.get("description") or "Incident recorded",
                "recorded_at": row.get("incident_datetime") or row.get("created_at"),
                "recorded_by_name": YoungPeopleCalendarService._full_name(
                    row.get("first_name"), row.get("last_name")
                ),
                "workflow_status": row.get("manager_review_status") or "draft",
                "severity": row.get("severity") or "medium",
            }
            for row in rows
        ]

    @staticmethod
    def _fetch_risks(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        if not YoungPeopleCalendarService._table_exists(cur, "risk_assessments"):
            return []

        cur.execute(
            """
            SELECT
                ra.id,
                ra.title,
                ra.concern_summary,
                ra.review_date,
                ra.approval_status,
                ra.severity,
                ra.created_by,
                ra.updated_at,
                u.first_name,
                u.last_name
            FROM risk_assessments ra
            LEFT JOIN users u ON ra.created_by = u.id
            WHERE ra.young_person_id = %s
              AND ra.review_date = %s
            ORDER BY ra.updated_at DESC, ra.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        return [
            {
                "record_type": "risk",
                "record_id": row["id"],
                "id": row["id"],
                "title": row.get("title") or "Risk assessment",
                "summary": row.get("concern_summary") or "Risk assessment updated",
                "recorded_at": row.get("updated_at") or row.get("review_date"),
                "recorded_by_name": YoungPeopleCalendarService._full_name(
                    row.get("first_name"), row.get("last_name")
                ),
                "workflow_status": row.get("approval_status") or "draft",
                "severity": row.get("severity") or "medium",
            }
            for row in rows
        ]

    @staticmethod
    def _fetch_health_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        if not YoungPeopleCalendarService._table_exists(cur, "health_records"):
            return []

        cur.execute(
            """
            SELECT
                hr.id,
                hr.record_type,
                hr.title,
                hr.summary,
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

        return [
            {
                "record_type": "health",
                "record_id": row["id"],
                "id": row["id"],
                "title": row.get("title") or row.get("record_type") or "Health record",
                "summary": row.get("summary") or "Health record recorded",
                "recorded_at": row.get("event_datetime") or row.get("created_at"),
                "recorded_by_name": YoungPeopleCalendarService._full_name(
                    row.get("first_name"), row.get("last_name")
                ),
                "workflow_status": "recorded",
                "severity": "medium",
            }
            for row in rows
        ]

    @staticmethod
    def _fetch_medication_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        if not YoungPeopleCalendarService._table_exists(cur, "medication_records"):
            return []

        cur.execute(
            """
            SELECT
                mr.id,
                mr.medication_name,
                mr.status,
                mr.error_flag,
                mr.scheduled_time,
                mr.administered_time,
                mr.administered_by,
                mr.created_at,
                u.first_name,
                u.last_name
            FROM medication_records mr
            LEFT JOIN users u ON mr.administered_by = u.id
            WHERE mr.young_person_id = %s
              AND COALESCE(mr.scheduled_time::date, mr.created_at::date) = %s
            ORDER BY COALESCE(mr.administered_time, mr.scheduled_time, mr.created_at) DESC, mr.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        items = []
        for row in rows:
            items.append(
                {
                    "record_type": "health",
                    "record_id": row["id"],
                    "id": row["id"],
                    "title": f"Medication: {row.get('medication_name') or 'Medication'}",
                    "summary": f"Status: {row.get('status') or 'recorded'}",
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
        if not YoungPeopleCalendarService._table_exists(cur, "education_records"):
            return []

        cur.execute(
            """
            SELECT
                er.id,
                er.provision_name,
                er.behaviour_summary,
                er.achievement_note,
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

        return [
            {
                "record_type": "education",
                "record_id": row["id"],
                "id": row["id"],
                "title": row.get("provision_name") or "Education record",
                "summary": row.get("achievement_note") or row.get("behaviour_summary") or "Education record recorded",
                "recorded_at": row.get("created_at") or row.get("record_date"),
                "recorded_by_name": YoungPeopleCalendarService._full_name(
                    row.get("first_name"), row.get("last_name")
                ),
                "workflow_status": "recorded",
                "severity": "medium",
            }
            for row in rows
        ]

    @staticmethod
    def _fetch_family_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        if not YoungPeopleCalendarService._table_exists(cur, "family_contact_records"):
            return []

        cur.execute(
            """
            SELECT
                fcr.id,
                fcr.contact_person,
                fcr.post_contact_presentation,
                fcr.child_voice,
                fcr.concerns,
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

        return [
            {
                "record_type": "family",
                "record_id": row["id"],
                "id": row["id"],
                "title": row.get("contact_person") or "Family contact",
                "summary": row.get("child_voice") or row.get("post_contact_presentation") or row.get("concerns") or "Family contact recorded",
                "recorded_at": row.get("contact_datetime") or row.get("created_at"),
                "recorded_by_name": YoungPeopleCalendarService._full_name(
                    row.get("first_name"), row.get("last_name")
                ),
                "workflow_status": "recorded",
                "severity": "medium",
            }
            for row in rows
        ]

    @staticmethod
    def _fetch_keywork_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        if not YoungPeopleCalendarService._table_exists(cur, "keywork_sessions"):
            return []

        cur.execute(
            """
            SELECT
                ks.id,
                ks.topic,
                ks.summary,
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
            ORDER BY ks.created_at DESC, ks.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        return [
            {
                "record_type": "keywork",
                "record_id": row["id"],
                "id": row["id"],
                "title": f"Keywork: {row.get('topic') or 'Session'}",
                "summary": row.get("summary") or "Keywork session recorded",
                "recorded_at": row.get("created_at") or row.get("session_date"),
                "recorded_by_name": YoungPeopleCalendarService._full_name(
                    row.get("first_name"), row.get("last_name")
                ),
                "workflow_status": row.get("status") or "draft",
                "severity": "medium",
            }
            for row in rows
        ]

    @staticmethod
    def _fetch_plan_records(*, cur, young_person_id: int, selected_date: date) -> list[dict[str, Any]]:
        if not YoungPeopleCalendarService._table_exists(cur, "support_plans"):
            return []

        cur.execute(
            """
            SELECT
                sp.id,
                sp.title,
                sp.summary,
                sp.review_date,
                sp.approval_status,
                sp.owner_id,
                sp.updated_at,
                u.first_name,
                u.last_name
            FROM support_plans sp
            LEFT JOIN users u ON sp.owner_id = u.id
            WHERE sp.young_person_id = %s
              AND sp.review_date = %s
            ORDER BY sp.updated_at DESC, sp.id DESC
            """,
            (young_person_id, selected_date),
        )
        rows = cur.fetchall() or []

        return [
            {
                "record_type": "support_plan",
                "record_id": row["id"],
                "id": row["id"],
                "title": row.get("title") or "Support plan",
                "summary": row.get("summary") or "Support plan updated",
                "recorded_at": row.get("updated_at") or row.get("review_date"),
                "recorded_by_name": YoungPeopleCalendarService._full_name(
                    row.get("first_name"), row.get("last_name")
                ),
                "workflow_status": row.get("approval_status") or "draft",
                "severity": "medium",
            }
            for row in rows
        ]

    @staticmethod
    def _full_name(first_name: str | None, last_name: str | None) -> str | None:
        return " ".join([x for x in [first_name, last_name] if x]).strip() or None
