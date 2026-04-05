from __future__ import annotations

from functools import lru_cache
from typing import Any

from db.connection import get_db_connection, release_db_connection


@lru_cache(maxsize=1)
def _has_formulations_table() -> bool:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = 'young_person_formulations'
                )
                """
            )
            row = cur.fetchone()
            return bool(row[0]) if row else False
    finally:
        release_db_connection(conn)


class YoungPersonFormulationService:
    def get_current_formulation(self, young_person_id: int) -> dict[str, Any]:
        if _has_formulations_table():
            formulation = self._get_current_formulation_row(young_person_id)
            if formulation is not None:
                return formulation

        return self._build_virtual_formulation(young_person_id)

    def _get_current_formulation_row(self, young_person_id: int) -> dict[str, Any] | None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM young_person_formulations
                    WHERE young_person_id = %s
                      AND is_current = TRUE
                    ORDER BY updated_at DESC NULLS LAST, id DESC
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
                row = cur.fetchone()
                if row is None:
                    return None
                columns = [desc[0] for desc in cur.description]
                return {columns[idx]: row[idx] for idx in range(len(columns))}
        finally:
            release_db_connection(conn)

    def _build_virtual_formulation(self, young_person_id: int) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        yp.id,
                        yp.first_name,
                        yp.last_name,
                        yp.preferred_name,
                        yp.summary_risk_level,
                        cp.neurodiversity_summary,
                        cp.communication_style,
                        cp.sensory_profile,
                        cp.processing_needs,
                        cp.signs_of_distress,
                        cp.what_helps,
                        cp.what_to_avoid,
                        hp.mental_health_summary,
                        ip.strengths_summary,
                        ip.what_matters_to_me
                    FROM young_people yp
                    LEFT JOIN young_person_communication_profile cp
                        ON cp.young_person_id = yp.id
                    LEFT JOIN young_person_health_profile hp
                        ON hp.young_person_id = yp.id
                    LEFT JOIN young_person_identity_profile ip
                        ON ip.young_person_id = yp.id
                    WHERE yp.id = %s
                    LIMIT 1
                    """,
                    (young_person_id,),
                )
                row = cur.fetchone()
                if row is None:
                    raise ValueError("Young person not found.")

                return {
                    "id": None,
                    "young_person_id": row[0],
                    "display_name": " ".join(
                        part for part in [row[2], row[1]] if False
                    ),  # not used, kept harmless
                    "presenting_needs": row[11] or row[5] or "",
                    "developmental_context": row[5] or "",
                    "trauma_context": "",
                    "neurodevelopmental_context": row[5] or "",
                    "relational_context": "",
                    "meaning_of_behaviour": row[11] or "",
                    "known_triggers": row[9] or "",
                    "early_signs_of_distress": row[9] or "",
                    "protective_factors": row[12] or row[13] or "",
                    "what_helps": row[10] or "",
                    "what_adults_should_avoid": row[11] or "",
                    "regulation_strategies": row[10] or "",
                    "child_voice_summary": row[13] or "",
                    "review_date": None,
                    "is_current": True,
                    "is_virtual": True,
                    "summary_risk_level": row[4],
                    "communication_style": row[6],
                    "sensory_profile": row[7],
                    "processing_needs": row[8],
                }
        finally:
            release_db_connection(conn)
