from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException
from fastapi.responses import PlainTextResponse

from services.os_sync_hooks import archive_after_status_change, sync_after_save


class YoungPersonPlansService:
    VALID_STATUSES = {"draft", "active", "completed", "archived"}
    VALID_APPROVAL_STATUSES = {"not_required", "draft", "submitted", "approved", "returned"}

    @staticmethod
    def now_utc() -> datetime:
        return datetime.utcnow()

    @staticmethod
    def normalise_status(value: str | None) -> str:
        v = (value or "").strip().lower()

        if v in YoungPersonPlansService.VALID_STATUSES:
            return v
        if v == "approved":
            return "active"
        if v == "returned":
            return "draft"
        return "draft"

    @staticmethod
    def normalise_approval_status(value: str | None) -> str:
        v = (value or "").strip().lower()
        if v in YoungPersonPlansService.VALID_APPROVAL_STATUSES:
            return v
        return "draft"

    @staticmethod
    def full_name(first_name: str | None, last_name: str | None) -> str | None:
        return " ".join([x for x in [first_name, last_name] if x]).strip() or None

    @staticmethod
    def ensure_young_person_exists(conn, young_person_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, home_id, first_name, last_name
                FROM young_people
                WHERE id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Young person not found")
            return row

    @staticmethod
    def fetch_plan_select_sql(where_sql: str) -> str:
        return f"""
            SELECT
                sp.id,
                sp.young_person_id,
                yp.home_id,
                sp.plan_type,
                sp.title,
                sp.presenting_need,
                sp.summary,
                sp.child_voice,
                sp.proactive_strategies,
                sp.pace_guidance,
                sp.triggers,
                sp.protective_factors,
                sp.start_date,
                sp.review_date,
                sp.status,
                sp.owner_id,
                sp.approval_status,
                sp.approved_by,
                sp.approved_at,
                sp.created_by,
                sp.archived,
                sp.created_at,
                sp.updated_at,
                ou.first_name AS owner_first_name,
                ou.last_name AS owner_last_name,
                cu.first_name AS created_by_first_name,
                cu.last_name AS created_by_last_name,
                au.first_name AS approved_by_first_name,
                au.last_name AS approved_by_last_name
            FROM support_plans sp
            INNER JOIN young_people yp ON yp.id = sp.young_person_id
            LEFT JOIN users ou ON sp.owner_id = ou.id
            LEFT JOIN users cu ON sp.created_by = cu.id
            LEFT JOIN users au ON sp.approved_by = au.id
            {where_sql}
        """

    @staticmethod
    def transform_plan_row(row: dict[str, Any]) -> dict[str, Any]:
        owner_name = YoungPersonPlansService.full_name(
            row.get("owner_first_name"),
            row.get("owner_last_name"),
        )
        created_by_name = YoungPersonPlansService.full_name(
            row.get("created_by_first_name"),
            row.get("created_by_last_name"),
        )
        approved_by_name = YoungPersonPlansService.full_name(
            row.get("approved_by_first_name"),
            row.get("approved_by_last_name"),
        )

        approval_status = YoungPersonPlansService.normalise_approval_status(
            row.get("approval_status")
        )
        base_status = YoungPersonPlansService.normalise_status(row.get("status"))

        display_status = approval_status
        if approval_status in {"not_required", "draft"}:
            display_status = (
                base_status
                if base_status in {"draft", "active", "archived", "completed"}
                else "draft"
            )

        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "home_id": row.get("home_id"),
            "plan_type": row.get("plan_type") or "support_plan",
            "title": row.get("title"),
            "presenting_need": row.get("presenting_need"),
            "summary": row.get("summary"),
            "child_voice": row.get("child_voice"),
            "proactive_strategies": row.get("proactive_strategies"),
            "pace_guidance": row.get("pace_guidance"),
            "triggers": row.get("triggers"),
            "protective_factors": row.get("protective_factors"),
            "start_date": row.get("start_date"),
            "review_date": row.get("review_date"),
            "review_due_at": row.get("review_date"),
            "status": display_status,
            "record_status": base_status,
            "approval_status": approval_status,
            "owner_id": row.get("owner_id"),
            "owner_name": owner_name,
            "approved_by": row.get("approved_by"),
            "approved_by_name": approved_by_name,
            "approved_at": row.get("approved_at"),
            "reviewer_name": approved_by_name,
            "created_by": row.get("created_by"),
            "created_by_name": created_by_name,
            "archived": row.get("archived"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "staff_guidance": row.get("proactive_strategies"),
            "formulation": row.get("presenting_need"),
            "workflow_status": display_status,
            "event_type": "support_plan",
            "record_type": "support_plan",
            "version_no": 1,
            "quality_standards": ["protection_of_children"],
            "judgement_areas": ["helped_and_protected"],
        }

    @staticmethod
    def fetch_plan_by_id(conn, plan_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                YoungPersonPlansService.fetch_plan_select_sql("WHERE sp.id = %s LIMIT 1"),
                (plan_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Support plan not found")

        return row

    @staticmethod
    def _run_os_sync_after_save(
        conn,
        *,
        plan_id: int,
    ) -> None:
        try:
            plan = YoungPersonPlansService.get_support_plan(conn, plan_id)
            sync_after_save(
                source_table="support_plans",
                record=plan,
                recorded_by_name=plan.get("created_by_name") or plan.get("owner_name"),
            )
        except Exception:
            # Keep the source record write successful even if OS sync fails.
            pass

    @staticmethod
    def list_plans_for_young_person(
        conn,
        *,
        young_person_id: int,
        archived: bool = False,
    ) -> list[dict[str, Any]]:
        YoungPersonPlansService.ensure_young_person_exists(conn, young_person_id)

        where_sql = """
            WHERE sp.young_person_id = %s
              AND COALESCE(sp.archived, FALSE) = FALSE
              AND LOWER(COALESCE(sp.status, 'draft')) NOT IN ('archived', 'completed')
            ORDER BY
                CASE
                    WHEN LOWER(COALESCE(sp.approval_status, '')) = 'returned' THEN 1
                    WHEN LOWER(COALESCE(sp.approval_status, '')) = 'submitted' THEN 2
                    WHEN LOWER(COALESCE(sp.status, '')) = 'draft' THEN 3
                    WHEN LOWER(COALESCE(sp.status, '')) = 'active' THEN 4
                    ELSE 5
                END,
                sp.review_date ASC NULLS LAST,
                sp.updated_at DESC,
                sp.id DESC
        """

        if archived:
            where_sql = """
                WHERE sp.young_person_id = %s
                  AND (
                    COALESCE(sp.archived, FALSE) = TRUE
                    OR LOWER(COALESCE(sp.status, '')) IN ('archived', 'completed')
                  )
                ORDER BY sp.updated_at DESC, sp.id DESC
            """

        with conn.cursor() as cur:
            cur.execute(
                YoungPersonPlansService.fetch_plan_select_sql(where_sql),
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        return [YoungPersonPlansService.transform_plan_row(r) for r in rows]

    @staticmethod
    def get_support_plan(conn, plan_id: int) -> dict[str, Any]:
        row = YoungPersonPlansService.fetch_plan_by_id(conn, plan_id)
        return YoungPersonPlansService.transform_plan_row(row)

    @staticmethod
    def build_plan_summary(payload: dict[str, Any]) -> str:
        parts = [
            payload.get("title"),
            payload.get("summary"),
            payload.get("presenting_need"),
            payload.get("proactive_strategies"),
        ]
        text = " | ".join([str(x).strip() for x in parts if x and str(x).strip()])
        return text or "Support plan recorded"

    @staticmethod
    def build_plan_narrative(payload: dict[str, Any]) -> str:
        parts = [
            f"Summary: {payload.get('summary')}" if payload.get("summary") else None,
            f"Presenting need: {payload.get('presenting_need')}" if payload.get("presenting_need") else None,
            f"Child voice: {payload.get('child_voice')}" if payload.get("child_voice") else None,
            f"Proactive strategies: {payload.get('proactive_strategies')}" if payload.get("proactive_strategies") else None,
            f"Pace guidance: {payload.get('pace_guidance')}" if payload.get("pace_guidance") else None,
            f"Triggers: {payload.get('triggers')}" if payload.get("triggers") else None,
            f"Protective factors: {payload.get('protective_factors')}" if payload.get("protective_factors") else None,
        ]
        return "\n".join([p for p in parts if p]) or "Support plan recorded"

    @staticmethod
    def create_support_plan(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        now = YoungPersonPlansService.now_utc()
        YoungPersonPlansService.ensure_young_person_exists(conn, young_person_id)

        presenting_need = payload.get("presenting_need")
        proactive_strategies = payload.get("proactive_strategies")

        if payload.get("formulation") is not None:
            presenting_need = payload.get("formulation")

        if payload.get("staff_guidance") is not None:
            proactive_strategies = payload.get("staff_guidance")

        status = YoungPersonPlansService.normalise_status(payload.get("status"))
        approval_status = YoungPersonPlansService.normalise_approval_status(payload.get("approval_status"))

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO support_plans (
                    young_person_id,
                    plan_type,
                    title,
                    presenting_need,
                    summary,
                    child_voice,
                    proactive_strategies,
                    pace_guidance,
                    triggers,
                    protective_factors,
                    start_date,
                    review_date,
                    status,
                    owner_id,
                    approval_status,
                    created_by,
                    archived,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    young_person_id,
                    payload.get("plan_type") or "support_plan",
                    payload.get("title"),
                    presenting_need,
                    payload.get("summary"),
                    payload.get("child_voice"),
                    proactive_strategies,
                    payload.get("pace_guidance"),
                    payload.get("triggers"),
                    payload.get("protective_factors"),
                    payload.get("start_date"),
                    payload.get("review_date"),
                    status,
                    payload.get("owner_id") or actor_user_id,
                    approval_status,
                    payload.get("created_by") or actor_user_id,
                    bool(payload.get("archived", False)),
                    now,
                    now,
                ),
            )
            created = cur.fetchone()
            plan_id = created["id"]

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=young_person_id,
                source_table="support_plans",
                source_id=plan_id,
                event_type="created",
                title=payload.get("title") or "Support plan",
                summary=YoungPersonPlansService.build_plan_summary(
                    {
                        **payload,
                        "presenting_need": presenting_need,
                        "proactive_strategies": proactive_strategies,
                    }
                ),
                narrative=YoungPersonPlansService.build_plan_narrative(
                    {
                        **payload,
                        "presenting_need": presenting_need,
                        "proactive_strategies": proactive_strategies,
                    }
                ),
                category="support_plan",
                subcategory=payload.get("plan_type") or "support_plan",
                significance="medium",
                review_date=payload.get("review_date"),
                due_date=payload.get("review_date"),
                owner_id=payload.get("owner_id") or actor_user_id,
                created_by=payload.get("created_by") or actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": bool(payload.get("review_date")),
                    "manager_review": approval_status == "submitted",
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": approval_status if approval_status != "not_required" else status,
                    "quality_standards": ["protection_of_children"],
                    "standards_rationale": "Linked from support plan workflow",
                    "evidence_strength": "strong",
                    "response_actions": payload.get("proactive_strategies"),
                    "judgement_areas": ["helped_and_protected"],
                },
            )

        conn.commit()
        YoungPersonPlansService._run_os_sync_after_save(conn, plan_id=plan_id)

        return {
            "message": "Support plan created successfully",
            "id": plan_id,
            "workflow": workflow_result,
        }

    @staticmethod
    def update_support_plan(
        conn,
        *,
        plan_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        update_data = dict(payload)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        if "staff_guidance" in update_data:
            update_data["proactive_strategies"] = update_data.pop("staff_guidance")

        if "formulation" in update_data:
            update_data["presenting_need"] = update_data.pop("formulation")

        if "status" in update_data and update_data["status"] is not None:
            update_data["status"] = YoungPersonPlansService.normalise_status(update_data["status"])

        if "approval_status" in update_data and update_data["approval_status"] is not None:
            update_data["approval_status"] = YoungPersonPlansService.normalise_approval_status(
                update_data["approval_status"]
            )

        update_data["updated_at"] = YoungPersonPlansService.now_utc()

        set_parts = []
        values = []
        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)
        values.append(plan_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE support_plans
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Support plan not found")

        conn.commit()
        YoungPersonPlansService._run_os_sync_after_save(conn, plan_id=plan_id)

        return {"message": "Support plan updated successfully", "id": row["id"]}

    @staticmethod
    def submit_support_plan(
        conn,
        *,
        plan_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonPlansService.fetch_plan_by_id(conn, plan_id)
        now = YoungPersonPlansService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE support_plans
                SET approval_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("submitted", now, plan_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonPlansService.transform_plan_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="support_plans",
                source_id=plan_id,
                event_type="submitted",
                title=f"{row.get('title') or 'Support plan'} submitted",
                summary=transformed["summary"] or "Support plan submitted",
                narrative=transformed["summary"] or "Support plan submitted",
                category="support_plan",
                subcategory=row.get("plan_type") or "support_plan",
                significance="medium",
                review_date=row.get("review_date"),
                due_date=row.get("review_date"),
                owner_id=row.get("owner_id"),
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": "submitted",
                    "quality_standards": ["protection_of_children"],
                    "standards_rationale": "Support plan submitted for review",
                    "evidence_strength": "strong",
                    "judgement_areas": ["helped_and_protected"],
                },
            )

        conn.commit()
        YoungPersonPlansService._run_os_sync_after_save(conn, plan_id=plan_id)

        return {"ok": True, "status": "submitted", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def approve_support_plan(
        conn,
        *,
        plan_id: int,
        approved_by: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonPlansService.fetch_plan_by_id(conn, plan_id)
        now = YoungPersonPlansService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE support_plans
                SET approval_status = %s,
                    status = %s,
                    approved_by = %s,
                    approved_at = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("approved", "active", approved_by, now, now, plan_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonPlansService.transform_plan_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="support_plans",
                source_id=plan_id,
                event_type="approved",
                title=f"{row.get('title') or 'Support plan'} approved",
                summary=transformed["summary"] or "Support plan approved",
                narrative=review_note or transformed["summary"] or "Support plan approved",
                category="support_plan",
                subcategory=row.get("plan_type") or "support_plan",
                significance="medium",
                review_date=row.get("review_date"),
                due_date=row.get("review_date"),
                owner_id=row.get("owner_id"),
                created_by=approved_by,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": "approved",
                    "quality_standards": ["protection_of_children"],
                    "standards_rationale": "Support plan approved",
                    "evidence_strength": "strong",
                    "judgement_areas": ["helped_and_protected"],
                    "manager_review_comment": review_note,
                },
            )

        conn.commit()
        YoungPersonPlansService._run_os_sync_after_save(conn, plan_id=plan_id)

        return {"ok": True, "status": "approved", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def return_support_plan(
        conn,
        *,
        plan_id: int,
        actor_user_id: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonPlansService.fetch_plan_by_id(conn, plan_id)
        now = YoungPersonPlansService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE support_plans
                SET approval_status = %s,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("returned", "draft", now, plan_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonPlansService.transform_plan_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="support_plans",
                source_id=plan_id,
                event_type="returned",
                title=f"{row.get('title') or 'Support plan'} returned",
                summary=transformed["summary"] or "Support plan returned",
                narrative=review_note or "Support plan returned for amendment",
                category="support_plan",
                subcategory=row.get("plan_type") or "support_plan",
                significance="medium",
                review_date=row.get("review_date"),
                due_date=row.get("review_date"),
                owner_id=row.get("owner_id"),
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": True,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": False,
                    "link_quality_standards": False,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": "returned",
                    "response_actions": review_note,
                    "manager_review_comment": review_note,
                },
            )

        conn.commit()
        YoungPersonPlansService._run_os_sync_after_save(conn, plan_id=plan_id)

        return {
            "ok": True,
            "status": "returned",
            "id": updated["id"],
            "review_note": review_note or "",
            "workflow": workflow_result,
        }

    @staticmethod
    def archive_support_plan(
        conn,
        *,
        plan_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonPlansService.fetch_plan_by_id(conn, plan_id)
        now = YoungPersonPlansService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE support_plans
                SET archived = TRUE,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("archived", now, plan_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonPlansService.transform_plan_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="support_plans",
                source_id=plan_id,
                event_type="archived",
                title=f"{row.get('title') or 'Support plan'} archived",
                summary=transformed["summary"] or "Support plan archived",
                narrative="Support plan archived",
                category="support_plan",
                subcategory=row.get("plan_type") or "support_plan",
                significance="low",
                review_date=row.get("review_date"),
                due_date=row.get("review_date"),
                owner_id=row.get("owner_id"),
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": False,
                    "link_monthly_reviews": False,
                    "link_quality_standards": False,
                },
                metadata={
                    "severity": "low",
                    "workflow_status": "archived",
                },
            )

        conn.commit()

        try:
            archive_after_status_change(
                young_person_id=row["young_person_id"],
                source_table="support_plans",
                source_id=plan_id,
            )
        except Exception:
            pass

        return {"ok": True, "status": "archived", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def export_support_plan(conn, plan_id: int) -> PlainTextResponse:
        plan = YoungPersonPlansService.get_support_plan(conn, plan_id)

        text = f"""INDICARE SUPPORT PLAN EXPORT

Title: {plan.get('title') or '—'}
Plan type: {plan.get('plan_type') or '—'}
Young person ID: {plan.get('young_person_id') or '—'}

Status: {plan.get('status') or '—'}
Record status: {plan.get('record_status') or '—'}
Approval status: {plan.get('approval_status') or '—'}
Version: {plan.get('version_no') or 1}

Owner: {plan.get('owner_name') or '—'}
Created by: {plan.get('created_by_name') or '—'}
Start date: {plan.get('start_date') or '—'}
Review date: {plan.get('review_due_at') or '—'}

SUMMARY
{plan.get('summary') or '—'}

CHILD VIEWS, WISHES AND FEELINGS
{plan.get('child_voice') or '—'}

FORMULATION / PRESENTING NEED
{plan.get('formulation') or '—'}

STAFF GUIDANCE / PROACTIVE STRATEGIES
{plan.get('staff_guidance') or '—'}

PACE GUIDANCE
{plan.get('pace_guidance') or '—'}

TRIGGERS
{plan.get('triggers') or '—'}

PROTECTIVE FACTORS
{plan.get('protective_factors') or '—'}

Created at: {plan.get('created_at') or '—'}
Updated at: {plan.get('updated_at') or '—'}
"""

        return PlainTextResponse(
            content=text,
            headers={"Content-Disposition": f'inline; filename="support-plan-{plan_id}.txt"'},
        )
