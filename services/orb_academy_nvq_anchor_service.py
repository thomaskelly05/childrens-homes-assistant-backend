"""ORB Academy/NVQ context anchoring — keep diploma outputs tied to supplied practice."""

from __future__ import annotations

import re
from typing import Any

NVQ_AUTHENTICITY_BOUNDARY = (
    "Based only on what the learner or assessor has described — do not invent incidents, "
    "observations, signatures, dates, names, chronology entries, or workplace events. "
    "Help structure, reflect and map possible evidence themes; do not write as if something "
    "happened unless it was described. Do not claim competence or that evidence is sufficient."
)

NVQ_AUTHENTICITY_CLOSER = (
    "Keep this authentic: only include what you personally did, saw, recorded or reflected on. "
    "Your assessor must decide whether the evidence meets the criteria."
)

LEVEL_3_AUTHENTICITY_NOTE = (
    "This is possible learning/evidence mapping only. Your assessor must judge whether the "
    "evidence is valid, authentic, sufficient and current."
)

GENERIC_EXAMPLE_MARKERS = (
    "child a",
    "child b",
    "during a group activity",
    "group activity",
    "expressed frustration",
    "during arts and crafts",
)

NVQ_TOPIC_MARKERS = (
    "nvq",
    "diploma",
    "level 3",
    "level 4",
    "level 5",
    "reflective account",
    "professional discussion",
    "witness testimony",
    "assessor",
    "criteria",
    "portfolio",
    "workbook",
    "learning evidence",
    "qualification",
)

LEVEL_3_REFLECTIVE_MARKERS = (
    "level 3",
    "l3 diploma",
    "diploma",
    "nvq",
    "reflective account",
    "reflective learning",
    "evidence mapping",
    "how could this incident",
    "how can this incident",
    "support my reflective",
)

SAFEGUARDING_THRESHOLD_QUESTION_MARKERS = (
    "threshold",
    "referral",
    "lado",
    "immediate risk",
    "should we refer",
    "make a referral",
    "safeguarding action",
    "escalate to",
    "report to children's services",
    "social worker referral",
    "police",
    "emergency",
)

ACADEMY_ACTION_ANCHORING_RULES = """
Academy/NVQ anchoring rules (mandatory):
- Use ONLY facts, incidents, roles and observations supplied in the source material or prior chat context.
- Do NOT invent a new example scenario (no generic "Child A", "group activity", or substitute incidents).
- If the learner's personal role is unclear, say so explicitly.
- If qualification criteria were not supplied, label sections "possible evidence themes" — not mapped criteria.
- Do NOT claim competence, sufficiency, or that evidence meets criteria.
- Do NOT write as if the learner did actions they have not described.
- Use phrasing such as "based only on what you have provided".
- Separate: facts supplied | possible themes | evidence gaps | questions for supervision/assessor.
""".strip()

LEVEL_3_REFLECTIVE_STRUCTURE = """
When the user asks how an incident could support a Level 3 diploma / NVQ reflective account, structure the answer with these markdown headings (use the ACTUAL scenario supplied — never a invented example):

## Short answer
State that this could support a reflective account only if they are clear about their actual role and do not claim actions they did not take.

## Possible evidence themes
List themes drawn only from the described scenario (e.g. missing from care, safeguarding awareness, contextual safeguarding, recording, child voice, autism/GDD communication, medication, restraint reflection, injury/body map process, manager escalation, staff language, debriefs).

## Evidence already present in what you described
Bullet only facts the user supplied.

## Evidence still missing
Include: learner's role; what they personally did; policy followed; what they reported; what they learned; supervision; witness testimony; assessor questions.

## Reflective account plan
Sections: what happened; my role; what I noticed; what I did; why I did it; safeguarding/risk consideration; how I supported the child; what I recorded/reported; what I learned; what I would do differently; further evidence needed.

## What not to write
Examples: do not claim body map/debrief/referral/child views/actions not described; avoid punitive labels as fact.

## Questions for supervision / assessor
Role, observations, actions, who informed, autism/GDD communication, policy, what differently, confirming evidence.

## Authenticity note
""" + LEVEL_3_AUTHENTICITY_NOTE

PROFESSIONAL_DISCUSSION_EXTRA = """
Professional discussion prompts must also include:
- Assessor note: do not lead the learner into an answer; test understanding of their own practice.
- Evidence gap prompts — what is still missing from the portfolio.
- Possible witness testimony prompt — who could attest to what was described (only if practice was described).

Cover where relevant: learner's role; observations; how risk was recognised; exploitation/contextual safeguarding; autism/GDD communication; who was informed; recording requirements; child voice; policy/procedure; learning; evidence supporting the account; what they would do differently.
""".strip()


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def is_nvq_learning_question(message: str) -> bool:
    lower = _lower(message)
    return any(marker in lower for marker in NVQ_TOPIC_MARKERS)


def is_level_3_reflective_account_question(message: str) -> bool:
    lower = _lower(message)
    if not any(marker in lower for marker in LEVEL_3_REFLECTIVE_MARKERS):
        return False
    return any(
        term in lower
        for term in (
            "reflective",
            "evidence",
            "incident",
            "diploma",
            "level 3",
            "nvq",
            "without making anything up",
            "without inventing",
        )
    )


def is_safeguarding_threshold_question(message: str) -> bool:
    lower = _lower(message)
    if not is_nvq_learning_question(message):
        return any(term in lower for term in SAFEGUARDING_THRESHOLD_QUESTION_MARKERS)
    return any(
        term in lower
        for term in (
            "threshold",
            "referral decision",
            "should we refer",
            "make a referral",
            "lado threshold",
            "immediate risk",
            "safeguarding action",
            "report to",
        )
    )


def format_chat_history(history: list[dict[str, Any]] | None, *, limit: int = 12) -> str:
    if not history:
        return ""
    lines: list[str] = []
    for item in history[-limit:]:
        role = _text(item.get("role")).capitalize() or "User"
        content = _clip(_text(item.get("content")), 2500)
        if content:
            lines.append(f"{role}: {content}")
    if not lines:
        return ""
    return "## Prior conversation context (facts only — do not invent beyond this)\n" + "\n\n".join(lines)


def _clip(text: str, limit: int = 6000) -> str:
    if len(text) <= limit:
        return text
    return f"{text[:limit].rstrip()}..."


def combine_source_material(
    *,
    source_message: str | None = None,
    source_answer: str | None = None,
    chat_history: list[dict[str, Any]] | None = None,
    selected_message: str | None = None,
) -> str:
    parts: list[str] = []
    history_block = format_chat_history(chat_history)
    if history_block:
        parts.append(history_block)
    if selected_message and _text(selected_message) not in (_text(source_message), _text(source_answer)):
        parts.append(f"## Selected message\n{_clip(selected_message)}")
    if source_message:
        parts.append(f"## Current question / source message\n{_clip(source_message)}")
    if source_answer:
        parts.append(f"## Source answer / selected assistant output\n{_clip(source_answer)}")
    combined = "\n\n".join(p for p in parts if p)
    return combined or "(No source text provided.)"


def conversation_context_for_message(
    message: str,
    history: list[dict[str, Any]] | None,
) -> str:
    """Build supplemental context from history when the current message is a short follow-up."""
    if not history:
        return ""
    lower = _lower(message)
    if len(message.split()) > 80 and not is_level_3_reflective_account_question(message):
        return ""
    if not is_nvq_learning_question(message) and not any(
        term in lower for term in ("this incident", "that incident", "the incident", "above", "previous")
    ):
        return ""
    prior = [h for h in history if _text(h.get("content"))]
    if not prior:
        return ""
    return format_chat_history(prior, limit=10)


def academy_action_prompt_intro(action_id: str) -> str:
    return f"{ACADEMY_ACTION_ANCHORING_RULES}\n\n{NVQ_AUTHENTICITY_BOUNDARY}\n"


def action_user_prompt(action_id: str, *, source_text: str) -> str:
    intro = academy_action_prompt_intro(action_id)
    if action_id == "map_to_nvq_evidence":
        return (
            f"{intro}\n"
            "Map the described practice to possible NVQ/diploma evidence themes (not mapped criteria unless supplied).\n"
            "Structure with markdown headings:\n"
            "1. Possible evidence themes (from described practice only)\n"
            "2. Evidence already described\n"
            "3. Evidence gaps\n"
            "4. Questions to ask the learner\n"
            "5. Suggested evidence types\n"
            "6. Authenticity warning\n"
            "7. Next action plan\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "explain_nvq_criteria":
        return (
            f"{intro}\n"
            "Explain criteria or themes mentioned in plain English for residential childcare diplomas (L3–L5).\n"
            "If criteria text was not supplied, explain general themes only — do not invent unit numbers.\n"
            "Include what good evidence looks like and common mistakes (inventing practice, punitive labels).\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "create_reflective_account_plan":
        return (
            f"{intro}\n"
            f"{LEVEL_3_REFLECTIVE_STRUCTURE}\n"
            "Create a reflective account plan from described practice only.\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "review_reflective_account":
        return (
            f"{intro}\n"
            "Review the reflective account draft for structure, possible themes, gaps and authenticity.\n"
            "Phrase as draft support — not official assessment. Do not claim competence.\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "create_professional_discussion_prompts":
        return (
            f"{intro}\n"
            f"{PROFESSIONAL_DISCUSSION_EXTRA}\n"
            "Create professional discussion questions from described evidence only.\n"
            "Structure: ## Discussion questions; ## Assessor quality notes; ## Evidence gap prompts; "
            "## Possible witness testimony prompt\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "create_witness_testimony_prompt":
        return (
            f"{intro}\n"
            "Suggest witness testimony focus: who might witness, what they could attest, questions to ask.\n"
            "Based only on described practice — do not invent events.\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "identify_learning_evidence_gaps":
        return (
            f"{intro}\n"
            "Identify learning evidence gaps from what was described.\n"
            "List missing coverage, weak areas, and authentic next collection steps.\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "create_learner_action_plan":
        return (
            f"{intro}\n"
            "Create a learner action plan for collecting missing authentic evidence over time.\n"
            "Be specific about evidence types; do not invent completed work.\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "assessor_feedback_draft":
        return (
            f"{intro}\n"
            "Draft assessor feedback (support for assessor judgement only — not official sign-off).\n"
            "Structure:\n"
            "1. Strengths (from described evidence only)\n"
            "2. Possible themes matched\n"
            "3. Gaps\n"
            "4. Questions for professional discussion\n"
            "5. Next steps\n"
            "6. Authenticity/boundary note\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "supervision_to_learning_evidence":
        return (
            f"{intro}\n"
            "Link supervision themes in the source to possible qualification learning evidence.\n"
            "Say what could be used if authentically recorded; flag gaps.\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "incident_to_reflective_learning":
        return (
            f"{intro}\n"
            f"{LEVEL_3_REFLECTIVE_STRUCTURE}\n"
            "Turn the described incident into reflective learning structure — no invented facts.\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    if action_id == "policy_to_learning_questions":
        return (
            f"{intro}\n"
            "Generate learning and knowledge-check questions from supplied policy/training text.\n"
            "Link to residential practice; do not invent workplace examples.\n"
            f"\n--- SOURCE ---\n{source_text}"
        )
    return f"{intro}\nPerform action {action_id} on:\n\n{source_text}"


def level_3_conversation_prompt_block(*, message: str, history: list[dict[str, Any]] | None = None) -> str:
    if not is_level_3_reflective_account_question(message):
        return ""
    history_block = conversation_context_for_message(message, history)
    parts = [
        "LEVEL 3 DIPLOMA / NVQ REFLECTIVE ACCOUNT SUPPORT",
        LEVEL_3_REFLECTIVE_STRUCTURE,
        NVQ_AUTHENTICITY_BOUNDARY,
        "Do NOT use a generic example incident. Do NOT introduce Child A, group activities, or substitute scenarios.",
        "If prior conversation described an incident, anchor every section to that incident only.",
    ]
    if history_block:
        parts.append(history_block)
    return "\n\n".join(parts)


def sanitize_nvq_answer(answer: str, *, message: str) -> str:
    text = _text(answer)
    if not text:
        return text
    if not is_nvq_learning_question(message) and not is_level_3_reflective_account_question(message):
        return text
    cleaned = text
    for pattern in (
        r"\n+ORB can support your thinking, but the threshold decision should remain human-led[\s\S]*?(?=\n\n##|\Z)",
        r"\n+Do not make the threshold decision alone[\s\S]*?(?=\n\n##|\Z)",
    ):
        cleaned = re.sub(pattern, "", cleaned, flags=re.I).rstrip()
    if "threshold decision" in cleaned.lower() and not is_safeguarding_threshold_question(message):
        cleaned = re.sub(
            r"\n+[^\n]*threshold decision[^\n]*",
            "",
            cleaned,
            flags=re.I,
        ).rstrip()
    lower_cleaned = cleaned.lower()
    if not is_safeguarding_threshold_question(message):
        authenticity_markers = ("assessor must", "authentic", "only include what you personally")
        if not any(m in lower_cleaned for m in authenticity_markers):
            cleaned = f"{cleaned}\n\n{NVQ_AUTHENTICITY_CLOSER}"
        if is_level_3_reflective_account_question(message) and LEVEL_3_AUTHENTICITY_NOTE.lower() not in lower_cleaned:
            cleaned = f"{cleaned}\n\n{LEVEL_3_AUTHENTICITY_NOTE}"
    return cleaned


def contains_invented_generic_example(text: str) -> bool:
    lower = _lower(text)
    return any(marker in lower for marker in GENERIC_EXAMPLE_MARKERS)


class OrbAcademyNvqAnchorService:
    """Helpers for anchoring Academy/NVQ outputs to user-supplied context."""

    NVQ_AUTHENTICITY_BOUNDARY = NVQ_AUTHENTICITY_BOUNDARY
    NVQ_AUTHENTICITY_CLOSER = NVQ_AUTHENTICITY_CLOSER

    is_nvq_learning_question = staticmethod(is_nvq_learning_question)
    is_level_3_reflective_account_question = staticmethod(is_level_3_reflective_account_question)
    is_safeguarding_threshold_question = staticmethod(is_safeguarding_threshold_question)
    combine_source_material = staticmethod(combine_source_material)
    conversation_context_for_message = staticmethod(conversation_context_for_message)
    action_user_prompt = staticmethod(action_user_prompt)
    level_3_conversation_prompt_block = staticmethod(level_3_conversation_prompt_block)
    sanitize_nvq_answer = staticmethod(sanitize_nvq_answer)
    contains_invented_generic_example = staticmethod(contains_invented_generic_example)
    format_chat_history = staticmethod(format_chat_history)


orb_academy_nvq_anchor_service = OrbAcademyNvqAnchorService()
