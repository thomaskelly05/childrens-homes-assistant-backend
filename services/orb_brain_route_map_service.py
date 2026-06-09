"""Canonical ORB standalone brain route map — diagnostic and documentation utility.

This module documents the live /orb standalone cognition path. It does not route
messages itself; ``orb_brain_convergence_orchestrator_service`` is the single
canonical brain decision builder used by conversation and stream routes.
"""

from __future__ import annotations

from typing import Any, Literal

OrbRouteStepId = Literal[
    "frontend_message_send",
    "orb_standalone_conversation",
    "orb_standalone_conversation_stream",
    "build_standalone_request_context",
    "orb_brain_convergence_orchestrator",
    "orb_brain_route_service",
    "orb_standalone_brain_service",
    "orb_residential_cognition_router",
    "orb_indicare_intelligence_convergence_service",
    "shared_institutional_cognition_runtime",
    "grounded_answer_style_depth_frame",
    "orb_response_composer",
    "explainability_metadata",
    "response_support_actions",
]

CANONICAL_STANDALONE_BRAIN_ROUTE: list[dict[str, Any]] = [
    {
        "step": 1,
        "id": "frontend_message_send",
        "component": "frontend-next/lib/orb/standalone-client.ts",
        "role": "User sends message via ORB shell (chat/voice metadata only).",
        "authoritative": False,
    },
    {
        "step": 2,
        "id": "orb_standalone_conversation",
        "component": "routers/orb_standalone_routes.py::standalone_orb_conversation",
        "role": "POST /orb/standalone/conversation — sync JSON answer.",
        "authoritative": True,
    },
    {
        "step": 3,
        "id": "orb_standalone_conversation_stream",
        "component": "routers/orb_standalone_routes.py::standalone_orb_conversation_stream",
        "role": "POST /orb/standalone/conversation/stream — SSE tokens + metadata.",
        "authoritative": True,
        "note": "Uses the same _build_standalone_request_context as step 2.",
    },
    {
        "step": 4,
        "id": "build_standalone_request_context",
        "component": "routers/orb_standalone_routes.py::_build_standalone_request_context",
        "role": "Assembles retrieval, brain decision, shared cognition and framed prompt.",
        "authoritative": True,
    },
    {
        "step": 5,
        "id": "orb_brain_convergence_orchestrator",
        "component": "services/orb_brain_convergence_orchestrator_service.py",
        "role": "Single canonical brain decision object for standalone ORB.",
        "authoritative": True,
    },
    {
        "step": 6,
        "id": "orb_brain_route_service",
        "component": "services/orb_brain_route_service.py::decide_orb_brain_route",
        "role": "Server-authoritative route: general_assistant | residential_specialist | live_lookup | document_workspace.",
        "authoritative": True,
    },
    {
        "step": 7,
        "id": "orb_standalone_brain_service",
        "component": "services/orb_standalone_brain_service.py",
        "role": "Dual-brain frame, active brains, soft response contracts, boundaries.",
        "authoritative": True,
    },
    {
        "step": 8,
        "id": "orb_residential_cognition_router",
        "component": "services/orb_residential_cognition_router.py",
        "role": "Topic detection, cognition brains, vault domains, display labels.",
        "authoritative": True,
    },
    {
        "step": 9,
        "id": "orb_indicare_intelligence_convergence_service",
        "component": "services/orb_indicare_intelligence_convergence_service.py",
        "role": "IndiCare Intelligence layer activation (engines, lenses).",
        "authoritative": True,
    },
    {
        "step": 10,
        "id": "shared_institutional_cognition_runtime",
        "component": "services/shared_institutional_cognition_runtime.py",
        "role": "Institutional cognition prompt blocks, citations, depth frame (skipped on fast tier).",
        "authoritative": True,
    },
    {
        "step": 11,
        "id": "grounded_answer_style_depth_frame",
        "component": "services/orb_grounded_answer_style_service.py, orb_institutional_depth_frame_service.py",
        "role": "Grounded answer style and institutional depth framing.",
        "authoritative": True,
    },
    {
        "step": 12,
        "id": "orb_response_composer",
        "component": "services/orb_converged_general_assistant_service.py → orb_general_assistant_service",
        "role": "LLM execution with converged residential intelligence wrapper.",
        "authoritative": True,
    },
    {
        "step": 13,
        "id": "explainability_metadata",
        "component": "services/orb_unified_explainability_service.py",
        "role": "Post-answer explainability, cognition labels, vault domains.",
        "authoritative": False,
    },
    {
        "step": 14,
        "id": "response_support_actions",
        "component": "services/orb_response_support_service.py, orb_action_engine_service.py",
        "role": "Support actions and quality gate preview in response metadata.",
        "authoritative": False,
    },
]

AUDIT_GAPS: list[dict[str, str]] = [
    {
        "area": "duplicate_routing",
        "finding": "orb_unified_cognition_runtime exists but is not wired to live standalone chat.",
        "canonical": "shared_institutional_cognition_runtime + orb_brain_convergence_orchestrator_service",
    },
    {
        "area": "soft_vs_mandatory_contracts",
        "finding": "orb_standalone_brain_service applied contracts as prompt hints only.",
        "canonical": "orb_mandatory_response_contract_service enforces mandatory shape for high-risk scenarios.",
    },
    {
        "area": "streaming_parity",
        "finding": "Stream route had early status/fast-opening before context; brain decision now shared via orchestrator.",
        "canonical": "_build_standalone_request_context for both routes.",
    },
    {
        "area": "scenario_playbook_coverage",
        "finding": "Playbooks exist for missing return, allegations, self-harm, parent removal, exploitation, peer harm, medication, restraint, online harm.",
        "canonical": "orb_multi_scenario_detector_service maps prompt segments to scenario_types.",
    },
    {
        "area": "debug_visibility",
        "finding": "Founder/admin brain-route debug endpoint added at POST /orb/standalone/brain-route/debug.",
        "canonical": "orb_brain_convergence_orchestrator_service.build_debug_payload",
    },
    {
        "area": "test_harness",
        "finding": "orb_expert_scenario_bank_service supports batch scenario evaluation; not yet wired to standalone QA UI.",
        "canonical": "tests/test_orb_brain_convergence_orchestrator.py",
    },
    {
        "area": "response_quality_gate",
        "finding": "orb_answer_quality_gate_service scores answers; mandatory marker checks added for scenario contracts.",
        "canonical": "orb_mandatory_response_contract_service.validate_answer_markers",
    },
    {
        "area": "universal_convergence",
        "finding": "Action engine, dictate/write adapter, document intelligence and template review routes now call build_brain_decision.",
        "canonical": "orb_brain_convergence_orchestrator_service + orb_universal_response_contract_service",
    },
]

PARALLEL_NON_CANONICAL = [
    "orb_unified_cognition_runtime — broader alternate orchestrator, not on live standalone path",
    "run_brain_selection_shadow — non-authoritative comparison only",
    "frontend routeOrbBrainIntent — display metadata only",
]

# Internal audit map — user-facing ORB Residential entrypoints vs converged orchestrator.
ORB_ENTRYPOINT_AUDIT: list[dict[str, Any]] = [
    {
        "entrypoint": "/orb/standalone/conversation",
        "user_visible": True,
        "uses_converged_orchestrator": True,
        "current_route": "orb_brain_convergence_orchestrator_service.build_brain_decision",
        "risk": "low",
        "fix_needed": False,
        "notes": "Canonical sync chat entrypoint.",
    },
    {
        "entrypoint": "/orb/standalone/conversation/stream",
        "user_visible": True,
        "uses_converged_orchestrator": True,
        "current_route": "_build_standalone_request_context → build_brain_decision",
        "risk": "low",
        "fix_needed": False,
        "notes": "Same brain decision as sync conversation.",
    },
    {
        "entrypoint": "/orb/standalone/actions/run",
        "user_visible": True,
        "uses_converged_orchestrator": True,
        "current_route": "orb_action_engine_service.run_action → build_brain_decision",
        "risk": "medium",
        "fix_needed": False,
        "notes": "Response support chips route through action engine convergence.",
    },
    {
        "entrypoint": "/orb/standalone/brain-route",
        "user_visible": True,
        "uses_converged_orchestrator": True,
        "current_route": "build_brain_decision (preview sanitised for normal users)",
        "risk": "low",
        "fix_needed": False,
        "notes": "Authoritative brain-route preview.",
    },
    {
        "entrypoint": "/orb/dictate/analyze|finalise|generate",
        "user_visible": True,
        "uses_converged_orchestrator": True,
        "current_route": "orb_document_brain_adapter_service → build_brain_decision",
        "risk": "medium",
        "fix_needed": False,
        "notes": "Dictate document path shares orchestrator with Write.",
    },
    {
        "entrypoint": "/orb/voice/* transport",
        "user_visible": True,
        "uses_converged_orchestrator": False,
        "current_route": "Session/STT/TTS transport; cognition via conversation/stream",
        "risk": "low",
        "fix_needed": False,
        "notes": "Voice answers use /orb/standalone/conversation/stream with source_surface=voice.",
    },
    {
        "entrypoint": "/orb/standalone/documents/intelligence",
        "user_visible": True,
        "uses_converged_orchestrator": True,
        "current_route": "orb_document_intelligence_service._with_brain_metadata → build_brain_decision",
        "risk": "medium",
        "fix_needed": False,
        "notes": "Document lenses attach convergence metadata.",
    },
    {
        "entrypoint": "/orb/standalone/review-this",
        "user_visible": True,
        "uses_converged_orchestrator": True,
        "current_route": "build_brain_decision before shared cognition",
        "risk": "low",
        "fix_needed": False,
        "notes": "Full answer still via conversation with document_text.",
    },
    {
        "entrypoint": "frontend response support chips",
        "user_visible": True,
        "uses_converged_orchestrator": True,
        "current_route": "/orb/standalone/actions/run",
        "risk": "medium",
        "fix_needed": False,
        "notes": "Backend-supported chips use action engine; UI prefill is fallback only.",
    },
    {
        "entrypoint": "/orb/standalone/knowledge/search",
        "user_visible": True,
        "uses_converged_orchestrator": False,
        "current_route": "orb_rag_retrieval_service.search (retrieval only)",
        "risk": "low",
        "fix_needed": False,
        "notes": "No LLM answer — RAG index search only.",
    },
]


class OrbBrainRouteMapService:
    def canonical_route(self) -> list[dict[str, Any]]:
        return list(CANONICAL_STANDALONE_BRAIN_ROUTE)

    def audit_gaps(self) -> list[dict[str, str]]:
        return list(AUDIT_GAPS)

    def parallel_layers(self) -> list[str]:
        return list(PARALLEL_NON_CANONICAL)

    def entrypoint_audit(self) -> list[dict[str, Any]]:
        return list(ORB_ENTRYPOINT_AUDIT)

    def trace_live_route(self, *, route: str = "/orb/standalone/conversation") -> dict[str, Any]:
        stream = route.endswith("/stream")
        steps = []
        for entry in CANONICAL_STANDALONE_BRAIN_ROUTE:
            step_id = entry["id"]
            if stream and step_id == "orb_standalone_conversation":
                continue
            if not stream and step_id == "orb_standalone_conversation_stream":
                continue
            steps.append(dict(entry))
        return {
            "surface": "orb_standalone",
            "entry_route": route,
            "canonical": True,
            "steps": steps,
            "parallel_non_authoritative": self.parallel_layers(),
            "audit_gaps": self.audit_gaps(),
        }


orb_brain_route_map_service = OrbBrainRouteMapService()
