from __future__ import annotations

from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection


def init_passkeys_table() -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS user_passkeys (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    credential_id TEXT NOT NULL UNIQUE,
                    public_key TEXT,
                    credential_public_key TEXT,
                    sign_count BIGINT NOT NULL DEFAULT 0,
                    transports TEXT,
                    aaguid TEXT,
                    nickname TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    last_used_at TIMESTAMPTZ
                )
                """
            )

            cur.execute(
                """
                ALTER TABLE user_passkeys
                ADD COLUMN IF NOT EXISTS public_key TEXT
                """
            )

            cur.execute(
                """
                ALTER TABLE user_passkeys
                ADD COLUMN IF NOT EXISTS credential_public_key TEXT
                """
            )

            cur.execute(
                """
                ALTER TABLE user_passkeys
                ADD COLUMN IF NOT EXISTS sign_count BIGINT NOT NULL DEFAULT 0
                """
            )

            cur.execute(
                """
                ALTER TABLE user_passkeys
                ADD COLUMN IF NOT EXISTS transports TEXT
                """
            )

            cur.execute(
                """
                ALTER TABLE user_passkeys
                ADD COLUMN IF NOT EXISTS aaguid TEXT
                """
            )

            cur.execute(
                """
                ALTER TABLE user_passkeys
                ADD COLUMN IF NOT EXISTS nickname TEXT
                """
            )

            cur.execute(
                """
                ALTER TABLE user_passkeys
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                """
            )

            cur.execute(
                """
                ALTER TABLE user_passkeys
                ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ
                """
            )

            cur.execute(
                """
                UPDATE user_passkeys
                SET credential_public_key = public_key
                WHERE credential_public_key IS NULL
                  AND public_key IS NOT NULL
                """
            )

            cur.execute(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS idx_user_passkeys_credential_id_unique
                ON user_passkeys (credential_id)
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_user_passkeys_user_id
                ON user_passkeys (user_id)
                """
            )

            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_user_passkeys_created_at
                ON user_passkeys (created_at)
                """
            )

        conn.commit()
    finally:
        release_db_connection(conn)


def user_has_passkeys(user_id: int) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM user_passkeys
                WHERE user_id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            return cur.fetchone() is not None
    finally:
        release_db_connection(conn)


def list_user_passkeys(user_id: int) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    credential_id,
                    sign_count,
                    transports,
                    aaguid,
                    nickname,
                    created_at,
                    last_used_at
                FROM user_passkeys
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall() or []
            return [dict(row) for row in rows]
    finally:
        release_db_connection(conn)


def get_passkey_by_credential_id(credential_id: str) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id,
                    user_id,
                    credential_id,
                    public_key,
                    credential_public_key,
                    sign_count,
                    transports,
                    aaguid,
                    nickname,
                    created_at,
                    last_used_at
                FROM user_passkeys
                WHERE credential_id = %s
                LIMIT 1
                """,
                (credential_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        release_db_connection(conn)


def create_user_passkey(
    *,
    user_id: int,
    credential_id: str,
    credential_public_key: str,
    sign_count: int = 0,
    transports: str | None = None,
    aaguid: str | None = None,
    nickname: str | None = None,
) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_passkeys (
                    user_id,
                    credential_id,
                    public_key,
                    credential_public_key,
                    sign_count,
                    transports,
                    aaguid,
                    nickname,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    user_id,
                    credential_id,
                    credential_public_key,
                    credential_public_key,
                    int(sign_count),
                    transports,
                    aaguid,
                    nickname,
                ),
            )
        conn.commit()
    finally:
        release_db_connection(conn)


def update_passkey_sign_count(
    credential_id: str,
    sign_count: int,
) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_passkeys
                SET sign_count = %s,
                    last_used_at = NOW()
                WHERE credential_id = %s
                """,
                (int(sign_count), credential_id),
            )
        conn.commit()
    finally:
        release_db_connection(conn)


def delete_user_passkey(user_id: int, passkey_id: int) -> bool:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_passkeys
                WHERE id = %s
                  AND user_id = %s
                """,
                (passkey_id, user_id),
            )
            deleted = cur.rowcount > 0
        conn.commit()
        return deleted
    finally:
        release_db_connection(conn)
