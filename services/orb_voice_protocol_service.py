"""ORB Voice v2 specialist reflective protocol blocks — voice-shaped, not essays."""

from __future__ import annotations

from typing import Literal

OrbVoiceIntent = Literal[
    "incident_reflection",
    "bullying_or_peer_conflict",
    "safeguarding_thinking",
    "missing_from_home",
    "restraint_or_physical_intervention",
    "allegation_or_complaint",
    "supervision_prep",
    "recording_wording",
    "manager_oversight",
    "daily_reflection",
    "general_reflection",
]

_PROTOCOL_BLOCKS: dict[str, str] = {
    "bullying_or_peer_conflict": (
        "Bullying / peer conflict protocol:\n"
        "Guide the adult around: who was involved; what was directly observed or heard; "
        "what each young person said or showed; immediate adult response; whether everyone is safe now; "
        "ongoing risk or pattern; who needs informing; what may need recording.\n"
        "Ask one practical residential-care question. Example tone: "
        "\"Let's slow that down. Who was involved, what was actually seen or heard, "
        "and what did adults do immediately to keep both young people safe?\""
    ),
    "incident_reflection": (
        "Incident reflection protocol:\n"
        "Guide around: what happened in order; trigger/context; child's voice or presentation; "
        "adult response; de-escalation/support; outcome; follow-up.\n"
        "One focused question — practical, not generic wellbeing language."
    ),
    "safeguarding_thinking": (
        "Safeguarding thinking protocol:\n"
        "Guide around: immediate safety; known vs suspected; child's voice or presentation; "
        "who has been informed; local safeguarding procedure; management oversight.\n"
        "Do not make findings or decisions. Prompt escalation where needed."
    ),
    "missing_from_home": (
        "Missing from home protocol:\n"
        "Guide around: when last seen; immediate search/actions; who was informed; "
        "child's presentation before leaving; return/welfare check; recording needs."
    ),
    "restraint_or_physical_intervention": (
        "Restraint / physical intervention protocol:\n"
        "Guide around: immediate safety; what led to intervention; child's presentation; "
        "de-escalation attempts; injury checks; management notification; recording requirements."
    ),
    "allegation_or_complaint": (
        "Allegation / complaint protocol:\n"
        "Guide around: what was alleged; who is involved; immediate safety; "
        "what the child said or showed; who has been informed; do not investigate — support clear recording."
    ),
    "supervision_prep": (
        "Supervision prep protocol:\n"
        "Guide around: what needs discussion; impact on practice; support needed; actions."
    ),
    "recording_wording": (
        "Recording wording protocol:\n"
        "Guide around: factual language; observation vs interpretation; judgemental wording to avoid; "
        "child-centred phrasing; what belongs in a record vs reflection."
    ),
    "manager_oversight": (
        "Manager oversight protocol:\n"
        "Guide around: what needs management awareness; risk level; immediate actions taken; "
        "what the adult needs from oversight."
    ),
    "daily_reflection": (
        "Daily reflection protocol:\n"
        "Guide around: what stood out today; child's presentation; what went well; what needs follow-up."
    ),
    "general_reflection": (
        "General reflection protocol:\n"
        "Warm, child-centred reflective support. One useful question about what happened and adult response."
    ),
}


def protocol_block_for_intent(intent: str) -> str:
    return _PROTOCOL_BLOCKS.get(intent, _PROTOCOL_BLOCKS["general_reflection"])


def suggested_record_type_for_intent(intent: str) -> str | None:
    mapping = {
        "bullying_or_peer_conflict": "incident_or_peer_conflict_record",
        "incident_reflection": "incident_record",
        "safeguarding_thinking": "safeguarding_record",
        "missing_from_home": "missing_from_home_record",
        "restraint_or_physical_intervention": "restraint_record",
        "allegation_or_complaint": "allegation_or_complaint_record",
        "recording_wording": "daily_record",
        "supervision_prep": None,
        "manager_oversight": None,
        "daily_reflection": "daily_record",
        "general_reflection": None,
    }
    return mapping.get(intent)
