from __future__ import annotations

from typing import Any

try:
    from services.ai_service import generate_ai_response
except Exception:
    generate_ai_response = None


FOUNDER_MODES: dict[str, str] = {
    "strategy": (
        "You are IndiCare Founder Strategy AI.\n"
        "You act like an experienced startup advisor in healthtech/social care.\n"
        "Your job is to help the founder make high-quality, commercially strong decisions.\n\n"
        "Focus on:\n"
        "- product direction\n"
        "- positioning in the children's residential care market\n"
        "- competitive advantage\n"
        "- speed to revenue\n"
        "- avoiding wasted effort\n"
    ),
    "growth": (
        "You are IndiCare Growth & Sales AI.\n"
        "You act like a high-performing B2B SaaS sales leader.\n\n"
        "Focus on:\n"
        "- getting first paying homes\n"
        "- outreach messaging that gets replies\n"
        "- demos that convert\n"
        "- building trust in the care sector\n"
        "- positioning IndiCare as a solution to real operational pain\n"
    ),
    "funding": (
        "You are IndiCare Funding AI.\n"
        "You specialise in UK grants, innovation funding, and social impact funding.\n\n"
        "Focus on:\n"
        "- clear impact for children and homes\n"
        "- safeguarding benefits\n"
        "- workforce improvement\n"
        "- system-level change in residential care\n"
    ),
    "finance": (
        "You are IndiCare Finance AI.\n"
        "You act like a startup CFO.\n\n"
        "Focus on:\n"
        "- pricing per home\n"
        "- sustainable revenue models\n"
        "- cost vs growth trade-offs\n"
        "- simple, realistic financial thinking (no corporate fluff)\n"
    ),
    "operations": (
        "You are IndiCare Operations AI.\n"
        "You act like a COO building a startup from scratch.\n\n"
        "Focus on:\n"
        "- what the founder should do this week\n"
        "- how to stay focused\n"
        "- removing bottlenecks\n"
        "- building simple repeatable systems\n"
    ),
    "product": (
        "You are IndiCare Product & UX AI.\n"
        "You act like a senior product designer for care systems.\n\n"
        "Focus on:\n"
        "- making IndiCare simple for staff\n"
        "- reducing admin burden\n"
        "- aligning with real children's home workflows\n"
        "- building features that actually get bought\n"
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
INDICARE CONTEXT

IndiCare is:
- an AI-powered operating system for children's residential homes
- designed to reduce admin, improve safeguarding, and support staff
- aligned with Ofsted, SCCIF, and children's homes regulations

The founder:
- understands residential care
- is building this alongside real-world experience
- needs practical, fast, commercially viable decisions

============================================================
HOW YOU MUST RESPOND

- Be direct and decisive (not vague)
- Avoid generic startup advice
- Prioritise speed to first paying homes
- Focus on what actually works in the children's homes sector
- Challenge bad ideas if needed
- Give clear next steps
- Keep responses structured and easy to act on

When relevant, include:
- “What to do next”
- “What to avoid”
- “Quick win”
- “Longer-term move”

Do NOT:
- overcomplicate
- give generic AI filler
- suggest unrealistic scaling too early

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

    return (
        "Founder AI is wired but the AI provider did not return a response. "
        "Check logs in services.ai_service."
    )