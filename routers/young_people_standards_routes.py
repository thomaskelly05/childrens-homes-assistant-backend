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
            qs.short_label AS standard_short_label
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
