from __future__ import annotations

import hashlib
import logging
import secrets
from typing import Any

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger(__name__)


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode("utf-8")).hexdigest()


def generate_api_key() -> str:
    return "indicare_live_" + secrets.token_urlsafe(32)


def init_partner_assistant_tables() -> None:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS partner_assistant_api_keys (
                    id BIGSERIAL PRIMARY KEY,
                    organisation_id TEXT NOT NULL,
                    organisation_name TEXT,
                    api_key_hash TEXT NOT NULL UNIQUE,
                    status TEXT NOT NULL DEFAULT 'active',
                    allowed_origin TEXT,
                    rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    revoked_at TIMESTAMPTZ
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_partner_assistant_api_keys_org
                ON partner_assistant_api_keys (organisation_id)
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS partner_assistant_audit_logs (
                    id BIGSERIAL PRIMARY KEY,
                    audit_id TEXT NOT NULL UNIQUE,
                    organisation_id TEXT,
                    api_key_id BIGINT,
                    host_system TEXT,
                    mode TEXT,
                    user_role TEXT,
                    request_message_preview TEXT,
                    safeguarding_level TEXT,
                    follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
                    status TEXT NOT NULL,
                    error TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_partner_assistant_audit_logs_org_created
                ON partner_assistant_audit_logs (organisation_id, created_at DESC)
                """
            )
        conn.commit()
        logger.info("partner assistant tables ready")
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Failed to initialise partner assistant tables")
        raise
    finally:
        release_db_connection(conn)


def validate_partner_api_key(api_key: str) -> dict[str, Any] | None:
    key = (api_key or "").strip()
    if not key:
        return None

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    organisation_id,
                    organisation_name,
                    status,
                    allowed_origin,
                    rate_limit_per_minute
                FROM partner_assistant_api_keys
                WHERE api_key_hash = %s
                LIMIT 1
                """,
                (hash_api_key(key),),
            )
            row = cur.fetchone()
        conn.commit()
        if not row:
            return None
        if str(row.get("status") or "").lower() != "active":
            return None
        return dict(row)
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Failed to validate partner assistant API key")
        raise
    finally:
        release_db_connection(conn)


def create_partner_api_key(
    *,
    organisation_id: str,
    organisation_name: str | None = None,
    allowed_origin: str | None = None,
    rate_limit_per_minute: int = 60,
) -> dict[str, Any]:
    api_key = generate_api_key()
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO partner_assistant_api_keys (
                    organisation_id,
                    organisation_name,
                    api_key_hash,
                    allowed_origin,
                    rate_limit_per_minute
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, organisation_id, organisation_name, allowed_origin, rate_limit_per_minute, created_at
                """,
                (
                    organisation_id,
                    organisation_name,
                    hash_api_key(api_key),
                    allowed_origin,
                    rate_limit_per_minute,
                ),
            )
            row = cur.fetchone()
        conn.commit()
        result = dict(row)
        result["api_key"] = api_key
        return result
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Failed to create partner assistant API key")
        raise
    finally:
        release_db_connection(conn)


def record_partner_assistant_audit(
    *,
    audit_id: str,
    organisation_id: str | None,
    api_key_id: int | None,
    host_system: str | None,
    mode: str | None,
    user_role: str | None,
    request_message_preview: str | None,
    safeguarding_level: str | None,
    follow_up_required: bool,
    status: str,
    error: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO partner_assistant_audit_logs (
                    audit_id,
                    organisation_id,
                    api_key_id,
                    host_system,
                    mode,
                    user_role,
                    request_message_preview,
                    safeguarding_level,
                    follow_up_required,
                    status,
                    error,
                    ip_address,
                    user_agent
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (audit_id) DO NOTHING
                """,
                (
                    audit_id,
                    organisation_id,
                    api_key_id,
                    host_system,
                    mode,
                    user_role,
                    request_message_preview,
                    safeguarding_level,
                    follow_up_required,
                    status,
                    error,
                    ip_address,
                    user_agent,
                ),
            )
        conn.commit()
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Failed to record partner assistant audit log")
    finally:
        release_db_connection(conn)
