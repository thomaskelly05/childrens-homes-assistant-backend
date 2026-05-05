from __future__ import annotations

from typing import Any

from services.assistant_orchestrator import OrchestratorRequest, OrchestratorResult, build_orchestrator_result
from services.defensible_ai_policy import append_defensible_ai_guard, mark_runtime_defensible


def build_safe_orchestrator_result(req: OrchestratorRequest) -> OrchestratorResult:
    """Build an assistant prompt package with child-home safety policy applied.

    This wrapper avoids risky changes to the large legacy orchestrator while enforcing:
    - defensible response format
    - citation rules
    - runtime flags for audit/review
    """
    result = build_orchestrator_result(req)

    runtime_payload = result.runtime_payload or {}
    evidence_index = runtime_payload.get("evidence_index") or []
    sources = runtime_payload.get("sources") or result.sources or []
    regulation_payload = result.regulation_payload or runtime_payload.get("regulation_basis") or []
    assistant_surface = runtime_payload.get("assistant_surface") or getattr(result.runtime, "assistant_surface", "unknown")
    requires_evidence_grounding = bool(
        runtime_payload.get("requires_evidence_grounding")
        or getattr(result.runtime, "requires_evidence_grounding", False)
    )

    result.system_prompt = append_defensible_ai_guard(
        result.system_prompt,
        evidence_index=evidence_index if isinstance(evidence_index, list) else [],
        sources=sources if isinstance(sources, list) else [],
        regulation_payload=regulation_payload if isinstance(regulation_payload, list) else [],
        assistant_surface=assistant_surface,
        requires_evidence_grounding=requires_evidence_grounding,
    )

    result.runtime_payload = mark_runtime_defensible(
        runtime_payload,
        regulation_payload=regulation_payload if isinstance(regulation_payload, list) else [],
    )

    # Rebuild messages so the updated system prompt is what the model receives.
    messages = [{"role": "system", "content": result.system_prompt}]
    messages.extend(result.trimmed_history or [])
    messages.append({"role": "user", "content": result.user_message})
    result.messages = messages

    return result


def serialise_safe_orchestrator_result(result: OrchestratorResult) -> dict[str, Any]:
    return {
        "system_prompt": result.system_prompt,
        "user_message": result.user_message,
        "messages": result.messages,
        "selected_mode": result.selected_mode,
        "sources": result.sources,
        "runtime": result.runtime_payload,
        "regulation_basis": result.regulation_payload,
        "defensible_output_contract": bool(result.runtime_payload.get("defensible_output_contract")),
        "requires_citations": bool(result.runtime_payload.get("requires_citations")),
    }
