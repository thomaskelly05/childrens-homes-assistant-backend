import logging
import os
import threading
from contextlib import contextmanager

from psycopg2 import InterfaceError, OperationalError
from psycopg2.extras import RealDictCursor
from psycopg2.pool import PoolError, ThreadedConnectionPool
from sqlalchemy.orm import declarative_base

logger = logging.getLogger(__name__)

# Backwards compatibility for legacy SQLAlchemy models still imported by
# auxiliary services and scripts.
Base = declarative_base()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set")

DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "8"))
if DB_POOL_MAX < DB_POOL_MIN:
    logger.warning("DB_POOL_MAX=%s is lower than DB_POOL_MIN=%s; raising max to min", DB_POOL_MAX, DB_POOL_MIN)
    DB_POOL_MAX = DB_POOL_MIN

DB_POOL_WAIT_TIMEOUT_SECONDS = float(os.getenv("DB_POOL_WAIT_TIMEOUT_SECONDS", "3"))
DB_STATEMENT_TIMEOUT_MS = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "10000"))
DB_IDLE_TX_TIMEOUT_MS = int(os.getenv("DB_IDLE_TX_TIMEOUT_MS", "10000"))
DB_CONNECT_RETRIES = int(os.getenv("DB_CONNECT_RETRIES", "1"))
DB_POOL_EXHAUSTION_WARN_INTERVAL = int(os.getenv("DB_POOL_EXHAUSTION_WARN_INTERVAL", "10"))

_db_pool_exhaustion_count = 0
_db_pool_waiting_count = 0
_db_pool_waiting_lock = threading.Lock()
_db_pool_slots = threading.BoundedSemaphore(DB_POOL_MAX)

db_pool: ThreadedConnectionPool | None = None


def pool_status() -> dict[str, int | float | None]:
    if db_pool is None:
        return {
            "min": DB_POOL_MIN,
            "max": DB_POOL_MAX,
            "used": 0,
            "available": 0,
            "waiting": _db_pool_waiting_count,
            "wait_timeout_seconds": DB_POOL_WAIT_TIMEOUT_SECONDS,
            "acquisition_failures": _db_pool_exhaustion_count,
        }

    used = len(getattr(db_pool, "_used", {}) or {})
    available = len(getattr(db_pool, "_pool", []) or [])
    return {
        "min": DB_POOL_MIN,
        "max": DB_POOL_MAX,
        "used": used,
        "available": available,
        "waiting": _db_pool_waiting_count,
        "wait_timeout_seconds": DB_POOL_WAIT_TIMEOUT_SECONDS,
        "acquisition_failures": _db_pool_exhaustion_count,
    }


def _log_pool_state(level: int, message: str, *, exc_info: bool = False) -> None:
    logger.log(level, "%s pool=%s", message, pool_status(), exc_info=exc_info)


def _try_acquire_pool_slot() -> bool:
    global _db_pool_waiting_count
    with _db_pool_waiting_lock:
        _db_pool_waiting_count += 1
    try:
        return _db_pool_slots.acquire(timeout=DB_POOL_WAIT_TIMEOUT_SECONDS)
    finally:
        with _db_pool_waiting_lock:
            _db_pool_waiting_count = max(0, _db_pool_waiting_count - 1)


def _release_pool_slot() -> None:
    try:
        _db_pool_slots.release()
    except ValueError:
        logger.warning("DB pool slot release called without matching acquire", exc_info=True)


def init_db_pool():
    global db_pool

    if db_pool is not None:
        return db_pool

    db_pool = ThreadedConnectionPool(
        minconn=DB_POOL_MIN,
        maxconn=DB_POOL_MAX,
        dsn=DATABASE_URL,
        cursor_factory=RealDictCursor,
        sslmode=os.getenv("DB_SSLMODE", "require"),
        connect_timeout=int(os.getenv("DB_CONNECT_TIMEOUT", "10")),
        application_name=os.getenv("DB_APPLICATION_NAME", "indicare-api"),
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )

    _log_pool_state(logging.INFO, "Database pool initialised")
    return db_pool


def close_db_pool():
    global db_pool

    if db_pool is not None:
        db_pool.closeall()
        db_pool = None
        logger.info("Database pool closed")


def _prepare_connection(conn):
    if conn.closed:
        raise OperationalError("Received closed database connection from pool")

    with conn.cursor() as cur:
        cur.execute("SELECT 1")
        cur.execute(f"SET statement_timeout TO {DB_STATEMENT_TIMEOUT_MS}")
        cur.execute(f"SET idle_in_transaction_session_timeout TO {DB_IDLE_TX_TIMEOUT_MS}")


def _discard_connection(conn) -> None:
    global db_pool

    if conn is None or db_pool is None:
        return
    try:
        db_pool.putconn(conn, close=True)
    except Exception:
        logger.warning("Failed to discard unhealthy DB connection", exc_info=True)


def get_db_connection():
    global db_pool, _db_pool_exhaustion_count

    if db_pool is None:
        init_db_pool()

    last_error: Exception | None = None
    attempts = max(1, DB_CONNECT_RETRIES + 1)

    for attempt in range(1, attempts + 1):
        conn = None
        slot_acquired = False
        try:
            slot_acquired = _try_acquire_pool_slot()
            if not slot_acquired:
                _db_pool_exhaustion_count += 1
                last_error = RuntimeError("Database is busy; please retry shortly.")
                if _db_pool_exhaustion_count == 1 or _db_pool_exhaustion_count % DB_POOL_EXHAUSTION_WARN_INTERVAL == 0:
                    _log_pool_state(logging.ERROR, f"Database pool wait timed out on attempt {attempt}/{attempts}")
                if attempt == attempts:
                    break
                continue

            conn = db_pool.getconn()
            _prepare_connection(conn)
            return conn
        except PoolError as exc:
            _db_pool_exhaustion_count += 1
            last_error = exc
            if conn is not None:
                _discard_connection(conn)
                conn = None
            if slot_acquired:
                _release_pool_slot()
                slot_acquired = False
            if _db_pool_exhaustion_count == 1 or _db_pool_exhaustion_count % DB_POOL_EXHAUSTION_WARN_INTERVAL == 0:
                _log_pool_state(logging.ERROR, f"Database connection pool exhausted on attempt {attempt}/{attempts}", exc_info=True)
            if attempt == attempts:
                break
        except (OperationalError, InterfaceError, RuntimeError) as exc:
            last_error = exc
            _log_pool_state(logging.WARNING, f"Database connection validation failed on attempt {attempt}/{attempts}; discarding pooled connection", exc_info=True)
            _discard_connection(conn)
            conn = None
            if slot_acquired:
                _release_pool_slot()
                slot_acquired = False
            if attempt == attempts:
                break
        except Exception as exc:
            last_error = exc
            _discard_connection(conn)
            conn = None
            if slot_acquired:
                _release_pool_slot()
            raise

    raise last_error or RuntimeError("Unable to acquire database connection")


def release_db_connection(conn, *, close: bool = False):
    global db_pool

    try:
        if conn is None or db_pool is None:
            return

        if conn.closed:
            db_pool.putconn(conn, close=True)
            return

        try:
            conn.rollback()
        except Exception:
            close = True

        if close:
            db_pool.putconn(conn, close=True)
        else:
            db_pool.putconn(conn)
    except Exception:
        logger.warning("Failed to release DB connection back to pool", exc_info=True)
    finally:
        if conn is not None:
            _release_pool_slot()


@contextmanager
def db_session(*, commit: bool = True):
    """Acquire and always return a pooled connection for service-layer code."""

    conn = None
    try:
        conn = get_db_connection()
        yield conn
        if commit and conn is not None and not conn.closed:
            conn.commit()
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def get_db():
    conn = None

    try:
        conn = get_db_connection()
        yield conn

        if conn is not None and not conn.closed:
            conn.commit()

    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
        raise

    finally:
        release_db_connection(conn)