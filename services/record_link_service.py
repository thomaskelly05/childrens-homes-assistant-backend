from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from db.connection import get_db_connection, release_db_connection


VALID_RELATIONSHIP_TYPES = {
    "related_to",
    "supports",
    "evidences",
    "informs",
    "updates",
    "reviews",
    "follows_from",
    "triggered_by",
    "mitigated_by",
    "references",
}


def _read_row_value(row, *, key: str, index: int):
    if row is None:
        return None
    if isinstance(row, dict):
        return row.get(key)
    return row[index]


def _normalise_relationship_type(value: str) -> str:
    cleaned = (value or "").strip().lower()
    if cleaned not in VALID_RELATIONSHIP_TYPES:
        raise ValueError(f"Invalid relationship_type: {value}")
    return cleaned


@dataclass(slots=True)
class RecordLinkInput:
    young_person_id: int
    from_table: str
    from_id: int
    to_table: str
    to_id: int
    relationship_type: str
    created_by: int | None = None


class RecordLinkService:
    def create_link(self, payload: RecordLinkInput) -> int:
        relationship_type = _normalise_relationship_type(payload.relationship_type)

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id
                    FROM record_links
                    WHERE young_person_id = %s
                      AND from_table = %s
                      AND from_id = %s
                      AND to_table = %s
                      AND to_id = %s
                      AND relationship_type = %s
                    LIMIT 1
                    """,
                    (
                        payload.young_person_id,
                        payload.from_table,
                        payload.from_id,
                        payload.to_table,
                        payload.to_id,
                        relationship_type,
                    ),
                )
                existing = cur.fetchone()
                if existing:
                    return int(_read_row_value(existing, key="id", index=0))

                cur.execute(
                    """
                    INSERT INTO record_links (
                        young_person_id,
                        from_table,
                        from_id,
                        to_table,
                        to_id,
                        relationship_type,
                        created_by,
                        created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    RETURNING id
                    """,
                    (
                        payload.young_person_id,
                        payload.from_table,
                        payload.from_id,
                        payload.to_table,
                        payload.to_id,
                        relationship_type,
                        payload.created_by,
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

    def delete_link(
        self,
        *,
        young_person_id: int,
        from_table: str,
        from_id: int,
        to_table: str,
        to_id: int,
        relationship_type: str,
    ) -> None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM record_links
                    WHERE young_person_id = %s
                      AND from_table = %s
                      AND from_id = %s
                      AND to_table = %s
                      AND to_id = %s
                      AND relationship_type = %s
                    """,
                    (
                        young_person_id,
                        from_table,
                        from_id,
                        to_table,
                        to_id,
                        _normalise_relationship_type(relationship_type),
                    ),
                )
            conn.commit()
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def replace_links_for_source(
        self,
        *,
        young_person_id: int,
        from_table: str,
        from_id: int,
        relationship_type: str,
        targets: Iterable[tuple[str, int]],
        created_by: int | None = None,
    ) -> None:
        normalised_type = _normalise_relationship_type(relationship_type)
        deduped_targets = {(table, int(record_id)) for table, record_id in targets}

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM record_links
                    WHERE young_person_id = %s
                      AND from_table = %s
                      AND from_id = %s
                      AND relationship_type = %s
                    """,
                    (
                        young_person_id,
                        from_table,
                        from_id,
                        normalised_type,
                    ),
                )

                for to_table, to_id in deduped_targets:
                    cur.execute(
                        """
                        INSERT INTO record_links (
                            young_person_id,
                            from_table,
                            from_id,
                            to_table,
                            to_id,
                            relationship_type,
                            created_by,
                            created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                        """,
                        (
                            young_person_id,
                            from_table,
                            from_id,
                            to_table,
                            to_id,
                            normalised_type,
                            created_by,
                        ),
                    )
            conn.commit()
        except Exception:
            if conn:
                conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def get_links_for_source(
        self,
        *,
        young_person_id: int,
        from_table: str,
        from_id: int,
    ) -> list[dict]:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        id,
                        young_person_id,
                        from_table,
                        from_id,
                        to_table,
                        to_id,
                        relationship_type,
                        created_by,
                        created_at
                    FROM record_links
                    WHERE young_person_id = %s
                      AND from_table = %s
                      AND from_id = %s
                    ORDER BY created_at DESC, id DESC
                    """,
                    (young_person_id, from_table, from_id),
                )
                rows = cur.fetchall()

            return [
                {
                    "id": _read_row_value(row, key="id", index=0),
                    "young_person_id": _read_row_value(row, key="young_person_id", index=1),
                    "from_table": _read_row_value(row, key="from_table", index=2),
                    "from_id": _read_row_value(row, key="from_id", index=3),
                    "to_table": _read_row_value(row, key="to_table", index=4),
                    "to_id": _read_row_value(row, key="to_id", index=5),
                    "relationship_type": _read_row_value(row, key="relationship_type", index=6),
                    "created_by": _read_row_value(row, key="created_by", index=7),
                    "created_at": _read_row_value(row, key="created_at", index=8),
                }
                for row in rows
            ]
        finally:
            release_db_connection(conn)
