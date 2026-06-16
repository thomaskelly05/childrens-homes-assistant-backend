#!/usr/bin/env python3
"""One-off product wording safety replacements for ORB governance pass."""

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

# Order matters — longer phrases first
REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\binspection-ready\b", re.I), "inspection evidence preparation"),
    (re.compile(r"\bInspection-ready\b", re.I), "Inspection evidence preparation"),
    (re.compile(r"\binspection-readiness\b", re.I), "inspection evidence preparation"),
    (re.compile(r"\bInspection-readiness\b", re.I), "Inspection evidence preparation"),
    (re.compile(r"\bOfsted-readiness\b", re.I), "inspection evidence preparation"),
    (re.compile(r"Ofsted ready", re.I), "Inspection evidence support"),
    (re.compile(r"Ofsted readiness", re.I), "Inspection evidence preparation"),
    (re.compile(r"ofsted readiness", re.I), "inspection evidence preparation"),
    (re.compile(r"stay inspection ready", re.I), "support inspection evidence preparation"),
    (re.compile(r"inspection ready", re.I), "inspection evidence preparation"),
    (re.compile(r"Inspection readiness", re.I), "Inspection evidence preparation"),
    (re.compile(r"inspection readiness", re.I), "inspection evidence preparation"),
    (re.compile(r"Ofsted Readiness", re.I), "Inspection evidence support"),
    (re.compile(r"Ofsted readiness review", re.I), "Inspection evidence preparation review"),
    (re.compile(r"ofsted readiness review", re.I), "inspection evidence preparation review"),
    (re.compile(r"Ofsted Readiness Engine", re.I), "Inspection evidence support engine"),
    (re.compile(r"OFSTED Inspection Ready", re.I), "Inspection evidence support"),
    (re.compile(r"Ofsted-grade", re.I), "quality evidence"),
    (re.compile(r"Ofsted compliant", re.I), "regulatory evidence support"),
    (re.compile(r"Ofsted approved", re.I), "inspection evidence support"),
    (re.compile(r"Ofsted certified", re.I), "inspection evidence support"),
    (re.compile(r"compliance ready", re.I), "evidence preparation support"),
    (re.compile(r"regulator approved", re.I), "regulator source referenced"),
)

EXTENSIONS = {".py", ".tsx", ".ts", ".js", ".html", ".md", ".json"}


def should_process(path: Path) -> bool:
    rel = path.as_posix()
    if any(part in rel for part in SKIP_PARTS):
        return False
    if path.suffix.lower() not in EXTENSIONS:
        return False
    # Preserve governance traceability artefacts
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
            updated = original
            for pattern, replacement in REPLACEMENTS:
                updated = pattern.sub(replacement, updated)
            if updated != original:
                path.write_text(updated, encoding="utf-8")
                changed += 1
                print(f"updated: {path.relative_to(ROOT)}")
    print(f"files changed: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
