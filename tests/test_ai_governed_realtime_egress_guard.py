"""Guard: direct OpenAI realtime session HTTP must stay in approved adapter module."""

from __future__ import annotations

import ast
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
APPROVED_REALTIME_HTTP = {
    REPO_ROOT / "services" / "ai_providers" / "openai_realtime_session_provider.py",
}
ALLOWED_REALTIME_URL_REFERENCE = {
    REPO_ROOT / "services" / "orb_voice_realtime_config_service.py",
}
SKIP_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "build",
    "frontend",
    "frontend-next",
    "tests",
}


def _python_files() -> list[Path]:
    files: list[Path] = []
    for path in REPO_ROOT.rglob("*.py"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        files.append(path)
    return files


def _file_makes_realtime_session_http(path: Path) -> bool:
    resolved = path.resolve()
    if resolved in APPROVED_REALTIME_HTTP or resolved in ALLOWED_REALTIME_URL_REFERENCE:
        return False
    text = path.read_text(encoding="utf-8")
    if "httpx" not in text:
        return False
    if "/v1/realtime/client_secrets" not in text and "OPENAI_REALTIME_CLIENT_SECRET_URL" not in text:
        return False
    return ".post(" in text or "client.post" in text


def test_no_direct_openai_realtime_session_http_outside_approved_adapter():
    violations: list[str] = []
    for path in _python_files():
        if _file_makes_realtime_session_http(path):
            violations.append(str(path.relative_to(REPO_ROOT)))
    assert not violations, (
        "Direct OpenAI realtime session HTTP must only live in "
        "services/ai_providers/openai_realtime_session_provider.py. "
        f"Violations: {violations}"
    )


def test_ai_governed_egress_exposes_issue_realtime_session():
    egress_path = REPO_ROOT / "services" / "ai_governed_egress.py"
    source = egress_path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(egress_path))
    method_names = [
        child.name
        for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name == "AiGovernedEgress"
        for child in node.body
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]
    assert "issue_realtime_session" in method_names
