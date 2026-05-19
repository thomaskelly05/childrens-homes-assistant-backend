from __future__ import annotations

import json
import os
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from db.connection import get_db_connection, release_db_connection

SNAPSHOT_CACHE_TTL_SECONDS = int(os.getenv("PROJECTION_SNAPSHOT_CACHE_TTL_SECONDS", "30"))
SNAPSHOT_CACHE_MAX_ENTRIES = int(os.getenv("PROJECTION_SNAPSHOT_CACHE_MAX_ENTRIES", "5000"))

_SNAPSHOT_CACHE: dict[str, tuple[float, dict[str, Any] | None]] = {}
_TABLE_READY = False
_TABLE_INIT_ATTEMPTED = False

CREATE_PROJECTION_SNAPSHOTS_SQL = """
CREATE TABLE IF NOT EXISTS operational_projection_snapshots (
    id BIGSERIAL PRIMARY KEY,
    projection_key TEXT NOT NULL UNIQUE,
    projection_type TEXT NOT NULL,
    domain TEXT NOT NULL,
    home_id INTEGER NULL,
    provider_id INTEGER NULL,
    young_person_id INTEGER NULL,
    staff_id INTEGER NULL,
    source_entity_type TEXT NULL,
    source_entity_id TEXT NULL,
    correlation_id TEXT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    stale BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projection_snapshots_type ON operational_projection_snapshots (projection_type);
CREATE INDEX IF NOT EXISTS idx_projection_snapshots_domain ON operational_projection_snapshots (domain);
CREATE INDEX IF NOT EXISTS idx_projection_snapshots_home ON operational_projection_snapshots (home_id);
CREATE INDEX IF NOT EXISTS idx_projection_snapshots_provider ON operational_projection_snapshots (provider_id);
CREATE INDEX IF NOT EXISTS idx_projection_snapshots_young_person ON operational_projection_snapshots (young_person_id);
CREATE INDEX IF NOT EXISTS idx_projection_snapshots_staff ON operational_projection_snapshots (staff_id);
CREATE INDEX IF NOT EXISTS idx_projection_snapshots_updated_at ON operational_projection_snapshots (updated_at DESC);
"""


@dataclass(frozen=True)
class ProjectionSnapshot:
    projection_key: str
    projection_type: str
    domain: str
    payload: dict[str, Any]
    home_id: int | None = None
    provider_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    source_entity_type: str | None = None
    source_entity_id: str | None = None
    correlation_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    stale: bool = False

    def to_record(self) -> dict[str, Any]:
        return asdict(self) | {"generated_at": datetime.now(timezone.utc).isoformat()}


def projection_snapshot_key(*parts: object) -> str:
    return "::".join(str(part or "") for part in parts)


def _now() -> float:
    return time.time()


def _json(value: dict[str, Any] | None) -> str:
    return json.dumps(value or {}, default=str)


def _prune_cache() -> None:
    while len(_SNAPSHOT_CACHE) > SNAPSHOT_CACHE_MAX_ENTRIES:
        first_key = next(iter(_SNAPSHOT_CACHE), None)
        if first_key is None:
            break
        _SNAPSHOT_CACHE.pop(first_key, None)


def _cache_get(key: str) -> dict[str, Any] | None:
    cached = _SNAPSHOT_CACHE.get(key)
    if not cached:
        return None
    expires_at, payload = cached
    if expires_at <= _now():
        _SNAPSHOT_CACHE.pop(key, None)
        return None
    return payload


def _cache_set(key: str, payload: dict[str, Any] | None) -> None:
    _SNAPSHOT_CACHE[key] = (_now() + SNAPSHOT_CACHE_TTL_SECONDS, payload)
    _prune_cache()


def ensure_projection_snapshot_table() -> None:
    global _TABLE_READY, _TABLE_INIT_ATTEMPTED
    if _TABLE_READY or _TABLE_INIT_ATTEMPTED:
        return
    _TABLE_INIT_ATTEMPTED = True
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(CREATE_PROJECTION_SNAPSHOTS_SQL)
        conn.commit()
        _TABLE_READY = True
    except Exception:
        if conn is not None and not conn.closed:
            conn.rollback()
    finally:
        if conn is not None:
            release_db_connection(conn)


class ProjectionSnapshotService:
    """Stores reusable operational projection snapshots for expensive OS views.

    The service is intentionally best-effort. If the table is unavailable, callers
    can still rebuild projections live and use the in-memory cache only.
    """

    def get(self, projection_key: str) -> dict[str, Any] | None:
        cached = _cache_get(projection_key)
        if cached is not None:
            return cached

        ensure_projection_snapshot_table()
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        projection_key,
                        projection_type,
                        domain,
                        home_id,
                        provider_id,
                        young_person_id,
                        staff_id,
                        source_entity_type,
                        source_entity_id,
                        correlation_id,
                        payload,
                        metadata,
                        version,
                        stale,
                        generated_at,
                        updated_at
                    FROM operational_projection_snapshots
                    WHERE projection_key = %s
                    LIMIT 1
                    """,
                    (projection_key,),
                )
                row = cur.fetchone()
                if not row:
                    _cache_set(projection_key, None)
                    return None
                record = dict(row)
                _cache_set(projection_key, record)
                return record
        except Exception:
            return None
        finally:
            if conn is not None:
                release_db_connection(conn)

    def put(self, snapshot: ProjectionSnapshot) -> dict[str, Any]:
        payload = snapshot.to_record()
        _cache_set(snapshot.projection_key, payload)
        ensure_projection_snapshot_table()
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO operational_projection_snapshots (
                        projection_key,
                        projection_type,
                        domain,
                        home_id,
                        provider_id,
                        young_person_id,
                        staff_id,
                        source_entity_type,
                        source_entity_id,
                        correlation_id,
                        payload,
                        metadata,
                        stale,
                        generated_at,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s, NOW(), NOW()
                    )
                    ON CONFLICT (projection_key)
                    DO UPDATE SET
                        projection_type = EXCLUDED.projection_type,
                        domain = EXCLUDED.domain,
                        home_id = EXCLUDED.home_id,
                        provider_id = EXCLUDED.provider_id,
                        young_person_id = EXCLUDED.young_person_id,
                        staff_id = EXCLUDED.staff_id,
                        source_entity_type = EXCLUDED.source_entity_type,
                        source_entity_id = EXCLUDED.source_entity_id,
                        correlation_id = EXCLUDED.correlation_id,
                        payload = EXCLUDED.payload,
                        metadata = EXCLUDED.metadata,
                        stale = EXCLUDED.stale,
                        version = operational_projection_snapshots.version + 1,
                        generated_at = NOW(),
                        updated_at = NOW()
                    RETURNING projection_key, projection_type, domain, payload, metadata, version, stale, generated_at, updated_at
                    """,
                    (
                        snapshot.projection_key,
                        snapshot.projection_type,
                        snapshot.domain,
                        snapshot.home_id,
                        snapshot.provider_id,
                        snapshot.young_person_id,
                        snapshot.staff_id,
                        snapshot.source_entity_type,
                        snapshot.source_entity_id,
                        snapshot.correlation_id,
                        _json(snapshot.payload),
                        _json(snapshot.metadata),
                        bool(snapshot.stale),
                    ),
                )
                row = cur.fetchone()
            conn.commit()
            record = dict(row) if row else payload
            _cache_set(snapshot.projection_key, record)
            return {"ok": True, "snapshot": record, "stored": True}
        except Exception:
            if conn is not None and not conn.closed:
                conn.rollback()
            return {"ok": True, "snapshot": payload, "stored": False, "cache_only": True}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def mark_stale(self, prefix: str | None = None, *, projection_key: str | None = None) -> dict[str, Any]:
        if projection_key:
            keys = [projection_key]
        elif prefix:
            keys = [key for key in list(_SNAPSHOT_CACHE.keys()) if key.startswith(prefix)]
        else:
            keys = list(_SNAPSHOT_CACHE.keys())

        for key in keys:
            _SNAPSHOT_CACHE.pop(key, None)

        ensure_projection_snapshot_table()
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                if projection_key:
                    cur.execute(
                        "UPDATE operational_projection_snapshots SET stale = TRUE, updated_at = NOW() WHERE projection_key = %s",
                        (projection_key,),
                    )
                elif prefix:
                    cur.execute(
                        "UPDATE operational_projection_snapshots SET stale = TRUE, updated_at = NOW() WHERE projection_key LIKE %s",
                        (f"{prefix}%",),
                    )
                else:
                    cur.execute("UPDATE operational_projection_snapshots SET stale = TRUE, updated_at = NOW()")
                changed = cur.rowcount
            conn.commit()
            return {"ok": True, "stale": changed, "prefix": prefix, "projection_key": projection_key}
        except Exception:
            if conn is not None and not conn.closed:
                conn.rollback()
            return {"ok": False, "stale": 0, "prefix": prefix, "projection_key": projection_key}
        finally:
            if conn is not None:
                release_db_connection(conn)


projection_snapshot_service = ProjectionSnapshotService()
