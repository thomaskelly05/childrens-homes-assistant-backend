from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import HTTPException

from services.os_sync_hooks import sync_after_save


class YoungPersonFamilyService:
    @staticmethod
    def now_utc() -> datetime:
        return datetime.utcnow()

    @staticmethod
    def _meaningful_text(value: Any) -> str | None:
        text = str(value or "").strip()
        if not text:
            return None

        normalised = text.lower().strip().rstrip(".")
        if normalised in {"none", "no", "n/a", "na", "nil", "nothing", "not applicable"}:
            return None

        return text

    @staticmethod
    def _truthy_follow_up(value: Any) -> bool:
        if isinstance(value, bool):
            return value

        normalised = str(value or "").strip().lower().rstrip(".")
        return normalised not in {"", "false", "no", "none", "n/a", "na", "nil", "0", "not applicable"}

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
    def full_name(first_name: str | None, last_name: str | None) -> str | None:
        return " ".join([x for x in [first_name, last_name] if x]).strip() or None

    @staticmethod
    def transform_contact(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "contact_type": row.get("contact_type"),
            "full_name": row.get("full_name"),
            "relationship_to_young_person": row.get("relationship_to_young_person"),
            "phone": row.get("phone"),
            "email": row.get("email"),
            "address": row.get("address"),
            "is_parental_responsibility_holder": row.get("is_parental_responsibility_holder"),
            "is_approved_contact": row.get("is_approved_contact"),
            "is_restricted_contact": row.get("is_restricted_contact"),
            "supervision_level": row.get("supervision_level"),
            "notes": row.get("notes"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }

    @staticmethod
    def transform_family_contact_record(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id"),
            "young_person_id": row.get("young_person_id"),
            "contact_datetime": row.get("contact_datetime"),
            "occurred_at": row.get("contact_datetime") or row.get("created_at"),
            "contact_type": row.get("contact_type"),
            "contact_person": row.get("contact_person"),
            "supervision_level": row.get("supervision_level"),
            "location": row.get("location"),
            "pre_contact_presentation": row.get("pre_contact_presentation"),
            "post_contact_presentation": row.get("post_contact_presentation"),
            "child_voice": row.get("child_voice"),
            "concerns": row.get("concerns"),
            "follow_up_required": row.get("follow_up_required"),
            "created_by": row.get("created_by"),
            "created_by_name": YoungPersonFamilyService.full_name(
                row.get("created_by_first_name"),
                row.get("created_by_last_name"),
            ),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "title": row.get("contact_person") or "Family contact",
            "summary": row.get("child_voice") or row.get("post_contact_presentation") or row.get("concerns") or "Family contact recorded",
            "narrative": row.get("child_voice") or row.get("post_contact_presentation") or row.get("concerns") or "Family contact recorded",
            "event_type": "family",
            "workflow_status": "recorded",
            "quality_standards": ["positive_relationships", "wishes_and_feelings"],
            "judgement_areas": ["experiences_and_progress"],
        }

    @staticmethod
    def _run_os_sync_after_family_contact_record_save(
        conn,
        *,
        record_id: int,
    ) -> None:
        try:
            row = YoungPersonFamilyService.get_family_contact_record_row(conn, record_id)
            record = YoungPersonFamilyService.transform_family_contact_record(row)
            sync_after_save(
                source_table="family_contact_records",
                record=record,
                recorded_by_name=record.get("created_by_name"),
            )
        except Exception:
            pass

    @staticmethod
    def get_family_bundle(conn, young_person_id: int) -> dict[str, Any]:
        YoungPersonFamilyService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM young_person_contacts
                WHERE young_person_id = %s
                ORDER BY
                    COALESCE(is_parental_responsibility_holder, FALSE) DESC,
                    COALESCE(is_approved_contact, FALSE) DESC,
                    full_name ASC,
                    id DESC
                """,
                (young_person_id,),
            )
            contacts = cur.fetchall() or []

            cur.execute(
                """
                SELECT
                    fcr.id,
                    fcr.young_person_id,
                    yp.home_id,
                    fcr.contact_datetime,
                    fcr.contact_type,
                    fcr.contact_person,
                    fcr.supervision_level,
                    fcr.location,
                    fcr.pre_contact_presentation,
                    fcr.post_contact_presentation,
                    fcr.child_voice,
                    fcr.concerns,
                    fcr.follow_up_required,
                    fcr.created_by,
                    fcr.created_at,
                    fcr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM family_contact_records fcr
                INNER JOIN young_people yp ON yp.id = fcr.young_person_id
                LEFT JOIN users u ON fcr.created_by = u.id
                WHERE fcr.young_person_id = %s
                ORDER BY COALESCE(fcr.contact_datetime, fcr.created_at) DESC, fcr.id DESC
                """,
                (young_person_id,),
            )
            records = cur.fetchall() or []

        transformed_records = [YoungPersonFamilyService.transform_family_contact_record(r) for r in records]

        return {
            "contacts": [YoungPersonFamilyService.transform_contact(r) for r in contacts],
            "family_contact_records": transformed_records,
            "items": transformed_records,
        }

    @staticmethod
    def get_contact_row(conn, contact_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ypc.*, yp.home_id
                FROM young_person_contacts ypc
                INNER JOIN young_people yp ON yp.id = ypc.young_person_id
                WHERE ypc.id = %s
                LIMIT 1
                """,
                (contact_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Contact not found")

        return row

    @staticmethod
    def get_contact(conn, contact_id: int) -> dict[str, Any]:
        row = YoungPersonFamilyService.get_contact_row(conn, contact_id)
        return YoungPersonFamilyService.transform_contact(row)

    @staticmethod
    def get_family_contact_record_row(conn, record_id: int) -> dict[str, Any]:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    fcr.id,
                    fcr.young_person_id,
                    yp.home_id,
                    fcr.contact_datetime,
                    fcr.contact_type,
                    fcr.contact_person,
                    fcr.supervision_level,
                    fcr.location,
                    fcr.pre_contact_presentation,
                    fcr.post_contact_presentation,
                    fcr.child_voice,
                    fcr.concerns,
                    fcr.follow_up_required,
                    fcr.created_by,
                    fcr.created_at,
                    fcr.updated_at,
                    u.first_name AS created_by_first_name,
                    u.last_name AS created_by_last_name
                FROM family_contact_records fcr
                INNER JOIN young_people yp ON yp.id = fcr.young_person_id
                LEFT JOIN users u ON fcr.created_by = u.id
                WHERE fcr.id = %s
                LIMIT 1
                """,
                (record_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Family contact record not found")

        return row

    @staticmethod
    def get_family_contact_record(conn, record_id: int) -> dict[str, Any]:
        row = YoungPersonFamilyService.get_family_contact_record_row(conn, record_id)
        return YoungPersonFamilyService.transform_family_contact_record(row)

    @staticmethod
    def create_contact(conn, *, young_person_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        now = YoungPersonFamilyService.now_utc()
        YoungPersonFamilyService.ensure_young_person_exists(conn, young_person_id)

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO young_person_contacts (
                    young_person_id,
                    contact_type,
                    full_name,
                    relationship_to_young_person,
                    phone,
                    email,
                    address,
                    is_parental_responsibility_holder,
                    is_approved_contact,
                    is_restricted_contact,
                    supervision_level,
                    notes,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    young_person_id,
                    payload.get("contact_type"),
                    payload.get("full_name"),
                    payload.get("relationship_to_young_person"),
                    payload.get("phone"),
                    payload.get("email"),
                    payload.get("address"),
                    payload.get("is_parental_responsibility_holder", False),
                    payload.get("is_approved_contact", False),
                    payload.get("is_restricted_contact", False),
                    payload.get("supervision_level"),
                    payload.get("notes"),
                    now,
                    now,
                ),
            )
            row = cur.fetchone()

        conn.commit()
        return YoungPersonFamilyService.transform_contact(row)

    @staticmethod
    def update_contact(conn, *, contact_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        update_data = dict(payload)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        update_data["updated_at"] = YoungPersonFamilyService.now_utc()

        set_parts = []
        values = []

        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)

        values.append(contact_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE young_person_contacts
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING *
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Contact not found")

        conn.commit()
        return YoungPersonFamilyService.transform_contact(row)

    @staticmethod
    def create_family_contact_record(
        conn,
        *,
        young_person_id: int,
        payload: dict[str, Any],
        actor_user_id: int | None,
        linking_service,
    ) -> dict[str, Any]:
        now = YoungPersonFamilyService.now_utc()
        YoungPersonFamilyService.ensure_young_person_exists(conn, young_person_id)

        concerns = YoungPersonFamilyService._meaningful_text(payload.get("concerns"))
        follow_up_required = YoungPersonFamilyService._truthy_follow_up(payload.get("follow_up_required"))

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO family_contact_records (
                    young_person_id,
                    contact_datetime,
                    contact_type,
                    contact_person,
                    supervision_level,
                    location,
                    pre_contact_presentation,
                    post_contact_presentation,
                    child_voice,
                    concerns,
                    follow_up_required,
                    created_by,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    young_person_id,
                    payload.get("contact_datetime"),
                    payload.get("contact_type"),
                    payload.get("contact_person"),
                    payload.get("supervision_level"),
                    payload.get("location"),
                    payload.get("pre_contact_presentation"),
                    payload.get("post_contact_presentation"),
                    payload.get("child_voice"),
                    payload.get("concerns"),
                    follow_up_required,
                    payload.get("created_by") or actor_user_id,
                    now,
                    now,
                ),
            )
            created = cur.fetchone()
            record_id = created["id"]

            workflow_result = linking_service.process_record_event(
                conn=conn,
                young_person_id=young_person_id,
                source_table="family_contact_records",
                source_id=record_id,
                event_type="created",
                title=payload.get("contact_person") or "Family contact",
                summary=payload.get("child_voice") or payload.get("post_contact_presentation") or concerns or "Family contact recorded",
                narrative=payload.get("child_voice") or payload.get("post_contact_presentation") or concerns or "Family contact recorded",
                category="family",
                subcategory=payload.get("contact_type") or "family_contact",
                significance="medium",
                due_date=payload.get("contact_datetime"),
                owner_id=payload.get("created_by") or actor_user_id,
                created_by=payload.get("created_by") or actor_user_id,
                workflow={
                    "link_chronology": True,
                    "create_task": bool(follow_up_required or concerns),
                    "manager_review": False,
                    "safeguarding": bool(concerns),
                    "link_support_plans": True,
                    "link_monthly_reviews": True,
                    "link_quality_standards": True,
                },
                metadata={
                    "severity": "medium",
                    "workflow_status": payload.get("workflow_status") or payload.get("status") or "recorded",
                    "quality_standards": ["positive_relationships", "wishes_and_feelings"],
                    "standards_rationale": "Linked from family contact workflow",
                    "evidence_strength": "medium",
                    "response_actions": concerns,
                    "judgement_areas": ["experiences_and_progress"],
                },
            )

        conn.commit()
        YoungPersonFamilyService._run_os_sync_after_family_contact_record_save(conn, record_id=record_id)

        return {
            "message": "Family contact record created successfully",
            "id": record_id,
            "workflow": workflow_result,
        }

    @staticmethod
    def update_family_contact_record(conn, *, record_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        update_data = dict(payload)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        update_data["updated_at"] = YoungPersonFamilyService.now_utc()

        set_parts = []
        values = []

        for field, value in update_data.items():
            set_parts.append(f"{field} = %s")
            values.append(value)

        values.append(record_id)

        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE family_contact_records
                SET {", ".join(set_parts)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )
            row = cur.fetchone()

        if not row:
            conn.rollback()
            raise HTTPException(status_code=404, detail="Family contact record not found")

        conn.commit()
        YoungPersonFamilyService._run_os_sync_after_family_contact_record_save(conn, record_id=record_id)

        return {"message": "Family contact record updated successfully", "id": row["id"]}
