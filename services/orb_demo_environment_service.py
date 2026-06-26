"""ORB demo environment readiness checks — inspect-only, non-destructive."""

from __future__ import annotations

import os
import socket
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlparse

CheckStatus = Literal["pass", "concern", "fail", "skip"]

ROOT = Path(__file__).resolve().parents[1]

ORB_MIGRATION_FILES = tuple(
    ROOT / "sql" / f"{num}_{name}.sql"
    for num, name in (
        ("200", "orb_residential_premium"),
        ("201", "orb_feedback"),
        ("202", "orb_improvement_candidates"),
        ("203", "orb_residential_subscriptions"),
        ("204", "orb_stripe_events"),
        ("205", "orb_oauth_accounts"),
        ("206", "orb_oauth_states"),
        ("206", "orb_commercial_infrastructure"),
        ("207", "orb_saved_outputs_canonical"),
        ("208", "orb_knowledge_source_scope"),
        ("209", "orb_learning_ledger"),
        ("210", "orb_records_workspace"),
        ("211", "orb_home_documents"),
    )
)

KEY_ORB_TABLES = (
    "users",
    "homes",
    "orb_trials",
    "orb_subscriptions",
    "orb_safety_acceptances",
    "orb_records_workspace",
    "orb_home_documents",
)

USEFUL_SCRIPTS = (
    ROOT / "scripts" / "check_orb_pilot_readiness.py",
    ROOT / "scripts" / "check_orb_demo_environment.py",
    ROOT / "scripts" / "run_orb_live_ui_verification_pr1724.py",
    ROOT / "frontend-next" / "scripts" / "run-orb-live-ui-rerun.mjs",
    ROOT / "create_first_admin.py",
)

PLACEHOLDER_OPENAI_VALUES = frozenset(
    {
        "",
        "replace-with-openai-key",
        "sk-placeholder",
        "your-openai-api-key",
        "changeme",
    }
)


@dataclass
class DemoEnvironmentCheck:
    id: str
    status: CheckStatus
    message: str
    detail: str | None = None


@dataclass
class DemoEnvironmentReport:
    checks: list[DemoEnvironmentCheck] = field(default_factory=list)
    ready_for_demo: bool = False
    blockers: list[str] = field(default_factory=list)
    next_steps: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ready_for_demo": self.ready_for_demo,
            "blockers": self.blockers,
            "next_steps": self.next_steps,
            "checks": [asdict(c) for c in self.checks],
            "summary": {
                "pass": sum(1 for c in self.checks if c.status == "pass"),
                "concern": sum(1 for c in self.checks if c.status == "concern"),
                "fail": sum(1 for c in self.checks if c.status == "fail"),
                "skip": sum(1 for c in self.checks if c.status == "skip"),
            },
        }


def _add(
    checks: list[DemoEnvironmentCheck],
    check_id: str,
    status: CheckStatus,
    message: str,
    detail: str | None = None,
) -> None:
    checks.append(DemoEnvironmentCheck(id=check_id, status=status, message=message, detail=detail))


def _looks_like_placeholder_secret(value: str) -> bool:
    cleaned = value.strip().strip('"').strip("'")
    if not cleaned:
        return True
    lower = cleaned.lower()
    if lower in PLACEHOLDER_OPENAI_VALUES:
        return True
    if lower.startswith("replace-with"):
        return True
    return False


def _http_probe(url: str, *, timeout_seconds: float = 2.0) -> tuple[bool, str | None]:
    request = urllib.request.Request(url, method="GET", headers={"User-Agent": "orb-demo-environment-check/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            return True, f"HTTP {response.status}"
    except urllib.error.HTTPError as exc:
        if exc.code < 500:
            return True, f"HTTP {exc.code}"
        return False, f"HTTP {exc.code}"
    except Exception as exc:
        return False, exc.__class__.__name__


def _postgres_reachable(database_url: str, *, timeout_seconds: float = 3.0) -> tuple[bool, str | None]:
    try:
        import psycopg2
    except ImportError:
        return False, "psycopg2 not installed"

    parsed = urlparse(database_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    try:
        with socket.create_connection((host, port), timeout=timeout_seconds):
            pass
    except OSError as exc:
        return False, f"TCP unreachable on {host}:{port} ({exc.__class__.__name__})"

    try:
        conn = psycopg2.connect(database_url, connect_timeout=int(timeout_seconds))
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        finally:
            conn.close()
        return True, None
    except Exception as exc:
        return False, exc.__class__.__name__


def _table_exists(database_url: str, table_name: str) -> bool | None:
    try:
        import psycopg2
    except ImportError:
        return None

    try:
        conn = psycopg2.connect(database_url, connect_timeout=3)
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
            conn.close()
    except Exception:
        return None


def run_demo_environment_checks(
    *,
    backend_url: str = "http://127.0.0.1:8000",
    frontend_url: str = "http://127.0.0.1:3001",
    probe_services: bool = True,
) -> DemoEnvironmentReport:
    """Inspect local/staging demo prerequisites without mutating environment state."""
    checks: list[DemoEnvironmentCheck] = []
    blockers: list[str] = []
    next_steps: list[str] = []

    env_file = ROOT / ".env"
    if env_file.is_file():
        _add(checks, "env_file", "pass", ".env file exists at repository root")
    else:
        _add(
            checks,
            "env_file",
            "fail",
            ".env file is missing",
            "Copy .env.example to .env and configure local values (do not commit secrets)",
        )
        blockers.append("env_file_missing")
        next_steps.append("cp .env.example .env  # then edit DATABASE_URL, SESSION_SECRET, OPENAI_API_KEY")

    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        _add(checks, "env_database_url", "pass", "DATABASE_URL is set in environment")
    else:
        _add(
            checks,
            "env_database_url",
            "fail",
            "DATABASE_URL is not set",
            "Local example: postgresql://indicare:indicare123@localhost:5432/childrens_homes",
        )
        blockers.append("database_url_missing")
        next_steps.append("Set DATABASE_URL in .env and export before running backend")

    session_secret = os.getenv("SESSION_SECRET", "").strip()
    if session_secret and not _looks_like_placeholder_secret(session_secret):
        _add(checks, "env_session_secret", "pass", "SESSION_SECRET is set")
    elif session_secret:
        _add(
            checks,
            "env_session_secret",
            "fail",
            "SESSION_SECRET looks like a placeholder",
            "Generate a long random secret for local sessions",
        )
        blockers.append("session_secret_placeholder")
    else:
        _add(checks, "env_session_secret", "fail", "SESSION_SECRET is not set")
        blockers.append("session_secret_missing")

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    if openai_key and not _looks_like_placeholder_secret(openai_key):
        _add(checks, "env_openai_api_key", "pass", "OPENAI_API_KEY appears configured")
    elif openai_key:
        _add(
            checks,
            "env_openai_api_key",
            "concern",
            "OPENAI_API_KEY is set but looks like a placeholder",
            "Live ORB answers will fall back to mock/provider-unavailable until a valid key is set",
        )
        next_steps.append("Set a valid OPENAI_API_KEY for live LLM demo sign-off")
    else:
        _add(
            checks,
            "env_openai_api_key",
            "concern",
            "OPENAI_API_KEY is not set",
            "UI shell works without it; live answers and sign-off harness need a real key",
        )
        next_steps.append("Export OPENAI_API_KEY before live LLM sign-off")

    missing_migrations = [path.name for path in ORB_MIGRATION_FILES if not path.is_file()]
    if not missing_migrations:
        _add(checks, "orb_migration_files", "pass", "ORB migration files sql/200–211 are present")
    else:
        _add(
            checks,
            "orb_migration_files",
            "fail",
            f"Missing ORB migration files: {', '.join(missing_migrations)}",
        )
        blockers.append("orb_migration_files_missing")

    missing_scripts = [path.relative_to(ROOT).as_posix() for path in USEFUL_SCRIPTS if not path.is_file()]
    if not missing_scripts:
        _add(checks, "useful_scripts", "pass", "Demo helper scripts are present")
    else:
        _add(
            checks,
            "useful_scripts",
            "concern",
            f"Missing helper scripts: {', '.join(missing_scripts)}",
        )

    if database_url:
        reachable, detail = _postgres_reachable(database_url)
        if reachable:
            _add(checks, "postgres_reachable", "pass", "PostgreSQL is reachable via DATABASE_URL")
        else:
            _add(
                checks,
                "postgres_reachable",
                "fail",
                "PostgreSQL is not reachable via DATABASE_URL",
                detail,
            )
            blockers.append("postgres_unreachable")
            next_steps.append("sudo pg_ctlcluster 16 main start  # then retry this script")

        for table_name in KEY_ORB_TABLES:
            exists = _table_exists(database_url, table_name)
            check_id = f"table_{table_name}"
            if exists is True:
                _add(checks, check_id, "pass", f"Table public.{table_name} exists")
            elif exists is False:
                severity: CheckStatus = "fail" if table_name in {"users", "orb_safety_acceptances", "orb_subscriptions"} else "concern"
                _add(
                    checks,
                    check_id,
                    severity,
                    f"Table public.{table_name} is missing",
                    "Apply ORB SQL migrations in order — see docs/deployment/orb-demo-readiness-runbook.md",
                )
                if severity == "fail":
                    blockers.append(f"table_{table_name}_missing")
                next_steps.append(f"Apply migrations until public.{table_name} exists")
            else:
                _add(
                    checks,
                    check_id,
                    "skip",
                    f"Could not verify table public.{table_name}",
                    "Database connection failed during table inspection",
                )
    else:
        _add(checks, "postgres_reachable", "skip", "Skipped PostgreSQL check — DATABASE_URL not set")
        for table_name in KEY_ORB_TABLES:
            _add(checks, f"table_{table_name}", "skip", f"Skipped table check for {table_name}")

    if probe_services:
        backend_health = backend_url.rstrip("/") + "/health"
        ok, detail = _http_probe(backend_health)
        if ok:
            _add(checks, "backend_health", "pass", f"Backend responded at {backend_health}", detail)
        else:
            _add(
                checks,
                "backend_health",
                "concern",
                f"Backend not responding at {backend_health}",
                detail or "Start backend: source .venv/bin/activate && uvicorn app:app --reload --host 127.0.0.1 --port 8000",
            )
            next_steps.append("Start FastAPI backend on port 8000 after PostgreSQL and .env are ready")

        frontend_ok, frontend_detail = _http_probe(frontend_url)
        if frontend_ok:
            _add(checks, "frontend_http", "pass", f"Frontend responded at {frontend_url}", frontend_detail)
        else:
            _add(
                checks,
                "frontend_http",
                "concern",
                f"Frontend not responding at {frontend_url}",
                frontend_detail or "Start frontend: cd frontend-next && npm run dev",
            )
            next_steps.append("Start Next.js frontend on port 3001 for /orb UI demo")
    else:
        _add(checks, "backend_health", "skip", "Skipped backend probe")
        _add(checks, "frontend_http", "skip", "Skipped frontend probe")

    # Deduplicate guidance while preserving order
    seen: set[str] = set()
    deduped_next_steps: list[str] = []
    for step in next_steps:
        if step not in seen:
            seen.add(step)
            deduped_next_steps.append(step)

    if not blockers:
        deduped_next_steps.insert(
            0,
            "Environment baseline looks ready — log in at /orb, complete MFA if prompted, accept safety terms, then run live UI sign-off",
        )

    ready = not blockers
    return DemoEnvironmentReport(
        checks=checks,
        ready_for_demo=ready,
        blockers=blockers,
        next_steps=deduped_next_steps,
    )
