from __future__ import annotations

from typing import Any

try:
    from services.openai_service import generate_ai_response
except Exception:
    generate_ai_response = None


FOUNDER_MODES: dict[str, str] = {
    "strategy": (
        "You are IndiCare Founder Strategy AI. You help the founder make clear, "
        "commercially strong decisions about product direction, market positioning, "
        "growth, risk, priorities, and next steps."
    ),
    "growth": (
        "You are IndiCare Growth and Sales AI. You help generate leads, outreach, "
        "sales scripts, LinkedIn content, demo plans, follow-ups, customer discovery, "
        "and customer acquisition strategy."
    ),
    "funding": (
        "You are IndiCare Funding AI. You help write grant applications, impact "
        "statements, funding narratives, outcomes, social value evidence, and project "
        "summaries for IndiCare."
    ),
    "finance": (
        "You are IndiCare Finance AI. You help with pricing, revenue models, "
        "cashflow thinking, forecasts, costs, runway, and founder-level financial decisions."
    ),
    "operations": (
        "You are IndiCare Operations AI. You help the founder organise the company, "
        "build repeatable systems, plan workload, improve delivery, and prioritise execution."
    ),
    "product": (
        "You are IndiCare Product and UX AI. You help the founder improve the product, "
        "simplify workflows, improve user experience, and prioritise features that will "
        "win customers and improve children's home operations."
    ),
}


def normalise_founder_mode(mode: str | None) -> str:
    clean = (mode or "strategy").strip().lower()
    return clean if clean in FOUNDER_MODES else "strategy"


def build_founder_prompt(
    *,
    mode: str,
    message: str,
    user: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
) -> str:
    safe_mode = normalise_founder_mode(mode)
    role_prompt = FOUNDER_MODES[safe_mode]

    history_lines: list[str] = []
    for item in history or []:
        role = str(item.get("role") or "").strip()
        content = str(item.get("content") or "").strip()
        if role and content:
            history_lines.append(f"{role.upper()}: {content}")

    history_text = "\n".join(history_lines[-12:])

    return f"""
{role_prompt}

Context:
- IndiCare is an AI-powered operating system for residential children's homes.
- The founder wants a private business AI area that is not visible to normal users.
- The Founder AI supports business growth, funding, finance, strategy, product and operations.
- Keep Founder HQ completely separate from care records unless the founder explicitly provides care-related context.
- Use British English.
- Be direct, practical and commercially useful.
- Give clear next steps.
- Do not overcomplicate the answer.

Previous conversation:
{history_text if history_text else "No previous messages in this thread."}

Founder message:
{message}
""".strip()


async def run_founder_ai(
    *,
    mode: str,
    message: str,
    user: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
) -> str:
    prompt = build_founder_prompt(
        mode=mode,
        message=message,
        user=user,
        history=history,
    )

    if generate_ai_response is not None:
        try:
            result = await generate_ai_response(prompt)
            if isinstance(result, str) and result.strip():
                return result.strip()
        except Exception:
            pass

    return (
        "Founder AI is connected at route level, but your existing AI model function "
        "has not been matched yet.\n\n"
        "Your message was received successfully.\n\n"
        f"Mode: {normalise_founder_mode(mode)}\n\n"
        f"Message: {message}"
    )
