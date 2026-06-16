#!/usr/bin/env python3
"""Restore inspection-readiness technical identifiers corrupted by wording safety pass."""

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
    "assistant",
    "tests",
    "backend",
)

SKIP_PARTS = (
    "/node_modules/",
    "/.venv/",
    "/reports/",
    "restore_inspection_readiness_technical_paths.py",
)

EXTENSIONS = {".py", ".tsx", ".ts", ".js", ".html", ".md", ".json"}

# Longest / most specific first — technical tokens only, never user-facing prose.
LITERAL_REPLACEMENTS: tuple[tuple[str, str], ...] = (
    (
        "@/components/inspection evidence preparation/inspection evidence preparation-summary",
        "@/components/inspection-readiness/inspection-readiness-summary",
    ),
    (
        "@/components/inspection evidence preparation/inspection evidence preparation-workspace",
        "@/components/inspection-readiness/inspection-readiness-workspace",
    ),
    ("@/components/inspection evidence preparation", "@/components/inspection-readiness"),
    ("@/lib/os-api/inspection evidence preparation", "@/lib/os-api/inspection-readiness"),
    ("components/inspection evidence preparation", "components/inspection-readiness"),
    ("lib/os-api/inspection evidence preparation", "lib/os-api/inspection-readiness"),
    ("/intelligence/inspection evidence preparation", "/intelligence/inspection-readiness"),
    ("/api/inspection evidence preparation", "/api/inspection-readiness"),
    ("/inspection evidence preparation", "/inspection-readiness"),
    ("data-orb-inspection evidence preparation", "data-orb-inspection-readiness"),
    ("data-ai-inspection evidence preparation", "data-ai-inspection-readiness"),
    ("inspection evidence preparation-workspace", "inspection-readiness-workspace"),
    ("inspection evidence preparation-summary", "inspection-readiness-summary"),
    ("inspection evidence preparation-page", "inspection-readiness-page"),
    ('prefix="/inspection evidence preparation"', 'prefix="/inspection-readiness"'),
    ('"/homes/{home_id}/inspection evidence preparation"', '"/homes/{home_id}/inspection-readiness"'),
    ('@router.get("/inspection evidence preparation")', '@router.get("/inspection-readiness")'),
    ("/homes/$1/inspection evidence preparation", "/homes/$1/inspection-readiness"),
    ("/homes/(\\d+)/inspection evidence preparation", "/homes/(\\d+)/inspection-readiness"),
)

REGEX_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    # data-testid / data-orb identifiers with embedded spaces
    (
        re.compile(r'(data-(?:testid|orb)-[\w-]*?)inspection evidence preparation'),
        r"\1inspection-readiness",
    ),
    (
        re.compile(r'(data-testid="[^"]*?)inspection evidence preparation'),
        r"\1inspection-readiness",
    ),
    # Nav / route object keys and string route ids (not display values after colon)
    (
        re.compile(r'(["\'])inspection evidence preparation\1(\s*[,\]:])'),
        r"\1inspection-readiness\1\2",
    ),
    # osRequestDedupeKey and similar path-only strings
    (
        re.compile(r"(['\"])/intelligence/inspection evidence preparation"),
        r"\1/intelligence/inspection-readiness",
    ),
)


def should_process(path: Path) -> bool:
    rel = path.as_posix()
    if any(part in rel for part in SKIP_PARTS):
        return False
    if path.suffix.lower() not in EXTENSIONS:
        return False
    return True


def restore_content(text: str) -> str:
    updated = text
    for old, new in LITERAL_REPLACEMENTS:
        updated = updated.replace(old, new)
    for pattern, replacement in REGEX_REPLACEMENTS:
        updated = pattern.sub(replacement, updated)
    return updated


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
            updated = restore_content(original)
            if updated != original:
                path.write_text(updated, encoding="utf-8")
                changed += 1
                print(f"restored: {path.relative_to(ROOT)}")
    print(f"files restored: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
