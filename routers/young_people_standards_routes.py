from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Standards"])


class StandardLinkCreate(BaseModel):
    young_person_id: int
    source_table: str
    source_id: int
    standard_code: str
    evidence_strength: str | None = "primary"
    rationale: str | None = None
    linked_by: int | None = None
    auto_linked: bool = True


class StandardLinkUpdate(BaseModel):
    evidence_strength: str | None = None
    rationale: str | None = None
    linked_by: int | None = None
    auto_linked: bool | None = None


@router.get("/{young_person_id}/standards")
def get_young_person_standards(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            qs.code,
            qs.title,
            qs.short_label,
            qs.display_order,
            COUNT(rsl.id) AS linked_record_count
        FROM quality_standards qs
        LEFT JOIN record_standard_links rsl
            ON qs.code = rsl.standard_code
           AND rsl.young_person_id = %s
        GROUP BY qs.code, qs.title, qs.short_label, qs.display_order
        ORDER BY qs.display_order ASC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.get("/{young_person_id}/standards/evidence")
def get_young_person_standard_evidence(
    young_person_id: int,
    conn=Depends(get_db),
):
    query = """
        SELECT
            rsl.*,
            qs.title AS standard_title,
            qs.short_label AS standard_short_label,
            qs.display_order
        FROM record_standard_links rsl
        JOIN quality_standards qs
            ON rsl.standard_code = qs.code
        WHERE rsl.young_person_id = %s
        ORDER BY qs.display_order ASC, rsl.created_at DESC, rsl.id DESC
    """

    with conn.cursor() as cur:
        cur.execute(query, (young_person_id,))
        rows = cur.fetchall()

    return rows


@router.post("/standards/link")
def create_standard_link(
    payload: StandardLinkCreate,
    conn=Depends(get_db),
):
    now = datetime.utcnow()

    query = """
        INSERT INTO record_standard_links (
            young_person_id,
            source_table,
            source_id,
            standard_code,
            evidence_strength,
            rationale,
            linked_by,
            auto_linked,
            created_at,
            updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """

    values = (
        payload.young_person_id,
        payload.source_table,
        payload.source_id,
        payload.standard_code,
        payload.evidence_strength,
        payload.rationale,
        payload.linked_by,
        payload.auto_linked,
        now,
        now,
    )

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create standards link: {str(e)}")

    return {"message": "Standards link created successfully", "id": row["id"]}


@router.put("/standards/link/{link_id}")
def update_standard_link(
    link_id: int,
    payload: StandardLinkUpdate,
    conn=Depends(get_db),
):
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    update_data["updated_at"] = datetime.utcnow()

    set_parts = []
    values = []

    for field, value in update_data.items():
        set_parts.append(f"{field} = %s")
        values.append(value)

    values.append(link_id)

    query = f"""
        UPDATE record_standard_links
        SET {", ".join(set_parts)}
        WHERE id = %s
        RETURNING id
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, values)
            row = cur.fetchone()
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update standards link: {str(e)}")

    if not row:
        raise HTTPException(status_code=404, detail="Standards link not found")

    return {"message": "Standards link updated successfully", "id": row["id"]}


@router.post("/{young_person_id}/standards/rebuild")
def rebuild_standard_links(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM record_standard_links
                WHERE young_person_id = %s
                  AND COALESCE(auto_linked, TRUE) = TRUE
                """,
                (young_person_id,),
            )

            # Daily notes -> QS2, QS5, QS6
            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'daily_notes', id, 'QS2',
                       'supporting', 'Child voice and daily lived experience', author_id, TRUE, NOW(), NOW()
                FROM daily_notes
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'daily_notes', id, 'QS5',
                       'supporting', 'Daily well-being, presentation and health context', author_id, TRUE, NOW(), NOW()
                FROM daily_notes
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'daily_notes', id, 'QS6',
                       'supporting', 'Relationship-based care reflected in day-to-day recording', author_id, TRUE, NOW(), NOW()
                FROM daily_notes
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            # Support plans -> QS9, QS6
            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'support_plans', id, 'QS9',
                       'primary', 'Support plans are core care planning evidence', created_by, TRUE, NOW(), NOW()
                FROM support_plans
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                """,
                (young_person_id,),
            )

            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'support_plans', id, 'QS6',
                       'supporting', 'Plans often evidence relational support strategies', created_by, TRUE, NOW(), NOW()
                FROM support_plans
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                """,
                (young_person_id,),
            )

            # Risk assessments -> QS7, QS9
            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'risk_assessments', id, 'QS7',
                       'primary', 'Risk assessments evidence protection and safeguarding', created_by, TRUE, NOW(), NOW()
                FROM risk_assessments
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                """,
                (young_person_id,),
            )

            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'risk_assessments', id, 'QS9',
                       'supporting', 'Risk planning contributes to care planning', created_by, TRUE, NOW(), NOW()
                FROM risk_assessments
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                """,
                (young_person_id,),
            )

            # Education records -> QS3, QS4
            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'education_records', id, 'QS3',
                       'primary', 'Education records evidence participation and support in education', created_by, TRUE, NOW(), NOW()
                FROM education_records
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'education_records', id, 'QS4',
                       'supporting', 'Education achievements support enjoyment and achievement', created_by, TRUE, NOW(), NOW()
                FROM education_records
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            # Health records -> QS5
            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'health_records', id, 'QS5',
                       'primary', 'Health records evidence health and well-being support', created_by, TRUE, NOW(), NOW()
                FROM health_records
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            # Family contact -> QS6, QS2
            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'family_contact_records', id, 'QS6',
                       'primary', 'Family contact supports positive relationships', created_by, TRUE, NOW(), NOW()
                FROM family_contact_records
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'family_contact_records', id, 'QS2',
                       'supporting', 'Family contact records often contain the child''s views and wishes', created_by, TRUE, NOW(), NOW()
                FROM family_contact_records
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            # Keywork -> QS2, QS6
            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'keywork_sessions', id, 'QS2',
                       'primary', 'Key work captures child voice and reflective direct work', worker_id, TRUE, NOW(), NOW()
                FROM keywork_sessions
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'keywork_sessions', id, 'QS6',
                       'supporting', 'Key work evidences positive direct relationships', worker_id, TRUE, NOW(), NOW()
                FROM keywork_sessions
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            # Incidents -> QS7, QS8
            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'incidents', id, 'QS7',
                       'primary', 'Incidents evidence safeguarding and protective responses', staff_id, TRUE, NOW(), NOW()
                FROM incidents
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            cur.execute(
                """
                INSERT INTO record_standard_links (
                    young_person_id, source_table, source_id, standard_code,
                    evidence_strength, rationale, linked_by, auto_linked, created_at, updated_at
                )
                SELECT young_person_id, 'incidents', id, 'QS8',
                       'supporting', 'Manager review and oversight contributes to leadership and management evidence', staff_id, TRUE, NOW(), NOW()
                FROM incidents
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to rebuild standards links: {str(e)}")

    return {"message": "Standards links rebuilt successfully"}
