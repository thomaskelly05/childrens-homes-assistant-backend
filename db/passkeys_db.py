from __future__ import annotations

from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection


def get_user_by_email(email: str) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, first_name, last_name, role, is_active, archived
                FROM users
                WHERE lower(email) = lower(%s)
                LIMIT 1
                """,
                (email,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        release_db_connection(conn)


def get_user_by_id(user_id: int) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, email, first_name, last_name, role, is_active, archived
                FROM users
                WHERE id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
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
                    public_key,
                    sign_count,
                    transports,
                    device_type,
                    backed_up,
                    aaguid,
                    nickname,
                    last_used_at,
                    created_at
                FROM user_passkeys
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,),
            )
            return [dict(r) for r in cur.fetchall()]
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
                    sign_count,
                    transports,
                    device_type,
                    backed_up,
                    aaguid,
                    nickname,
                    last_used_at,
                    created_at
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


def create_passkey(
    *,
    user_id: int,
    credential_id: str,
    public_key: str,
    sign_count: int,
    transports: str | None,
    device_type: str | None,
    backed_up: bool | None,
    aaguid: str | None,
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
                    sign_count,
                    transports,
                    device_type,
                    backed_up,
                    aaguid,
                    nickname,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    user_id,
                    credential_id,
                    public_key,
                    sign_count,
                    transports,
                    device_type,
                    backed_up,
                    aaguid,
                    nickname,
                ),
            )
        conn.commit()
    finally:
        release_db_connection(conn)


def update_passkey_counter(passkey_id: int, sign_count: int) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_passkeys
                SET sign_count = %s,
                    last_used_at = NOW()
                WHERE id = %s
                """,
                (sign_count, passkey_id),
            )
        conn.commit()
    finally:
        release_db_connection(conn)


def delete_passkey(passkey_id: int, user_id: int) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_passkeys
                WHERE id = %s AND user_id = %s
                """,
                (passkey_id, user_id),
            )
        conn.commit()
    finally:
        release_db_connection(conn)


def create_webauthn_challenge(
    *,
    challenge: str,
    challenge_type: str,
    user_id: int | None = None,
    email: str | None = None,
    expires_in_seconds: int = 300,
) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO webauthn_challenges (
                    user_id,
                    email,
                    challenge,
                    challenge_type,
                    expires_at,
                    created_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    NOW() + (%s || ' seconds')::interval,
                    NOW()
                )
                """,
                (user_id, email, challenge, challenge_type, expires_in_seconds),
            )
        conn.commit()
    finally:
        release_db_connection(conn)


def get_active_webauthn_challenge(
    *,
    challenge: str,
    challenge_type: str,
) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, email, challenge, challenge_type, expires_at, used_at, created_at
                FROM webauthn_challenges
                WHERE challenge = %s
                  AND challenge_type = %s
                  AND used_at IS NULL
                  AND expires_at > NOW()
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (challenge, challenge_type),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        release_db_connection(conn)


def consume_webauthn_challenge(challenge_id: int) -> None:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE webauthn_challenges
                SET used_at = NOW()
                WHERE id = %s
                """,
                (challenge_id,),
            )
        conn.commit()
    finally:
        release_db_connection(conn)
