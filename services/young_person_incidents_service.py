from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from fastapi.responses import PlainTextResponse


class YoungPersonIncidentsService:
    INCIDENT_TYPE_OPTIONS = [
        "missing_from_placement",
        "physical_aggression",
        "verbal_aggression",
        "self_harm_concern",
        "safeguarding_concern",
        "absconding",
        "property_damage",
        "bullying",
        "substance_misuse",
        "relationship_incident",
        "health_incident",
        "medication_error",
        "physical_intervention",
        "restraint",
        "other",
    ]

    OPTIONAL_COLUMNS = [
        "antecedent",
        "presentation",
        "staff_response",
        "trauma_informed_formulation",
        "child_voice",
        "restorative_follow_up",
        "outcome",
        "manager_review_comment",
        "approved_by",
        "approved_at",
        "returned_at",
        "submitted_at",
        "physical_intervention_used",
        "physical_intervention_type",
        "physical_intervention_duration_minutes",
        "physical_intervention_reason",
        "body_map_required",
        "body_map_json",
        "external_notification_required",
        "external_notification_details",
    ]

    @staticmethod
    def now_utc() -> datetime:
        return datetime.utcnow()

    @staticmethod
    def full_name(first_name: str | None, last_name: str | None) -> str | None:
        return " ".join([x for x in [first_name, last_name] if x]).strip() or None

    @staticmethod
    def normalise_severity(value: str | None) -> str:
        v = (value or "").strip().lower()
        if v in {"low", "medium", "high", "critical"}:
            return v
        return "medium"

    @staticmethod
    def normalise_review_status(value: str | None) -> str:
        v = (value or "").strip().lower()
        if v in {"draft", "pending", "submitted", "approved", "returned", "reviewed", "archived", "closed"}:
            return v
        return "draft"

    @staticmethod
    def ui_workflow_status(row: dict[str, Any]) -> str:
        review = YoungPersonIncidentsService.normalise_review_status(row.get("manager_review_status"))
        if review == "pending":
            return "submitted"
        if review == "reviewed":
            return "approved"
        return review

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
    def has_column(conn, table_name: str, column_name: str) -> bool:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = %s
                  AND column_name = %s
                LIMIT 1
                """,
                (table_name, column_name),
            )
            return bool(cur.fetchone())

    @staticmethod
    def available_optional_columns(conn) -> dict[str, bool]:
        return {
            col: YoungPersonIncidentsService.has_column(conn, "incidents", col)
            for col in YoungPersonIncidentsService.OPTIONAL_COLUMNS
        }

    @staticmethod
    def build_extra_select(cols: dict[str, bool]) -> str:
        parts = []
        for col, exists in cols.items():
            if exists:
                parts.append(f"i.{col}")
            else:
                parts.append(f"NULL AS {col}")
        return ", " + ", ".join(parts) if parts else ""

    @staticmethod
    def fetch_incident_select_sql(extra_select: str, where_sql: str) -> str:
        return f"""
        SELECT
            i.id,
            i.young_person_id,
            i.home_id,
            i.incident_datetime,
            i.incident_type,
            i.severity,
            i.location,
            i.description,
            i.manager_review_status,
            i.follow_up_required,
            i.staff_id,
            i.archived,
            i.created_at,
            i.updated_at
            {extra_select},
            s.first_name AS staff_first_name,
            s.last_name AS staff_last_name
        FROM incidents i
        LEFT JOIN users s ON i.staff_id = s.id
        {where_sql}
        """

    @staticmethod
    def transform_incident_row(row: dict[str, Any]) -> dict[str, Any]:
        staff_name = YoungPersonIncidentsService.full_name(
            row.get("staff_first_name"),
            row.get("staff_last_name"),
        )
        workflow_status = YoungPersonIncidentsService.ui_workflow_status(row)
        severity = YoungPersonIncidentsService.normalise_severity(row.get("severity"))

        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "home_id": row.get("home_id"),
            "incident_datetime": row.get("incident_datetime"),
            "occurred_at": row.get("incident_datetime"),
            "incident_type": row.get("incident_type"),
            "incident_type_options": YoungPersonIncidentsService.INCIDENT_TYPE_OPTIONS,
            "event_type": "incident",
            "title": (row.get("incident_type") or "incident").replace("_", " ").title(),
            "severity": severity,
            "risk_level": severity if severity in {"low", "medium", "high"} else "high",
            "location": row.get("location"),
            "description": row.get("description"),
            "narrative": row.get("description"),
            "manager_review_status": YoungPersonIncidentsService.normalise_review_status(
                row.get("manager_review_status")
            ),
            "workflow_status": workflow_status,
            "follow_up_required": row.get("follow_up_required"),
            "outcome": row.get("outcome") or row.get("follow_up_required"),
            "staff_id": row.get("staff_id"),
            "staff_name": staff_name,
            "archived": row.get("archived"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "antecedent": row.get("antecedent"),
            "presentation": row.get("presentation"),
            "staff_response": row.get("staff_response"),
            "trauma_informed_formulation": row.get("trauma_informed_formulation"),
            "child_voice": row.get("child_voice"),
            "restorative_follow_up": row.get("restorative_follow_up"),
            "manager_review_comment": row.get("manager_review_comment"),
            "approved_by": row.get("approved_by"),
            "approved_at": row.get("approved_at"),
            "returned_at": row.get("returned_at"),
            "submitted_at": row.get("submitted_at"),
            "physical_intervention_used": row.get("physical_intervention_used"),
            "physical_intervention_type": row.get("physical_intervention_type"),
            "physical_intervention_duration_minutes": row.get("physical_intervention_duration_minutes"),
            "physical_intervention_reason": row.get("physical_intervention_reason"),
            "body_map_required": row.get("body_map_required"),
            "body_map_json": row.get("body_map_json"),
            "external_notification_required": row.get("external_notification_required"),
            "external_notification_details": row.get("external_notification_details"),
            "requires_manager_review": True,
            "quality_standards": ["protection_of_children"],
            "judgement_areas": ["helped_and_protected"],
            "version_no": 1,
        }

    @staticmethod
    def fetch_incident_by_id(conn, incident_id: int) -> tuple[dict[str, Any], dict[str, bool]]:
        cols = YoungPersonIncidentsService.available_optional_columns(conn)
        extra_select = YoungPersonIncidentsService.build_extra_select(cols)

        with conn.cursor() as cur:
            cur.execute(
                YoungPersonIncidentsService.fetch_incident_select_sql(
                    extra_select,
                    "WHERE i.id = %s LIMIT 1",
                ),
                (incident_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")

        return row, cols

    @staticmethod
    def list_incidents_for_young_person(
        conn,
        *,
        young_person_id: int,
        archived: bool = False,
    ) -> list[dict[str, Any]]:
        YoungPersonIncidentsService.ensure_young_person_exists(conn, young_person_id)
        cols = YoungPersonIncidentsService.available_optional_columns(conn)
        extra_select = YoungPersonIncidentsService.build_extra_select(cols)

        where_sql = """
            WHERE i.young_person_id = %s
              AND COALESCE(i.archived, FALSE) = FALSE
              AND LOWER(COALESCE(i.manager_review_status, 'draft')) NOT IN ('archived', 'closed')
            ORDER BY COALESCE(i.incident_datetime, i.created_at) DESC, i.id DESC
        """
        if archived:
            where_sql = """
                WHERE i.young_person_id = %s
                  AND (
                    COALESCE(i.archived, FALSE) = TRUE
                    OR LOWER(COALESCE(i.manager_review_status, '')) IN ('archived', 'closed', 'reviewed', 'approved')
                  )
                ORDER BY COALESCE(i.incident_datetime, i.created_at) DESC, i.id DESC
            """

        with conn.cursor() as cur:
            cur.execute(
                YoungPersonIncidentsService.fetch_incident_select_sql(extra_select, where_sql),
                (young_person_id,),
            )
            rows = cur.fetchall() or []

        return [YoungPersonIncidentsService.transform_incident_row(r) for r in rows]

    @staticmethod
    def get_incident(conn, incident_id: int) -> dict[str, Any]:
        row, _ = YoungPersonIncidentsService.fetch_incident_by_id(conn, incident_id)
        return YoungPersonIncidentsService.transform_incident_row(row)

    @staticmethod
    def build_incident_title(incident_type: str | None) -> str:
        return (incident_type or "incident").replace("_", " ").title()

    @staticmethod
    def build_incident_summary(payload: dict[str, Any]) -> str:
        parts = [
            payload.get("presentation"),
            payload.get("description") or payload.get("narrative"),
            payload.get("staff_response"),
            payload.get("outcome") or payload.get("follow_up_required") or payload.get("restorative_follow_up"),
        ]
        text = " | ".join([str(x).strip() for x in parts if x and str(x).strip()])
        return text or "Incident recorded"

    @staticmethod
    def build_incident_narrative(payload: dict[str, Any]) -> str:
        parts = [
            f"Description: {payload.get('description') or payload.get('narrative')}" if payload.get("description") or payload.get("narrative") else None,
            f"Antecedent: {payload.get('antecedent')}" if payload.get("antecedent") else None,
            f"Presentation: {payload.get('presentation')}" if payload.get("presentation") else None,
            f"Staff response: {payload.get('staff_response')}" if payload.get("staff_response") else None,
            f"Trauma-informed formulation: {payload.get('trauma_informed_formulation')}" if payload.get("trauma_informed_formulation") else None,
            f"Child voice: {payload.get('child_voice')}" if payload.get("child_voice") else None,
            f"Restorative follow-up: {payload.get('restorative_follow_up')}" if payload.get("restorative_follow_up") else None,
            f"Outcome: {payload.get('outcome')}" if payload.get("outcome") else None,
        ]
        return "\n".join([p for p in parts if p]) or "Incident recorded"

    @staticmethod
    def create_incident(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        person = YoungPersonIncidentsService.ensure_young_person_exists(conn, young_person_id)
        cols = YoungPersonIncidentsService.available_optional_columns(conn)
        now = YoungPersonIncidentsService.now_utc()

        incident_datetime = payload.get("incident_datetime") or payload.get("occurred_at") or now.isoformat()
        description = payload.get("description") or payload.get("narrative")
        severity = YoungPersonIncidentsService.normalise_severity(
            payload.get("severity") or payload.get("risk_level")
        )
        follow_up_required = (
            payload.get("follow_up_required")
            or payload.get("outcome")
            or payload.get("restorative_follow_up")
        )

        review_status = YoungPersonIncidentsService.normalise_review_status(
            payload.get("manager_review_status") or payload.get("workflow_status")
        )
        if review_status == "submitted":
            review_status = "pending"
        if review_status == "approved":
            review_status = "reviewed"

        insert_columns = [
            "young_person_id",
            "home_id",
            "incident_datetime",
            "incident_type",
            "severity",
            "location",
            "description",
            "manager_review_status",
            "follow_up_required",
            "staff_id",
            "archived",
            "created_at",
            "updated_at",
        ]

        values = [
            young_person_id,
            person.get("home_id"),
            incident_datetime,
            payload.get("incident_type") if payload.get("incident_type") in YoungPersonIncidentsService.INCIDENT_TYPE_OPTIONS else "other",
            severity,
            payload.get("location"),
            description,
            review_status,
            follow_up_required,
            payload.get("staff_id") or actor_user_id,
            bool(payload.get("archived", False)),
            now,
            now,
        ]

        optional_map = {
            "antecedent": payload.get("antecedent"),
            "presentation": payload.get("presentation"),
            "staff_response": payload.get("staff_response"),
            "trauma_informed_formulation": payload.get("trauma_informed_formulation"),
            "child_voice": payload.get("child_voice"),
            "restorative_follow_up": payload.get("restorative_follow_up"),
            "outcome": payload.get("outcome"),
            "manager_review_comment": payload.get("manager_review_comment"),
            "physical_intervention_used": payload.get("physical_intervention_used"),
            "physical_intervention_type": payload.get("physical_intervention_type"),
            "physical_intervention_duration_minutes": payload.get("physical_intervention_duration_minutes"),
            "physical_intervention_reason": payload.get("physical_intervention_reason"),
            "body_map_required": payload.get("body_map_required"),
            "body_map_json": json.dumps(payload.get("body_map_json")) if payload.get("body_map_json") is not None else None,
            "external_notification_required": payload.get("external_notification_required"),
            "external_notification_details": payload.get("external_notification_details"),
        }

        for col, value in optional_map.items():
            if cols.get(col):
                insert_columns.append(col)
                values.append(value)

        placeholders = ", ".join(["%s"] * len(insert_columns))

        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO incidents ({", ".join(insert_columns)})
                VALUES ({placeholders})
                RETURNING id
                """,
                values,
            )
            created = cur.fetchone()
            incident_id = created["id"]

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=young_person_id,
                source_table="incidents",
                source_id=incident_id,
                event_type="created",
                title=YoungPersonIncidentsService.build_incident_title(payload.get("incident_type")),
                summary=YoungPersonIncidentsService.build_incident_summary(payload | {"description": description}),
                narrative=YoungPersonIncidentsService.build_incident_narrative(payload | {"description": description}),
                category="incident",
                subcategory=payload.get("incident_type") or "other",
                significance=severity,
                due_date=incident_datetime,
                owner_id=payload.get("staff_id") or actor_user_id,
                created_by=actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": bool(follow_up_required),
                    "manager_review": True,
                    "safeguarding": bool(payload.get("incident_type") == "safeguarding_concern"),
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": severity,
                    "workflow_status": review_status,
                    "incident_type": payload.get("incident_type") or "other",
                    "quality_standards": ["protection_of_children"],
                    "standards_rationale": "Linked from incident workflow",
                    "evidence_strength": "strong",
                    "response_actions": follow_up_required,
                    "judgement_areas": ["helped_and_protected"],
                },
            )

        conn.commit()
        return {
            "message": "Incident created successfully",
            "id": incident_id,
            "workflow": workflow_result,
        }

    @staticmethod
    def update_incident(
        conn,
        *,
        incident_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        update_data = dict(payload)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        if "occurred_at" in update_data:
            update_data["incident_datetime"] = update_data.pop("occurred_at")

        if "narrative" in update_data:
            update_data["description"] = update_data.pop("narrative")

        if "risk_level" in update_data:
            update_data["severity"] = update_data.pop("risk_level")

        if "workflow_status" in update_data:
            workflow_status = YoungPersonIncidentsService.normalise_review_status(update_data.pop("workflow_status"))
            if workflow_status == "submitted":
                update_data["manager_review_status"] = "pending"
            elif workflow_status == "approved":
                update_data["manager_review_status"] = "reviewed"
            else:
                update_data["manager_review_status"] = workflow_status

        if "severity" in update_data and update_data["severity"] is not None:
            update_data["severity"] = YoungPersonIncidentsService.normalise_severity(update_data["severity"])

        if "manager_review_status" in update_data and update_data["manager_review_status"] is not None:
            update_data["manager_review_status"] = YoungPersonIncidentsService.normalise_review_status(
                update_data["manager_review_status"]
            )

        if "incident_type" in update_data and update_data["incident_type"] not in YoungPersonIncidentsService.INCIDENT_TYPE_OPTIONS:
            update_data["incident_type"] = "other"

        if "body_map_json" in update_data and update_data["body_map_json"] is not None:
            update_data["body_map_json"] = json.dumps(update_data["body_map_json"])

        _, cols = YoungPersonIncidentsService.fetch_incident_by_id(conn, incident_id)

        for field in YoungPersonIncidentsService.OPTIONAL_COLUMNS:
            if not cols.get(field):
                update_data.pop(field, None)

        update_data["updated_at"] = YoungPersonIncidentsService.now_utc()

        set_parts = []
        values = []
        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)

        values.append(incident_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE incidents
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Incident not found")

        conn.commit()
        return {"message": "Incident updated successfully", "id": row["id"]}

    @staticmethod
    def submit_incident(
        conn,
        *,
        incident_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row, cols = YoungPersonIncidentsService.fetch_incident_by_id(conn, incident_id)
        now = YoungPersonIncidentsService.now_utc()

        set_parts = ["manager_review_status = %s", "updated_at = %s"]
        values = ["pending", now]

        if cols.get("submitted_at"):
            set_parts.append("submitted_at = %s")
            values.append(now)

        values.append(incident_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE incidents
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            updated = cur.fetchone()

            transformed = YoungPersonIncidentsService.transform_incident_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="incidents",
                source_id=incident_id,
                event_type="submitted",
                title=f"{transformed['title']} submitted",
                summary=transformed["description"] or "Incident submitted",
                narrative=transformed["description"] or "Incident submitted",
                category="incident",
                subcategory=row.get("incident_type") or "other",
                significance=row.get("severity") or "high",
                due_date=row.get("incident_datetime"),
                owner_id=row.get("staff_id"),
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
                    "severity": row.get("severity") or "high",
                    "workflow_status": "submitted",
                    "incident_type": row.get("incident_type"),
                    "quality_standards": ["protection_of_children"],
                    "standards_rationale": "Incident submitted for review",
                    "evidence_strength": "strong",
                    "judgement_areas": ["helped_and_protected"],
                },
            )

        conn.commit()
        return {"ok": True, "status": "submitted", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def approve_incident(
        conn,
        *,
        incident_id: int,
        approved_by: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row, cols = YoungPersonIncidentsService.fetch_incident_by_id(conn, incident_id)
        now = YoungPersonIncidentsService.now_utc()

        set_parts = ["manager_review_status = %s", "updated_at = %s"]
        values = ["reviewed", now]

        if cols.get("manager_review_comment"):
            set_parts.append("manager_review_comment = %s")
            values.append(review_note)

        if cols.get("approved_by"):
            set_parts.append("approved_by = %s")
            values.append(approved_by)

        if cols.get("approved_at"):
            set_parts.append("approved_at = %s")
            values.append(now)

        values.append(incident_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE incidents
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            updated = cur.fetchone()

            transformed = YoungPersonIncidentsService.transform_incident_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="incidents",
                source_id=incident_id,
                event_type="approved",
                title=f"{transformed['title']} approved",
                summary=transformed["description"] or "Incident approved",
                narrative=review_note or transformed["description"] or "Incident approved",
                category="incident",
                subcategory=row.get("incident_type") or "other",
                significance=row.get("severity") or "high",
                due_date=row.get("incident_datetime"),
                owner_id=row.get("staff_id"),
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
                    "severity": row.get("severity") or "high",
                    "workflow_status": "approved",
                    "incident_type": row.get("incident_type"),
                    "quality_standards": ["protection_of_children"],
                    "standards_rationale": "Incident approved",
                    "evidence_strength": "strong",
                    "judgement_areas": ["helped_and_protected"],
                    "manager_review_comment": review_note,
                },
            )

        conn.commit()
        return {"ok": True, "status": "approved", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def return_incident(
        conn,
        *,
        incident_id: int,
        actor_user_id: int | None,
        review_note: str | None,
        linking_service,
    ) -> dict[str, Any]:
        row, cols = YoungPersonIncidentsService.fetch_incident_by_id(conn, incident_id)
        now = YoungPersonIncidentsService.now_utc()

        set_parts = ["manager_review_status = %s", "updated_at = %s"]
        values = ["returned", now]

        if cols.get("manager_review_comment"):
            set_parts.append("manager_review_comment = %s")
            values.append(review_note)

        if cols.get("returned_at"):
            set_parts.append("returned_at = %s")
            values.append(now)

        values.append(incident_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE incidents
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            updated = cur.fetchone()

            transformed = YoungPersonIncidentsService.transform_incident_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="incidents",
                source_id=incident_id,
                event_type="returned",
                title=f"{transformed['title']} returned",
                summary=transformed["description"] or "Incident returned",
                narrative=review_note or "Incident returned for revision",
                category="incident",
                subcategory=row.get("incident_type") or "other",
                significance=row.get("severity") or "high",
                due_date=row.get("incident_datetime"),
                owner_id=row.get("staff_id"),
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
                    "severity": row.get("severity") or "high",
                    "workflow_status": "returned",
                    "incident_type": row.get("incident_type"),
                    "response_actions": review_note,
                    "manager_review_comment": review_note,
                },
            )

        conn.commit()
        return {"ok": True, "status": "returned", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def archive_incident(
        conn,
        *,
        incident_id: int,
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        row, _ = YoungPersonIncidentsService.fetch_incident_by_id(conn, incident_id)
        now = YoungPersonIncidentsService.now_utc()

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE incidents
                SET archived = TRUE,
                    manager_review_status = %s,
                    updated_at = %s
                WHERE id = %s
                RETURNING id
                """,
                ("archived", now, incident_id),
            )
            updated = cur.fetchone()

            transformed = YoungPersonIncidentsService.transform_incident_row(row)
            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=row["young_person_id"],
                source_table="incidents",
                source_id=incident_id,
                event_type="archived",
                title=f"{transformed['title']} archived",
                summary=transformed["description"] or "Incident archived",
                narrative="Incident archived",
                category="incident",
                subcategory=row.get("incident_type") or "other",
                significance=row.get("severity") or "medium",
                due_date=row.get("incident_datetime"),
                owner_id=row.get("staff_id"),
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
                    "incident_type": row.get("incident_type"),
                },
            )

        conn.commit()
        return {"ok": True, "status": "archived", "id": updated["id"], "workflow": workflow_result}

    @staticmethod
    def export_incident(conn, incident_id: int) -> PlainTextResponse:
        incident = YoungPersonIncidentsService.get_incident(conn, incident_id)

        text = f"""INDICARE INCIDENT EXPORT

Incident ID: {incident.get('id') or '—'}
Young person ID: {incident.get('young_person_id') or '—'}

Incident type: {incident.get('incident_type') or '—'}
Occurred at: {incident.get('occurred_at') or '—'}
Severity: {incident.get('severity') or '—'}
Location: {incident.get('location') or '—'}

Description
{incident.get('description') or '—'}

Antecedent
{incident.get('antecedent') or '—'}

Presentation
{incident.get('presentation') or '—'}

Staff response
{incident.get('staff_response') or '—'}

Trauma-informed formulation
{incident.get('trauma_informed_formulation') or '—'}

Child voice
{incident.get('child_voice') or '—'}

Outcome / Follow-up
{incident.get('outcome') or incident.get('follow_up_required') or '—'}

Physical intervention used: {incident.get('physical_intervention_used')}
Physical intervention type: {incident.get('physical_intervention_type') or '—'}
Physical intervention duration: {incident.get('physical_intervention_duration_minutes') or '—'}
Physical intervention reason: {incident.get('physical_intervention_reason') or '—'}

Body map required: {incident.get('body_map_required')}
Body map data: {incident.get('body_map_json') or '—'}

External notification required: {incident.get('external_notification_required')}
External notification details: {incident.get('external_notification_details') or '—'}

Manager review status: {incident.get('manager_review_status') or '—'}
Workflow status: {incident.get('workflow_status') or '—'}
Manager review comment: {incident.get('manager_review_comment') or '—'}

Recorded by: {incident.get('staff_name') or '—'}
Created at: {incident.get('created_at') or '—'}
Updated at: {incident.get('updated_at') or '—'}
"""

        return PlainTextResponse(
            content=text,
            headers={"Content-Disposition": f'inline; filename="incident-{incident_id}.txt"'},
        )
