import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.db.migration_runner import run_pending
from backend.db.schema_doctor import run_schema_doctor
from db.connection import close_db_pool, get_db_connection, init_db_pool, release_db_connection
from db.legal_acceptance_db import init_legal_acceptance_table
from db.mfa_db import init_mfa_tables
from db.partner_assistant_db import init_partner_assistant_tables
from db.passkeys_db import init_passkeys_table
from services.ai_runtime.monthly_usage_report import monthly_usage_report_loop

logger = logging.getLogger("indicare.app")


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


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db_pool()
    run_startup_migrations()
    init_legal_acceptance_table()
    init_mfa_tables()
    init_passkeys_table()
    init_partner_assistant_tables()

    usage_report_task = asyncio.create_task(monthly_usage_report_loop())

    logger.info("IndiCare API started")
    try:
        yield
    finally:
        usage_report_task.cancel()
        close_db_pool()
        logger.info("IndiCare API stopped")