"""Guard: no provider egress bypasses the approved governance modules (NR-1).

Runs the dependency-free AST audit in `scripts/ai_egress_audit.py` and fails if a
new raw OpenAI client is constructed outside the sanitised factory, or a provider
inference call appears outside the approved egress modules. See
docs/ai-egress-approved-modules.md and constitution A2 (Named Risk NR-1).

This test imports only stdlib + the audit script (no app dependencies), so it runs
even in minimal environments. It can also be run directly:
    python3 scripts/ai_egress_audit.py
"""

from __future__ import annotations

import importlib.util
import os
import sys

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_SCRIPT = os.path.join(_ROOT, "scripts", "ai_egress_audit.py")


def _load_audit():
    spec = importlib.util.spec_from_file_location("ai_egress_audit", _SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    # Register before exec so the module's dataclasses can resolve their own module.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_no_unapproved_ai_egress():
    audit = _load_audit()
    report = audit.scan_repo()
    assert not report.violations, "Unapproved AI egress detected:\n" + "\n".join(report.violations)


def test_audit_finds_known_egress_sites():
    # Sanity: the audit must actually be scanning (guards against an empty/no-op run).
    audit = _load_audit()
    report = audit.scan_repo()
    assert len(report.findings) > 0
