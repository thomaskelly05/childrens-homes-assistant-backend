"""CI guard: model router must route provider calls through governed egress."""

from __future__ import annotations

import ast
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
ROUTER_PATH = REPO_ROOT / "services" / "ai_model_router_service.py"
EGRESS_MODULE = "ai_governed_egress"


def _router_source() -> str:
    return ROUTER_PATH.read_text(encoding="utf-8")


def test_model_router_imports_governed_egress():
    source = _router_source()
    assert EGRESS_MODULE in source
    assert "ai_governed_egress.complete" in source or "ai_governed_egress.stream" in source


def test_model_router_does_not_call_provider_adapters_directly():
    """Provider adapters must not be invoked directly from the router service."""
    source = _router_source()
    tree = ast.parse(source, filename=str(ROUTER_PATH))
    violations: list[str] = []
    banned_calls = {
        ("openai_provider", "complete"),
        ("openai_provider", "stream"),
        ("mock_provider", "complete"),
        ("mock_provider", "stream"),
    }
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        func = node.func
        if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
            pair = (func.value.id, func.attr)
            if pair in banned_calls:
                violations.append(f"{pair[0]}.{pair[1]} at line {node.lineno}")
    assert not violations, (
        "Model router must not call provider adapters directly; use ai_governed_egress. "
        f"Found: {violations}"
    )


def test_governed_egress_module_exists():
    egress_path = REPO_ROOT / "services" / "ai_governed_egress.py"
    assert egress_path.is_file()
    source = egress_path.read_text(encoding="utf-8")
    assert "class AiGovernedEgress" in source
    assert "evaluate_external_call" in source
    assert "ProviderEgressDecision" in source
