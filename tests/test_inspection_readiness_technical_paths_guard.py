"""CI guard: spaced inspection evidence tokens must not appear in technical contexts."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

SCAN_ROOTS = (
    ROOT / "services",
    ROOT / "routers",
    ROOT / "schemas",
    ROOT / "frontend",
    ROOT / "frontend-next",
    ROOT / "assistant",
    ROOT / "backend",
    ROOT / "tests",
)

SKIP_PARTS = (
    "/node_modules/",
    "/.venv/",
    "/reports/",
    "test_inspection_readiness_technical_paths_guard.py",
    "restore_inspection_readiness_technical_paths.py",
    "apply_orb_ofsted_wording_safety.py",
)

EXTENSIONS = {".py", ".tsx", ".ts", ".js", ".html"}

TECHNICAL_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("route path", re.compile(r"/inspection evidence preparation")),
    ("api path", re.compile(r"/api/inspection evidence preparation")),
    (
        "component import alias",
        re.compile(r"@/components/inspection evidence preparation"),
    ),
    (
        "os-api import alias",
        re.compile(r"@/lib/os-api/inspection evidence preparation"),
    ),
    (
        "data-orb attribute",
        re.compile(r"data-orb-inspection evidence preparation"),
    ),
    (
        "data-testid attribute",
        re.compile(r'data-testid="[^"]*inspection evidence preparation'),
    ),
    (
        "router prefix",
        re.compile(r'prefix="/inspection evidence preparation"'),
    ),
    (
        "fetch url",
        re.compile(r"fetch\(['\"]/api/inspection evidence preparation"),
    ),
    (
        "href url",
        re.compile(r'href="/intelligence/inspection evidence preparation'),
    ),
)


def _iter_production_files() -> list[Path]:
    files: list[Path] = []
    for root in SCAN_ROOTS:
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            rel = path.as_posix()
            if any(part in rel for part in SKIP_PARTS):
                continue
            if path.suffix.lower() not in EXTENSIONS:
                continue
            files.append(path)
    return files


def test_no_spaced_inspection_technical_tokens_in_production_files() -> None:
    violations: list[str] = []
    for path in _iter_production_files():
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        rel = path.relative_to(ROOT).as_posix()
        for line_no, line in enumerate(text.splitlines(), start=1):
            for label, pattern in TECHNICAL_PATTERNS:
                if pattern.search(line):
                    violations.append(f"{rel}:{line_no} [{label}] {line.strip()[:120]}")
    if violations:
        sample = "\n".join(violations[:20])
        pytest.fail(
            f"Spaced technical inspection tokens found ({len(violations)}):\n{sample}"
        )
