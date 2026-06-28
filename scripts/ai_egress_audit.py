#!/usr/bin/env python3
"""AI egress audit and governance guard (NR-1).

Stdlib-only static analysis (no app dependencies required) that enumerates and
classifies every AI/provider egress site in the repository, and enforces two
invariants that protect Named Risk NR-1:

  INVARIANT 1 — No raw OpenAI()/AsyncOpenAI() client construction outside the
                approved sanitised client factory
                (services/openai_header_sanitisation.py).
  INVARIANT 2 — No provider inference call (chat.completions / responses /
                embeddings / audio.speech / audio.transcriptions / completions)
                in a file outside the approved egress allow-list, unless the
                file is a script/tool or a test.

Usage:
  python3 scripts/ai_egress_audit.py            # guard mode: exit 1 on violation
  python3 scripts/ai_egress_audit.py --report   # print classification, exit 0

This script does not call any provider. It only parses source with `ast`.
"""

from __future__ import annotations

import argparse
import ast
import os
from dataclasses import dataclass, field

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Directories that are not part of the Python backend egress surface.
EXCLUDED_DIRS = {
    ".git", "node_modules", "frontend", "frontend-next", "indicare-frontend-next",
    "indicare-ai", "apps", "__pycache__", ".venv", "venv",
}

# The single approved place a raw OpenAI/AsyncOpenAI client may be constructed.
APPROVED_CLIENT_FACTORY = os.path.join("services", "openai_header_sanitisation.py")

# Modules permitted to make provider inference calls. Each is governed or is the
# approved provider adapter. Adding a new module here is a deliberate governance
# decision (see constitution A2 / docs/ai-egress-approved-modules.md).
APPROVED_INFERENCE_MODULES = {
    os.path.join("services", "ai_gateway_service.py"),
    os.path.join("services", "ai_external_call_governance.py"),
    os.path.join("assistant", "llm_provider.py"),
    os.path.join("services", "ai_providers", "openai_provider.py"),
    os.path.join("services", "ai_providers", "openai_tts_provider.py"),
    os.path.join("services", "ai_providers", "elevenlabs_tts_provider.py"),
    # Governance-allow-listed legacy streaming path (applies evaluate_external_call
    # + redact_chat_messages); documented in tests/test_no_direct_external_ai_bypass.py.
    os.path.join("assistant", "streaming.py"),
}

RAW_CLIENT_NAMES = {"OpenAI", "AsyncOpenAI"}
SANITISED_FACTORY_NAMES = {"create_sync_openai_client", "create_async_openai_client"}

# Inference call attribute tails we care about, e.g. client.chat.completions.create
INFERENCE_CALL_TAILS = (
    ("chat", "completions", "create"),
    ("responses", "create"),
    ("embeddings", "create"),
    ("completions", "create"),
    ("audio", "speech", "create"),
    ("audio", "transcriptions", "create"),
)


@dataclass
class Finding:
    path: str
    line: int
    kind: str  # raw_client | sanitised_client | inference_call
    detail: str


@dataclass
class Report:
    findings: list[Finding] = field(default_factory=list)
    violations: list[str] = field(default_factory=list)


def _rel(path: str) -> str:
    return os.path.relpath(path, REPO_ROOT)


def _is_test(rel: str) -> bool:
    return rel.startswith("tests" + os.sep) or os.path.basename(rel).startswith("test_")


def _is_script(rel: str) -> bool:
    return rel.startswith("scripts" + os.sep)


def _attr_chain(node: ast.AST) -> tuple[str, ...]:
    parts: list[str] = []
    cur = node
    while isinstance(cur, ast.Attribute):
        parts.append(cur.attr)
        cur = cur.value
    parts.reverse()
    return tuple(parts)


def _matches_inference(chain: tuple[str, ...]) -> str | None:
    for tail in INFERENCE_CALL_TAILS:
        if len(chain) >= len(tail) and tuple(chain[-len(tail):]) == tail:
            return ".".join(tail)
    return None


def scan_file(path: str, report: Report) -> None:
    rel = _rel(path)
    try:
        src = open(path, "r", encoding="utf-8").read()
    except (OSError, UnicodeDecodeError):
        return
    try:
        tree = ast.parse(src, filename=rel)
    except SyntaxError:
        return

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        func = node.func

        # Client construction: OpenAI(...) / AsyncOpenAI(...)
        name = None
        if isinstance(func, ast.Name):
            name = func.id
        elif isinstance(func, ast.Attribute):
            name = func.attr
        if name in RAW_CLIENT_NAMES:
            report.findings.append(Finding(rel, node.lineno, "raw_client", name))
            if rel != APPROVED_CLIENT_FACTORY and not _is_test(rel) and not _is_script(rel):
                report.violations.append(
                    f"INVARIANT 1 violated: raw {name}() constructed in {rel}:{node.lineno} "
                    f"(only {APPROVED_CLIENT_FACTORY} may build raw clients)."
                )
        if name in SANITISED_FACTORY_NAMES:
            report.findings.append(Finding(rel, node.lineno, "sanitised_client", name))

        # Inference calls
        if isinstance(func, ast.Attribute):
            chain = _attr_chain(func)
            tail = _matches_inference(chain)
            if tail:
                report.findings.append(Finding(rel, node.lineno, "inference_call", tail))
                if (
                    rel not in APPROVED_INFERENCE_MODULES
                    and not _is_test(rel)
                    and not _is_script(rel)
                ):
                    report.violations.append(
                        f"INVARIANT 2 violated: provider inference call ({tail}) in {rel}:{node.lineno} "
                        f"is outside the approved egress modules."
                    )


def scan_repo() -> Report:
    report = Report()
    for root, dirs, files in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS]
        for f in files:
            if f.endswith(".py"):
                scan_file(os.path.join(root, f), report)
    return report


def classify(rel: str) -> str:
    if rel == APPROVED_CLIENT_FACTORY:
        return "approved client factory"
    if rel in APPROVED_INFERENCE_MODULES:
        return "approved egress module (governed or approved adapter)"
    if _is_test(rel):
        return "test/mock"
    if _is_script(rel):
        return "script/tooling"
    return "UNAPPROVED — review required"


def main() -> int:
    parser = argparse.ArgumentParser(description="AI egress audit / governance guard (NR-1)")
    parser.add_argument("--report", action="store_true", help="Print classification and exit 0")
    args = parser.parse_args()

    report = scan_repo()

    by_file: dict[str, list[Finding]] = {}
    for fnd in report.findings:
        by_file.setdefault(fnd.path, []).append(fnd)

    print("=== AI egress sites (NR-1 audit) ===")
    for rel in sorted(by_file):
        print(f"\n{rel}  [{classify(rel)}]")
        for fnd in sorted(by_file[rel], key=lambda x: x.line):
            print(f"  {fnd.line}: {fnd.kind} -> {fnd.detail}")

    print(f"\nTotal egress sites: {len(report.findings)} across {len(by_file)} files")

    if args.report:
        return 0

    if report.violations:
        print("\n=== GUARD FAILURES ===")
        for v in report.violations:
            print(f"  ✗ {v}")
        print(f"\n{len(report.violations)} violation(s). See constitution A2 (Named Risk NR-1).")
        return 1

    print("\nGuard OK: no raw clients outside the factory; no inference calls outside approved modules.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
