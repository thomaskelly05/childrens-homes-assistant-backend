from fastapi import APIRouter, Depends, HTTPException
from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Handover"])


@router.get("/{young_person_id}/handover")
def get_handover_records(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        query = """
            SELECT
                h.id,
                h.young_person_id,
                h.handover_date,
                h.shift_type,
                h.title,
                h.summary_text,
                h.status,
                h.source_window_start,
                h.source_window_end,
                h.generated_by,
                h.approved_by,
                h.created_at,
                h.updated_at
            FROM handover_records h
            WHERE h.young_person_id = %s
            ORDER BY h.handover_date DESC, h.created_at DESC
        """

        with conn.cursor() as cur:
            cur.execute(query, (young_person_id,))
            rows = cur.fetchall()

        return rows

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load handover: {str(e)}")


@router.post("/{young_person_id}/handover/generate")
def generate_handover_record(
    young_person_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    note_date,
                    shift_type,
                    mood,
                    presentation,
                    activities,
                    education_update,
                    health_update,
                    family_update,
                    behaviour_update,
                    young_person_voice,
                    positives,
                    actions_required
                FROM daily_notes
                WHERE young_person_id = %s
                ORDER BY note_date DESC, created_at DESC
                LIMIT 3
                """,
                (young_person_id,),
            )
            daily_rows = cur.fetchall()

            cur.execute(
                """
                SELECT
                    incident_datetime,
                    incident_type,
                    description,
                    staff_response,
                    outcome,
                    severity
                FROM incidents
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY incident_datetime DESC, created_at DESC
                LIMIT 3
                """,
                (young_person_id,),
            )
            incident_rows = cur.fetchall()

            cur.execute(
                """
                SELECT
                    session_date,
                    topic,
                    summary,
                    child_voice,
                    reflective_analysis,
                    actions_agreed
                FROM keywork_sessions
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY session_date DESC, created_at DESC
                LIMIT 3
                """,
                (young_person_id,),
            )
            keywork_rows = cur.fetchall()

            latest_daily = daily_rows[0] if daily_rows else None
            latest_incident = incident_rows[0] if incident_rows else None
            latest_keywork = keywork_rows[0] if keywork_rows else None

            parts = []

            if latest_daily:
                presentation = latest_daily.get("presentation") or latest_daily.get("mood") or "No presentation recorded"
                activities = latest_daily.get("activities") or "No activity detail recorded"
                parts.append(f"Presentation and daily living: {presentation}. Activities included {activities}.")

                if latest_daily.get("education_update"):
                    parts.append(f"Education: {latest_daily.get('education_update')}")
                if latest_daily.get("health_update"):
                    parts.append(f"Health: {latest_daily.get('health_update')}")
                if latest_daily.get("family_update"):
                    parts.append(f"Family/contact: {latest_daily.get('family_update')}")
                if latest_daily.get("behaviour_update"):
                    parts.append(f"Behaviour/regulation: {latest_daily.get('behaviour_update')}")
                if latest_daily.get("young_person_voice"):
                    parts.append(f"Young person's voice: {latest_daily.get('young_person_voice')}")
                if latest_daily.get("positives"):
                    parts.append(f"Positives: {latest_daily.get('positives')}")
                if latest_daily.get("actions_required"):
                    parts.append(f"Actions for next shift: {latest_daily.get('actions_required')}")

            if latest_incident:
                incident_type = latest_incident.get("incident_type") or "Incident"
                description = latest_incident.get("description") or "No description recorded"
                staff_response = latest_incident.get("staff_response") or "No staff response recorded"
                parts.append(f"Recent incident: {incident_type}. {description}. Staff response: {staff_response}")

            if latest_keywork:
                topic = latest_keywork.get("topic") or "Key work"
                summary = latest_keywork.get("summary") or latest_keywork.get("reflective_analysis") or "No summary recorded"
                parts.append(f"Recent key work focus: {topic}. {summary}")

            summary_text = " ".join(parts) if parts else "No recent records were available to generate a handover summary."

            cur.execute(
                """
                INSERT INTO handover_records (
                    young_person_id,
                    handover_date,
                    shift_type,
                    title,
                    summary_text,
                    status,
                    source_window_start,
                    source_window_end,
                    generated_by,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s,
                    CURRENT_DATE,
                    'day',
                    'Shift Handover',
                    %s,
                    'draft',
                    NOW() - INTERVAL '7 days',
                    NOW(),
                    1,
                    NOW(),
                    NOW()
                )
                RETURNING *
                """,
                (young_person_id, summary_text),
            )
            row = cur.fetchone()

        conn.commit()
        return row

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate handover: {str(e)}")


@router.put("/handover/{handover_id}/approve")
def approve_handover(
    handover_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE handover_records
                SET
                    status = 'approved',
                    approved_by = 1,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (handover_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Handover not found")

        conn.commit()
        return row

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to approve handover: {str(e)}")


@router.put("/handover/{handover_id}/archive")
def archive_handover(
    handover_id: int,
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE handover_records
                SET
                    status = 'archived',
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (handover_id,),
            )
            row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Handover not found")

        conn.commit()
        return row

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to archive handover: {str(e)}")
