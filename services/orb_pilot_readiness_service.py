"""ORB closed-pilot deployment readiness checks — migrations, env, feature flags."""

from __future__ import annotations

import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection

CheckStatus = Literal["pass", "concern", "fail"]

ROOT = Path(__file__).resolve().parents[1]
MIGRATION_210 = ROOT / "sql" / "210_orb_records_workspace.sql"
MIGRATION_211 = ROOT / "sql" / "211_orb_home_documents.sql"

REQUIRED_ENV_VARS = (
    "DATABASE_URL",
    "SESSION_SECRET",
)

PILOT_RECOMMENDED_ENV_VARS = (
    "OPENAI_API_KEY",
)


@dataclass
class ReadinessCheck:
    id: str
    status: CheckStatus
    message: str
    detail: str | None = None


@dataclass
class PilotReadinessReport:
    checks: list[ReadinessCheck] = field(default_factory=list)
    ready_for_pilot: bool = False
    pilot_blockers: list[str] = field(default_factory=list)
    production_blockers: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ready_for_pilot": self.ready_for_pilot,
            "pilot_blockers": self.pilot_blockers,
            "production_blockers": self.production_blockers,
            "checks": [asdict(c) for c in self.checks],
            "summary": {
                "pass": sum(1 for c in self.checks if c.status == "pass"),
                "concern": sum(1 for c in self.checks if c.status == "concern"),
                "fail": sum(1 for c in self.checks if c.status == "fail"),
            },
        }


def _add(checks: list[ReadinessCheck], check_id: str, status: CheckStatus, message: str, detail: str | None = None) -> None:
    checks.append(ReadinessCheck(id=check_id, status=status, message=message, detail=detail))


def _table_exists(table_name: str) -> bool | None:
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = %s
                    """,
                    (table_name,),
                )
                return cur.fetchone() is not None
        finally:
            release_db_connection(conn)
    except (DatabaseUnavailableError, Exception):
        return None


def run_pilot_readiness_checks(*, require_database: bool = True) -> PilotReadinessReport:
    """Run closed-pilot readiness checks for migrations, env and feature posture."""
    checks: list[ReadinessCheck] = []
    pilot_blockers: list[str] = []
    production_blockers: list[str] = []

    if MIGRATION_210.is_file():
        text = MIGRATION_210.read_text(encoding="utf-8")
        if "orb_records_workspace" in text:
            _add(checks, "migration_210_file", "pass", "sql/210_orb_records_workspace.sql present")
        else:
            _add(checks, "migration_210_file", "fail", "Migration 210 missing orb_records_workspace table")
            pilot_blockers.append("migration_210_invalid")
    else:
        _add(checks, "migration_210_file", "fail", "sql/210_orb_records_workspace.sql not found")
        pilot_blockers.append("migration_210_missing")

    if MIGRATION_211.is_file():
        text = MIGRATION_211.read_text(encoding="utf-8")
        if "orb_home_documents" in text and "orb_home_document_chunks" in text:
            _add(checks, "migration_211_file", "pass", "sql/211_orb_home_documents.sql present")
        else:
            _add(checks, "migration_211_file", "fail", "Migration 211 missing required tables")
            pilot_blockers.append("migration_211_invalid")
    else:
        _add(checks, "migration_211_file", "fail", "sql/211_orb_home_documents.sql not found")
        pilot_blockers.append("migration_211_missing")

    workspace_exists = _table_exists("orb_records_workspace")
    if workspace_exists is True:
        _add(checks, "records_workspace_table", "pass", "orb_records_workspace table exists in database")
    elif workspace_exists is False:
        _add(
            checks,
            "records_workspace_table",
            "fail" if require_database else "concern",
            "orb_records_workspace table not applied — workspace will use memory fallback",
            "Apply sql/210_orb_records_workspace.sql before pilot",
        )
        if require_database:
            pilot_blockers.append("records_workspace_table_missing")
        else:
            production_blockers.append("records_workspace_table_missing")
    else:
        _add(
            checks,
            "records_workspace_table",
            "concern",
            "Database unavailable — could not verify orb_records_workspace table",
        )

    home_docs_exists = _table_exists("orb_home_documents")
    if home_docs_exists is True:
        _add(checks, "home_documents_table", "pass", "orb_home_documents table exists in database")
    elif home_docs_exists is False:
        _add(
            checks,
            "home_documents_table",
            "fail" if require_database else "concern",
            "orb_home_documents table not applied — home documents will use memory fallback",
            "Apply sql/211_orb_home_documents.sql before pilot",
        )
        if require_database:
            pilot_blockers.append("home_documents_table_missing")
    else:
        _add(
            checks,
            "home_documents_table",
            "concern",
            "Database unavailable — could not verify orb_home_documents table",
        )

    for env_name in REQUIRED_ENV_VARS:
        if os.getenv(env_name, "").strip():
            _add(checks, f"env_{env_name.lower()}", "pass", f"{env_name} is set")
        else:
            _add(checks, f"env_{env_name.lower()}", "fail", f"{env_name} is not set")
            pilot_blockers.append(f"env_{env_name.lower()}_missing")

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key:
        _add(checks, "openai_configured", "pass", "OPENAI_API_KEY is configured")
    else:
        _add(
            checks,
            "openai_configured",
            "concern",
            "OPENAI_API_KEY is not configured — live ORB answers will be unavailable",
            "Required for live GOLD verification; internal-brain safeguards still apply offline",
        )
        production_blockers.append("openai_not_configured")

    strict_mode = os.getenv("AI_PROVIDER_STRICT", "").strip().lower() in {"1", "true", "yes"}
    signoff = os.getenv("ORB_LIVE_SIGN_OFF", "").strip().lower() in {"1", "true", "yes"}
    if strict_mode:
        _add(checks, "ai_provider_strict", "pass", "AI_PROVIDER_STRICT is enabled")
    elif signoff:
        _add(
            checks,
            "ai_provider_strict",
            "fail",
            "ORB_LIVE_SIGN_OFF requires AI_PROVIDER_STRICT=true with OPENAI_API_KEY",
        )
        pilot_blockers.append("strict_mode_required_for_signoff")
    else:
        _add(
            checks,
            "ai_provider_strict",
            "concern",
            "AI_PROVIDER_STRICT is not enabled — mock provider may be used in non-production",
        )

    communicate_visible = os.getenv("NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE", "").strip() == "1"
    if communicate_visible:
        _add(
            checks,
            "communicate_hidden",
            "concern",
            "NEXT_PUBLIC_ORB_COMMUNICATE_VISIBLE=1 — Communicate visible in launch nav",
            "Pilot scope expects Communicate hidden unless explicitly enabled",
        )
    else:
        _add(checks, "communicate_hidden", "pass", "Communicate hidden from launch nav (default)")

    app_env = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).strip().lower()
    if workspace_exists is False or home_docs_exists is False:
        if app_env in {"production", "staging"}:
            production_blockers.append("migrations_not_applied_in_deployed_env")

    ready = len(pilot_blockers) == 0
    return PilotReadinessReport(
        checks=checks,
        ready_for_pilot=ready,
        pilot_blockers=pilot_blockers,
        production_blockers=production_blockers,
    )


orb_pilot_readiness_service = run_pilot_readiness_checks
