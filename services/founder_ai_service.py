from __future__ import annotations

from typing import Any

try:
    from services.ai_service import generate_ai_response
except Exception:
    generate_ai_response = None


# ============================================================
# FOUNDER MODES (ROLE DEFINITIONS)
# ============================================================

FOUNDER_MODES: dict[str, str] = {
    "strategy": (
        "You are IndiCare Founder Strategy AI.\n"
        "You think like a startup founder, product strategist, and operator.\n"
        "You help the founder make clear, commercially strong decisions quickly."
    ),
    "growth": (
        "You are IndiCare Growth & Sales AI.\n"
        "You think like a high-performing SaaS sales leader.\n"
        "You focus on getting paying customers and driving revenue."
    ),
    "funding": (
        "You are IndiCare Funding AI.\n"
        "You specialise in UK grants and social impact funding.\n"
        "You focus on safeguarding, workforce improvement, and outcomes."
    ),
    "finance": (
        "You are IndiCare Finance AI.\n"
        "You think like a startup CFO.\n"
        "You focus on pricing, revenue, and sustainability."
    ),
    "operations": (
        "You are IndiCare Operations AI.\n"
        "You think like a COO.\n"
        "You focus on execution, prioritisation, and delivery."
    ),
    "product": (
        "You are IndiCare Product & UX AI.\n"
        "You think like a senior product designer + developer.\n"
        "You focus on simple, sellable, real-world features."
    ),
}


# ============================================================
# QUICK ACTIONS (PRESET TASKS)
# ============================================================

FOUNDER_QUICK_ACTIONS: dict[str, dict[str, str]] = {
    "weekly_plan": {
        "mode": "operations",
        "prompt": (
            "Create my weekly Founder Plan for IndiCare.\n"
            "Include:\n"
            "- top 3 priorities\n"
            "- daily actions\n"
            "- quick win\n"
            "- what to avoid"
        ),
    },
    "first_customers": {
        "mode": "growth",
        "prompt": (
            "Create a practical plan to get IndiCare its first 5 paying children's homes.\n"
            "Include:\n"
            "- who to target\n"
            "- outreach message\n"
            "- demo approach\n"
            "- follow-up plan\n"
            "- next 7 days actions"
        ),
    },
    "pricing_model": {
        "mode": "finance",
        "prompt": (
            "Create a simple pricing model for IndiCare.\n"
            "Include tiers, what is included, and a strong pilot offer."
        ),
    },
    "funding_summary": {
        "mode": "funding",
        "prompt": (
            "Write a strong funding summary for IndiCare.\n"
            "Focus on safeguarding, Ofsted readiness, workforce impact, and outcomes."
        ),
    },
    "product_focus": {
        "mode": "product",
        "prompt": (
            "What should IndiCare build next?\n"
            "Separate:\n"
            "- must build now\n"
            "- build later\n"
            "- avoid"
        ),
    },
}


# ============================================================
# HELPERS
# ============================================================

def normalise_founder_mode(mode: str | None) -> str:
    clean = (mode or "strategy").strip().lower()
    return clean if clean in FOUNDER_MODES else "strategy"


def get_founder_quick_action(action: str | None) -> dict[str, str] | None:
    clean = (action or "").strip().lower()
    return FOUNDER_QUICK_ACTIONS.get(clean)


# ============================================================
# PROMPT BUILDER
# ============================================================

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

    history_text = "\n".join(history_lines[-10:])

    return f"""
{role_prompt}

============================================================
INDICARE CONTEXT

IndiCare is:
- an AI-powered operating system for children's residential homes
- built from real care experience
- aligned with Ofsted and safeguarding standards

============================================================
HOW YOU THINK

Always combine:

1. BUILDER → keep it simple and buildable
2. BUSINESS → focus on revenue and traction
3. CARE → ensure it works in real homes

============================================================
HOW YOU RESPOND

- Be direct
- Avoid generic advice
- Focus on real execution
- Give clear next steps

Structure:
1. Straight answer
2. Why it matters
3. What to do next
4. What to avoid (if needed)

============================================================
PREVIOUS CONTEXT

{history_text if history_text else "No previous messages."}

============================================================
FOUNDER QUESTION

{message}
""".strip()


# ============================================================
# MAIN AI EXECUTION
# ============================================================

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
            return await generate_ai_response(
                message=prompt,
                session_id=f"founder_{user.get('id') if user else 'unknown'}",
                history=[],
                role="IndiCare founder",
                training_mode=False,
                speed="balanced",
                response_mode="balanced",
                user_context={
                    "assistant_type": "founder_ai",
                    "scope_type": "founder_private",
                    "founder_mode": normalise_founder_mode(mode),
                },
                user_id=user.get("id") if user else None,
                conversation_id=f"founder_{normalise_founder_mode(mode)}",
            )
        except Exception:
            pass

    return "Founder AI is connected but no response was returned. Check AI service logs."


# ============================================================
# QUICK ACTION EXECUTION
# ============================================================

async def run_founder_quick_action(
    *,
    action: str,
    user: dict[str, Any] | None = None,
) -> str:
    config = get_founder_quick_action(action)

    if not config:
        return "Invalid quick action."

    return await run_founder_ai(
        mode=config["mode"],
        message=config["prompt"],
        user=user,
        history=[],
    )