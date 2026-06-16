"""ORB Residential Ofsted / regulatory wording safety audit.

Scans product-facing code for risky validation-style language while preserving
factual regulator source references in governance traceability artefacts.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[2]

# Small explicit allowlist — factual source / governance traceability only.
ALLOWLIST_RELATIVE_PATHS = frozenset(
    {
        "quality/orb_external_framework_sources.json",
        "quality/orb_quality_rubric_traceability.json",
        "quality/orb_scenario_expectation_traceability.json",
        "quality/orb_unsafe_flag_traceability.json",
        "quality/orb_external_reviewer_pack.json",
        "docs/orb_quality_framework_traceability.md",
        "assistant/evals/orb_ofsted_wording_audit.py",
        "assistant/evals/orb_external_framework_traceability.py",
        "tests/test_orb_residential_baseline.py",
        "tests/test_orb_ofsted_wording_safety.py",
        "reports/orb_ofsted_wording_audit.json",
        "scripts/audit_full_internal_brain.json",
        "scripts/audit_high-risk_internal_brain.json",
    }
)

# Paths scanned for product-facing wording safety (tests enforce clean scan).
PRODUCT_SCAN_ROOTS = (
    "services",
    "routers",
    "schemas",
    "frontend",
    "frontend-next",
    "indicare-frontend-next",
    "indicare-ai",
    "assistant",
    "data/orb_knowledge_seed",
)

PRODUCT_SCAN_EXTENSIONS = frozenset({".py", ".tsx", ".ts", ".js", ".html", ".md", ".json"})

RISKY_PATTERN_SPECS: tuple[tuple[str, re.Pattern[str], str], ...] = (
    (
        "ofsted-ready",
        re.compile(r"\bofsted(?:[\s_-]ready|\s+ready)\b", re.I),
        "product_label_risky",
    ),
    (
        "ofsted readiness",
        re.compile(r"\bofsted(?:[\s_-]readiness|\s+readiness)\b", re.I),
        "product_label_risky",
    ),
    (
        "ofsted compliant",
        re.compile(r"\bofsted(?:[\s_-]compliant|\s+compliant)\b", re.I),
        "product_label_risky",
    ),
    (
        "ofsted compliance",
        re.compile(r"\bofsted(?:[\s_-]compliance|\s+compliance)\b", re.I),
        "product_label_risky",
    ),
    (
        "ofsted approved",
        re.compile(r"\bofsted(?:[\s_-]approved|\s+approved)\b", re.I),
        "product_label_risky",
    ),
    (
        "ofsted certified",
        re.compile(r"\bofsted(?:[\s_-]certified|\s+certified)\b", re.I),
        "product_label_risky",
    ),
    (
        "ofsted-grade",
        re.compile(r"\bofsted(?:[\s_-]grade|\s+grade)\b", re.I),
        "product_label_risky",
    ),
    (
        "inspection ready",
        re.compile(r"\binspection(?:[\s_-]ready|\s+ready)\b", re.I),
        "user_facing_copy_risky",
    ),
    (
        "inspection readiness",
        re.compile(r"\binspection(?:[\s_-]readiness|\s+readiness)\b", re.I),
        "user_facing_copy_risky",
    ),
    (
        "compliance ready",
        re.compile(r"\bcompliance(?:[\s_-]ready|\s+ready)\b", re.I),
        "user_facing_copy_risky",
    ),
    (
        "regulator approved",
        re.compile(r"\bregulator(?:[\s_-]approved|\s+approved)\b", re.I),
        "product_label_risky",
    ),
    (
        "regulator endorsed",
        re.compile(r"\bregulator(?:[\s_-]endorsed|\s+endorsed)\b", re.I),
        "product_label_risky",
    ),
    (
        "compliance guaranteed",
        re.compile(r"\bcompliance(?:[\s_-]guaranteed|\s+guaranteed)\b", re.I),
        "product_label_risky",
    ),
    (
        "guarantees compliance",
        re.compile(r"\bguarantees?\s+compliance\b", re.I),
        "product_label_risky",
    ),
)

# Internal snake_case API keys allowed during migration (not user-facing copy).
INTERNAL_IDENTIFIER_ALLOWLIST = frozenset(
    {
        "inspection_readiness",
        "ofsted_readiness",
        "ofsted_ready",
        "ofsted_readiness_review",
        "ofsted_readiness_score",
        "ofsted_readiness_check",
        "sccif_ofsted_readiness_intelligence",
        "ofsted_readiness_summary",
        "ofsted-ready",
        "inspection evidence preparation",
    }
)

# Factual Ofsted mentions (not readiness/approval claims) — informational only.
FACTUAL_OFSTED_PATTERN = re.compile(r"\bofsted\b", re.I)


@dataclass
class WordingOccurrence:
    file: str
    line: int
    context: str
    occurrence: str
    classification: str
    action: str = "replace"


@dataclass
class WordingAuditResult:
    occurrences: list[WordingOccurrence] = field(default_factory=list)
    risky_count: int = 0
    factual_kept_count: int = 0
    replaced_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "risky_occurrences_found": self.risky_count,
            "occurrences_replaced": self.replaced_count,
            "factual_source_references_kept": self.factual_kept_count,
            "occurrences": [
                {
                    "file": o.file,
                    "line": o.line,
                    "context": o.context,
                    "occurrence": o.occurrence,
                    "classification": o.classification,
                    "action": o.action,
                }
                for o in self.occurrences
            ],
        }


def _relative_path(path: Path) -> str:
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def is_allowlisted(path: Path) -> bool:
    rel = _relative_path(path)
    return rel in ALLOWLIST_RELATIVE_PATHS


def iter_product_scan_files() -> Iterable[Path]:
    for root_name in PRODUCT_SCAN_ROOTS:
        root = ROOT / root_name
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in PRODUCT_SCAN_EXTENSIONS:
                continue
            if is_allowlisted(path):
                continue
            # Skip eval fixtures and generated reports under assistant/
            rel = _relative_path(path)
            if "/fixtures/" in rel or rel.startswith("reports/"):
                continue
            yield path


def _classify_ofsted_factual(line_text: str, pattern_name: str) -> str:
    lower = line_text.lower()
    if any(
        term in lower
        for term in (
            "sccif",
            "inspection guidance",
            "source_id",
            "external_source",
            "gov.uk",
            "reports.ofsted",
            "regulator",
            "notification",
            "factual",
            "source registry",
            "quality standard",
        )
    ):
        return "factual_source_reference"
    if "ofsted" in pattern_name:
        return "product_label_risky"
    return "user_facing_copy_risky"


def scan_file(path: Path) -> list[WordingOccurrence]:
    rel = _relative_path(path)
    occurrences: list[WordingOccurrence] = []
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return occurrences

    for line_no, line in enumerate(text.splitlines(), start=1):
        for pattern_name, pattern, default_class in RISKY_PATTERN_SPECS:
            if pattern.search(line):
                classification = _classify_ofsted_factual(line, pattern_name)
                if classification == "factual_source_reference":
                    action = "keep"
                elif "test_" in rel and "assert" in line:
                    action = "keep"
                else:
                    action = "replace"
                occurrences.append(
                    WordingOccurrence(
                        file=rel,
                        line=line_no,
                        context=line.strip()[:200],
                        occurrence=pattern_name,
                        classification=classification,
                        action=action,
                    )
                )
    return occurrences


def scan_repo(*, product_only: bool = True) -> WordingAuditResult:
    """Scan repository for risky Ofsted / readiness wording."""
    result = WordingAuditResult()
    paths = list(iter_product_scan_files()) if product_only else list(ROOT.rglob("*"))

    factual_paths: set[str] = set()
    for path in paths:
        if not path.is_file():
            continue
        rel = _relative_path(path)
        if is_allowlisted(path):
            try:
                if FACTUAL_OFSTED_PATTERN.search(path.read_text(encoding="utf-8")):
                    factual_paths.add(rel)
            except (OSError, UnicodeDecodeError):
                pass
            continue
        if product_only and path.suffix.lower() not in PRODUCT_SCAN_EXTENSIONS:
            continue

        file_occurrences = scan_file(path)
        for occ in file_occurrences:
            if occ.action == "replace":
                result.risky_count += 1
            result.occurrences.append(occ)

    # Count factual Ofsted references kept in allowlisted governance files
    for rel in ALLOWLIST_RELATIVE_PATHS:
        path = ROOT / rel
        if path.is_file():
            try:
                if FACTUAL_OFSTED_PATTERN.search(path.read_text(encoding="utf-8")):
                    result.factual_kept_count += 1
            except (OSError, UnicodeDecodeError):
                pass

    return result


def _iter_string_literals(line: str) -> list[str]:
    """Extract quoted string contents from a line (simple heuristic)."""
    literals: list[str] = []
    for match in re.finditer(r'(["\'])(?:(?=(\\?))\2.)*?\1', line):
        raw = match.group(0)
        if len(raw) >= 2:
            literals.append(raw[1:-1])
    # Template literal chunks in TS/JS
    for match in re.finditer(r"`([^`]*)`", line):
        literals.append(match.group(1))
    return literals


def scan_product_strings() -> list[WordingOccurrence]:
    """Scan user-facing string literals for risky regulatory validation wording."""
    occurrences: list[WordingOccurrence] = []
    for path in iter_product_scan_files():
        rel = _relative_path(path)
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except (OSError, UnicodeDecodeError):
            continue
        for line_no, line in enumerate(lines, start=1):
            # Skip pure import lines and test assertion lines checking prohibitions
            stripped = line.strip()
            if stripped.startswith("import ") or stripped.startswith("from "):
                continue
            if "PROHIBITED" in line or "prohibited" in line.lower() and "assert" in line:
                continue
            for literal in _iter_string_literals(line):
                if literal in INTERNAL_IDENTIFIER_ALLOWLIST:
                    continue
                if re.fullmatch(r"[a-z][a-z0-9_]*", literal):
                    continue
                if re.fullmatch(r"[A-Z][A-Z0-9_]*", literal):
                    continue
                if "." in literal and re.search(r"\b(inspection_readiness|ofsted_readiness)\b", literal):
                    continue
                if re.search(r"\bofsted\s+grade\s+prediction\s+blocked\b", literal, re.I):
                    continue
                if re.search(r"\bdo not present it as an ofsted grade\b", literal, re.I):
                    continue
                if re.search(r"\bno ofsted grade prediction\b", literal, re.I):
                    continue
                if re.search(r"\bofsted\s+grade\s+prediction", literal, re.I) and re.search(
                    r"\b(not|do not|does not|must not|unverified)\b", literal, re.I
                ):
                    continue
                if re.search(r"\bdoes not provide an ofsted grade\b", literal, re.I):
                    continue
                if "/inspection evidence preparation" in literal or "inspection_readiness_" in literal:
                    continue
                if re.search(
                    r"\b(does not|do not|must not|cannot|can't|will not|won't)\s+[\w\s]{0,30}"
                    r"(predict|claim|guarantee|certify|endorse|approve)",
                    literal,
                    re.I,
                ):
                    continue
                if re.search(r"\bnot\s+(an?\s+)?ofsted\b", literal, re.I):
                    continue
                for pattern_name, pattern, default_class in RISKY_PATTERN_SPECS:
                    if pattern.search(literal):
                        classification = _classify_ofsted_factual(literal, pattern_name)
                        action = "keep" if classification == "factual_source_reference" else "replace"
                        occurrences.append(
                            WordingOccurrence(
                                file=rel,
                                line=line_no,
                                context=literal[:200],
                                occurrence=pattern_name,
                                classification=classification,
                                action=action,
                            )
                        )
    return [o for o in occurrences if o.action == "replace"]


def find_risky_product_occurrences() -> list[WordingOccurrence]:
    """Return risky wording in product-facing string literals."""
    return scan_product_strings()


BOUNDARY_DISCLAIMER = (
    "ORB supports inspection evidence preparation. It does not determine inspection outcomes, "
    "guarantee compliance or represent regulator endorsement."
)
