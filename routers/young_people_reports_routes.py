from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService

router = APIRouter(prefix="/young-people", tags=["Young People Reports"])


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

    _assert_home_access(current_user, _safe_int(row.get("home_id")))
    return row


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

        return {
            "items": [dict(row) for row in rows],
            "count": len(rows),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load reports: {str(e)}")


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
            "report": dict(row),
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

        return {
            "items": [dict(row) for row in rows],
            "count": len(rows),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load report links: {str(e)}")
