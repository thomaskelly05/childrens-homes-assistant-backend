from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from db.connection import get_db

router = APIRouter(prefix="/ofsted-ai", tags=["OFSTED AI Report"])


def safe_text(value):
    if value is None:
        return ""
    return str(value).strip()


def yes_no(value):
    return "Yes" if value else "No"


def format_dt(value):
    if not value:
        return "—"
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")
    return str(value)


def build_bullets(rows, formatter, empty_text="No evidence recorded."):
    if not rows:
        return [empty_text]
    return [formatter(row) for row in rows]


def top_n(rows, n=5):
    return rows[:n] if rows else []


@router.get("/young-person/{young_person_id}/report")
def generate_ofsted_ai_report(
    young_person_id: int,
    review_month: str | None = Query(default=None, description="Optional month in YYYY-MM-01 format"),
    conn=Depends(get_db),
):
    try:
        with conn.cursor() as cur:
            # Young person
            cur.execute(
                """
                SELECT
                    yp.*,
                    u.first_name AS primary_keyworker_first_name,
                    u.last_name AS primary_keyworker_last_name
                FROM young_people yp
                LEFT JOIN users u
                    ON yp.primary_keyworker_id = u.id
                WHERE yp.id = %s
                LIMIT 1
                """,
                (young_person_id,),
            )
            young_person = cur.fetchone()

            if not young_person:
                raise HTTPException(status_code=404, detail="Young person not found")

            # Latest monthly review
            if review_month:
                cur.execute(
                    """
                    SELECT *
                    FROM monthly_reviews
                    WHERE young_person_id = %s
                      AND review_month = %s
                    LIMIT 1
                    """,
                    (young_person_id, review_month),
                )
            else:
                cur.execute(
                    """
                    SELECT *
                    FROM monthly_reviews
                    WHERE young_person_id = %s
                    ORDER BY review_month DESC, id DESC
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
            monthly_review = cur.fetchone()

            # Standards summary
            cur.execute(
                """
                SELECT
                    qs.code,
                    qs.title,
                    qs.short_label,
                    COUNT(rsl.id) AS evidence_count
                FROM quality_standards qs
                LEFT JOIN record_standard_links rsl
                    ON rsl.standard_code = qs.code
                   AND rsl.young_person_id = %s
                GROUP BY qs.code, qs.title, qs.short_label, qs.display_order
                ORDER BY qs.display_order ASC
                """,
                (young_person_id,),
            )
            standards = cur.fetchall()

            # Plans
            cur.execute(
                """
                SELECT *
                FROM support_plans
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY review_date ASC NULLS LAST, created_at DESC
                """,
                (young_person_id,),
            )
            plans = cur.fetchall()

            # Risks
            cur.execute(
                """
                SELECT *
                FROM risk_assessments
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                ORDER BY
                    CASE
                        WHEN LOWER(COALESCE(severity, '')) = 'high' THEN 1
                        WHEN LOWER(COALESCE(severity, '')) = 'medium' THEN 2
                        ELSE 3
                    END,
                    review_date ASC NULLS LAST,
                    created_at DESC
                """,
                (young_person_id,),
            )
            risks = cur.fetchall()

            # Incidents
            cur.execute(
                """
                SELECT *
                FROM incidents
                WHERE young_person_id = %s
                ORDER BY COALESCE(incident_datetime, created_at) DESC, id DESC
                LIMIT 10
                """,
                (young_person_id,),
            )
            incidents = cur.fetchall()

            # Daily notes
            cur.execute(
                """
                SELECT *
                FROM daily_notes
                WHERE young_person_id = %s
                ORDER BY note_date DESC, created_at DESC
                LIMIT 10
                """,
                (young_person_id,),
            )
            daily_notes = cur.fetchall()

            # Education
            cur.execute(
                """
                SELECT *
                FROM education_records
                WHERE young_person_id = %s
                ORDER BY record_date DESC, created_at DESC
                LIMIT 10
                """,
                (young_person_id,),
            )
            education = cur.fetchall()

            # Health
            cur.execute(
                """
                SELECT *
                FROM health_records
                WHERE young_person_id = %s
                ORDER BY COALESCE(event_datetime, created_at) DESC
                LIMIT 10
                """,
                (young_person_id,),
            )
            health = cur.fetchall()

            # Family
            cur.execute(
                """
                SELECT *
                FROM family_contact_records
                WHERE young_person_id = %s
                ORDER BY COALESCE(contact_datetime, created_at) DESC
                LIMIT 10
                """,
                (young_person_id,),
            )
            family = cur.fetchall()

            # Keywork
            cur.execute(
                """
                SELECT *
                FROM keywork_sessions
                WHERE young_person_id = %s
                ORDER BY session_date DESC, created_at DESC
                LIMIT 10
                """,
                (young_person_id,),
            )
            keywork = cur.fetchall()

            # Compliance
            cur.execute(
                """
                SELECT COUNT(*) AS overdue_plans
                FROM support_plans
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                  AND review_date IS NOT NULL
                  AND review_date < CURRENT_DATE
                """,
                (young_person_id,),
            )
            overdue_plans = cur.fetchone()["overdue_plans"]

            cur.execute(
                """
                SELECT COUNT(*) AS overdue_risks
                FROM risk_assessments
                WHERE young_person_id = %s
                  AND COALESCE(archived, FALSE) = FALSE
                  AND review_date IS NOT NULL
                  AND review_date < CURRENT_DATE
                """,
                (young_person_id,),
            )
            overdue_risks = cur.fetchone()["overdue_risks"]

            cur.execute(
                """
                SELECT COUNT(*) AS overdue_keywork
                FROM keywork_sessions
                WHERE young_person_id = %s
                  AND next_session_date IS NOT NULL
                  AND next_session_date < CURRENT_DATE
                """,
                (young_person_id,),
            )
            overdue_keywork = cur.fetchone()["overdue_keywork"]

        name = f"{safe_text(young_person.get('first_name'))} {safe_text(young_person.get('last_name'))}".strip()

        overview_section = {
            "name": name,
            "preferred_name": safe_text(young_person.get("preferred_name")) or "—",
            "dob": format_dt(young_person.get("date_of_birth")),
            "placement_status": safe_text(young_person.get("placement_status")) or "—",
            "risk_level": safe_text(young_person.get("summary_risk_level")) or "—",
            "primary_keyworker": (
                f"{safe_text(young_person.get('primary_keyworker_first_name'))} "
                f"{safe_text(young_person.get('primary_keyworker_last_name'))}"
            ).strip() or "—",
        }

        monthly_review_section = {
            "review_title": safe_text(monthly_review.get("review_title")) if monthly_review else "No monthly review recorded",
            "review_month": format_dt(monthly_review.get("review_month")) if monthly_review else "—",
            "summary_of_month": safe_text(monthly_review.get("summary_of_month")) if monthly_review else "",
            "progress_summary": safe_text(monthly_review.get("progress_summary")) if monthly_review else "",
            "child_voice_summary": safe_text(monthly_review.get("child_voice_summary")) if monthly_review else "",
            "concerns_and_risks": safe_text(monthly_review.get("concerns_and_risks")) if monthly_review else "",
            "manager_analysis": safe_text(monthly_review.get("manager_analysis")) if monthly_review else "",
        }

        narrative = {
            "care_planning_summary": (
                f"{name} has {len(plans)} active support plan(s), "
                f"{len(risks)} active risk assessment(s), "
                f"and {overdue_plans} overdue plan review(s)."
            ),
            "safeguarding_summary": (
                f"There are {len(incidents)} recent incident record(s) reviewed for this report. "
                f"High-priority safeguarding evidence should be checked against the linked incident and risk records."
            ),
            "education_summary": (
                f"There are {len(education)} recent education record(s) available. "
                f"The report should consider attendance, engagement, achievements and barriers."
            ),
            "health_summary": (
                f"There are {len(health)} recent health record(s) available. "
                f"Follow-up actions and well-being needs should be checked against the health timeline."
            ),
            "relationships_summary": (
                f"There are {len(family)} recent family contact record(s) and {len(keywork)} recent key work session(s). "
                f"These should be used to evidence relationships, child voice and emotional support."
            ),
            "compliance_summary": (
                f"Overdue items: plans {overdue_plans}, risks {overdue_risks}, key work follow-up {overdue_keywork}."
            ),
        }

        evidence = {
            "recent_daily_notes": build_bullets(
                top_n(daily_notes, 5),
                lambda row: f"{format_dt(row.get('note_date'))} - {safe_text(row.get('presentation')) or safe_text(row.get('positives')) or 'Daily note recorded.'}"
            ),
            "recent_incidents": build_bullets(
                top_n(incidents, 5),
                lambda row: f"{format_dt(row.get('incident_datetime') or row.get('created_at'))} - {safe_text(row.get('incident_type'))}: {safe_text(row.get('description')) or 'Incident recorded.'}"
            ),
            "recent_education": build_bullets(
                top_n(education, 5),
                lambda row: f"{format_dt(row.get('record_date'))} - {safe_text(row.get('attendance_status'))}: {safe_text(row.get('achievement_note')) or safe_text(row.get('learning_engagement')) or 'Education update recorded.'}"
            ),
            "recent_health": build_bullets(
                top_n(health, 5),
                lambda row: f"{format_dt(row.get('event_datetime') or row.get('created_at'))} - {safe_text(row.get('title'))}: {safe_text(row.get('summary')) or 'Health update recorded.'}"
            ),
            "recent_family": build_bullets(
                top_n(family, 5),
                lambda row: f"{format_dt(row.get('contact_datetime') or row.get('created_at'))} - {safe_text(row.get('contact_person'))}: {safe_text(row.get('child_voice')) or safe_text(row.get('concerns')) or 'Family contact recorded.'}"
            ),
            "recent_keywork": build_bullets(
                top_n(keywork, 5),
                lambda row: f"{format_dt(row.get('session_date'))} - {safe_text(row.get('topic'))}: {safe_text(row.get('summary')) or safe_text(row.get('child_voice')) or 'Key work recorded.'}"
            ),
        }

        standards_section = [
            {
                "code": row["code"],
                "title": row["title"],
                "short_label": row["short_label"],
                "evidence_count": row["evidence_count"],
                "inspection_comment": (
                    "Strong evidence base." if int(row["evidence_count"]) >= 5
                    else "Some evidence available." if int(row["evidence_count"]) >= 1
                    else "Evidence gap - needs strengthening."
                )
            }
            for row in standards
        ]

        report = {
            "generated_at": datetime.utcnow().isoformat(),
            "report_type": "OFSTED inspection evidence preparation Young Person Report",
            "young_person_id": young_person_id,
            "overview": overview_section,
            "monthly_review": monthly_review_section,
            "narrative": narrative,
            "standards": standards_section,
            "evidence": evidence,
            "compliance": {
                "overdue_plans": overdue_plans,
                "overdue_risks": overdue_risks,
                "overdue_keywork": overdue_keywork,
            },
            "recommendations": [
                "Check all overdue review dates and update them before inspection.",
                "Ensure the latest monthly review is completed and manager analysis is present.",
                "Rebuild chronology and standards evidence before generating the final inspection pack.",
                "Review linked child voice evidence across daily notes, key work and family contact.",
                "Confirm safeguarding, risk and incident follow-up actions are clearly recorded.",
            ],
        }

        return report

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate OFSTED AI report: {str(e)}")
