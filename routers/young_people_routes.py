from fastapi import APIRouter, Depends, HTTPException

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People"])


# =========================================================
# Helpers
# =========================================================

def full_name(first_name, last_name):
    return " ".join([x for x in [first_name, last_name] if x]).strip() or None


def try_fetchone(cur, query: str, params=()):
    try:
        cur.execute(query, params)
        return cur.fetchone()
    except Exception:
        return None


def try_fetchall(cur, query: str, params=()):
    try:
        cur.execute(query, params)
        return cur.fetchall() or []
    except Exception:
        return []


def get_latest_plan_summary(cur, young_person_id: int):
    """
    Pull a current working plan summary to help the Overview screen feel live.
    """
    row = try_fetchone(
        cur,
        """
        SELECT
            summary,
            proactive_strategies,
            presenting_need,
            review_date,
            status,
            approval_status
        FROM support_plans
        WHERE young_person_id = %s
          AND COALESCE(archived, FALSE) = FALSE
          AND LOWER(COALESCE(status, 'draft')) NOT IN ('archived', 'completed')
        ORDER BY
            CASE
                WHEN LOWER(COALESCE(approval_status, '')) = 'returned' THEN 1
                WHEN LOWER(COALESCE(approval_status, '')) = 'submitted' THEN 2
                WHEN LOWER(COALESCE(status, '')) = 'active' THEN 3
                WHEN LOWER(COALESCE(status, '')) = 'draft' THEN 4
                ELSE 5
            END,
            review_date ASC NULLS LAST,
            updated_at DESC NULLS LAST,
            id DESC
        LIMIT 1
        """,
        (young_person_id,),
    )
    return row or {}


def get_latest_risk_summary(cur, young_person_id: int):
    """
    Tries a few likely table shapes without breaking if your schema differs.
    """
    candidates = [
        """
        SELECT
            summary AS summary_risk,
            de_escalation_guidance,
            risk_level,
            review_date
        FROM young_person_risk_assessments
        WHERE young_person_id = %s
        ORDER BY review_date DESC NULLS LAST, id DESC
        LIMIT 1
        """,
        """
        SELECT
            summary AS summary_risk,
            de_escalation_guidance,
            risk_level,
            review_date
        FROM risk_assessments
        WHERE young_person_id = %s
        ORDER BY review_date DESC NULLS LAST, id DESC
        LIMIT 1
        """,
        """
        SELECT
            risk_summary AS summary_risk,
            de_escalation_guidance,
            risk_level,
            review_date
        FROM young_people_risk
        WHERE young_person_id = %s
        ORDER BY review_date DESC NULLS LAST, id DESC
        LIMIT 1
        """,
    ]

    for query in candidates:
        row = try_fetchone(cur, query, (young_person_id,))
        if row:
            return row

    return {}


def get_health_alerts_text(health_row: dict | None):
    if not health_row:
        return None

    parts = []

    allergies = health_row.get("allergies")
    diagnoses = health_row.get("diagnoses")

    if allergies:
        parts.append(f"Allergies: {allergies}")
    if diagnoses:
        parts.append(f"Diagnoses: {diagnoses}")

    return " | ".join(parts) if parts else None


def get_family_contact_summary(cur, young_person_id: int):
    candidates = [
        """
        SELECT
            summary,
            contact_type,
            contact_frequency
        FROM young_person_family_time
        WHERE young_person_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        """
        SELECT
            summary,
            contact_type,
            contact_frequency
        FROM young_person_family_contact
        WHERE young_person_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
        """
        SELECT
            notes AS summary,
            contact_type,
            frequency AS contact_frequency
        FROM family_contact_arrangements
        WHERE young_person_id = %s
        ORDER BY id DESC
        LIMIT 1
        """,
    ]

    for query in candidates:
        row = try_fetchone(cur, query, (young_person_id,))
        if row:
            summary = row.get("summary")
            contact_type = row.get("contact_type")
            contact_frequency = row.get("contact_frequency")

            parts = [x for x in [summary, contact_type, contact_frequency] if x]
            return " · ".join(parts) if parts else None

    return None


def get_home_name(cur, home_id):
    if not home_id:
        return None

    candidates = [
        "SELECT name FROM homes WHERE id = %s LIMIT 1",
        "SELECT home_name AS name FROM homes WHERE id = %s LIMIT 1",
    ]

    for query in candidates:
        row = try_fetchone(cur, query, (home_id,))
        if row and row.get("name"):
            return row.get("name")

    return None


def enrich_list_row(cur, row: dict) -> dict:
    plan = get_latest_plan_summary(cur, row["id"])
    risk = get_latest_risk_summary(cur, row["id"])

    primary_keyworker_name = full_name(
        row.get("primary_keyworker_first_name"),
        row.get("primary_keyworker_last_name"),
    )

    home_name = get_home_name(cur, row.get("home_id"))

    summary_risk = (
        risk.get("summary_risk")
        or plan.get("presenting_need")
        or row.get("summary_risk_level")
    )

    de_escalation_guidance = (
        risk.get("de_escalation_guidance")
        or plan.get("proactive_strategies")
    )

    next_review_due = (
        risk.get("review_date")
        or plan.get("review_date")
    )

    enriched = dict(row)
    enriched.update({
        "primary_keyworker_name": primary_keyworker_name,
        "home_name": home_name,
        "summary_risk": summary_risk,
        "staff_guidance": plan.get("proactive_strategies"),
        "de_escalation_guidance": de_escalation_guidance,
        "next_review_due": next_review_due,
    })
    return enriched


# =========================================================
# List routes
# =========================================================

@router.get("")
def list_young_people(conn=Depends(get_db)):
    query = """
        SELECT
            yp.id,
            yp.home_id,
            yp.first_name,
            yp.last_name,
            yp.preferred_name,
            yp.date_of_birth,
            yp.gender,
            yp.ethnicity,
            yp.nhs_number,
            yp.local_id_number,
            yp.admission_date,
            yp.discharge_date,
            yp.placement_status,
            yp.primary_keyworker_id,
            yp.summary_risk_level,
            yp.photo_url,
            yp.archived,
            yp.created_at,
            yp.updated_at,
            u.first_name AS primary_keyworker_first_name,
            u.last_name AS primary_keyworker_last_name
        FROM young_people yp
        LEFT JOIN users u
            ON yp.primary_keyworker_id = u.id
        WHERE COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.first_name ASC, yp.last_name ASC, yp.id ASC
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall() or []
            enriched = [enrich_list_row(cur, row) for row in rows]
        return {"items": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load young people: {str(e)}")


@router.get("/list")
def list_young_people_alias(conn=Depends(get_db)):
    query = """
        SELECT
            yp.id,
            yp.home_id,
            yp.first_name,
            yp.last_name,
            yp.preferred_name,
            yp.date_of_birth,
            yp.gender,
            yp.ethnicity,
            yp.nhs_number,
            yp.local_id_number,
            yp.admission_date,
            yp.discharge_date,
            yp.placement_status,
            yp.primary_keyworker_id,
            yp.summary_risk_level,
            yp.photo_url,
            yp.archived,
            yp.created_at,
            yp.updated_at,
            u.first_name AS primary_keyworker_first_name,
            u.last_name AS primary_keyworker_last_name
        FROM young_people yp
        LEFT JOIN users u
            ON yp.primary_keyworker_id = u.id
        WHERE COALESCE(yp.archived, FALSE) = FALSE
        ORDER BY yp.first_name ASC, yp.last_name ASC, yp.id ASC
    """

    try:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall() or []
            enriched = [enrich_list_row(cur, row) for row in rows]
        return {"items": enriched}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load young people list: {str(e)}")


# =========================================================
# Overview route
# =========================================================

@router.get("/{young_person_id}")
def get_young_person_overview(young_person_id: int, conn=Depends(get_db)):
    try:
        with conn.cursor() as cur:
            # Base profile
            cur.execute(
                """
                SELECT
                    yp.id,
                    yp.home_id,
                    yp.first_name,
                    yp.last_name,
                    yp.preferred_name,
                    yp.date_of_birth,
                    yp.gender,
                    yp.ethnicity,
                    yp.nhs_number,
                    yp.local_id_number,
                    yp.admission_date,
                    yp.discharge_date,
                    yp.placement_status,
                    yp.primary_keyworker_id,
                    yp.summary_risk_level,
                    yp.photo_url,
                    yp.archived,
                    yp.created_at,
                    yp.updated_at,
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

            # Legal status
            legal = try_fetchone(
                cur,
                """
                SELECT
                    legal_status,
                    order_type,
                    order_details
                FROM young_person_legal_status
                WHERE young_person_id = %s
                ORDER BY is_current DESC, effective_from DESC NULLS LAST, id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )

            # Education profile
            education = try_fetchone(
                cur,
                """
                SELECT
                    school_name,
                    year_group,
                    education_status
                FROM young_person_education_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )

            # Health profile
            health = try_fetchone(
                cur,
                """
                SELECT
                    gp_name,
                    allergies,
                    diagnoses
                FROM young_person_health_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )

            # Communication profile
            communication = try_fetchone(
                cur,
                """
                SELECT
                    communication_style,
                    sensory_profile
                FROM young_person_communication_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )

            # Identity profile
            identity = try_fetchone(
                cur,
                """
                SELECT
                    interests,
                    strengths_summary,
                    what_matters_to_me
                FROM young_person_identity_profile
                WHERE young_person_id = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (young_person_id,),
            )

            # Current plan / risk / family / home
            plan = get_latest_plan_summary(cur, young_person_id)
            risk = get_latest_risk_summary(cur, young_person_id)
            family_contact_summary = get_family_contact_summary(cur, young_person_id)
            home_name = get_home_name(cur, young_person.get("home_id"))

        overview = dict(young_person)

        primary_keyworker_name = full_name(
            overview.get("primary_keyworker_first_name"),
            overview.get("primary_keyworker_last_name"),
        )

        overview.update({
            "primary_keyworker_name": primary_keyworker_name,
            "home_name": home_name,
        })

        if legal:
            overview.update({
                "legal_status": legal.get("legal_status"),
                "order_type": legal.get("order_type"),
                "order_details": legal.get("order_details"),
            })

        if education:
            overview.update({
                "school_name": education.get("school_name"),
                "year_group": education.get("year_group"),
                "education_status": education.get("education_status"),
            })

        if health:
            overview.update({
                "gp_name": health.get("gp_name"),
                "allergies": health.get("allergies"),
                "diagnoses": health.get("diagnoses"),
            })

        if communication:
            overview.update({
                "communication_style": communication.get("communication_style"),
                "sensory_profile": communication.get("sensory_profile"),
            })

        if identity:
            overview.update({
                "interests": identity.get("interests"),
                "strengths_summary": identity.get("strengths_summary"),
                "what_matters_to_me": identity.get("what_matters_to_me"),
            })

        # Children’s home OS overlay fields
        overview.update({
            "summary_risk": (
                risk.get("summary_risk")
                or plan.get("presenting_need")
                or overview.get("summary_risk_level")
            ),
            "staff_guidance": plan.get("proactive_strategies"),
            "de_escalation_guidance": (
                risk.get("de_escalation_guidance")
                or plan.get("proactive_strategies")
            ),
            "next_review_due": (
                risk.get("review_date")
                or plan.get("review_date")
            ),
            "health_alerts": get_health_alerts_text(health),
            "family_contact_summary": family_contact_summary,
        })

        return overview

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load young person overview: {str(e)}")
