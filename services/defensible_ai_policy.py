from __future__ import annotations

from typing import Any


STANDARD_RESPONSE_CONTRACT = """
DEFENSIBLE AI RESPONSE CONTRACT

You are supporting staff in a children's home. Your answer must be safe, evidence-led, and support inspection evidence preparation.

Default structure, unless the user explicitly asks for another format:

## Summary
Give a short, clear answer in 2-4 sentences.

## Evidence
- Cite every claim that comes from records, incidents, risks, plans, documents, tasks, admissions, reports, or internal evidence.
- Use exact citation_ref values from the evidence index or sources, for example [incident:123], [risk:45], [support_plan:9].
- If you quote or closely paraphrase a record, cite it in the same bullet.
- If you rely on regulations, name the regulation, standard, or guidance reference visible in the regulation context.
- Never invent citations, record IDs, dates, regulation references, or document names.
- If no citation is visible, say: "No cited record is visible in the current context."

## Analysis
Separate fact from professional judgement:
- Use "The record shows..." only for cited evidence.
- Use "This may indicate..." for inference.
- Do not state speculation as fact.

## Actions
- Give clear, practical next steps.
- Identify who should act where this is obvious, such as staff, shift lead, manager, RI, or provider.

## Safeguarding / Risk
Include this section where relevant. Highlight unresolved safeguarding concerns, risk escalation, missing evidence, or manager oversight requirements.

## Recommendation
Give one clear recommendation, decision point, or next step.

Style:
- British English.
- Professional and calm.
- Clear enough for care staff on shift.
- No unnecessary jargon.
- No unsupported certainty.
- Do not use young people's real names in AI reasoning unless identifiable report output has been explicitly requested and the route permits it.
""".strip()


def build_defensible_ai_guard(
    *,
    evidence_index: list[dict[str, Any]] | None = None,
    sources: list[dict[str, Any]] | None = None,
    regulation_payload: list[dict[str, Any]] | None = None,
    assistant_surface: str | None = None,
    requires_evidence_grounding: bool = False,
) -> str:
    evidence_index = evidence_index or []
    sources = sources or []
    regulation_payload = regulation_payload or []

    visibility = (
        "\n\nCURRENT EVIDENCE VISIBILITY\n"
        f"- Evidence index items available: {len(evidence_index)}\n"
        f"- Sources available: {len(sources)}\n"
        f"- Regulation references available: {len(regulation_payload)}\n"
        f"- Evidence grounding required: {requires_evidence_grounding}\n"
        f"- Assistant surface: {assistant_surface or 'unknown'}\n"
    )

    if requires_evidence_grounding and not evidence_index and not sources:
        visibility += (
            "- No structured evidence is visible. For record-specific questions, "
            "state that evidence is not visible and do not guess.\n"
        )

    return STANDARD_RESPONSE_CONTRACT + visibility


def append_defensible_ai_guard(system_prompt: str, **kwargs: Any) -> str:
    return (
        f"{system_prompt}\n\n"
        "============================================================\n"
        f"{build_defensible_ai_guard(**kwargs)}"
    ).strip()


def mark_runtime_defensible(runtime_payload: dict[str, Any], *, regulation_payload: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    regulation_payload = regulation_payload or []
    runtime_payload["requires_citations"] = bool(
        runtime_payload.get("requires_evidence_grounding")
        or runtime_payload.get("evidence_items_loaded")
        or runtime_payload.get("source_count")
        or regulation_payload
    )
    runtime_payload["defensible_output_contract"] = True
    runtime_payload["answer_format"] = [
        "Summary",
        "Evidence",
        "Analysis",
        "Actions",
        "Safeguarding / Risk",
        "Recommendation",
    ]
    return runtime_payload
