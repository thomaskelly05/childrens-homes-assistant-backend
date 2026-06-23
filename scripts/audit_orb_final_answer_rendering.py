#!/usr/bin/env python3
"""ORB Final Answer Rendering Audit — trace assembly for benchmark prompts."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence
from services.orb_fast_opening_service import (
    fast_opening_for_message,
    merge_stream_answer,
    strip_streaming_artifacts_from_answer,
)
from services.orb_final_answer_repair_service import repair_and_validate_final_answer
from services.orb_therapeutic_language_contract_service import (
    build_safe_residential_scenario_scaffold,
    is_short_residential_scenario,
)
from services.orb_universal_answer_contract_map_service import detect_contract_family
from services.orb_response_support_service import build_response_support_chips

BENCHMARKS: list[dict[str, str]] = [
    {
        "id": "school_refusal",
        "prompt": "Sophie refused school this morning and became dysregulated. How should I record this?",
        "mode": "Ask ORB",
    },
    {
        "id": "upset_after_contact",
        "prompt": "A young person was upset after contact. How should staff record this?",
        "mode": "Ask ORB",
    },
    {
        "id": "allegation_against_staff",
        "prompt": "A child has made an allegation against a member of staff. What should we do?",
        "mode": "Safeguarding",
    },
    {
        "id": "missing_from_care",
        "prompt": "A young person is missing from care. What are the immediate steps?",
        "mode": "Safeguarding",
    },
    {
        "id": "whistleblowing",
        "prompt": "I need to raise a whistleblowing concern about unsafe practice in the home.",
        "mode": "Ask ORB",
    },
    {
        "id": "send_recording",
        "prompt": "Help me record a SEND support session with a non-verbal young person.",
        "mode": "Record",
    },
]


def _simulate_strong_brain_answer(prompt: str, mode: str) -> str:
    """Representative scenario-specific brain output (structure typical of ORB Residential brain)."""
    if is_short_residential_scenario(prompt):
        return build_safe_residential_scenario_scaffold(prompt)

    family = detect_contract_family(prompt) or "general"
    if "allegation" in prompt.lower():
        return """## Immediate safety and boundaries

Listen calmly. Do not promise secrecy. Separate the accused staff member from direct contact with the child where policy requires it.

## What to do now

- Preserve safety and evidence — do not investigate beyond immediate safety steps.
- Escalate to the manager, designated safeguarding lead and LADO where threshold is met.
- The accused person must not manage the concern or contact witnesses alone.
- Record facts, not opinions — protect child and staff rights.

## Recording guidance

Contemporaneous chronology: who said what, when, visible injuries, immediate actions taken.
Record the child's exact words where known — do not invent quotes.

## Manager oversight

Inform the registered manager promptly. Follow local allegation protocol and preserve evidence."""

    if "missing from care" in prompt.lower() or "missing" in prompt.lower():
        return """## Immediate steps

First, confirm whether the young person is safe and follow your missing-from-care procedure.

## Actions now

- Notify the manager and on-call safeguarding lead.
- Contact police if required by policy or risk level.
- Record last known whereabouts, clothing, associates and risk factors.
- Arrange return-home interview and welfare check when they return.

## Recording

Use observable facts. Record what was known at each stage and who was informed.
Do not speculate about motives."""

    if "whistleblow" in prompt.lower():
        return """## Whistleblowing route

Protected disclosure must not be suppressed. Follow your whistleblowing policy and governance route.

## Immediate priorities

- If children may be at risk, escalate safeguarding immediately.
- Record what was observed or reported, when, and who has been informed.
- Do not retaliate or advise silence.
- Use the appropriate senior person, safeguarding route or external body where policy allows.

## Recording

Factual chronology only. Separate observation from interpretation."""

    if "send" in prompt.lower() or "non-verbal" in prompt.lower():
        return """## SEND session recording

Record how the young person communicated (AAC, symbols, gestures, device) — not only what adults inferred.

## Session structure

- Communication method used and how adults checked understanding.
- What the young person showed, selected or indicated.
- Adult support, pacing and environmental adjustments.
- Outcomes and follow-up for education/health partners.

## Boundaries

Do not invent quotes. Use '[communicated via widget/symbol]' where exact words are unknown."""

  # upset after contact / school refusal style
    return """## What happened

The young person was observed to be upset following contact. Staff offered calm reassurance and space.

## Child voice

Record the young person's words where known. Note what they communicated through behaviour or affect.

## Staff response

What adults did to support, de-escalate and restore safety. Who was informed.

## Follow-up

Whether manager review, contact review or additional support is needed."""


def _run_frontend_reshape(content: str, user_message: str, mode: str) -> dict[str, Any]:
    guide_ts = ROOT / "frontend-next/lib/orb/orb-residential-chat-response-guide.ts"
    snippet = f"""
import {{
  detectResidentialChatSupportType,
  shouldApplyResidentialChatGuidance,
  isGenericResidentialSafeguardingEssay,
  answerLooksGuidedResidentialChat,
  reshapeResidentialChatAnswer,
  reshapeGenericResidentialChatAnswer,
  buildResidentialGuidedChatFallback
}} from '{guide_ts.as_posix()}';

const content = {json.dumps(content)};
const userMessage = {json.dumps(user_message)};
const mode = {json.dumps(mode)};

const result = {{
  support_type: detectResidentialChatSupportType(userMessage, mode),
  should_apply_guidance: shouldApplyResidentialChatGuidance(userMessage, mode),
  is_generic_essay: isGenericResidentialSafeguardingEssay(content),
  looks_guided: answerLooksGuidedResidentialChat(content),
  reshaped: reshapeResidentialChatAnswer(content, userMessage, mode),
  generic_reshape: reshapeGenericResidentialChatAnswer(content, userMessage, mode),
  fallback: buildResidentialGuidedChatFallback(userMessage, mode),
}};
console.log(JSON.stringify(result));
"""
    proc = subprocess.run(
        ["npx", "tsx", "-e", snippet],
        cwd=ROOT / "frontend-next",
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        return {"error": proc.stderr or proc.stdout}
    return json.loads(proc.stdout.strip())


def audit_prompt(case: dict[str, str]) -> dict[str, Any]:
    prompt = case["prompt"]
    mode = case["mode"]

    packet = indicare_intelligence_core_service.build_intelligence_packet(prompt, mode=mode)
    expert_depth = str(packet.get("expert_depth") or "")
    fast_opening = fast_opening_for_message(prompt, expert_depth=expert_depth, mode=mode)
    contract_family = detect_contract_family(prompt)

    raw_brain = _simulate_strong_brain_answer(prompt, mode)

    # Stream path simulation
    stream_chunks: list[str] = []
    if fast_opening:
        stream_chunks.append(f"{fast_opening}\n\n")
    # Simulate tokenized model stream (abbreviated)
    for para in raw_brain.split("\n\n"):
        stream_chunks.append(para + "\n\n")
    streamed_text = "".join(stream_chunks)

    merged_pre_finalize = merge_stream_answer(
        fast_opening=fast_opening,
        model_answer=raw_brain,
        streamed_text=streamed_text,
    )
    stripped = strip_streaming_artifacts_from_answer(merged_pre_finalize, fast_opening=fast_opening)

    repaired, repair_meta = repair_and_validate_final_answer(
        stripped,
        contract_family=contract_family,
        message=prompt,
        mode=mode,
        fast_opening=fast_opening,
    )

    final_answer, finalize_meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer=repaired,
        prompt_text=prompt,
        message=prompt,
        mode=mode,
        record_learning=False,
    )

    response_support = build_response_support_chips(packet, quality_gate=finalize_meta.get("answer_quality_gate"), mode=mode)

    frontend = _run_frontend_reshape(final_answer, prompt, mode)
    reshaped = frontend.get("reshaped", "")
    demoted = reshaped != final_answer
    has_additional_context = "Additional context from ORB" in reshaped

    return {
        "id": case["id"],
        "prompt": prompt,
        "mode": mode,
        "layers": {
            "contract_family": contract_family,
            "therapeutic_scaffold_available": is_short_residential_scenario(prompt),
            "expert_depth": expert_depth,
            "fast_opening": fast_opening,
            "guardrail_repair": {
                "repair_applied": repair_meta.get("repair_applied"),
                "answer_repaired": repair_meta.get("answer_repaired"),
                "validation_passed": repair_meta.get("final_answer_validation_passed"),
                "repair_reason": repair_meta.get("repair_reason"),
            },
            "quality_gate": finalize_meta.get("answer_quality_gate", {}),
            "response_support_chips": response_support,
            "explainability": "Built in route handler via orb_unified_explainability_service (metadata only, not answer body)",
        },
        "A_raw_brain_answer": raw_brain[:500] + ("…" if len(raw_brain) > 500 else ""),
        "B_backend_final_payload_answer": final_answer[:600] + ("…" if len(final_answer) > 600 else ""),
        "C_stream_chunks_preview": [c[:120] + ("…" if len(c) > 120 else "") for c in stream_chunks[:4]],
        "D_frontend_rendered": reshaped[:800] + ("…" if len(reshaped) > 800 else ""),
        "E_layer_attribution": {
            "primary_opening_I_can_help": "frontend: buildResidentialGuidedChatFallback" if demoted and "I can help you think this through" in reshaped else (
                "frontend: reshapeResidentialChatAnswer" if demoted else "backend: brain answer (passed through)"
            ),
            "additional_context_section": "frontend: reshapeGenericResidentialChatAnswer" if has_additional_context else "none",
            "scenario_specific_body": (
                "demoted to Additional context" if has_additional_context
                else "discarded" if demoted and not has_additional_context
                else "rendered as primary"
            ),
            "fast_opening_in_stream": "backend: orb_fast_opening_service (stripped at merge if model substantial)",
            "contract_repair": "backend: orb_final_answer_repair_service",
            "response_support": "metadata chips only (not in message body)",
        },
        "frontend_diagnostics": {
            k: v for k, v in frontend.items()
            if k not in ("reshaped", "fallback", "generic_reshape")
        },
        "demotion_detected": demoted,
        "strong_answer_surfaced": not demoted,
    }


def main() -> None:
    results = [audit_prompt(case) for case in BENCHMARKS]
    print(json.dumps(results, indent=2))
    demoted = [r["id"] for r in results if r["demotion_detected"]]
    surfaced = [r["id"] for r in results if r["strong_answer_surfaced"]]
    print("\n=== SUMMARY ===", file=sys.stderr)
    print(f"Strong answers surfaced as primary: {surfaced}", file=sys.stderr)
    print(f"Strong answers demoted by frontend reshape: {demoted}", file=sys.stderr)


if __name__ == "__main__":
    main()
