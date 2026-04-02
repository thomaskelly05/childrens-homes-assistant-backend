from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/young-people", tags=["Young People Reports"])


class GenerateYoungPersonReportPayload(BaseModel):
    report_type: str = "handover_summary"
    title: str | None = None
    review_month: str | None = None


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _user_role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or "").strip().lower()


def _assert_home_access(current_user: dict[str, Any], record_home_id: int | None) -> None:
    role = _user_role(current_user)
    user_home_id = _user_home_id(current_user)

    if role in {"admin", "provider_admin"}:
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if user_home_id != record_home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this young person")


def _assert_can_edit(current_user: dict[str, Any]) -> None:
    role = _user_role(current_user)
    if role not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to generate reports")


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


def _load_and_check_report(
    conn,
    report_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                r.*,
                yp.home_id
            FROM ai_generated_reports r
            JOIN young_people yp
              ON yp.id = r.young_person_id
            WHERE r.id = %s
            LIMIT 1
            """,
            (report_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Report not found")

    row = dict(row)
    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


def _fetch_report_context(conn, young_person_id: int) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                yp.id,
                yp.first_name,
                yp.last_name,
                yp.preferred_name,
                yp.placement_status,
                yp.summary_risk_level
            FROM young_people yp
            WHERE yp.id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        young_person = cur.fetchone()

        cur.execute(
            """
            SELECT
                title,
                description,
                severity,
                is_active
            FROM young_person_alerts
            WHERE young_person_id = %s
              AND COALESCE(is_active, TRUE) = TRUE
            ORDER BY created_at DESC, id DESC
            LIMIT 5
            """,
            (young_person_id,),
        )
        alerts = cur.fetchall() or []

        cur.execute(
            """
            SELECT
                title,
                concern_summary,
                severity,
                status,
                approval_status,
                review_date
            FROM risk_assessments
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY updated_at DESC, id DESC
            LIMIT 5
            """,
            (young_person_id,),
        )
        risks = cur.fetchall() or []

        cur.execute(
            """
            SELECT
                title,
                summary,
                approval_status,
                review_date,
                plan_type
            FROM support_plans
            WHERE young_person_id = %s
              AND COALESCE(archived, FALSE) = FALSE
            ORDER BY updated_at DESC, id DESC
            LIMIT 5
            """,
            (young_person_id,),
        )
        plans = cur.fetchall() or []

        cur.execute(
            """
            SELECT
                title,
                appointment_type,
                appointment_date,
                status,
                location,
                professional_name,
                linked_plan_id,
                follow_up_actions
            FROM young_person_appointments
            WHERE young_person_id = %s
            ORDER BY appointment_date ASC, id DESC
            LIMIT 10
            """,
            (young_person_id,),
        )
        appointments = cur.fetchall() or []

        cur.execute(
            """
            SELECT
                title,
                summary,
                category,
                subcategory,
                event_datetime,
                significance,
                source_table,
                source_id
            FROM chronology_events
            WHERE young_person_id = %s
              AND COALESCE(is_visible, TRUE) = TRUE
            ORDER BY event_datetime DESC, created_at DESC, id DESC
            LIMIT 20
            """,
            (young_person_id,),
        )
        chronology = cur.fetchall() or []

        cur.execute(
            """
            SELECT
                compliance_type,
                title,
                due_date,
                status,
                approval_status
            FROM (
                SELECT
                    'support_plan_review' AS compliance_type,
                    COALESCE(sp.title, sp.plan_type, 'Plan review') AS title,
                    sp.review_date AS due_date,
                    sp.status,
                    sp.approval_status,
                    sp.created_at
                FROM support_plans sp
                WHERE sp.young_person_id = %s
                  AND sp.review_date IS NOT NULL
                  AND COALESCE(sp.archived, FALSE) = FALSE

                UNION ALL

                SELECT
                    'risk_review' AS compliance_type,
                    COALESCE(r.title, r.category, 'Risk review') AS title,
                    r.review_date AS due_date,
                    r.status,
                    r.approval_status,
                    r.created_at
                FROM risk_assessments r
                WHERE r.young_person_id = %s
                  AND r.review_date IS NOT NULL
                  AND COALESCE(r.archived, FALSE) = FALSE

                UNION ALL

                SELECT
                    'appointment' AS compliance_type,
                    COALESCE(a.title, a.appointment_type, 'Appointment') AS title,
                    a.appointment_date::date AS due_date,
                    a.status,
                    NULL::text AS approval_status,
                    a.created_at
                FROM young_person_appointments a
                WHERE a.young_person_id = %s
                  AND a.appointment_date IS NOT NULL
            ) x
            ORDER BY due_date ASC NULLS LAST
            LIMIT 12
            """,
            (young_person_id, young_person_id, young_person_id),
        )
        due_items = cur.fetchall() or []

    return {
        "young_person": dict(young_person) if young_person else {},
        "alerts": [dict(x) for x in alerts],
        "risks": [dict(x) for x in risks],
        "plans": [dict(x) for x in plans],
        "appointments": [dict(x) for x in appointments],
        "chronology": [dict(x) for x in chronology],
        "due_items": [dict(x) for x in due_items],
    }


def _person_name(yp: dict[str, Any]) -> str:
    return (
        " ".join([x for x in [yp.get("first_name"), yp.get("last_name")] if x]).strip()
        or yp.get("preferred_name")
        or "Young person"
    )


def _build_report_text(report_type: str, bundle: dict[str, Any]) -> str:
    yp = bundle.get("young_person") or {}
    alerts = bundle.get("alerts") or []
    risks = bundle.get("risks") or []
    plans = bundle.get("plans") or []
    appointments = bundle.get("appointments") or []
    chronology = bundle.get("chronology") or []
    due_items = bundle.get("due_items") or []

    name = _person_name(yp)

    intro = [
        f"Report for {name}.",
        f"Placement status: {yp.get('placement_status') or 'Not recorded'}.",
        f"Risk level: {yp.get('summary_risk_level') or 'Not recorded'}.",
        "",
    ]

    if report_type == "handover_summary":
        parts = intro + ["Handover summary:", ""]
        if alerts:
            parts.append("Active alerts:")
            parts.extend([f"- {x.get('title') or 'Alert'}: {x.get('description') or 'No description'}" for x in alerts])
            parts.append("")
        if risks:
            parts.append("Current risks and what adults need to hold in mind:")
            parts.extend([f"- {x.get('title') or 'Risk'}: {x.get('concern_summary') or 'No summary'}" for x in risks])
            parts.append("")
        if appointments:
            parts.append("Upcoming appointments and actions:")
            parts.extend([
                f"- {x.get('title') or 'Appointment'} on {x.get('appointment_date') or 'Not set'} at {x.get('location') or 'No location'}"
                for x in appointments[:5]
            ])
            parts.append("")
        if chronology:
            parts.append("Most recent chronology:")
            parts.extend([f"- {x.get('event_datetime') or 'Unknown time'}: {x.get('title') or 'Record'} — {x.get('summary') or 'No summary'}" for x in chronology[:8]])
        return "\n".join(parts).strip()

    if report_type == "monthly_summary":
        parts = intro + ["Monthly summary:", ""]
        parts.append("This summary should be reviewed alongside plans, risks, incidents, daily notes and chronology.")
        parts.append("")
        if chronology:
            parts.append("Recent recorded themes:")
            parts.extend([f"- {x.get('title') or 'Record'} — {x.get('summary') or 'No summary'}" for x in chronology[:10]])
            parts.append("")
        if plans:
            parts.append("Plans currently guiding care:")
            parts.extend([f"- {x.get('title') or 'Plan'} — {x.get('summary') or 'No summary'}" for x in plans])
            parts.append("")
        if due_items:
            parts.append("Reviews, appointments and actions due:")
            parts.extend([f"- {x.get('title') or 'Item'} due {x.get('due_date') or 'Not set'}" for x in due_items[:8]])
        return "\n".join(parts).strip()

    if report_type == "risk_and_support_summary":
        parts = intro + ["Risk and support summary:", ""]
        if risks:
            parts.append("Current risks:")
            parts.extend([f"- {x.get('title') or 'Risk'} | severity={x.get('severity') or 'medium'} | {x.get('concern_summary') or 'No summary'}" for x in risks])
            parts.append("")
        if plans:
            parts.append("Current support and guidance:")
            parts.extend([f"- {x.get('title') or 'Plan'} | {x.get('summary') or 'No summary'}" for x in plans])
            parts.append("")
        parts.append("This report should be read with a PACE-informed lens, linking identified risks to the support and adult responses set out in current plans.")
        return "\n".join(parts).strip()

    if report_type == "appointments_and_actions":
        parts = intro + ["Appointments and actions summary:", ""]
        if appointments:
            parts.append("Appointments:")
            parts.extend([
                f"- {x.get('title') or 'Appointment'} | {x.get('appointment_date') or 'Not set'} | {x.get('status') or 'scheduled'} | linked plan {x.get('linked_plan_id') or 'none'} | follow-up: {x.get('follow_up_actions') or 'none recorded'}"
                for x in appointments
            ])
            parts.append("")
        if due_items:
            parts.append("Other due items:")
            parts.extend([f"- {x.get('title') or 'Item'} due {x.get('due_date') or 'Not set'}" for x in due_items])
        return "\n".join(parts).strip()

    parts = intro + ["Ofsted evidence summary:", ""]
    parts.append("This summary should show the lived experience of the young person, the clarity of current planning, timely review activity, and evidence that adults understand and respond therapeutically.")
    parts.append("")
    if alerts:
        parts.append("Current safeguarding / risk-sensitive alerts:")
        parts.extend([f"- {x.get('title') or 'Alert'} — {x.get('description') or 'No description'}" for x in alerts])
        parts.append("")
    if plans:
        parts.append("Current plans and guidance:")
        parts.extend([f"- {x.get('title') or 'Plan'} — review date {x.get('review_date') or 'Not set'}" for x in plans])
        parts.append("")
    if chronology:
        parts.append("Recent evidence of day-to-day practice:")
        parts.extend([f"- {x.get('event_datetime') or 'Unknown time'} — {x.get('title') or 'Record'} — {x.get('summary') or 'No summary'}" for x in chronology[:10]])
        parts.append("")
    if due_items:
        parts.append("Review and compliance picture:")
        parts.extend([f"- {x.get('title') or 'Item'} due {x.get('due_date') or 'Not set'}" for x in due_items[:10]])
    return "\n".join(parts).strip()


def _default_report_title(report_type: str) -> str:
    mapping = {
        "handover_summary": "Handover Summary",
        "monthly_summary": "Monthly Summary",
        "risk_and_support_summary": "Risk and Support Summary",
        "ofsted_evidence_summary": "Ofsted Evidence Summary",
        "appointments_and_actions": "Appointments and Actions Summary",
    }
    return mapping.get(report_type, "Young Person Report")


def _insert_report_links(conn, report_id: int, chronology: list[dict[str, Any]]) -> None:
    if not chronology:
        return

    with conn.cursor() as cur:
        for row in chronology[:10]:
            source_table = row.get("source_table")
            source_id = row.get("source_id")
            if not source_table or not source_id:
                continue

            cur.execute(
                """
                INSERT INTO ai_report_links (
                    report_id,
                    source_table,
                    source_id,
                    link_reason,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    report_id,
                    source_table,
                    source_id,
                    "Included as supporting chronology evidence",
                    datetime.utcnow(),
                ),
            )


@router.get("/{young_person_id}/reports")
def list_young_person_reports(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    r.id,
                    r.young_person_id,
                    r.report_type,
                    r.title,
                    r.review_month,
                    r.report_text,
                    r.status,
                    r.generated_by,
                    r.created_at,
                    r.updated_at
                FROM ai_generated_reports r
                WHERE r.young_person_id = %s
                ORDER BY r.created_at DESC, r.id DESC
                """,
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        items = [dict(row) for row in rows]

        return {
            "items": items,
            "count": len(items),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load reports: {str(e)}")


@router.post("/{young_person_id}/reports/generate")
def generate_young_person_report(
    young_person_id: int,
    payload: GenerateYoungPersonReportPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)
    _load_and_check_young_person(young_person_id, current_user)

    try:
        report_type = (payload.report_type or "handover_summary").strip().lower()
        bundle = _fetch_report_context(conn, young_person_id)
        report_text = _build_report_text(report_type, bundle)
        title = (payload.title or _default_report_title(report_type)).strip()
        generated_by = _safe_int(current_user.get("user_id"))

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_generated_reports (
                    young_person_id,
                    report_type,
                    title,
                    review_month,
                    report_text,
                    status,
                    generated_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING
                    id,
                    young_person_id,
                    report_type,
                    title,
                    review_month,
                    report_text,
                    status,
                    generated_by,
                    created_at,
                    updated_at
                """,
                (
                    young_person_id,
                    report_type,
                    title,
                    payload.review_month,
                    report_text,
                    "draft",
                    generated_by,
                    datetime.utcnow(),
                    datetime.utcnow(),
                ),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=500, detail="Report could not be created")

        report = dict(row)
        _insert_report_links(conn, report["id"], bundle.get("chronology") or [])
        conn.commit()

        return {
            "ok": True,
            "report": report,
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/reports/{report_id}")
def get_report(
    report_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        row = _load_and_check_report(conn, report_id, current_user)
        return {
            "ok": True,
            "report": row,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load report: {str(e)}")


@router.get("/reports/{report_id}/links")
def get_report_links(
    report_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_report(conn, report_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    l.id,
                    l.report_id,
                    l.source_table,
                    l.source_id,
                    l.link_reason,
                    l.created_at
                FROM ai_report_links l
                WHERE l.report_id = %s
                ORDER BY l.created_at ASC, l.id ASC
                """,
                (report_id,),
            )
            rows = cur.fetchall() or []

        items = [dict(row) for row in rows]

        return {
            "items": items,
            "count": len(items),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load report links: {str(e)}")
