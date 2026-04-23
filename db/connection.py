import logging
import os

from psycopg2.pool import ThreadedConnectionPool
from psycopg2.extras import RealDictCursor
from sqlalchemy.orm import declarative_base

logger = logging.getLogger(__name__)

# Backwards compatibility for legacy SQLAlchemy models still imported by
# auxiliary services and scripts.
Base = declarative_base()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "2"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "20"))
DB_STATEMENT_TIMEOUT_MS = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "15000"))
DB_IDLE_TX_TIMEOUT_MS = int(os.getenv("DB_IDLE_TX_TIMEOUT_MS", "15000"))

db_pool: ThreadedConnectionPool | None = None


def init_db_pool():
    global db_pool

    if db_pool is not None:
        return db_pool

    db_pool = ThreadedConnectionPool(
        minconn=DB_POOL_MIN,
        maxconn=DB_POOL_MAX,
        dsn=DATABASE_URL,
        cursor_factory=RealDictCursor,
        sslmode="require",
        connect_timeout=10,
        application_name="indicare-api",
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )

    logger.info("Database pool initialised (min=%s, max=%s)", DB_POOL_MIN, DB_POOL_MAX)
    return db_pool


def close_db_pool():
    global db_pool

    if db_pool is not None:
        db_pool.closeall()
        db_pool = None
        logger.info("Database pool closed")


def _prepare_connection(conn):
    if conn.closed:
        raise RuntimeError("Received closed database connection from pool")

    with conn.cursor() as cur:
        cur.execute("SELECT 1")
        cur.execute(f"SET statement_timeout TO {DB_STATEMENT_TIMEOUT_MS}")
        cur.execute(f"SET idle_in_transaction_session_timeout TO {DB_IDLE_TX_TIMEOUT_MS}")


def get_db_connection():
    global db_pool

    if db_pool is None:
        init_db_pool()

    conn = db_pool.getconn()
    _prepare_connection(conn)
    return conn


def release_db_connection(conn, *, close: bool = False):
    global db_pool

    if conn is None:
        return

    try:
        if conn.closed:
            return

        if close:
            db_pool.putconn(conn, close=True)
        else:
            db_pool.putconn(conn)
    except Exception:
        logger.warning("Failed to release DB connection back to pool", exc_info=True)


def get_db():
    conn = None

    try:
        conn = get_db_connection()
        yield conn

        if not conn.closed:
            conn.commit()

    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        raise

    finally:
        release_db_connection(conn)
