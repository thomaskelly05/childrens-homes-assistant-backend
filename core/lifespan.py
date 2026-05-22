import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.db.migration_runner import run_pending
from backend.db.schema_doctor import run_schema_doctor
from db.connection import (
    DB_REQUIRED_ON_STARTUP,
    close_db_pool,
    get_db_connection,
    init_db_pool,
    is_db_available,
    release_db_connection,
)
from db.legal_acceptance_db import init_legal_acceptance_table
from db.mfa_db import init_mfa_tables
from db.partner_assistant_db import init_partner_assistant_tables
from db.passkeys_db import init_passkeys_table
from services.ai_runtime.monthly_usage_report import monthly_usage_report_loop

logger = logging.getLogger("indicare.app")


def _safe_startup_error(exc: Exception) -> str:
    message = str(exc) or exc.__class__.__name__
    database_url = os.getenv("DATABASE_URL", "")
    if database_url and database_url in message:
        message = message.replace(database_url, "<redacted>")
    return message[:500]


def run_startup_migrations() -> None:
    conn = None
    try:
        conn = get_db_connection()

        try:
            repair_summary = run_schema_doctor(conn)
            conn.commit()
            logger.info(
                "Schema doctor completed tables=%s columns=%s",
                repair_summary.get("tables_checked"),
                repair_summary.get("columns_ensured"),
            )
        except Exception:
            conn.rollback()
            logger.exception("Schema doctor failed during startup")
            raise

        applied = run_pending(conn)
        conn.commit()
        logger.info("Migration check complete (%s applied)", sum(1 for item in applied if item.applied))
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        logger.exception("Database migration check failed during startup")
        raise
    finally:
        if conn is not None:
            release_db_connection(conn)


def _run_database_startup_tasks() -> None:
    run_startup_migrations()
    init_legal_acceptance_table()
    init_mfa_tables()
    init_passkeys_table()
    init_partner_assistant_tables()


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        init_db_pool()
    except Exception as exc:
        if DB_REQUIRED_ON_STARTUP:
            raise
        logger.warning(
            "Database unavailable during startup; app starting in degraded mode: %s",
            _safe_startup_error(exc),
        )

    if is_db_available():
        try:
            _run_database_startup_tasks()
        except Exception:
            if DB_REQUIRED_ON_STARTUP:
                raise
            logger.exception("Database startup tasks failed; continuing in degraded mode")
    else:
        logger.warning("Database unavailable; skipping migrations and auth table initialisation during startup")

    usage_report_task = asyncio.create_task(monthly_usage_report_loop())

    logger.info("IndiCare API started")
    try:
        yield
    finally:
        usage_report_task.cancel()
        close_db_pool()
        logger.info("IndiCare API stopped")
