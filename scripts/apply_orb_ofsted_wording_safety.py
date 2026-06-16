#!/usr/bin/env python3
"""Product wording safety replacements for ORB governance pass.

Only replaces known user-facing display strings. Never alters route paths, imports,
data attributes, or code identifiers.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SCAN_ROOTS = (
    "services",
    "routers",
    "schemas",
    "frontend",
    "frontend-next",
    "indicare-frontend-next",
    "indicare-ai",
    "assistant",
    "data",
)

SKIP_PARTS = (
    "/fixtures/",
    "/node_modules/",
    "/.venv/",
    "/assistant/evals/",
    "audit_full_internal_brain",
    "audit_high-risk_internal_brain",
)

# User-facing copy only — ordered longest-first.
DISPLAY_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bOfsted-readiness\b"), "Inspection evidence preparation"),
    (re.compile(r"\bOfsted Readiness Engine\b"), "Inspection evidence support engine"),
    (re.compile(r"\bOfsted readiness review\b"), "Inspection evidence preparation review"),
    (re.compile(r"\bofsted readiness review\b"), "inspection evidence preparation review"),
    (re.compile(r"\bOfsted Readiness\b"), "Inspection evidence support"),
    (re.compile(r"\bOfsted readiness\b"), "Inspection evidence preparation"),
    (re.compile(r"\bofsted readiness\b"), "inspection evidence preparation"),
    (re.compile(r"\bOfsted ready\b"), "Inspection evidence support"),
    (re.compile(r"\bOFSTED Inspection Ready\b"), "Inspection evidence support"),
    (re.compile(r"\bInspection readiness\b"), "Inspection evidence preparation"),
    (re.compile(r"\binspection readiness\b"), "inspection evidence preparation"),
    (re.compile(r"\bInspection-ready\b"), "Inspection evidence preparation"),
    (re.compile(r"\binspection-ready\b"), "inspection evidence preparation"),
    (re.compile(r"\bInspection ready\b"), "Inspection evidence preparation"),
    (re.compile(r"\binspection ready\b"), "inspection evidence preparation"),
    (re.compile(r"\bstay inspection ready\b"), "support inspection evidence preparation"),
    (re.compile(r"\bOfsted-grade\b"), "quality evidence"),
    (re.compile(r"\bOfsted compliant\b"), "regulatory evidence support"),
    (re.compile(r"\bOfsted approved\b"), "inspection evidence support"),
    (re.compile(r"\bOfsted certified\b"), "inspection evidence support"),
    (re.compile(r"\bcompliance ready\b"), "evidence preparation support"),
    (re.compile(r"\bregulator approved\b"), "regulator source referenced"),
)

EXTENSIONS = {".py", ".tsx", ".ts", ".js", ".html", ".md", ".json"}

# Lines matching these patterns are never modified (technical / identifier contexts).
TECHNICAL_LINE_GUARD = re.compile(
    r"(?:"
    r"^\s*(?:import|from)\s+"
    r"|@/"
    r"|(?:href|fetch|prefix|route|url|path|src|module)\s*[=(]"
    r"|data-(?:testid|orb)-"
    r"|/api/"
    r"|/intelligence/"
    r"|/inspection"
    r"|inspection[-_]"
    r"|ofsted[-_]"
    r"|APIRouter\s*\("
    r"|@router\.(?:get|post|put|patch|delete)"
    r"|\b(?:def|class|async def)\s+\w*inspection"
    r"|\b(?:def|class|async def)\s+\w*ofsted"
    r"|\b(?:const|let|var|type|interface|enum)\s+"
    r"|\w_\w"  # snake_case identifiers on the line
    r")",
    re.IGNORECASE,
)

# Quoted strings that look like paths or imports must not be changed.
TECHNICAL_STRING_GUARD = re.compile(
    r"['\"](?:"
    r"@/"
    r"|/api/"
    r"|/intelligence/"
    r"|/inspection"
    r"|[a-z]+(?:[-/][a-z0-9_-]+)+"
    r")[^'\"]*['\"]",
    re.IGNORECASE,
)


def should_process(path: Path) -> bool:
    rel = path.as_posix()
    if any(part in rel for part in SKIP_PARTS):
        return False
    if path.suffix.lower() not in EXTENSIONS:
        return False
    if rel.endswith(
        (
            "quality/orb_external_framework_sources.json",
            "quality/orb_quality_rubric_traceability.json",
            "quality/orb_scenario_expectation_traceability.json",
            "quality/orb_unsafe_flag_traceability.json",
            "quality/orb_external_reviewer_pack.json",
            "docs/orb_quality_framework_traceability.md",
        )
    ):
        return False
    return True


def _replace_in_display_strings(line: str) -> str:
    if TECHNICAL_LINE_GUARD.search(line):
        return line

    def _replace_quoted(match: re.Match[str]) -> str:
        segment = match.group(0)
        if TECHNICAL_STRING_GUARD.search(segment):
            return segment
        updated = segment
        for pattern, replacement in DISPLAY_REPLACEMENTS:
            updated = pattern.sub(replacement, updated)
        return updated

    updated = re.sub(r"""(['"])(?:\\.|(?!\1).)*\1""", _replace_quoted, line)
    if updated == line and not TECHNICAL_STRING_GUARD.search(line):
        for pattern, replacement in DISPLAY_REPLACEMENTS:
            updated = pattern.sub(replacement, updated)
    return updated


def apply_wording_safety(text: str) -> str:
    lines = text.splitlines(keepends=True)
    return "".join(_replace_in_display_strings(line) for line in lines)


def main() -> int:
    changed = 0
    for root_name in SCAN_ROOTS:
        root = ROOT / root_name
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or not should_process(path):
                continue
            try:
                original = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                continue
            updated = apply_wording_safety(original)
            if updated != original:
                path.write_text(updated, encoding="utf-8")
                changed += 1
                print(f"updated: {path.relative_to(ROOT)}")
    print(f"files changed: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
