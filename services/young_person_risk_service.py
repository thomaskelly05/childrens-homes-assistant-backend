from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException

from services.os_sync_hooks import archive_after_status_change, sync_after_save


class YoungPersonRiskService:
    VALID_SEVERITIES = {"low", "medium", "high", "critical"}
    VALID_LIKELIHOODS = {"low", "medium", "high"}
    VALID_STATUSES = {"active", "draft", "submitted", "approved", "returned", "archived", "completed", "closed"}
    VALID_APPROVAL_STATUSES = {"not_required", "draft", "submitted", "approved", "returned", "rejected", "pending"}

    @staticmethod
    def now_utc() -> datetime:
        return datetime.utcnow()

    @staticmethod
    def full_name(first_name: str | None, last_name: str | None) -> str | None:
        return " ".join([x for x in [first_name, last_name] if x]).strip() or None

    @staticmethod
    def normalise_severity(value: str | None) -> str:
        v = (value or "").strip().lower()
        return v if v in YoungPersonRiskService.VALID_SEVERITIES else "medium"

    @staticmethod
    def normalise_likelihood(value: str | None) -> str:
        v = (value or "").strip().lower()
        return v if v in YoungPersonRiskService.VALID_LIKELIHOODS else "medium"

    @staticmethod
    def normalise_status(value: str | None) -> str:
        v = (value or "").strip().lower()
        return v if v in YoungPersonRiskService.VALID_STATUSES else "active"

    @staticmethod
    def normalise_approval_status(value: str | None) -> str:
        v = (value or "").strip().lower()
        return v if v in YoungPersonRiskService.VALID_APPROVAL_STATUSES else "not_required"

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
    def fetch_risk_select_sql(where_sql: str) -> str:
        return f"""
            SELECT
                ra.id,
                ra.young_person_id,
                yp.home_id,
                ra.category,
                ra.title,
                ra.concern_summary,
                ra.known_triggers,
                ra.early_warning_signs,
                ra.contextual_factors,
                ra.current_controls,
                ra.deescalation_strategies,
                ra.response_actions,
                ra.child_views,
                ra.severity,
                ra.likelihood,
                ra.review_date,
                ra.status,
                ra.owner_id,
                ra.approval_status,
                ra.approved_by,
                ra.approved_at,
                ra.created_by,
                ra.archived,
                ra.created_at,
                ra.updated_at,
                ou.first_name AS owner_first_name,
                ou.last_name AS owner_last_name,
                cu.first_name AS created_by_first_name,
                cu.last_name AS created_by_last_name,
                au.first_name AS approved_by_first_name,
                au.last_name AS approved_by_last_name
            FROM risk_assessments ra
            INNER JOIN young_people yp ON yp.id = ra.young_person_id
            LEFT JOIN users ou ON ra.owner_id = ou.id
            LEFT JOIN users cu ON ra.created_by = cu.id
            LEFT JOIN users au ON ra.approved_by = au.id
            {where_sql}
        """

    @staticmethod
    def transform_risk_row(row: dict[str, Any]) -> dict[str, Any]:
        severity = YoungPersonRiskService.normalise_severity(row.get("severity"))
        likelihood = YoungPersonRiskService.normalise_likelihood(row.get("likelihood"))
        approval_status = YoungPersonRiskService.normalise_approval_status(row.get("approval_status"))
        status = YoungPersonRiskService.normalise_status(row.get("status"))

        workflow_status = approval_status
        if workflow_status == "not_required":
            workflow_status = status

        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "home_id": row.get("home_id"),
            "category": row.get("category"),
            "title": row.get("title"),
            "concern_summary": row.get("concern_summary"),
            "known_triggers": row.get("known_triggers"),
            "early_warning_signs": row.get("early_warning_signs"),
            "contextual_factors": row.get("contextual_factors"),
            "current_controls": row.get("current_controls"),
            "deescalation_strategies": row.get("deescalation_strategies"),
            "response_actions": row.get("response_actions"),
            "child_views": row.get("child_views"),
            "severity": severity,
            "likelihood": likelihood,
            "review_date": row.get("review_date"),
            "review_due_at": row.get("review_date"),
            "status": status,
            "approval_status": approval_status,
            "owner_id": row.get("owner_id"),
            "owner_name": YoungPersonRiskService.full_name(
                row.get("owner_first_name"),
                row.get("owner_last_name"),
            ),
            "approved_by": row.get("approved_by"),
            "approved_by_name": YoungPersonRiskService.full_name(
                row.get("approved_by_first_name"),
                row.get("approved_by_last_name"),
            ),
            "approved_at": row.get("approved_at"),
            "created_by": row.get("created_by"),
            "created_by_name": YoungPersonRiskService.full_name(
                row.get("created_by_first_name"),
                row.get("created_by_last_name"),
            ),
            "archived": row.get("archived"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "summary": row.get("concern_summary") or "Risk assessment",
            "narrative": row.get("concern_summary") or "Risk assessment",
            "workflow_status": workflow_status,
            "event_type": "risk",
            "formulation": row.get("concern_summary"),
            "staff_guidance": row.get("current_controls"),
            "quality_standards": ["protection_of_children"],
            "judgement_areas": ["helped_and_protected"],
            "version_no": 1,
        }

    @staticmethod
    def fetch_risk_by_id(conn, risk_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                YoungPersonRiskService.fetch_risk_select_sql("WHERE ra.id = %s LIMIT 1"),
                (risk_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Risk assessment not found")

        return row

    @staticmethod
    def _run_os_sync_after_save(
        conn,
        *,
        risk_id: int,
    ) -> None:
        try:
            risk = YoungPersonRiskService.get_risk(conn, risk_id)
            sync_after_save(
                source_table="risk_assessments",
                record=risk,
                recorded_by_name=risk.get("created_by_name") or risk.get("owner_name"),
            )
        except Exception:
            # Keep the source record write successful even if OS sync fails.
            pass

    @staticmethod
    def list_risk_for_young_person(
        conn,
        *,
        young_person_id: int,
        archived: bool = False,
    ) -> list[dict[str, Any]]:
        YoungPersonRiskService.ensure_young_person_exists(conn, young_person_id)

        where_sql = """
            WHERE ra.young_person_id = %s
              AND COALESCE(ra.archived, FALSE) = FALSE
              AND LOWER(COALESCE(ra.status, 'active')) NOT IN ('archived', 'completed')
            ORDER BY
                CASE
                    WHEN LOWER(COALESCE(ra.severity, '')) = 'critical' THEN 1
                    WHEN LOWER(COALESCE(ra.severity, '')) = 'high' THEN 2
                    WHEN LOWER(COALESCE(ra.severity, '')) = 'medium' THEN 3
                    ELSE 4
                END,
                ra.review_date ASC NULLS LAST,
                ra.created_at DESC,
                ra.id DESC
        """
        if archived:
            where_sql = """
                WHERE ra.young_person_id = %s
                  AND (
                    COALESCE(ra.archived, FALSE) = TRUE
                    OR LOWER(COALESCE(ra.status, '')) IN ('archived', 'completed')
                  )
                ORDER BY ra.updated_at DESC, ra.id DESC
            """

        with conn.cursor() as cur:
            cur.execute(
                YoungPersonRiskService.fetch_risk_select_sql(where_sql),
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        return [YoungPersonRiskService.transform_risk_row(r) for r in rows]

    @staticmethod
    def get_risk(conn, risk_id: int) -> dict[str, Any]:
        row = YoungPersonRiskService.fetch_risk_by_id(conn, risk_id)
        return YoungPersonRiskService.transform_risk_row(row)

    @staticmethod
    def build_risk_summary(payload: dict[str, Any]) -> str:
        parts = [
            payload.get("title"),
            payload.get("concern_summary"),
            payload.get("known_triggers"),
            payload.get("response_actions"),
        ]
        text = " | ".join([str(x).strip() for x in parts if x and str(x).strip()])
        return text or "Risk assessment recorded"

    @staticmethod
    def build_risk_narrative(payload: dict[str, Any]) -> str:
        parts = [
            f"Concern summary: {payload.get('concern_summary')}" if payload.get("concern_summary") else None,
            f"Known triggers: {payload.get('known_triggers')}" if payload.get("known_triggers") else None,
            f"Early warning signs: {payload.get('early_warning_signs')}" if payload.get("early_warning_signs") else None,
            f"Contextual factors: {payload.get('contextual_factors')}" if payload.get("contextual_factors") else None,
            f"Current controls: {payload.get('current_controls')}" if payload.get("current_controls") else None,
            f"De-escalation strategies: {payload.get('deescalation_strategies')}" if payload.get("deescalation_strategies") else None,
            f"Response actions: {payload.get('response_actions')}" if payload.get("response_actions") else None,
            f"Child views: {payload.get('child_views')}" if payload.get("child_views") else None,
        ]
        return "\n".join([p for p in parts if p]) or "Risk assessment recorded"

    @staticmethod
    def create_risk_assessment(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        now = YoungPersonRiskService.now_utc()
        YoungPersonRiskService.ensure_young_person_exists(conn, young_person_id)

        severity = YoungPersonRiskService.normalise_severity(payload.get("severity"))
        likelihood = YoungPersonRiskService.normalise_likelihood(payload.get("likelihood"))
        status = YoungPersonRiskService.normalise_status(payload.get("status"))
        approval_status = YoungPersonRiskService.normalise_approval_status(payload.get("approval_status"))

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO risk_assessments (
                    young_person_id,
                    category,
                    title,
                    concern_summary,
                    known_triggers,
                    early_warning_signs,
                    contextual_factors,
                    current_controls,
                    deescalation_strategies,
                    response_actions,
                    child_views,
                    severity,
                    likelihood,
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
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
                """,
                (
                    young_person_id,
                    payload.get("category"),
                    payload.get("title"),
                    payload.get("concern_summary"),
                    payload.get("known_triggers"),
                    payload.get("early_warning_signs"),
                    payload.get("contextual_factors"),
                    payload.get("current_controls"),
                    payload.get("deescalation_strategies"),
                    payload.get("response_actions"),
                    payload.get("child_views"),
                    severity,
                    likelihood,
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
            risk_id = created["id"]

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=young_person_id,
                source_table="risk_assessments",
                source_id=risk_id,
                event_type="created",
                title=payload.get("title") or "Risk assessment",
                summary=YoungPersonRiskService.build_risk_summary(payload),
                narrative=YoungPersonRiskService.build_risk_narrative(payload),
                category="risk",
                subcategory=payload.get("category") or "general",
                significance=severity,
                review_date=payload.get("review_date"),
                due_date=payload.get("review_date"),
                owner_id=payload.get("owner_id") or actor_user_id,
                created_by=payload.get("created_by") or actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": bool(payload.get("review_date")),
                    "manager_review": approval_status in {"submitted", "pending"},
                    "safeguarding": severity in {"high", "critical"},
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": severity,
                    "workflow_status": approval_status if approval_status != "not_required" else status,
                    "quality_standards": ["protection_of_children"],
                    "standards_rationale": "Linked from risk assessment workflow",
                    "evidence_strength": "strong",
                    "response_actions": payload.get("response_actions"),
                    "judgement_areas": ["helped_and_protected"],
                },
            )

        conn.commit()
        YoungPersonRiskService._run_os_sync_after_save(conn, risk_id=risk_id)

        return {
            "message": "Risk assessment created successfully",
            "id": risk_id,
            "workflow": workflow_result,
        }

    @staticmethod
    def update_risk_assessment(
        conn,
        *,
        risk_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        update_data = dict(payload)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        if "severity" in update_data and update_data["severity"] is not None:
            update_data["severity"] = YoungPersonRiskService.normalise_severity(update_data["severity"])

        if "likelihood" in update_data and update_data["likelihood"] is not None:
            update_data["likelihood"] = YoungPersonRiskService.normalise_likelihood(update_data["likelihood"])

        if "status" in update_data and update_data["status"] is not None:
            update_data["status"] = YoungPersonRiskService.normalise_status(update_data["status"])

        if "approval_status" in update_data and update_data["approval_status"] is not None:
            update_data["approval_status"] = YoungPersonRiskService.normalise_approval_status(
                update_data["approval_status"]
            )

        update_data["updated_at"] = YoungPersonRiskService.now_utc()

        set_parts = []
        values = []
        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)
        values.append(risk_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE risk_assessments
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Risk assessment not found")

        conn.commit()
        YoungPersonRiskService._run_os_sync_after_save(conn, risk_id=risk_id)

        return {"message": "Risk assessment updated successfully", "id": row["id"]}

    @staticmethod
    def submit_risk_assessment(
        conn,
        *,
        risk_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonRiskService.fetch_risk_by_id(conn, risk_id)
        now = YoungPersonRiskService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE risk_assessments
                SET approval_status = %s,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("submitted", "submitted", now, risk_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonRiskService.transform_risk_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="risk_assessments",
                source_id=risk_id,
                event_type="submitted",
                title=f"{row.get('title') or 'Risk assessment'} submitted",
                summary=transformed["summary"],
                narrative=transformed["narrative"],
                category="risk",
                subcategory=row.get("category") or "general",
                significance=row.get("severity") or "medium",
                review_date=row.get("review_date"),
                due_date=row.get("review_date"),
                owner_id=row.get("owner_id"),
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": row.get("severity") or "medium",
                    "workflow_status": "submitted",
                    "quality_standards": ["protection_of_children"],
                    "standards_rationale": "Risk submitted for review",
                    "evidence_strength": "strong",
                    "judgement_areas": ["helped_and_protected"],
                },
            )

        conn.commit()
        YoungPersonRiskService._run_os_sync_after_save(conn, risk_id=risk_id)

        return {"ok": True, "status": "submitted", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def approve_risk_assessment(
        conn,
        *,
        risk_id: int,
        approved_by: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonRiskService.fetch_risk_by_id(conn, risk_id)
        now = YoungPersonRiskService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE risk_assessments
                SET approval_status = %s,
                    status = %s,
                    approved_by = %s,
                    approved_at = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("approved", "approved", approved_by, now, now, risk_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonRiskService.transform_risk_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="risk_assessments",
                source_id=risk_id,
                event_type="approved",
                title=f"{row.get('title') or 'Risk assessment'} approved",
                summary=transformed["summary"],
                narrative=review_note or transformed["narrative"],
                category="risk",
                subcategory=row.get("category") or "general",
                significance=row.get("severity") or "medium",
                review_date=row.get("review_date"),
                due_date=row.get("review_date"),
                owner_id=row.get("owner_id"),
                created_by=approved_by,
                workflow={
                    "link_chronology": True,
                    "create_task": False,
                    "manager_review": False,
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": row.get("severity") or "medium",
                    "workflow_status": "approved",
                    "quality_standards": ["protection_of_children"],
                    "standards_rationale": "Risk approved",
                    "evidence_strength": "strong",
                    "judgement_areas": ["helped_and_protected"],
                    "manager_review_comment": review_note,
                },
            )

        conn.commit()
        YoungPersonRiskService._run_os_sync_after_save(conn, risk_id=risk_id)

        return {"ok": True, "status": "approved", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def return_risk_assessment(
        conn,
        *,
        risk_id: int,
        actor_user_id: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonRiskService.fetch_risk_by_id(conn, risk_id)
        now = YoungPersonRiskService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE risk_assessments
                SET approval_status = %s,
                    status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("returned", "returned", now, risk_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonRiskService.transform_risk_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="risk_assessments",
                source_id=risk_id,
                event_type="returned",
                title=f"{row.get('title') or 'Risk assessment'} returned",
                summary=transformed["summary"],
                narrative=review_note or "Risk assessment returned for revision",
                category="risk",
                subcategory=row.get("category") or "general",
                significance=row.get("severity") or "medium",
                review_date=row.get("review_date"),
                due_date=row.get("review_date"),
                owner_id=row.get("owner_id"),
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": True,
                    "manager_review": True,
                    "safeguarding": False,
                    "link_support_plans": True,
                    "link_monthly_reviews": False,
                    "link_quality_standards": False,
                },
                metadata={
                    "severity": row.get("severity") or "medium",
                    "workflow_status": "returned",
                    "response_actions": review_note,
                    "manager_review_comment": review_note,
                },
            )

        conn.commit()
        YoungPersonRiskService._run_os_sync_after_save(conn, risk_id=risk_id)

        return {"ok": True, "status": "returned", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def archive_risk_assessment(
        conn,
        *,
        risk_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row = YoungPersonRiskService.fetch_risk_by_id(conn, risk_id)
        now = YoungPersonRiskService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE risk_assessments
                SET archived = TRUE,
                    status = %s,
                    approval_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("archived", "approved", now, risk_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonRiskService.transform_risk_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="risk_assessments",
                source_id=risk_id,
                event_type="archived",
                title=f"{row.get('title') or 'Risk assessment'} archived",
                summary=transformed["summary"],
                narrative="Risk assessment archived",
                category="risk",
                subcategory=row.get("category") or "general",
                significance=row.get("severity") or "medium",
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
                    "severity": row.get("severity") or "medium",
                    "workflow_status": "archived",
                },
            )

        conn.commit()

        try:
            archive_after_status_change(
                young_person_id=row["young_person_id"],
                source_table="risk_assessments",
                source_id=risk_id,
            )
        except Exception:
            pass

        return {"ok": True, "status": "archived", "id": updated["id"], "workflow": workflow_result}
