from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/young-people", tags=["Young People Assistant"])


class YoungPersonAssistantContext(BaseModel):
    scope: str | None = "young_person"
    young_person_id: int
    current_view: str | None = None
    young_person_name: str | None = None


class YoungPersonAssistantPayload(BaseModel):
    message: str = Field(..., min_length=1)
    context: YoungPersonAssistantContext


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


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


def _fetch_overview_context(conn, young_person_id: int) -> dict[str, Any]:
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
                linked_plan_id
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
                significance
            FROM chronology_events
            WHERE young_person_id = %s
              AND COALESCE(is_visible, TRUE) = TRUE
            ORDER BY event_datetime DESC, created_at DESC, id DESC
            LIMIT 12
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


def _build_context_text(bundle: dict[str, Any], current_view: str | None) -> str:
    yp = bundle.get("young_person") or {}
    name = " ".join(
        [x for x in [yp.get("first_name"), yp.get("last_name")] if x]
    ).strip() or yp.get("preferred_name") or "Young person"

    lines: list[str] = [
        f"Current workspace view: {current_view or 'home'}",
        f"Young person: {name}",
        f"Preferred name: {yp.get('preferred_name') or 'Not recorded'}",
        f"Placement status: {yp.get('placement_status') or 'Not recorded'}",
        f"Risk level: {yp.get('summary_risk_level') or 'Not recorded'}",
        "",
        "Active alerts:",
    ]

    alerts = bundle.get("alerts") or []
    if alerts:
        for row in alerts:
            lines.append(
                f"- {row.get('title') or 'Alert'} | severity={row.get('severity') or 'standard'} | {row.get('description') or 'No description'}"
            )
    else:
        lines.append("- None recorded")

    lines.append("")
    lines.append("Current risks:")
    risks = bundle.get("risks") or []
    if risks:
        for row in risks:
            lines.append(
                f"- {row.get('title') or 'Risk'} | severity={row.get('severity') or 'medium'} | status={row.get('status') or row.get('approval_status') or 'draft'} | {row.get('concern_summary') or 'No summary'}"
            )
    else:
        lines.append("- None recorded")

    lines.append("")
    lines.append("Current plans:")
    plans = bundle.get("plans") or []
    if plans:
        for row in plans:
            lines.append(
                f"- {row.get('title') or 'Plan'} | type={row.get('plan_type') or 'support_plan'} | status={row.get('approval_status') or 'draft'} | review={row.get('review_date') or 'Not set'} | {row.get('summary') or 'No summary'}"
            )
    else:
        lines.append("- None recorded")

    lines.append("")
    lines.append("Appointments:")
    appointments = bundle.get("appointments") or []
    if appointments:
        for row in appointments:
            lines.append(
                f"- {row.get('title') or 'Appointment'} | type={row.get('appointment_type') or 'general'} | when={row.get('appointment_date') or 'Not set'} | status={row.get('status') or 'scheduled'} | location={row.get('location') or 'Not set'} | professional={row.get('professional_name') or 'Not set'} | linked_plan_id={row.get('linked_plan_id') or 'None'}"
            )
    else:
        lines.append("- None recorded")

    lines.append("")
    lines.append("Recent chronology:")
    chronology = bundle.get("chronology") or []
    if chronology:
        for row in chronology:
            lines.append(
                f"- {row.get('event_datetime') or 'Unknown time'} | {row.get('title') or row.get('category') or 'Record'} | {row.get('summary') or 'No summary'}"
            )
    else:
        lines.append("- None recorded")

    lines.append("")
    lines.append("Due soon / compliance items:")
    due_items = bundle.get("due_items") or []
    if due_items:
        for row in due_items:
            lines.append(
                f"- {row.get('compliance_type') or 'item'} | {row.get('title') or 'Untitled'} | due={row.get('due_date') or 'Not set'} | status={row.get('status') or row.get('approval_status') or 'unknown'}"
            )
    else:
        lines.append("- None recorded")

    return "\n".join(lines)


def _local_assistant_reply(user_message: str, context_text: str) -> str:
    msg = (user_message or "").strip().lower()

    if "handover" in msg:
        return (
            "Here is a short handover-style response based on the current young person context.\n\n"
            "Focus first on current alerts, the most relevant risks, any appointments due soon, and the plans staff need to follow. "
            "Then check recent chronology for any changes in presentation, incidents, family contact, education or health. "
            "Use the context below to finalise the handover in the young person’s voice, keeping it clear, child-focused and practical.\n\n"
            f"{context_text}"
        )

    if "risk" in msg:
        return (
            "Use the current risks, alerts, plans and chronology together. "
            "Summarise what is worrying, what the behaviour may be communicating, what helps, and what adults should do next using a calm, PACE-informed response.\n\n"
            f"{context_text}"
        )

    if "ofsted" in msg or "evidence" in msg or "inspection" in msg:
        return (
            "For Ofsted and evidence readiness, pull together: current plans, risk reviews, appointments, chronology, compliance deadlines and linked reports. "
            "Show the child’s lived experience, how adults understand and respond, and evidence of review and follow-through.\n\n"
            f"{context_text}"
        )

    if "appointment" in msg or "due" in msg or "review" in msg:
        return (
            "Use the appointments and due-items sections first. "
            "Check which reviews, meetings or appointments are coming up, whether they are linked to plans, and what preparation or follow-up is needed.\n\n"
            f"{context_text}"
        )

    if "daily note" in msg or "write" in msg:
        return (
            "Write in a therapeutic, child-focused way. "
            "Describe presentation, significant events, young person voice, what helped, and what adults need next. "
            "Keep language respectful, clear and evidence-based.\n\n"
            f"{context_text}"
        )

    return (
        "I have the current young person workspace context. "
        "Use it to answer the staff member’s question in a child-focused, therapeutically informed way, with practical guidance for adults, links to plans, quality standards, reports and Ofsted readiness where relevant.\n\n"
        f"{context_text}"
    )


@router.post("/assistant")
def ask_young_person_assistant(
    payload: YoungPersonAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    record = _load_and_check_young_person(payload.context.young_person_id, current_user)

    try:
        bundle = _fetch_overview_context(conn, payload.context.young_person_id)
        context_text = _build_context_text(bundle, payload.context.current_view)
        reply = _local_assistant_reply(payload.message, context_text)

        return {
            "ok": True,
            "reply": reply,
            "young_person_id": payload.context.young_person_id,
            "young_person_name": payload.context.young_person_name
            or " ".join(
                [x for x in [record.get("first_name"), record.get("last_name")] if x]
            ).strip()
            or record.get("preferred_name")
            or "Young person",
            "context_used": {
                "current_view": payload.context.current_view,
                "alerts_count": len(bundle.get("alerts") or []),
                "risks_count": len(bundle.get("risks") or []),
                "plans_count": len(bundle.get("plans") or []),
                "appointments_count": len(bundle.get("appointments") or []),
                "chronology_count": len(bundle.get("chronology") or []),
                "due_items_count": len(bundle.get("due_items") or []),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run young person assistant: {str(e)}")
