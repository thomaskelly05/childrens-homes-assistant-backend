from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Iterable

from db.connection import get_db_connection, release_db_connection


VALID_EVIDENCE_STRENGTHS = {"strong", "moderate", "light"}
VALID_JUDGEMENT_AREAS = {
    "experiences_and_progress",
    "helped_and_protected",
    "leadership_and_management",
}


def _read_row_value(row, *, key: str, index: int):
    if row is None:
        return None
    if isinstance(row, dict):
        return row.get(key)
    return row[index]


def _normalise_evidence_strength(value: str | None) -> str:
    cleaned = (value or "moderate").strip().lower()
    return cleaned if cleaned in VALID_EVIDENCE_STRENGTHS else "moderate"


def _normalise_judgement_area(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().lower()
    return cleaned if cleaned in VALID_JUDGEMENT_AREAS else None


@lru_cache(maxsize=1)
def _record_standard_link_columns() -> set[str]:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'record_standard_links'
                """
            )
            return {
                _read_row_value(row, key="column_name", index=0)
                for row in (cur.fetchall() or [])
                if _read_row_value(row, key="column_name", index=0)
            }
    finally:
        release_db_connection(conn)


@dataclass(slots=True)
class StandardLinkInput:
    young_person_id: int
    source_table: str
    source_id: int
    standard_code: str
    evidence_strength: str = "moderate"
    rationale: str | None = None
    linked_by: int | None = None
    auto_linked: bool = True
    judgement_area: str | None = None


class StandardsLinkService:
    def _has_judgement_area(self) -> bool:
        return "judgement_area" in _record_standard_link_columns()

    def upsert_link(self, payload: StandardLinkInput) -> int:
        conn = None
        has_judgement_area = self._has_judgement_area()

        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id
                    FROM record_standard_links
                    WHERE young_person_id = %s
                      AND source_table = %s
                      AND source_id = %s
                      AND standard_code = %s
                    LIMIT 1
                    """,
                    (
                        payload.young_person_id,
                        payload.source_table,
                        payload.source_id,
                        payload.standard_code,
                    ),
                )
                existing = cur.fetchone()

                if existing:
                    link_id = int(_read_row_value(existing, key="id", index=0))
                    if has_judgement_area:
                        cur.execute(
                            """
                            UPDATE record_standard_links
                            SET
                                evidence_strength = %s,
                                rationale = %s,
                                linked_by = %s,
                                auto_linked = %s,
                                judgement_area = %s,
                                updated_at = NOW()
                            WHERE id = %s
                            """,
                            (
                                _normalise_evidence_strength(payload.evidence_strength),
                                payload.rationale,
                                payload.linked_by,
                                payload.auto_linked,
                                _normalise_judgement_area(payload.judgement_area),
                                link_id,
                            ),
                        )
                    else:
                        cur.execute(
                            """
                            UPDATE record_standard_links
                            SET
                                evidence_strength = %s,
                                rationale = %s,
                                linked_by = %s,
                                auto_linked = %s,
                                updated_at = NOW()
                            WHERE id = %s
                            """,
                            (
                                _normalise_evidence_strength(payload.evidence_strength),
                                payload.rationale,
                                payload.linked_by,
                                payload.auto_linked,
                                link_id,
                            ),
                        )
                    conn.commit()
                    return link_id

                if has_judgement_area:
                    cur.execute(
                        """
                        INSERT INTO record_standard_links (
                            young_person_id,
                            source_table,
                            source_id,
                            standard_code,
                            evidence_strength,
                            rationale,
                            linked_by,
                            auto_linked,
                            judgement_area,
                            created_at,
                            updated_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        RETURNING id
                        """,
                        (
                            payload.young_person_id,
                            payload.source_table,
                            payload.source_id,
                            payload.standard_code,
                            _normalise_evidence_strength(payload.evidence_strength),
                            payload.rationale,
                            payload.linked_by,
                            payload.auto_linked,
                            _normalise_judgement_area(payload.judgement_area),
                        ),
                    )
                else:
                    cur.execute(
                        """
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
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                        RETURNING id
                        """,
                        (
                            payload.young_person_id,
                            payload.source_table,
                            payload.source_id,
                            payload.standard_code,
                            _normalise_evidence_strength(payload.evidence_strength),
                            payload.rationale,
                            payload.linked_by,
                            payload.auto_linked,
                        ),
                    )

                row = cur.fetchone()
            conn.commit()
            return int(_read_row_value(row, key="id", index=0))
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def replace_links_for_record(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
        links: Iterable[StandardLinkInput],
    ) -> None:
        conn = None
        has_judgement_area = self._has_judgement_area()

        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM record_standard_links
                    WHERE young_person_id = %s
                      AND source_table = %s
                      AND source_id = %s
                    """,
                    (young_person_id, source_table, source_id),
                )

                for link in links:
                    if has_judgement_area:
                        cur.execute(
                            """
                            INSERT INTO record_standard_links (
                                young_person_id,
                                source_table,
                                source_id,
                                standard_code,
                                evidence_strength,
                                rationale,
                                linked_by,
                                auto_linked,
                                judgement_area,
                                created_at,
                                updated_at
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            """,
                            (
                                link.young_person_id,
                                link.source_table,
                                link.source_id,
                                link.standard_code,
                                _normalise_evidence_strength(link.evidence_strength),
                                link.rationale,
                                link.linked_by,
                                link.auto_linked,
                                _normalise_judgement_area(link.judgement_area),
                            ),
                        )
                    else:
                        cur.execute(
                            """
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
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            """,
                            (
                                link.young_person_id,
                                link.source_table,
                                link.source_id,
                                link.standard_code,
                                _normalise_evidence_strength(link.evidence_strength),
                                link.rationale,
                                link.linked_by,
                                link.auto_linked,
                            ),
                        )
            conn.commit()
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def get_links_for_record(
        self,
        *,
        young_person_id: int,
        source_table: str,
        source_id: int,
    ) -> list[dict]:
        conn = None
        has_judgement_area = self._has_judgement_area()

        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                if has_judgement_area:
                    cur.execute(
                        """
                        SELECT
                            id,
                            young_person_id,
                            source_table,
                            source_id,
                            standard_code,
                            evidence_strength,
                            rationale,
                            linked_by,
                            auto_linked,
                            judgement_area,
                            created_at,
                            updated_at
                        FROM record_standard_links
                        WHERE young_person_id = %s
                          AND source_table = %s
                          AND source_id = %s
                        ORDER BY standard_code ASC, id ASC
                        """,
                        (young_person_id, source_table, source_id),
                    )
                    rows = cur.fetchall()
                    return [
                        {
                            "id": _read_row_value(row, key="id", index=0),
                            "young_person_id": _read_row_value(row, key="young_person_id", index=1),
                            "source_table": _read_row_value(row, key="source_table", index=2),
                            "source_id": _read_row_value(row, key="source_id", index=3),
                            "standard_code": _read_row_value(row, key="standard_code", index=4),
                            "evidence_strength": _read_row_value(row, key="evidence_strength", index=5),
                            "rationale": _read_row_value(row, key="rationale", index=6),
                            "linked_by": _read_row_value(row, key="linked_by", index=7),
                            "auto_linked": _read_row_value(row, key="auto_linked", index=8),
                            "judgement_area": _read_row_value(row, key="judgement_area", index=9),
                            "created_at": _read_row_value(row, key="created_at", index=10),
                            "updated_at": _read_row_value(row, key="updated_at", index=11),
                        }
                        for row in rows
                    ]

                cur.execute(
                    """
                    SELECT
                        id,
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
                    FROM record_standard_links
                    WHERE young_person_id = %s
                      AND source_table = %s
                      AND source_id = %s
                    ORDER BY standard_code ASC, id ASC
                    """,
                    (young_person_id, source_table, source_id),
                )
                rows = cur.fetchall()
                return [
                    {
                        "id": _read_row_value(row, key="id", index=0),
                        "young_person_id": _read_row_value(row, key="young_person_id", index=1),
                        "source_table": _read_row_value(row, key="source_table", index=2),
                        "source_id": _read_row_value(row, key="source_id", index=3),
                        "standard_code": _read_row_value(row, key="standard_code", index=4),
                        "evidence_strength": _read_row_value(row, key="evidence_strength", index=5),
                        "rationale": _read_row_value(row, key="rationale", index=6),
                        "linked_by": _read_row_value(row, key="linked_by", index=7),
                        "auto_linked": _read_row_value(row, key="auto_linked", index=8),
                        "judgement_area": None,
                        "created_at": _read_row_value(row, key="created_at", index=9),
                        "updated_at": _read_row_value(row, key="updated_at", index=10),
                    }
                    for row in rows
                ]
        finally:
            release_db_connection(conn)
