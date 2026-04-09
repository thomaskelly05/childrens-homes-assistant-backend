from __future__ import annotations

from typing import Any

from services.assistant_context_service import build_assistant_context


def _safe_name(young_person: dict[str, Any] | None) -> str:
    if not young_person:
        return "the young person"

    preferred = (young_person.get("preferred_name") or "").strip()
    first_name = (young_person.get("first_name") or "").strip()
    full_name = " ".join(
        part for part in [young_person.get("first_name"), young_person.get("last_name")] if part
    ).strip()

    return preferred or first_name or full_name or "the young person"


def _build_global_summary(context: dict[str, Any]) -> str:
    tasks = context.get("tasks") or []
    manager_updates = context.get("manager_updates") or []
    handover = context.get("handover") or []
    chronology = context.get("chronology") or []

    lines = [
        "Global assistant context loaded.",
        f"- Home ID: {context.get('home_id')}",
        f"- Open/recent tasks loaded: {len(tasks)}",
        f"- Recent manager updates loaded: {len(manager_updates)}",
        f"- Recent handovers loaded: {len(handover)}",
        f"- Recent chronology events loaded: {len(chronology)}",
    ]
    return "\n".join(lines)


def _build_young_person_summary(context: dict[str, Any]) -> str:
    young_person = context.get("young_person") or {}
    identity = context.get("identity") or {}
    active_work = context.get("active_work") or {}
    recent_records = context.get("recent_records") or {}

    display_name = _safe_name(young_person)

    alerts = identity.get("active_alerts") or []
    plans = active_work.get("support_plans") or []
    risks = active_work.get("risk_assessments") or []
    tasks = active_work.get("tasks") or []
    incidents = recent_records.get("incidents") or []
    daily_notes = recent_records.get("daily_notes") or []
    chronology = recent_records.get("chronology") or []

    lines = [
        f"Young person assistant context loaded for {display_name}.",
        f"- Young person ID: {young_person.get('id')}",
        f"- Home ID: {young_person.get('home_id')}",
        f"- Placement status: {young_person.get('placement_status')}",
        f"- Summary risk level: {young_person.get('summary_risk_level')}",
        f"- Active alerts: {len(alerts)}",
        f"- Active support plans: {len(plans)}",
        f"- Active/current risk records: {len(risks)}",
        f"- Current tasks: {len(tasks)}",
        f"- Recent incidents loaded: {len(incidents)}",
        f"- Recent daily notes loaded: {len(daily_notes)}",
        f"- Recent chronology loaded: {len(chronology)}",
    ]

    current_formulation = identity.get("current_formulation")
    if current_formulation:
        lines.append("- Current formulation available: yes")
    else:
        lines.append("- Current formulation available: no")

    communication_profile = identity.get("communication_profile")
    if communication_profile:
        lines.append("- Communication profile available: yes")
    else:
        lines.append("- Communication profile available: no")

    return "\n".join(lines)


def _build_prompt(
    *,
    message: str,
    context: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
) -> str:
    scope = context.get("scope") or {}
    scope_type = scope.get("scope_type")

    if scope_type == "young_person":
        summary = _build_young_person_summary(context)
    else:
        summary = _build_global_summary(context)

    history_lines: list[str] = []
    for item in history or []:
        role = str(item.get("role") or "").strip()
        content = str(item.get("message") or "").strip()
        if role and content:
            history_lines.append(f"{role.upper()}: {content}")

    history_text = "\n".join(history_lines[-12:]).strip()

    return f"""
You are the IndiCare assistant.

Use the context below to answer clearly, safely and practically for a children's home setting.
Keep the answer grounded in the available data.
If there are gaps in the context, say so.
If the request appears to need drafting, produce a structured draft.
If the request relates to a young person, stay child-centred, trauma-informed and safeguarding-aware.

=== CONTEXT SUMMARY ===
{summary}

=== STRUCTURED CONTEXT ===
{context}

=== CONVERSATION HISTORY ===
{history_text}

=== USER MESSAGE ===
{message}
""".strip()


def build_assistant_prompt(
    conn,
    *,
    user_id: int,
    message: str,
    scope: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    context = build_assistant_context(
        conn,
        user_id=user_id,
        scope=scope,
    )

    prompt = _build_prompt(
        message=message,
        context=context,
        history=history,
    )

    return {
        "prompt": prompt,
        "context": context,
        "runtime": {
            "scope_type": (context.get("scope") or {}).get("scope_type"),
            "home_id": (context.get("scope") or {}).get("home_id"),
            "young_person_id": (context.get("scope") or {}).get("young_person_id"),
        },
    }
