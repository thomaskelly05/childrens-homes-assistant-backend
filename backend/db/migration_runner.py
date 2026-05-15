from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger("indicare.db.migrations")

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"
TRACKING_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"""


@dataclass(frozen=True)
class MigrationResult:
    version: str
    name: str
    applied: bool


def discover_migrations(migrations_dir: Path = MIGRATIONS_DIR) -> list[Path]:
    return sorted(path for path in migrations_dir.glob("*.sql") if path.is_file())


def _migration_id(path: Path) -> tuple[str, str]:
    stem = path.stem
    version, _, name = stem.partition("_")
    return version, name or stem


def _ensure_tracking_table(conn: Any) -> None:
    with conn.cursor() as cur:
        cur.execute(TRACKING_TABLE_SQL)


def applied_versions(conn: Any) -> set[str]:
    _ensure_tracking_table(conn)
    with conn.cursor() as cur:
        cur.execute("SELECT version FROM schema_migrations")
        rows = cur.fetchall() or []
    return {str(row["version"] if isinstance(row, dict) else row[0]) for row in rows}


def run_pending(conn: Any, *, migrations_dir: Path = MIGRATIONS_DIR) -> list[MigrationResult]:
    """Apply idempotent SQL migrations and record successful versions."""
    _ensure_tracking_table(conn)
    applied = applied_versions(conn)
    results: list[MigrationResult] = []
    for path in discover_migrations(migrations_dir):
        version, name = _migration_id(path)
        if version in applied:
            results.append(MigrationResult(version=version, name=name, applied=False))
            continue
        sql = path.read_text(encoding="utf-8")
        with conn.cursor() as cur:
            cur.execute(sql)
            cur.execute(
                "INSERT INTO schema_migrations (version, name) VALUES (%s, %s) ON CONFLICT (version) DO NOTHING",
                (version, name),
            )
        applied.add(version)
        results.append(MigrationResult(version=version, name=name, applied=True))
        logger.info("Applied migration %s %s", version, name)
    return results

