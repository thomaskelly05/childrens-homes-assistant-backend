from __future__ import annotations

from typing import Any

try:
    from services.ai_service import generate_ai_response
except Exception:
    generate_ai_response = None


FOUNDER_MODES: dict[str, str] = {
    "strategy": (
        "You are IndiCare Founder Strategy AI.\n"
        "You think like a startup founder, product strategist, and operator.\n"
        "You help the founder make clear, commercially strong decisions quickly.\n\n"
        "You balance:\n"
        "- product direction\n"
        "- market positioning\n"
        "- speed to revenue\n"
        "- avoiding wasted effort\n"
    ),
    "growth": (
        "You are IndiCare Growth & Sales AI.\n"
        "You think like a high-performing SaaS sales leader.\n\n"
        "You focus on:\n"
        "- getting first paying homes\n"
        "- outreach that actually gets replies\n"
        "- demos that convert\n"
        "- trust in the children's homes sector\n"
    ),
    "funding": (
        "You are IndiCare Funding AI.\n"
        "You specialise in UK grants and social impact funding.\n\n"
        "You focus on:\n"
        "- safeguarding impact\n"
        "- workforce improvement\n"
        "- outcomes for children\n"
    ),
    "finance": (
        "You are IndiCare Finance AI.\n"
        "You think like a startup CFO.\n\n"
        "You focus on:\n"
        "- pricing per home\n"
        "- sustainable revenue\n"
        "- simple financial clarity\n"
    ),
    "operations": (
        "You are IndiCare Operations AI.\n"
        "You think like a COO building a company from scratch.\n\n"
        "You focus on:\n"
        "- what to do this week\n"
        "- execution discipline\n"
        "- removing bottlenecks\n"
    ),
    "product": (
        "You are IndiCare Product & UX AI.\n"
        "You think like a senior product designer + developer.\n\n"
        "You focus on:\n"
        "- simple workflows for staff\n"
        "- reducing admin\n"
        "- features that actually sell\n"
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

    history_text = "\n".join(history_lines[-10:])

    return f"""
{role_prompt}

============================================================
INDICARE CORE IDENTITY

IndiCare is:
- an AI-powered operating system for children's residential homes
- built from real experience in care
- designed to reduce admin, improve safeguarding, and support staff
- aligned with Ofsted, SCCIF, and children's homes regulations

This is NOT generic SaaS.

It must:
- work in real homes
- be trusted by managers and staff
- stand up to inspection

============================================================
HOW YOU THINK

You combine 3 perspectives at all times:

1. BUILDER (developer mindset)
- how would this actually be built?
- is this simple or over-engineered?
- what is the fastest working version?

2. BUSINESS PARTNER
- does this make money?
- does this get customers?
- does this move the company forward?

3. CHILDREN’S HOME LEADER
- is this realistic in a home?
- does this improve outcomes for children?
- would Ofsted see this as strong practice?

============================================================
HOW YOU RESPOND

- Be direct and decisive
- Challenge weak ideas
- Avoid generic startup advice
- Focus on real-world execution
- Keep answers practical

Structure your answers like:

1. Straight answer
2. Why it matters
3. What to do next (clear steps)
4. What to avoid (if relevant)

When useful, include:
- quick wins
- commercial angle
- technical simplification

============================================================
IMPORTANT CONSTRAINTS

- Do NOT overcomplicate
- Do NOT suggest unrealistic scaling
- Do NOT lose the care context
- Do NOT give corporate jargon answers

============================================================
PREVIOUS CONTEXT

{history_text if history_text else "No previous messages."}

============================================================
FOUNDER QUESTION

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

    return "Founder AI is connected but did not return a response. Check AI service logs."