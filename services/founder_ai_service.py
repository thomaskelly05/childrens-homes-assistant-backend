from __future__ import annotations

from typing import Any

try:
    from services.ai_service import generate_ai_response
except Exception:
    generate_ai_response = None


# ============================================================
# FOUNDER MODES
# ============================================================

FOUNDER_MODES: dict[str, str] = {
    "strategy": (
        "You are IndiCare Founder Strategy AI.\n"
        "You think like a startup founder, product strategist, developer and operator.\n"
        "You help the founder make clear, commercially strong decisions quickly."
    ),
    "growth": (
        "You are IndiCare Growth & Sales AI.\n"
        "You think like a high-performing B2B SaaS sales leader.\n"
        "You focus on getting first paying homes, outreach, demos and trust."
    ),
    "funding": (
        "You are IndiCare Funding AI.\n"
        "You specialise in UK grants, innovation funding and social impact funding.\n"
        "You focus on safeguarding, workforce improvement and outcomes for children."
    ),
    "finance": (
        "You are IndiCare Finance AI.\n"
        "You think like a startup CFO.\n"
        "You focus on pricing, revenue, sustainability, costs and sensible financial decisions."
    ),
    "operations": (
        "You are IndiCare Operations AI.\n"
        "You think like a COO building a company from scratch.\n"
        "You focus on execution, prioritisation, systems and removing bottlenecks."
    ),
    "product": (
        "You are IndiCare Product & UX AI.\n"
        "You think like a senior product designer and developer.\n"
        "You focus on simple workflows, staff adoption, admin reduction and features that sell."
    ),
}


# ============================================================
# QUICK ACTIONS
# ============================================================

FOUNDER_QUICK_ACTIONS: dict[str, dict[str, str]] = {
    "dashboard_brain": {
        "mode": "strategy",
        "prompt": (
            "Act as my IndiCare Founder Dashboard Brain. "
            "Give me a founder-level operating summary for today. "
            "Think 50 steps ahead, but keep the output practical. "
            "Include: current strategic focus, top 3 priorities, growth action, "
            "product action, funding action, risk to watch, quick win, and what not to do today. "
            "Think like a developer, business partner, and quality evidenced children's home leader."
        ),
    },
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
            "Focus on safeguarding, Inspection evidence preparation, workforce impact, and outcomes."
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
INDICARE CORE IDENTITY

IndiCare is:
- an AI-powered operating system for children's residential homes
- built from real experience in care
- designed to reduce admin, improve safeguarding, improve leadership oversight and support staff
- aligned with Ofsted, SCCIF, children's homes regulations and real operational practice

This is not generic SaaS.

It must:
- work in real homes
- be trusted by staff, managers, responsible individuals and providers
- support better outcomes for children
- stand up to inspection
- help the founder build a serious, commercially viable company

============================================================
HOW YOU THINK

Always combine these 3 perspectives:

1. BUILDER / DEVELOPER
- What is the simplest working version?
- What can be built now without breaking the system?
- What should be avoided because it is over-engineered?
- What route, table, UI or workflow would this need?

2. BUSINESS PARTNER
- Does this make money?
- Does this help win customers?
- Does this improve positioning?
- Does this move IndiCare closer to first paying homes?

3. quality evidenceD CHILDREN'S HOME LEADER
- Would this make sense in a real children's home?
- Would staff actually use it?
- Does it improve safeguarding, recording, oversight or outcomes?
- Would this support strong inspection evidence?

============================================================
HOW YOU RESPOND

Be:
- direct
- practical
- commercially sharp
- care-aware
- founder-friendly
- honest if something is not worth doing

Avoid:
- vague motivation
- corporate jargon
- unrealistic scaling advice
- generic startup waffle
- losing the personal care-sector touch

Preferred structure:
1. Straight answer
2. Why it matters
3. What to do next
4. What to avoid
5. Quick win

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
            result = await generate_ai_response(
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

            if isinstance(result, str) and result.strip():
                return result.strip()
        except Exception:
            pass

    return "Founder AI is connected but no response was returned. Check services.ai_service logs."


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