#!/usr/bin/env python3
"""Generate ORB Residential route map reports for route integrity audits."""

from __future__ import annotations

import json
from pathlib import Path

ROUTES = [
    {
        "route": "POST /orb/standalone/conversation",
        "frontend_caller": "frontend-next/lib/orb/standalone-client.ts (sendStandaloneOrbMessage)",
        "backend_handler": "routers/orb_standalone_routes.py::standalone_orb_conversation",
        "service": "orb_converged_general_assistant_service → finalize_orb_residential_answer",
        "streaming": False,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired",
        "risk_status": "green",
        "bypass_classification": None,
    },
    {
        "route": "POST /orb/standalone/conversation/stream",
        "frontend_caller": "frontend-next/lib/orb/standalone-client.ts (sendStandaloneOrbMessageStream) → orb-care-companion.tsx",
        "backend_handler": "routers/orb_standalone_routes.py::standalone_orb_conversation_stream",
        "service": "orb_converged_general_assistant_service.stream_answer → finalize_orb_residential_answer (metadata event)",
        "streaming": True,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired (metadata replaces raw stream)",
        "risk_status": "green",
        "bypass_classification": None,
        "notes": "Fixed: frontend resolveOrbStreamedAnswer now prefers repaired metadata; onMetadata swaps repaired text.",
    },
    {
        "route": "POST /orb/residential/conversation",
        "frontend_caller": "none (premium API alias; /orb uses standalone routes)",
        "backend_handler": "routers/orb_residential_premium_routes.py::orb_residential_conversation",
        "service": "orb_converged_general_assistant_service → finalize_orb_residential_answer",
        "streaming": False,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired",
        "risk_status": "green",
        "bypass_classification": None,
        "notes": "Fixed in this pass — previously bypassed finalization.",
    },
    {
        "route": "POST /orb/dictate/generate",
        "frontend_caller": "frontend-next/lib/orb/dictate/orb-dictate-client.ts → orb-dictate-station.tsx, orb-write-standalone-panel.tsx",
        "backend_handler": "routers/orb_dictate_routes.py::dictate_generate",
        "service": "generate_dictate_note → _finalize_dictate_text → finalize_orb_residential_answer",
        "streaming": False,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired (professional_note)",
        "risk_status": "green",
        "bypass_classification": None,
        "notes": "Fixed source_text pass-through for record-generation detection.",
    },
    {
        "route": "POST /orb/dictate/finalise",
        "frontend_caller": "orb-dictate-client.ts",
        "backend_handler": "routers/orb_dictate_routes.py::dictate_finalise",
        "service": "finalise_dictate_document → generate_dictate_note",
        "streaming": False,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired",
        "risk_status": "green",
        "bypass_classification": None,
    },
    {
        "route": "POST /orb/dictate/prepare-write",
        "frontend_caller": "orb-write-standalone-panel.tsx",
        "backend_handler": "routers/orb_dictate_routes.py::dictate_prepare_write",
        "service": "prepare_write_document → _finalize_dictate_text",
        "streaming": False,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired",
        "risk_status": "green",
        "bypass_classification": None,
    },
    {
        "route": "POST /orb/dictate/edit",
        "frontend_caller": "orb-dictate-studio.tsx",
        "backend_handler": "routers/orb_dictate_routes.py::dictate_edit",
        "service": "edit_dictate_document → _finalize_dictate_text",
        "streaming": False,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired (revised_text)",
        "risk_status": "green",
        "bypass_classification": None,
    },
    {
        "route": "POST /orb/dictate/analyze",
        "frontend_caller": "orb-dictate-station.tsx",
        "backend_handler": "routers/orb_dictate_routes.py::dictate_analyze",
        "service": "analyze_dictate_session → _finalize_dictate_text (analysis path)",
        "streaming": False,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired where text returned",
        "risk_status": "green",
        "bypass_classification": None,
    },
    {
        "route": "POST /orb/standalone/actions/run",
        "frontend_caller": "orb-care-companion.tsx (action chips)",
        "backend_handler": "routers/orb_standalone_routes.py::standalone_orb_action_run",
        "service": "orb_action_engine_service.run_action → finalize_standalone_intelligence",
        "streaming": False,
        "repair_and_validate_final_answer": "conditional (care-related actions)",
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired for care actions",
        "risk_status": "green",
        "bypass_classification": None,
    },
    {
        "route": "POST /orb/standalone/shift-builder/generate",
        "frontend_caller": "frontend-next/lib/orb/shift-builder.ts",
        "backend_handler": "routers/orb_shift_builder_routes.py::shift_builder_generate",
        "service": "orb_shift_builder_service → orb_action_engine_service (finalize via action engine)",
        "streaming": False,
        "repair_and_validate_final_answer": "conditional",
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired when care action path",
        "risk_status": "amber",
        "bypass_classification": "quality-critical",
        "notes": "Uses action engine finalization; shift plan sections may need dedicated record repair audit.",
    },
    {
        "route": "Voice → Chat handoff",
        "frontend_caller": "orb-voice-station.tsx onSendToOrb → sendMessage",
        "backend_handler": "POST /orb/standalone/conversation/stream",
        "service": "same as chat stream",
        "streaming": True,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": True,
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired",
        "risk_status": "green",
        "bypass_classification": None,
    },
    {
        "route": "Voice realtime WebSocket",
        "frontend_caller": "orb-realtime-voice-client.ts",
        "backend_handler": "WS /orb/voice/ws/{session_id}",
        "service": "orb_voice_realtime_ws_handler (provider realtime)",
        "streaming": True,
        "repair_and_validate_final_answer": False,
        "sanitize_live_record_output": False,
        "adult_identity_language": False,
        "childrens_home_terminology": False,
        "orb_residential_framework": False,
        "safeguarding_proportionality_guard": False,
        "displayed_answer": "raw realtime (handoff to Dictate/Chat for records)",
        "risk_status": "amber",
        "bypass_classification": "quality-critical",
        "notes": "Realtime session defers record finalization to Dictate/Chat handoff paths.",
    },
    {
        "route": "POST /orb/conversation (legacy)",
        "frontend_caller": "orb-standalone-chat.tsx (legacy, not /orb route)",
        "backend_handler": "routers/orb_routes.py::orb_conversation",
        "service": "orb_general_assistant_service (no residential finalizer)",
        "streaming": False,
        "repair_and_validate_final_answer": False,
        "sanitize_live_record_output": False,
        "adult_identity_language": False,
        "childrens_home_terminology": False,
        "orb_residential_framework": False,
        "safeguarding_proportionality_guard": False,
        "displayed_answer": "raw",
        "risk_status": "red",
        "bypass_classification": "dead code",
        "notes": "Legacy OS-linked route; not used by ORB Residential /orb shell.",
    },
    {
        "route": "POST /assistant/orb/conversation",
        "frontend_caller": "OS operational surfaces (not ORB Residential)",
        "backend_handler": "routers/orb_operational_routes.py",
        "service": "orb_operational_assistant_service → finalize_standalone_intelligence",
        "streaming": False,
        "repair_and_validate_final_answer": True,
        "sanitize_live_record_output": "conditional",
        "adult_identity_language": "conditional",
        "childrens_home_terminology": "conditional",
        "orb_residential_framework": "operational",
        "safeguarding_proportionality_guard": True,
        "displayed_answer": "repaired",
        "risk_status": "amber",
        "bypass_classification": "low risk",
        "notes": "OS-linked operational ORB — separate product surface.",
    },
]

BYPASS_PATHS = [
    {
        "id": "stream-frontend-partial-preference",
        "description": "Frontend preferred longer raw SSE partial over repaired metadata.answer",
        "status": "fixed",
        "classification": "production-critical",
        "fix": "resolveOrbStreamedAnswer + standalone-client.ts + onMetadata replacement",
    },
    {
        "id": "residential-premium-no-finalize",
        "description": "POST /orb/residential/conversation skipped finalize_orb_residential_answer",
        "status": "fixed",
        "classification": "quality-critical",
        "fix": "orb_residential_premium_routes.py",
    },
    {
        "id": "dictate-source-text",
        "description": "Dictate finalization used generated document as user_input, skipping record repair",
        "status": "fixed",
        "classification": "production-critical",
        "fix": "source_text parameter on finalize_document_intelligence",
    },
    {
        "id": "voice-realtime-raw",
        "description": "WebSocket realtime voice returns unrepaired provider text in-session",
        "status": "open",
        "classification": "quality-critical",
        "mitigation": "Record outputs hand off to Dictate/Chat which repair",
    },
    {
        "id": "legacy-orb-conversation",
        "description": "POST /orb/conversation lacks residential finalization",
        "status": "open",
        "classification": "dead code",
        "mitigation": "Not mounted by ORB Residential frontend",
    },
]


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    reports = root / "reports"
    reports.mkdir(exist_ok=True)

    summary = {
        "generated_by": "scripts/generate_orb_residential_route_map.py",
        "canonical_finalizer": "services/orb_residential_finalization_service.py::finalize_orb_residential_answer",
        "route_count": len(ROUTES),
        "risk_counts": {
            "green": sum(1 for r in ROUTES if r["risk_status"] == "green"),
            "amber": sum(1 for r in ROUTES if r["risk_status"] == "amber"),
            "red": sum(1 for r in ROUTES if r["risk_status"] == "red"),
        },
        "bypass_paths": BYPASS_PATHS,
        "routes": ROUTES,
    }

    json_path = reports / "orb_residential_route_map.json"
    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    md_lines = [
        "# ORB Residential Route Map",
        "",
        "Route integrity audit for ORB Residential record-generation and conversation surfaces.",
        "",
        f"**Canonical finalizer:** `{summary['canonical_finalizer']}`",
        "",
        "## Risk summary",
        "",
        f"- Green: {summary['risk_counts']['green']}",
        f"- Amber: {summary['risk_counts']['amber']}",
        f"- Red: {summary['risk_counts']['red']}",
        "",
        "## Routes",
        "",
    ]
    for route in ROUTES:
        md_lines.append(f"### `{route['route']}` — **{route['risk_status']}**")
        md_lines.append(f"- Frontend: {route['frontend_caller']}")
        md_lines.append(f"- Handler: {route['backend_handler']}")
        md_lines.append(f"- Service: {route['service']}")
        md_lines.append(f"- Streaming: {route['streaming']}")
        md_lines.append(f"- Final repair: {route['repair_and_validate_final_answer']}")
        md_lines.append(f"- sanitize_live_record_output: {route['sanitize_live_record_output']}")
        md_lines.append(f"- Displayed answer: {route['displayed_answer']}")
        if route.get("notes"):
            md_lines.append(f"- Notes: {route['notes']}")
        md_lines.append("")

    md_lines.extend(["## Bypass paths", ""])
    for bypass in BYPASS_PATHS:
        md_lines.append(f"### {bypass['id']} ({bypass['classification']}) — **{bypass['status']}**")
        md_lines.append(f"- {bypass['description']}")
        if bypass.get("fix"):
            md_lines.append(f"- Fix: {bypass['fix']}")
        if bypass.get("mitigation"):
            md_lines.append(f"- Mitigation: {bypass['mitigation']}")
        md_lines.append("")

    md_path = reports / "orb_residential_route_map.md"
    md_path.write_text("\n".join(md_lines), encoding="utf-8")
    print(f"Wrote {json_path} and {md_path}")


if __name__ == "__main__":
    main()
