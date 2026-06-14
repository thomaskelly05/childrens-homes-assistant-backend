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

# Conservative defaults for small Render/Postgres plans; override via env for larger hosts.
DB_POOL_MIN = int(os.getenv("DB_POOL_MIN", "1"))
DB_POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))
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
DB_POOL_INIT_RETRIES = int(
    os.getenv(
        "DB_POOL_INIT_RETRIES",
        os.getenv("DB_INIT_RETRIES", "3"),
    )
)
DB_INIT_RETRIES = DB_POOL_INIT_RETRIES
DB_INIT_RETRY_DELAY_SECONDS = float(os.getenv("DB_INIT_RETRY_DELAY_SECONDS", "2"))
DB_POOL_INIT_FAILURE_COOLDOWN_SECONDS = float(
    os.getenv("DB_POOL_INIT_FAILURE_COOLDOWN_SECONDS", "10")
)


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
_last_pool_init_failure_at: float | None = None
_last_pool_init_failure_category: str | None = None


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
    message = re.sub(
        r'connection to server at "\S+"',
        'connection to server at "<redacted>"',
        message,
        flags=re.IGNORECASE,
    )
    message = re.sub(
        r"host=\S+",
        "host=<redacted>",
        message,
        flags=re.IGNORECASE,
    )
    return message[:500]


def classify_db_init_error(exc: Exception) -> str:
    message = _safe_db_error_message(exc).lower()
    if "timeout" in message or "timed out" in message:
        return "timeout"
    if "password" in message or "authentication" in message or "role" in message:
        return "auth_config"
    if "does not exist" in message or "database_url" in message or "not set" in message:
        return "config"
    if "busy" in message:
        return "pool_busy"
    return "unavailable"


def is_pool_init_in_cooldown() -> bool:
    if _last_pool_init_failure_at is None:
        return False
    elapsed = time.monotonic() - _last_pool_init_failure_at
    return elapsed < DB_POOL_INIT_FAILURE_COOLDOWN_SECONDS


def pool_init_cooldown_remaining_seconds() -> float:
    if _last_pool_init_failure_at is None:
        return 0.0
    remaining = DB_POOL_INIT_FAILURE_COOLDOWN_SECONDS - (time.monotonic() - _last_pool_init_failure_at)
    return max(0.0, remaining)


def database_unavailable_payload(*, retry_after_seconds: int | None = None) -> dict[str, object]:
    retry_after = retry_after_seconds
    if retry_after is None:
        retry_after = max(1, int(pool_init_cooldown_remaining_seconds() or DB_POOL_INIT_FAILURE_COOLDOWN_SECONDS))
    return {
        "ok": False,
        "status": "service_unavailable",
        "reason": "database_unavailable",
        "message": (
            "ORB is temporarily unavailable while we connect to the service. "
            "Please try again shortly."
        ),
        "retry_after_seconds": retry_after,
    }


def _init_retry_delay_seconds(attempt: int) -> float:
    """Exponential backoff for pool init: 0.5s, 1s, 2s (capped), env override as base."""
    base = max(0.1, DB_INIT_RETRY_DELAY_SECONDS)
    if base != 2.0:
        return base
    return min(2.0, 0.5 * (2 ** (attempt - 1)))


def _mark_pool_init_failure(exc: Exception) -> None:
    global _last_pool_init_failure_at, _last_pool_init_failure_category

    _last_pool_init_failure_at = time.monotonic()
    _last_pool_init_failure_category = classify_db_init_error(exc)


def _clear_pool_init_failure() -> None:
    global _last_pool_init_failure_at, _last_pool_init_failure_category

    _last_pool_init_failure_at = None
    _last_pool_init_failure_category = None


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
        "pool_init_in_cooldown": is_pool_init_in_cooldown(),
        "pool_init_cooldown_remaining_seconds": pool_init_cooldown_remaining_seconds(),
        "pool_init_failure_category": _last_pool_init_failure_category,
        "pool_settings": {
            "min": DB_POOL_MIN,
            "max": DB_POOL_MAX,
            "connect_timeout_seconds": DB_CONNECT_TIMEOUT_SECONDS,
            "wait_timeout_seconds": DB_POOL_WAIT_TIMEOUT_SECONDS,
            "init_retries": DB_POOL_INIT_RETRIES,
            "init_failure_cooldown_seconds": DB_POOL_INIT_FAILURE_COOLDOWN_SECONDS,
        },
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

    After a failed init, subsequent calls fail fast until the cooldown expires so
    concurrent requests do not stampede the database.
    """
    global db_pool

    if db_pool is not None:
        return db_pool

    if is_pool_init_in_cooldown():
        return None

    retries = DB_POOL_INIT_RETRIES if max_retries is None else max(1, max_retries)
    last_error: Exception | None = None

    with _pool_init_lock:
        if db_pool is not None:
            return db_pool
        if is_pool_init_in_cooldown():
            return None

        for attempt in range(1, retries + 1):
            try:
                db_pool = _create_db_pool()
                _touch_db_status(error=None)
                _clear_pool_init_failure()
                _log_pool_state(
                    logging.INFO,
                    "Database pool initialised "
                    f"(DB_POOL_MIN={DB_POOL_MIN} DB_POOL_MAX={DB_POOL_MAX} "
                    f"wait_timeout_seconds={DB_POOL_WAIT_TIMEOUT_SECONDS} "
                    f"init_retries={DB_POOL_INIT_RETRIES})",
                )
                return db_pool
            except Exception as exc:
                last_error = exc
                db_pool = None
                _touch_db_status(error=exc)
                if attempt < retries:
                    delay = _init_retry_delay_seconds(attempt)
                    logger.warning(
                        "Database pool init failed (attempt %s/%s, category=%s): %s; retrying in %ss",
                        attempt,
                        retries,
                        classify_db_init_error(exc),
                        _safe_db_error_message(exc),
                        delay,
                    )
                    time.sleep(delay)
                else:
                    _mark_pool_init_failure(exc)
                    logger.error(
                        "Database pool init failed after %s attempt(s) (category=%s): %s; "
                        "cooldown %ss before retry",
                        retries,
                        classify_db_init_error(exc),
                        _safe_db_error_message(exc),
                        DB_POOL_INIT_FAILURE_COOLDOWN_SECONDS,
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
    if is_pool_init_in_cooldown():
        raise DatabaseUnavailableError("Database temporarily unavailable")
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
