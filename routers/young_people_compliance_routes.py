from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.current_user import get_current_user
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Compliance"])


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


def _load_and_check_young_person(conn, young_person_id: int, current_user: dict[str, Any]) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, home_id
            FROM young_people
            WHERE id = %s
            LIMIT 1
            """,
            (young_person_id,),
        )
        yp = cur.fetchone()

    if not yp:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(yp.get("home_id")))
    return yp


@router.get("/{young_person_id}/compliance")
def get_young_person_compliance(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(conn, young_person_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM (
                    SELECT
                        'support_plan_review' AS compliance_type,
                        sp.id,
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
                        r.id,
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
                        'keywork_follow_up' AS compliance_type,
                        k.id,
                        COALESCE(k.topic, 'Key work follow up') AS title,
                        k.next_session_date AS due_date,
                        k.status,
                        NULL::text AS approval_status,
                        k.created_at
                    FROM keywork_sessions k
                    WHERE k.young_person_id = %s
                      AND k.next_session_date IS NOT NULL
                      AND COALESCE(k.archived, FALSE) = FALSE

                    UNION ALL

                    SELECT
                        'statutory_document_review' AS compliance_type,
                        sd.id,
                        COALESCE(sd.title, sd.document_type, 'Statutory document') AS title,
                        COALESCE(sd.review_date, sd.expiry_date) AS due_date,
                        sd.status,
                        NULL::text AS approval_status,
                        sd.created_at
                    FROM statutory_documents sd
                    WHERE sd.young_person_id = %s
                      AND COALESCE(sd.archived, FALSE) = FALSE
                      AND (sd.review_date IS NOT NULL OR sd.expiry_date IS NOT NULL)
                ) x
                ORDER BY due_date ASC NULLS LAST, created_at DESC
                """,
                (young_person_id, young_person_id, young_person_id, young_person_id),
            )
            rows = cur.fetchall() or []

            cur.execute("SELECT CURRENT_DATE AS today")
            today_row = cur.fetchone()
            today = today_row["today"]

        items = []
        overdue_count = 0
        due_soon_count = 0
        ok_count = 0

        for row in rows:
            due_date = row.get("due_date")
            compliance_status = "ok"

            if due_date:
                if due_date < today:
                    compliance_status = "overdue"
                elif (due_date - today).days <= 7:
                    compliance_status = "due_soon"

            item = dict(row)
            item["compliance_status"] = compliance_status
            items.append(item)

            if compliance_status == "overdue":
                overdue_count += 1
            elif compliance_status == "due_soon":
                due_soon_count += 1
            else:
                ok_count += 1

        return {
            "young_person_id": young_person_id,
            "compliance_items": items,
            "summary": {
                "total": len(items),
                "overdue": overdue_count,
                "due_soon": due_soon_count,
                "ok": ok_count,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load compliance data: {str(e)}",
        )
