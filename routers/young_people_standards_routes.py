from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Standards"])


@router.get("/{young_person_id}/standards")
def get_standards_summary(
    young_person_id: int,
    conn=Depends(get_db),
):
    """
    Returns summary of evidence linked to each Children's Home Quality Standard
    for a specific young person.
    """

    query = """
        SELECT
            qs.code,
            qs.title,
            qs.short_label,
            COUNT(sel.id) AS linked_record_count
        FROM quality_standards qs
        LEFT JOIN standards_evidence_links sel
            ON qs.code = sel.standard_code
           AND sel.young_person_id = %s
        GROUP BY qs.code, qs.title, qs.short_label
        ORDER BY qs.code
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, (young_person_id,))
            rows = cur.fetchall()

        return rows

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load standards summary: {str(e)}"
        )


@router.get("/{young_person_id}/standards/evidence")
def get_standards_evidence(
    young_person_id: int,
    conn=Depends(get_db),
):
    """
    Returns all records that have been linked to Ofsted quality standards.
    """

    query = """
        SELECT
            sel.id,
            sel.young_person_id,
            sel.standard_code,
            qs.short_label AS standard_short_label,
            sel.source_table,
            sel.source_id,
            sel.evidence_strength,
            sel.rationale,
            sel.created_at
        FROM standards_evidence_links sel
        LEFT JOIN quality_standards qs
            ON sel.standard_code = qs.code
        WHERE sel.young_person_id = %s
        ORDER BY qs.code, sel.created_at DESC
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query, (young_person_id,))
            rows = cur.fetchall()

        return rows

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load standards evidence: {str(e)}"
        )


@router.post("/{young_person_id}/standards/rebuild")
def rebuild_standards_links(
    young_person_id: int,
    conn=Depends(get_db),
):
    """
    Regenerates automatic evidence links between records
    and the 9 Children's Home Quality Standards.
    """

    try:
        with conn.cursor() as cur:

            # Remove existing auto links
            cur.execute(
                """
                DELETE FROM standards_evidence_links
                WHERE young_person_id = %s
                """,
                (young_person_id,),
            )

            # Example: link daily notes → Standard 1 (voice of the child)
            cur.execute(
                """
                INSERT INTO standards_evidence_links (
                    young_person_id,
                    standard_code,
                    source_table,
                    source_id,
                    evidence_strength,
                    rationale,
                    created_at
                )
                SELECT
                    dn.young_person_id,
                    '1',
                    'daily_notes',
                    dn.id,
                    'medium',
                    'Daily note capturing child voice or lived experience',
                    NOW()
                FROM daily_notes dn
                WHERE dn.young_person_id = %s
                  AND dn.young_person_voice IS NOT NULL
                """,
                (young_person_id,),
            )

            # Support plans → Standard 2
            cur.execute(
                """
                INSERT INTO standards_evidence_links (
                    young_person_id,
                    standard_code,
                    source_table,
                    source_id,
                    evidence_strength,
                    rationale,
                    created_at
                )
                SELECT
                    sp.young_person_id,
                    '2',
                    'support_plans',
                    sp.id,
                    'high',
                    'Support plan demonstrating personalised care planning',
                    NOW()
                FROM support_plans sp
                WHERE sp.young_person_id = %s
                """,
                (young_person_id,),
            )

            # Risk assessments → Standard 12
            cur.execute(
                """
                INSERT INTO standards_evidence_links (
                    young_person_id,
                    standard_code,
                    source_table,
                    source_id,
                    evidence_strength,
                    rationale,
                    created_at
                )
                SELECT
                    ra.young_person_id,
                    '12',
                    'risk_assessments',
                    ra.id,
                    'high',
                    'Risk management and safeguarding evidence',
                    NOW()
                FROM risk_assessments ra
                WHERE ra.young_person_id = %s
                """,
                (young_person_id,),
            )

            # Education records → Standard 8
            cur.execute(
                """
                INSERT INTO standards_evidence_links (
                    young_person_id,
                    standard_code,
                    source_table,
                    source_id,
                    evidence_strength,
                    rationale,
                    created_at
                )
                SELECT
                    er.young_person_id,
                    '8',
                    'education_records',
                    er.id,
                    'medium',
                    'Education progress and attendance',
                    NOW()
                FROM education_records er
                WHERE er.young_person_id = %s
                """,
                (young_person_id,),
            )

        conn.commit()

        return {"message": "Standards evidence rebuilt successfully"}

    except Exception as e:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to rebuild standards evidence: {str(e)}"
        )
