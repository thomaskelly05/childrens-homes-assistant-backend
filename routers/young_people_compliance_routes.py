from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.current_user import get_current_user
from db.connection import get_db
from services.young_person_service import YoungPersonService

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


def _load_and_check_young_person(
    young_person_id: int,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    record = YoungPersonService.get_young_person_by_id(young_person_id)
    if not record:
        raise HTTPException(status_code=404, detail="Young person not found")

    _assert_home_access(current_user, _safe_int(record.get("home_id")))
    return record


def _build_profile_completeness_items(bundle: dict[str, Any]) -> list[dict[str, Any]]:
    communication_profile = bundle.get("communication_profile") or {}
    education_profile = bundle.get("education_profile") or {}
    health_profile = bundle.get("health_profile") or {}
    identity_profile = bundle.get("identity_profile") or {}
    legal_status = bundle.get("legal_status") or {}
    contacts = bundle.get("contacts") or []

    def has_any_value(data: dict[str, Any], keys: list[str]) -> bool:
        return any(bool(data.get(key)) for key in keys)

    items = [
        {
            "compliance_type": "profile_section",
            "title": "Communication profile",
            "due_date": None,
            "status": "present" if has_any_value(
                communication_profile,
                [
                    "communication_style",
                    "sensory_profile",
                    "processing_needs",
                    "signs_of_distress",
                    "what_helps",
                ],
            ) else "missing",
            "approval_status": None,
            "compliance_status": "ok" if has_any_value(
                communication_profile,
                [
                    "communication_style",
                    "sensory_profile",
                    "processing_needs",
                    "signs_of_distress",
                    "what_helps",
                ],
            ) else "missing",
            "category": "profile",
        },
        {
            "compliance_type": "profile_section",
            "title": "Education profile",
            "due_date": None,
            "status": "present" if has_any_value(
                education_profile,
                [
                    "school_name",
                    "education_status",
                    "sen_status",
                    "support_summary",
                ],
            ) else "missing",
            "approval_status": None,
            "compliance_status": "ok" if has_any_value(
                education_profile,
                [
                    "school_name",
                    "education_status",
                    "sen_status",
                    "support_summary",
                ],
            ) else "missing",
            "category": "profile",
        },
        {
            "compliance_type": "profile_section",
            "title": "Health profile",
            "due_date": None,
            "status": "present" if has_any_value(
                health_profile,
                [
                    "gp_name",
                    "allergies",
                    "diagnoses",
                    "mental_health_summary",
                    "medication_summary",
                ],
            ) else "missing",
            "approval_status": None,
            "compliance_status": "ok" if has_any_value(
                health_profile,
                [
                    "gp_name",
                    "allergies",
                    "diagnoses",
                    "mental_health_summary",
                    "medication_summary",
                ],
            ) else "missing",
            "category": "profile",
        },
        {
            "compliance_type": "profile_section",
            "title": "Identity profile",
            "due_date": None,
            "status": "present" if has_any_value(
                identity_profile,
                [
                    "cultural_identity",
                    "first_language",
                    "interests",
                    "strengths_summary",
                    "what_matters_to_me",
                ],
            ) else "missing",
            "approval_status": None,
            "compliance_status": "ok" if has_any_value(
                identity_profile,
                [
                    "cultural_identity",
                    "first_language",
                    "interests",
                    "strengths_summary",
                    "what_matters_to_me",
                ],
            ) else "missing",
            "category": "profile",
        },
        {
            "compliance_type": "profile_section",
            "title": "Legal status",
            "due_date": None,
            "status": "present" if has_any_value(
                legal_status,
                [
                    "legal_status",
                    "order_type",
                    "delegated_authority_details",
                    "consent_arrangements",
                ],
            ) else "missing",
            "approval_status": None,
            "compliance_status": "ok" if has_any_value(
                legal_status,
                [
                    "legal_status",
                    "order_type",
                    "delegated_authority_details",
                    "consent_arrangements",
                ],
            ) else "missing",
            "category": "profile",
        },
        {
            "compliance_type": "profile_section",
            "title": "Family / contact information",
            "due_date": None,
            "status": "present" if len(contacts) > 0 else "missing",
            "approval_status": None,
            "compliance_status": "ok" if len(contacts) > 0 else "missing",
            "category": "profile",
        },
    ]

    return items


@router.get("/{young_person_id}/compliance")
def get_young_person_compliance(
    young_person_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _load_and_check_young_person(young_person_id, current_user)

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM (
                    SELECT
                        'support_plan_review' AS compliance_type,
                        COALESCE(sp.title, sp.plan_type, 'Plan review') AS title,
                        sp.review_date AS due_date,
                        sp.status,
                        sp.approval_status,
                        sp.created_at,
                        'planning' AS category
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
                        r.created_at,
                        'risk' AS category
                    FROM risk_assessments r
                    WHERE r.young_person_id = %s
                      AND r.review_date IS NOT NULL
                      AND COALESCE(r.archived, FALSE) = FALSE

                    UNION ALL

                    SELECT
                        'keywork_follow_up' AS compliance_type,
                        COALESCE(k.topic, 'Key work follow up') AS title,
                        k.next_session_date AS due_date,
                        k.status,
                        NULL::text AS approval_status,
                        k.created_at,
                        'relationships' AS category
                    FROM keywork_sessions k
                    WHERE k.young_person_id = %s
                      AND k.next_session_date IS NOT NULL
                      AND COALESCE(k.archived, FALSE) = FALSE

                    UNION ALL

                    SELECT
                        'statutory_document_review' AS compliance_type,
                        COALESCE(sd.title, sd.document_type, 'Statutory document') AS title,
                        COALESCE(sd.review_date, sd.expiry_date) AS due_date,
                        sd.status,
                        NULL::text AS approval_status,
                        sd.created_at,
                        'documents' AS category
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
            today: date = today_row["today"]

        items: list[dict[str, Any]] = []
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

        bundle = YoungPersonService.get_full_profile_bundle(young_person_id)
        profile_items = _build_profile_completeness_items(bundle)
        all_items = items + profile_items

        overdue_items = [item for item in all_items if item.get("compliance_status") == "overdue"]
        due_soon_items = [item for item in all_items if item.get("compliance_status") == "due_soon"]
        missing_items = [item for item in all_items if item.get("compliance_status") == "missing"]
        ok_items = [item for item in all_items if item.get("compliance_status") == "ok"]

        grouped = {
            "overdue": overdue_items,
            "due_soon": due_soon_items,
            "missing": missing_items,
            "ok": ok_items,
        }

        summary = {
            "total_items": len(all_items),
            "overdue_count": len(overdue_items),
            "due_soon_count": len(due_soon_items),
            "missing_count": len(missing_items),
            "ok_count": len(ok_items),
        }

        return {
            "ok": True,
            "young_person_id": young_person_id,
            "summary": summary,
            "compliance_items": all_items,
            "grouped_items": grouped,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load compliance data: {str(e)}",
        )
