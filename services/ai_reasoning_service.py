from __future__ import annotations

import json
import os
from typing import Any

from services.defensible_ai_policy import build_defensible_ai_guard


SYSTEM_PROMPT = """
You are IndiCare, an expert assistant for residential children's homes in England.

You think like a Registered Manager, safeguarding lead and inspection preparation partner.

Rules:
- Use only the evidence in the provided context for child-specific claims.
- Reference evidence using citation_ref values such as [incidents:123].
- Do not invent events, diagnoses, decisions, dates, staff actions or professional involvement.
- If evidence is missing, say exactly what is missing.
- Be practical, trauma-informed, safeguarding-aware and support inspection evidence preparation.
- Do not replace safeguarding procedures, medical advice, legal advice, manager oversight or local authority decision-making.
- Write in clear British English for adults working in a children's home.
""".strip()


def _compact_context(context: dict[str, Any]) -> dict[str, Any]:
    return {
        "assistant_context": context.get("assistant_context") or {},
        "counts_by_category": context.get("counts_by_category") or {},
        "patterns": (context.get("patterns") or [])[:10],
        "inspection_prompts": (context.get("inspection_prompts") or context.get("manager_oversight") or [])[:10],
        "risk_signals": (context.get("risk_signals") or context.get("risk_flags") or [])[:20],
        "timeline": (context.get("timeline") or [])[:40],
        "sources": (context.get("sources") or context.get("items") or [])[:40],
        "evidence_index": (context.get("evidence_index") or context.get("sources") or context.get("items") or [])[:40],
        "pseudonymised": bool(context.get("pseudonymised")),
    }


def _evidence_items(context: dict[str, Any]) -> list[dict[str, Any]]:
    value = context.get("evidence_index") or context.get("sources") or context.get("items") or []
    return value if isinstance(value, list) else []


def _fallback_reasoning(question: str, context: dict[str, Any]) -> str:
    timeline = context.get("timeline") or []
    risks = context.get("risk_signals") or context.get("risk_flags") or []
    patterns = context.get("patterns") or []
    prompts = context.get("inspection_prompts") or context.get("manager_oversight") or []
    sources = context.get("sources") or context.get("items") or []

    recent_refs = []
    for item in sources[:8]:
        ref = item.get("citation_ref") or f"[{item.get('source_table') or item.get('record_type')}:{item.get('record_id') or item.get('id')}]"
        title = item.get("title") or item.get("record_type") or "Record"
        recent_refs.append(f"- {title} {ref}")

    risk_lines = []
    for item in risks[:5]:
        ref = item.get("citation_ref") or f"[{item.get('source_table') or item.get('record_type')}:{item.get('id')}]"
        risk_lines.append(f"- {item.get('title') or 'Risk signal'}: {item.get('summary') or 'Review required'} {ref}")

    pattern_lines = [f"- {item}" for item in patterns[:6]] or ["- No clear pattern has been detected from the current context window."]
    prompt_lines = [f"- {item.get('title')}: {item.get('summary')}" for item in prompts[:5]] or ["- Check whether recent records evidence action, child voice and manager oversight."]

    return "\n".join(
        [
            "## Summary",
            f"Question asked: {question}",
            f"The current OS context contains {len(timeline)} timeline item(s), {len(risks)} risk/safeguarding signal(s), and {len(sources)} evidence source(s).",
            "",
            "## Evidence",
            *(recent_refs or ["- No cited record is visible in the current context."]),
            "",
            "## Analysis",
            *pattern_lines,
            *prompt_lines,
            "",
            "## Actions",
            "- Ask the manager or shift lead to review any high-risk entries and record oversight clearly.",
            "- Link incidents, risks and daily notes to the relevant care/support plan where needed.",
            "- Evidence the young person’s wishes, feelings and presentation before drawing conclusions.",
            "- Record what action was taken, by whom, when it will be reviewed, and the impact on the child.",
            "",
            "## Safeguarding / Risk",
            *(risk_lines or ["- No active risk/safeguarding signal is visible in the current context window."]),
            "",
            "## Recommendation",
            "Manager or shift-lead review should confirm whether the visible evidence is complete before any final judgement is made.",
        ]
    )


async def run_os_reasoning(*, question: str, context: dict[str, Any]) -> str:
    clean_question = str(question or "").strip()
    if not clean_question:
        return "Please enter a question for IndiCare to review."

    evidence = _evidence_items(context)
    guard = build_defensible_ai_guard(
        evidence_index=evidence,
        sources=context.get("sources") or [],
        regulation_payload=context.get("regulation_basis") or [],
        assistant_surface="os_embedded",
        requires_evidence_grounding=True,
    )

    from schemas.data_protection import DataClassification
    from services.ai_external_call_governance import redact_plain_text, try_governed_draft_text

    compact_context = _compact_context(context)
    provider_id = context.get("provider_id") if isinstance(context.get("provider_id"), int) else None
    home_id = context.get("home_id") if isinstance(context.get("home_id"), int) else None
    user_id = context.get("user_id") if isinstance(context.get("user_id"), int) else None

    prompt = f"""
Question:
{clean_question}

Context JSON:
{json.dumps(compact_context, ensure_ascii=False, default=str)}

{guard}
""".strip()
    redacted_prompt, _ = redact_plain_text(prompt, mode="strict")

    gateway_response = try_governed_draft_text(
        feature="orb_text_fallback",
        system_prompt=f"{SYSTEM_PROMPT}\n\n{guard}",
        prompt=redacted_prompt,
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=DataClassification.CONFIDENTIAL_CHILD,
        metadata={"route": "ai_reasoning_service.run_os_reasoning", "draft_only": True},
    )
    if gateway_response is None:
        return _fallback_reasoning(clean_question, context)

    return gateway_response.text or _fallback_reasoning(clean_question, context)
