from __future__ import annotations

import json
import os
from typing import Any

try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - app can still run without optional package
    AsyncOpenAI = None  # type: ignore


SYSTEM_PROMPT = """
You are IndiCare, an expert assistant for residential children's homes in England.

You think like a Registered Manager, safeguarding lead and inspection preparation partner.

Rules:
- Use only the evidence in the provided context for child-specific claims.
- Reference evidence using citation_ref values such as [incidents:123].
- Do not invent events, diagnoses, decisions, dates, staff actions or professional involvement.
- If evidence is missing, say exactly what is missing.
- Be practical, trauma-informed, safeguarding-aware and inspection-ready.
- Do not replace safeguarding procedures, medical advice, legal advice, manager oversight or local authority decision-making.
- Write in clear British English for adults working in a children's home.
""".strip()


RESPONSE_FORMAT = """
Respond using these headings:

1. Current picture
2. Key risks / safeguarding concerns
3. Strengths and protective factors
4. Gaps or inspection challenge points
5. Recommended next actions
6. Evidence references
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
    }


def _fallback_reasoning(question: str, context: dict[str, Any]) -> str:
    timeline = context.get("timeline") or []
    risks = context.get("risk_signals") or context.get("risk_flags") or []
    patterns = context.get("patterns") or []
    prompts = context.get("inspection_prompts") or context.get("manager_oversight") or []
    sources = context.get("sources") or context.get("items") or []

    recent_refs = []
    for item in sources[:8]:
        ref = item.get("citation_ref") or f"{item.get('source_table') or item.get('record_type')}:{item.get('record_id') or item.get('id')}"
        title = item.get("title") or item.get("record_type") or "Record"
        recent_refs.append(f"- {title} [{ref}]")

    risk_lines = []
    for item in risks[:5]:
        ref = item.get("citation_ref") or f"{item.get('source_table') or item.get('record_type')}:{item.get('id')}"
        risk_lines.append(f"- {item.get('title') or 'Risk signal'}: {item.get('summary') or 'Review required'} [{ref}]")

    pattern_lines = [f"- {item}" for item in patterns[:6]] or ["- No clear pattern has been detected from the current context window."]
    prompt_lines = [f"- {item.get('title')}: {item.get('summary')}" for item in prompts[:5]] or ["- Check whether recent records evidence action, child voice and manager oversight."]

    return "\n".join(
        [
            "## 1. Current picture",
            f"Question asked: {question}",
            f"The current OS context contains {len(timeline)} timeline item(s), {len(risks)} risk/safeguarding signal(s), and {len(sources)} evidence source(s).",
            "",
            "## 2. Key risks / safeguarding concerns",
            *(risk_lines or ["- No active risk/safeguarding signal is visible in the current context window."]),
            "",
            "## 3. Strengths and protective factors",
            "- Review recent daily life, keywork, education, family and health records for evidence of stability, engagement and trusted relationships.",
            "- Where positive progress is present, link it to the plan and the child’s voice.",
            "",
            "## 4. Gaps or inspection challenge points",
            *pattern_lines,
            *prompt_lines,
            "",
            "## 5. Recommended next actions",
            "- Ask the manager or shift lead to review any high-risk entries and record oversight clearly.",
            "- Link incidents, risks and daily notes to the relevant care/support plan where needed.",
            "- Evidence the young person’s wishes, feelings and presentation before drawing conclusions.",
            "- Record what action was taken, by whom, when it will be reviewed, and the impact on the child.",
            "",
            "## 6. Evidence references",
            *(recent_refs or ["- No evidence references were available in the current context."]),
        ]
    )


async def run_os_reasoning(*, question: str, context: dict[str, Any]) -> str:
    clean_question = str(question or "").strip()
    if not clean_question:
        return "Please enter a question for IndiCare to review."

    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if not api_key or AsyncOpenAI is None:
        return _fallback_reasoning(clean_question, context)

    client = AsyncOpenAI(api_key=api_key)
    compact_context = _compact_context(context)

    prompt = f"""
Question:
{clean_question}

Context JSON:
{json.dumps(compact_context, ensure_ascii=False, default=str)}

{RESPONSE_FORMAT}
""".strip()

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.25,
    )

    return response.choices[0].message.content or _fallback_reasoning(clean_question, context)
