from __future__ import annotations

import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

from psycopg2.extras import Json

logger = logging.getLogger("indicare.orb.session_store")


def _now_ts() -> float:
    return time.time()


def _ttl_seconds(default: int = 7200) -> int:
    try:
        return max(300, int(os.getenv("ORB_SESSION_TTL_SECONDS", str(default))))
    except (TypeError, ValueError):
        return default


def _json(value: Any) -> str:
    return json.dumps(value, default=str, separators=(",", ":"))


def _loads(value: str | bytes | None) -> dict[str, Any] | None:
    if not value:
        return None
    try:
        return json.loads(value.decode("utf-8") if isinstance(value, bytes) else value)
    except Exception:
        return None


def _parse_expiry(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


class OrbSessionStore:
    """Redis-first shared store for Orb session and realtime state.

    Postgres is used when Redis is unavailable. A process-local emergency store
    remains as a last resort so local tests and single-process development do
    not fail closed when neither service is running.
    """

    def __init__(self) -> None:
        self._redis_client: Any | None = None
        self._redis_attempted = False
        self._postgres_ready = False
        self._postgres_failed_at = 0.0
        self._memory_sessions: dict[str, dict[str, Any]] = {}
        self._memory_realtime: dict[str, dict[str, Any]] = {}
        self._memory_sockets: dict[str, dict[str, Any]] = {}
        self._memory_user_index: dict[str, set[str]] = {}

    def health(self) -> dict[str, Any]:
        backend = self._backend()
        return {
            "backend": backend,
            "redis_configured": bool(os.getenv("REDIS_URL") or os.getenv("ORB_REDIS_URL")),
            "postgres_fallback_ready": self._postgres_ready,
            "emergency_memory_sessions": len(self._memory_sessions),
            "ttl_seconds": _ttl_seconds(),
        }

    def reset_for_tests(self) -> None:
        self._memory_sessions.clear()
        self._memory_realtime.clear()
        self._memory_sockets.clear()
        self._memory_user_index.clear()

    def save_session(
        self,
        *,
        session_id: str,
        user_id: int | str | None,
        home_id: int | str | None,
        payload: dict[str, Any],
        ttl_seconds: int | None = None,
        expires_at: str | None = None,
    ) -> None:
        ttl = ttl_seconds or _ttl_seconds()
        record = {
            "session_id": session_id,
            "user_id": str(user_id) if user_id is not None else None,
            "home_id": int(home_id) if str(home_id or "").isdigit() else home_id,
            "payload": payload,
            "expires_at": expires_at or payload.get("expires_at"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._write("save_session", record, ttl)

    def load_session(self, session_id: str) -> dict[str, Any] | None:
        return self._read_session(session_id)

    def delete_session(self, session_id: str) -> None:
        self._delete_session(session_id)
        self.delete_realtime_state(session_id)
        self.cleanup_socket_bindings(session_id=session_id)

    def cleanup_user_sessions(self, user_id: int | str | None) -> list[str]:
        if user_id is None:
            return []
        session_ids = self.user_session_ids(user_id)
        for session_id in session_ids:
            self.delete_session(session_id)
        return session_ids

    def user_session_ids(self, user_id: int | str | None) -> list[str]:
        if user_id is None:
            return []
        key = str(user_id)
        backend = self._backend()
        if backend == "redis":
            try:
                return sorted(str(item) for item in self._redis().smembers(f"orb:user:{key}:sessions"))
            except Exception:
                logger.warning("Redis user session index read failed", exc_info=True)
        if backend == "postgres":
            try:
                return self._pg_user_session_ids(key)
            except Exception:
                logger.warning("Postgres user session index read failed", exc_info=True)
        return sorted(self._memory_user_index.get(key, set()))

    def save_realtime_state(
        self,
        *,
        session_id: str,
        state: dict[str, Any],
        ttl_seconds: int | None = None,
    ) -> None:
        ttl = ttl_seconds or _ttl_seconds()
        self._write_realtime(session_id, state, ttl)

    def load_realtime_state(self, session_id: str) -> dict[str, Any] | None:
        backend = self._backend()
        if backend == "redis":
            try:
                return _loads(self._redis().get(f"orb:realtime:{session_id}"))
            except Exception:
                logger.warning("Redis realtime read failed", exc_info=True)
        if backend == "postgres":
            try:
                return self._pg_load_realtime(session_id)
            except Exception:
                logger.warning("Postgres realtime read failed", exc_info=True)
        return self._memory_realtime.get(session_id)

    def delete_realtime_state(self, session_id: str) -> None:
        backend = self._backend()
        if backend == "redis":
            try:
                self._redis().delete(f"orb:realtime:{session_id}")
            except Exception:
                logger.warning("Redis realtime delete failed", exc_info=True)
        if backend == "postgres":
            try:
                self._pg_update_realtime(session_id, {})
            except Exception:
                logger.warning("Postgres realtime delete failed", exc_info=True)
        self._memory_realtime.pop(session_id, None)

    def bind_socket(
        self,
        *,
        session_id: str,
        socket_id: str,
        user_id: int | str | None,
        home_id: int | str | None,
        worker_id: str,
        ttl_seconds: int | None = None,
    ) -> dict[str, Any]:
        ttl = ttl_seconds or int(os.getenv("ORB_WEBSOCKET_BINDING_TTL_SECONDS", "120"))
        binding = {
            "session_id": session_id,
            "socket_id": socket_id,
            "user_id": str(user_id) if user_id is not None else None,
            "home_id": home_id,
            "worker_id": worker_id,
            "bound_at": datetime.now(timezone.utc).isoformat(),
            "last_seen_at": datetime.now(timezone.utc).isoformat(),
        }
        backend = self._backend()
        if backend == "redis":
            try:
                redis = self._redis()
                redis.hset(f"orb:sockets:{session_id}", socket_id, _json(binding))
                redis.expire(f"orb:sockets:{session_id}", ttl)
            except Exception:
                logger.warning("Redis socket bind failed", exc_info=True)
        elif backend == "postgres":
            try:
                self._pg_bind_socket(session_id, socket_id, binding)
            except Exception:
                logger.warning("Postgres socket bind failed", exc_info=True)
        self._memory_sockets[f"{session_id}:{socket_id}"] = binding
        return binding

    def socket_bindings(self, session_id: str) -> list[dict[str, Any]]:
        backend = self._backend()
        bindings: list[dict[str, Any]] = []
        if backend == "redis":
            try:
                values = self._redis().hvals(f"orb:sockets:{session_id}")
                bindings = [loaded for value in values if (loaded := _loads(value))]
            except Exception:
                logger.warning("Redis socket bindings read failed", exc_info=True)
        elif backend == "postgres":
            try:
                bindings = self._pg_socket_bindings(session_id)
            except Exception:
                logger.warning("Postgres socket bindings read failed", exc_info=True)
        if not bindings:
            bindings = [
                binding
                for key, binding in self._memory_sockets.items()
                if key.startswith(f"{session_id}:")
            ]
        return bindings

    def cleanup_socket_bindings(self, *, session_id: str, except_socket_id: str | None = None) -> list[str]:
        removed: list[str] = []
        for binding in self.socket_bindings(session_id):
            socket_id = str(binding.get("socket_id") or "")
            if not socket_id or socket_id == except_socket_id:
                continue
            self.unbind_socket(session_id=session_id, socket_id=socket_id)
            removed.append(socket_id)
        return removed

    def unbind_socket(self, *, session_id: str, socket_id: str) -> None:
        backend = self._backend()
        if backend == "redis":
            try:
                self._redis().hdel(f"orb:sockets:{session_id}", socket_id)
            except Exception:
                logger.warning("Redis socket unbind failed", exc_info=True)
        elif backend == "postgres":
            try:
                self._pg_unbind_socket(session_id, socket_id)
            except Exception:
                logger.warning("Postgres socket unbind failed", exc_info=True)
        self._memory_sockets.pop(f"{session_id}:{socket_id}", None)

    def _backend(self) -> str:
        forced = (os.getenv("ORB_SESSION_STORE_BACKEND") or "").strip().lower()
        if forced in {"memory", "redis", "postgres"}:
            if forced == "redis" and self._redis_available():
                return "redis"
            if forced == "postgres" and self._postgres_available():
                return "postgres"
            if forced == "memory":
                return "memory"
        if self._redis_available():
            return "redis"
        if self._postgres_available():
            return "postgres"
        return "memory"

    def _redis_available(self) -> bool:
        if self._redis_client is not None:
            return True
        if self._redis_attempted:
            return False
        self._redis_attempted = True
        redis_url = os.getenv("ORB_REDIS_URL") or os.getenv("REDIS_URL")
        if not redis_url:
            return False
        try:
            import redis

            client = redis.Redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=1, socket_timeout=1)
            client.ping()
            self._redis_client = client
            return True
        except Exception:
            logger.warning("Redis unavailable for Orb session store; falling back", exc_info=True)
            self._redis_client = None
            return False

    def _redis(self) -> Any:
        if self._redis_client is None:
            raise RuntimeError("Redis client unavailable")
        return self._redis_client

    def _postgres_available(self) -> bool:
        if self._postgres_ready:
            return True
        if _now_ts() - self._postgres_failed_at < 30:
            return False
        try:
            self._pg_ensure_table()
            self._postgres_ready = True
            return True
        except Exception:
            self._postgres_failed_at = _now_ts()
            logger.warning("Postgres unavailable for Orb session store; using emergency memory store", exc_info=True)
            return False

    def _write(self, operation: str, record: dict[str, Any], ttl: int) -> None:
        session_id = str(record["session_id"])
        user_id = record.get("user_id")
        backend = self._backend()
        if backend == "redis":
            try:
                redis = self._redis()
                redis.setex(f"orb:session:{session_id}", ttl, _json(record))
                if user_id:
                    redis.sadd(f"orb:user:{user_id}:sessions", session_id)
                    redis.expire(f"orb:user:{user_id}:sessions", ttl)
                self._memory_save(record)
                return
            except Exception:
                logger.warning("Redis %s failed; falling back", operation, exc_info=True)
        if backend == "postgres":
            try:
                self._pg_save_session(record)
                self._memory_save(record)
                return
            except Exception:
                logger.warning("Postgres %s failed; falling back", operation, exc_info=True)
        self._memory_save(record)

    def _read_session(self, session_id: str) -> dict[str, Any] | None:
        backend = self._backend()
        if backend == "redis":
            try:
                record = _loads(self._redis().get(f"orb:session:{session_id}"))
                if record and not self._expired(record):
                    return record.get("payload")
            except Exception:
                logger.warning("Redis session read failed", exc_info=True)
        if backend == "postgres":
            try:
                record = self._pg_load_session(session_id)
                if record and not self._expired(record):
                    return record.get("payload")
            except Exception:
                logger.warning("Postgres session read failed", exc_info=True)
        record = self._memory_sessions.get(session_id)
        return record.get("payload") if record and not self._expired(record) else None

    def _delete_session(self, session_id: str) -> None:
        backend = self._backend()
        if backend == "redis":
            try:
                self._redis().delete(f"orb:session:{session_id}", f"orb:realtime:{session_id}", f"orb:sockets:{session_id}")
            except Exception:
                logger.warning("Redis session delete failed", exc_info=True)
        if backend == "postgres":
            try:
                self._pg_delete_session(session_id)
            except Exception:
                logger.warning("Postgres session delete failed", exc_info=True)
        record = self._memory_sessions.pop(session_id, None)
        if record and record.get("user_id"):
            self._memory_user_index.get(str(record["user_id"]), set()).discard(session_id)

    def _write_realtime(self, session_id: str, state: dict[str, Any], ttl: int) -> None:
        backend = self._backend()
        if backend == "redis":
            try:
                self._redis().setex(f"orb:realtime:{session_id}", ttl, _json(state))
            except Exception:
                logger.warning("Redis realtime write failed", exc_info=True)
        elif backend == "postgres":
            try:
                self._pg_update_realtime(session_id, state)
            except Exception:
                logger.warning("Postgres realtime write failed", exc_info=True)
        self._memory_realtime[session_id] = state

    def _memory_save(self, record: dict[str, Any]) -> None:
        session_id = str(record["session_id"])
        self._memory_sessions[session_id] = record
        user_id = record.get("user_id")
        if user_id:
            self._memory_user_index.setdefault(str(user_id), set()).add(session_id)

    def _expired(self, record: dict[str, Any]) -> bool:
        expires_at = _parse_expiry(record.get("expires_at"))
        return bool(expires_at and datetime.now(timezone.utc) >= expires_at)

    def _db(self) -> tuple[Any, Any]:
        from db.connection import get_db_connection, release_db_connection

        return get_db_connection(), release_db_connection

    def _pg_ensure_table(self) -> None:
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS orb_realtime_sessions (
                        session_id TEXT PRIMARY KEY,
                        user_id TEXT,
                        home_id TEXT,
                        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
                        realtime_state JSONB NOT NULL DEFAULT '{}'::jsonb,
                        websocket_bindings JSONB NOT NULL DEFAULT '{}'::jsonb,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                        expires_at TIMESTAMPTZ
                    )
                    """
                )
                cur.execute("CREATE INDEX IF NOT EXISTS idx_orb_realtime_sessions_user ON orb_realtime_sessions(user_id)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_orb_realtime_sessions_home ON orb_realtime_sessions(home_id)")
            conn.commit()
        finally:
            release(conn)

    def _pg_save_session(self, record: dict[str, Any]) -> None:
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO orb_realtime_sessions (session_id, user_id, home_id, payload, updated_at, expires_at)
                    VALUES (%s, %s, %s, %s, now(), %s)
                    ON CONFLICT (session_id) DO UPDATE SET
                        user_id = EXCLUDED.user_id,
                        home_id = EXCLUDED.home_id,
                        payload = EXCLUDED.payload,
                        updated_at = now(),
                        expires_at = EXCLUDED.expires_at
                    """,
                    (
                        record["session_id"],
                        record.get("user_id"),
                        str(record.get("home_id")) if record.get("home_id") is not None else None,
                        Json(record.get("payload") or {}),
                        record.get("expires_at"),
                    ),
                )
            conn.commit()
        finally:
            release(conn)

    def _pg_load_session(self, session_id: str) -> dict[str, Any] | None:
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT session_id, user_id, home_id, payload, expires_at FROM orb_realtime_sessions WHERE session_id = %s AND (expires_at IS NULL OR expires_at > now())",
                    (session_id,),
                )
                row = cur.fetchone()
            return dict(row) if row else None
        finally:
            release(conn)

    def _pg_delete_session(self, session_id: str) -> None:
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM orb_realtime_sessions WHERE session_id = %s", (session_id,))
            conn.commit()
        finally:
            release(conn)

    def _pg_user_session_ids(self, user_id: str) -> list[str]:
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT session_id FROM orb_realtime_sessions WHERE user_id = %s AND (expires_at IS NULL OR expires_at > now())",
                    (user_id,),
                )
                return [str(row["session_id"]) for row in cur.fetchall()]
        finally:
            release(conn)

    def _pg_update_realtime(self, session_id: str, state: dict[str, Any]) -> None:
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE orb_realtime_sessions SET realtime_state = %s, updated_at = now() WHERE session_id = %s",
                    (Json(state), session_id),
                )
            conn.commit()
        finally:
            release(conn)

    def _pg_load_realtime(self, session_id: str) -> dict[str, Any] | None:
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT realtime_state FROM orb_realtime_sessions WHERE session_id = %s AND (expires_at IS NULL OR expires_at > now())",
                    (session_id,),
                )
                row = cur.fetchone()
            return dict(row["realtime_state"]) if row and row.get("realtime_state") else None
        finally:
            release(conn)

    def _pg_bind_socket(self, session_id: str, socket_id: str, binding: dict[str, Any]) -> None:
        bindings = {item.get("socket_id"): item for item in self._pg_socket_bindings(session_id)}
        bindings[socket_id] = binding
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE orb_realtime_sessions SET websocket_bindings = %s, updated_at = now() WHERE session_id = %s",
                    (Json(bindings), session_id),
                )
            conn.commit()
        finally:
            release(conn)

    def _pg_socket_bindings(self, session_id: str) -> list[dict[str, Any]]:
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT websocket_bindings FROM orb_realtime_sessions WHERE session_id = %s", (session_id,))
                row = cur.fetchone()
            bindings = row.get("websocket_bindings") if row else {}
            if isinstance(bindings, dict):
                return [dict(value) for value in bindings.values() if isinstance(value, dict)]
            return []
        finally:
            release(conn)

    def _pg_unbind_socket(self, session_id: str, socket_id: str) -> None:
        bindings = {item.get("socket_id"): item for item in self._pg_socket_bindings(session_id)}
        bindings.pop(socket_id, None)
        conn, release = self._db()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE orb_realtime_sessions SET websocket_bindings = %s, updated_at = now() WHERE session_id = %s",
                    (Json(bindings), session_id),
                )
            conn.commit()
        finally:
            release(conn)


orb_session_store = OrbSessionStore()
