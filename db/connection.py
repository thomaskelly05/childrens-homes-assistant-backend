import logging
import os
import re
import threading
import time
import traceback
from contextlib import contextmanager
from datetime import datetime, timezone

from psycopg2 import InterfaceError, OperationalError
from psycopg2.extras import RealDictCursor
from psycopg2.pool import PoolError, ThreadedConnectionPool
from sqlalchemy.orm import declarative_base

logger = logging.getLogger(__name__)

# Backwards compatibility for legacy SQLAlchemy models still imported by
# auxiliary services and scripts.
Base = declarative_base()

DATABASE_URL = os.getenv("DATABASE_URL")

# Increased defaults because IndiCare now loads live operational cognition,
# chronology, governance and workforce state concurrently.
DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "5"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "25"))
if DB_POOL_MAX < DB_POOL_MIN:
    logger.warning("DB_POOL_MAX=%s is lower than DB_POOL_MIN=%s; raising max to min", DB_POOL_MAX, DB_POOL_MIN)
    DB_POOL_MAX = DB_POOL_MIN

DB_POOL_WAIT_TIMEOUT_SECONDS = float(os.getenv("DB_POOL_WAIT_TIMEOUT_SECONDS", "2"))
DASHBOARD_DB_WAIT_TIMEOUT_SECONDS = float(os.getenv("DASHBOARD_DB_WAIT_TIMEOUT_SECONDS", "0.1"))
DB_STATEMENT_TIMEOUT_MS = int(os.getenv("DB_STATEMENT_TIMEOUT_MS", "15000"))
DB_IDLE_TX_TIMEOUT_MS = int(os.getenv("DB_IDLE_TX_TIMEOUT_MS", "15000"))
# Total acquisition attempts (1 = single try). DB_CONNECT_RETRIES kept as legacy alias.
DB_POOL_ACQUIRE_RETRIES = int(
    os.getenv(
        "DB_POOL_ACQUIRE_RETRIES",
        os.getenv("DB_CONNECT_RETRIES", "1"),
    )
)
DB_CONNECT_RETRIES = DB_POOL_ACQUIRE_RETRIES
DB_POOL_EXHAUSTION_WARN_INTERVAL = int(os.getenv("DB_POOL_EXHAUSTION_WARN_INTERVAL", "10"))
DB_POOL_DEBUG_HOLD_SECONDS = float(os.getenv("DB_POOL_DEBUG_HOLD_SECONDS", "0") or "0")

DB_CONNECT_TIMEOUT_SECONDS = int(
    os.getenv(
        "DB_CONNECT_TIMEOUT_SECONDS",
        os.getenv("DB_CONNECT_TIMEOUT", "5"),
    )
)
DB_INIT_RETRIES = int(os.getenv("DB_INIT_RETRIES", "3"))
DB_INIT_RETRY_DELAY_SECONDS = float(os.getenv("DB_INIT_RETRY_DELAY_SECONDS", "2"))


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


DB_REQUIRED_ON_STARTUP = _env_bool("DB_REQUIRED_ON_STARTUP", default=False)

_db_pool_exhaustion_count = 0
_db_pool_waiting_count = 0
_db_pool_waiting_lock = threading.Lock()
_db_pool_slots = threading.BoundedSemaphore(DB_POOL_MAX)
_pool_init_lock = threading.Lock()

db_pool: ThreadedConnectionPool | None = None
_last_db_error: str | None = None
_last_checked_at: str | None = None


class DatabaseUnavailableError(Exception):
    """Raised when the database pool is unavailable; map to HTTP 503 in FastAPI."""


def _require_database_url() -> str:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")
    return DATABASE_URL


def _safe_db_error_message(exc: Exception) -> str:
    message = str(exc) or exc.__class__.__name__
    dsn = DATABASE_URL or ""
    if dsn and dsn in message:
        message = message.replace(dsn, "<redacted>")
    message = re.sub(r"postgresql://\S+", "<redacted-dsn>", message, flags=re.IGNORECASE)
    message = re.sub(r"password=\S+", "password=<redacted>", message, flags=re.IGNORECASE)
    return message[:500]


def _touch_db_status(*, error: Exception | None = None) -> None:
    global _last_db_error, _last_checked_at

    _last_checked_at = datetime.now(timezone.utc).isoformat()
    if error is None:
        _last_db_error = None
    else:
        _last_db_error = _safe_db_error_message(error)


def is_db_available() -> bool:
    return db_pool is not None


def is_pool_under_pressure() -> bool:
    """True when all pool connections are in use (dashboard/badge load may block auth)."""
    if db_pool is None:
        return False
    pool = pool_status()
    max_conn = int(pool.get("max") or 0)
    used = int(pool.get("used") or 0)
    return max_conn > 0 and used >= max_conn


def get_db_status() -> dict[str, str | bool | int | float | None]:
    pool = pool_status()
    return {
        "available": is_db_available(),
        "pool_initialised": db_pool is not None,
        "last_error": _last_db_error,
        "last_checked_at": _last_checked_at,
        "pool": pool,
        "pool_pressure": bool(pool.get("used", 0) >= pool.get("max", 0) and pool.get("max", 0) > 0),
    }


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
    available = len(getattr(db_pool, "_pool", []) or {})
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


def _connection_acquire_caller() -> str:
    for frame in reversed(traceback.extract_stack(limit=12)[:-2]):
        if "db/connection.py" not in (frame.filename or ""):
            return f"{frame.filename}:{frame.lineno}:{frame.name}"
    return "unknown"


def _note_connection_acquired(conn) -> None:
    if DB_POOL_DEBUG_HOLD_SECONDS <= 0 or conn is None:
        return
    conn._indicare_acquired_at = time.perf_counter()  # type: ignore[attr-defined]
    conn._indicare_acquire_caller = _connection_acquire_caller()  # type: ignore[attr-defined]


def _log_connection_hold_if_slow(conn) -> None:
    if DB_POOL_DEBUG_HOLD_SECONDS <= 0 or conn is None:
        return
    acquired_at = getattr(conn, "_indicare_acquired_at", None)
    if acquired_at is None:
        return
    hold_seconds = time.perf_counter() - acquired_at
    if hold_seconds < DB_POOL_DEBUG_HOLD_SECONDS:
        return
    logger.warning(
        "DB connection held for %.0fms caller=%s",
        hold_seconds * 1000,
        getattr(conn, "_indicare_acquire_caller", "unknown"),
    )


def _try_acquire_pool_slot(*, timeout_seconds: float | None = None) -> bool:
    global _db_pool_waiting_count
    wait_timeout = DB_POOL_WAIT_TIMEOUT_SECONDS if timeout_seconds is None else max(0.0, float(timeout_seconds))
    with _db_pool_waiting_lock:
        _db_pool_waiting_count += 1
    try:
        return _db_pool_slots.acquire(timeout=wait_timeout)
    finally:
        with _db_pool_waiting_lock:
            _db_pool_waiting_count = max(0, _db_pool_waiting_count - 1)


@contextmanager
def acquire_optional_dashboard_connection(*, timeout: float | None = None):
    """Fast-fail optional connection for dashboard/menu endpoints; yields None when pool is busy."""
    wait = DASHBOARD_DB_WAIT_TIMEOUT_SECONDS if timeout is None else timeout
    conn = None
    slot_acquired = False
    try:
        if is_pool_under_pressure():
            logger.info("pool_pressure_fast_path optional_dashboard_acquire=skipped")
            yield None
            return
        slot_acquired = _try_acquire_pool_slot(timeout_seconds=wait)
        if not slot_acquired or db_pool is None:
            yield None
            return
        conn = db_pool.getconn()
        _prepare_connection(conn)
        _note_connection_acquired(conn)
        yield conn
    except (PoolError, OperationalError, InterfaceError, DatabaseUnavailableError):
        if conn is not None:
            _discard_connection(conn)
            conn = None
        if slot_acquired:
            _release_pool_slot()
            slot_acquired = False
        yield None
    except Exception:
        if conn is not None:
            _discard_connection(conn)
            conn = None
        if slot_acquired:
            _release_pool_slot()
            slot_acquired = False
        yield None
    finally:
        release_db_connection(conn)


def _release_pool_slot() -> None:
    try:
        _db_pool_slots.release()
    except ValueError:
        logger.warning("DB pool slot release called without matching acquire", exc_info=True)


def _create_db_pool() -> ThreadedConnectionPool:
    return ThreadedConnectionPool(
        minconn=DB_POOL_MIN,
        maxconn=DB_POOL_MAX,
        dsn=_require_database_url(),
        cursor_factory=RealDictCursor,
        sslmode=os.getenv("DB_SSLMODE", "require"),
        connect_timeout=DB_CONNECT_TIMEOUT_SECONDS,
        application_name=os.getenv("DB_APPLICATION_NAME", "indicare-api"),
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )


def init_db_pool(*, max_retries: int | None = None) -> ThreadedConnectionPool | None:
    """Initialise the threaded connection pool with bounded retries.

    Returns the pool on success, None when init fails and DB_REQUIRED_ON_STARTUP is false.
    Raises the underlying error when DB_REQUIRED_ON_STARTUP is true.
    """
    global db_pool

    if db_pool is not None:
        return db_pool

    retries = DB_INIT_RETRIES if max_retries is None else max(1, max_retries)
    last_error: Exception | None = None

    with _pool_init_lock:
        if db_pool is not None:
            return db_pool

        for attempt in range(1, retries + 1):
            try:
                db_pool = _create_db_pool()
                _touch_db_status(error=None)
                _log_pool_state(
                    logging.INFO,
                    "Database pool initialised "
                    f"(DB_POOL_MIN={DB_POOL_MIN} DB_POOL_MAX={DB_POOL_MAX} "
                    f"wait_timeout_seconds={DB_POOL_WAIT_TIMEOUT_SECONDS})",
                )
                return db_pool
            except Exception as exc:
                last_error = exc
                db_pool = None
                _touch_db_status(error=exc)
                if attempt < retries:
                    logger.warning(
                        "Database pool init failed (attempt %s/%s): %s; retrying in %ss",
                        attempt,
                        retries,
                        _safe_db_error_message(exc),
                        DB_INIT_RETRY_DELAY_SECONDS,
                    )
                    time.sleep(DB_INIT_RETRY_DELAY_SECONDS)
                else:
                    logger.error(
                        "Database pool init failed after %s attempt(s): %s",
                        retries,
                        _safe_db_error_message(exc),
                    )

        if last_error is not None and DB_REQUIRED_ON_STARTUP:
            raise last_error
        return None


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


def _ensure_db_pool(*, lazy: bool = False) -> None:
    if db_pool is not None:
        return
    init_db_pool(max_retries=1 if lazy else None)
    if db_pool is None:
        raise DatabaseUnavailableError("Database temporarily unavailable")


def get_db_connection():
    global db_pool, _db_pool_exhaustion_count

    _ensure_db_pool(lazy=True)

    last_error: Exception | None = None
    attempts = max(1, DB_POOL_ACQUIRE_RETRIES)

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
            _note_connection_acquired(conn)
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
            _touch_db_status(error=exc)
            _log_pool_state(logging.WARNING, f"Database connection validation failed on attempt {attempt}/{attempts}; discarding pooled connection", exc_info=True)
            _discard_connection(conn)
            conn = None
            if slot_acquired:
                _release_pool_slot()
                slot_acquired = False
            if attempt == attempts:
                break
        except DatabaseUnavailableError:
            raise
        except Exception as exc:
            last_error = exc
            _discard_connection(conn)
            conn = None
            if slot_acquired:
                _release_pool_slot()
            raise

    if isinstance(last_error, (OperationalError, InterfaceError, PoolError)):
        raise DatabaseUnavailableError("Database temporarily unavailable") from last_error
    if isinstance(last_error, RuntimeError) and "busy" in str(last_error).lower():
        raise DatabaseUnavailableError("Database temporarily unavailable") from last_error
    raise DatabaseUnavailableError("Database temporarily unavailable") from (last_error or RuntimeError("Unable to acquire database connection"))


def release_db_connection(conn, *, close: bool = False):
    global db_pool

    try:
        _log_connection_hold_if_slow(conn)
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
def db_connection(*, commit: bool = False):
    """Acquire and always release a pooled connection."""
    conn = None
    try:
        conn = get_db_connection()
        yield conn
        if commit and conn is not None and not conn.closed:
            conn.commit()
    except Exception:
        if conn is not None and not conn.closed:
            try:
                conn.rollback()
            except Exception:
                pass
        raise
    finally:
        release_db_connection(conn)


@contextmanager
def db_cursor(*, commit: bool = False):
    """Acquire a connection, yield a cursor, then release."""
    with db_connection(commit=commit) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            yield cur


@contextmanager
def db_session(*, commit: bool = True):
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


def _safe_db_finalize(conn, *, commit: bool) -> None:
    if conn is None or conn.closed:
        return
    try:
        if commit:
            conn.commit()
        else:
            conn.rollback()
    except (OperationalError, InterfaceError):
        logger.warning(
            "DB %s skipped: connection closed during request lifecycle",
            "commit" if commit else "rollback",
        )


def get_db():
    conn = None

    try:
        conn = get_db_connection()
        yield conn
        _safe_db_finalize(conn, commit=True)

    except DatabaseUnavailableError:
        raise
    except Exception:
        _safe_db_finalize(conn, commit=False)
        raise

    finally:
        release_db_connection(conn)
