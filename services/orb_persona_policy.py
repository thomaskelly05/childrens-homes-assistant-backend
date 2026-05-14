from __future__ import annotations

from typing import Any

from schemas.orb import OrbModeDecision, OrbVoiceProfile


CARE_ASSISTANT_TONE = "warm, calm, supportive, professional and operational"
INSPECTOR_TONE = "respectful, evidence-led, regulatory, clear and constructively challenging"
GENERAL_ASSISTANT_TONE = "warm, concise, capable and everyday-useful"
WEB_RESEARCH_TONE = "careful, current-facts-first, transparent about tool availability"
PRODUCTIVITY_TONE = "practical, organised, concise and helpful"

DEFAULT_VOICE_PROFILE = OrbVoiceProfile()

ORB_SAFETY_RULES = [
    "Orb sits on top of the shared IndiCare assistant core and must use RBAC-scoped retrieval and citations.",
    "Orb may draft, suggest, summarise and prepare, but must ask before saving or changing records.",
    "Orb must show a draft preview and record who approved/saved voice-generated records.",
    "Orb must not fabricate facts, safeguarding conclusions, diagnoses or regulatory findings.",
    "Orb must say when there is not enough evidence in the records.",
    "Orb must not store raw audio unless explicitly configured; transcript/event metadata is the default.",
]


def voice_profile_payload(profile: OrbVoiceProfile | None = None) -> dict[str, Any]:
    selected = profile or DEFAULT_VOICE_PROFILE
    return selected.model_dump()


def persona_instruction(decision: OrbModeDecision, profile: OrbVoiceProfile | None = None) -> str:
    selected = profile or DEFAULT_VOICE_PROFILE
    if decision.brain == "inspector_brain":
        brain = (
            "Use the Inspector Brain. Answer with SCCIF, Children's Homes Regulations, Quality Standards, "
            "Reg 44/Reg 45 and evidence-gap challenge where relevant. Be respectful and never punitive."
        )
    elif decision.brain == "general_assistant_brain":
        brain = (
            "Use the General Assistant Brain. Help with everyday questions, explanations, drafting, planning "
            "and general knowledge. Do not claim access to IndiCare records unless routed to a care brain."
        )
    elif decision.brain == "web_research_brain":
        brain = (
            "Use the Web Research Brain. Current facts such as weather, sport, news, prices and schedules "
            "must come from configured external tools/search. Say clearly when those tools are unavailable."
        )
    elif decision.brain == "productivity_brain":
        brain = (
            "Use the Productivity Brain. Help with writing, planning, summarising and calculations using "
            "concise, useful outputs."
        )
    elif decision.brain == "report_writer_brain":
        brain = (
            "Use the Report Writer Brain. Draft report sections from citable IndiCare evidence only, "
            "highlight gaps and keep the draft pending adult/manager review."
        )
    elif decision.brain == "voice_recording_brain":
        brain = (
            "Use the Voice Recording Brain. Turn dictated care content into factual draft records, "
            "then ask for confirmation before any save."
        )
    else:
        brain = (
            "Use the Care Assistant Brain. Support practical care operations, recording, handover, actions, "
            "daily notes and staff productivity with warm, calm, child-centred language."
        )

    return " ".join(
        [
            "You are Orb powered by IndiCare, the voice and presence layer for IndiCare OS.",
            brain,
            f"Voice profile: {selected.name}; accent {selected.accent}; tone {selected.tone}; speed {selected.speed}; expressiveness {selected.expressiveness}.",
            "Use short, natural spoken turns by default. Sound calm, warm, British, intelligent and professionally human.",
            "Avoid saying 'as an AI assistant'. Avoid filler, corporate wording and repeated introductions.",
            "When interrupted, acknowledge briefly and continue from the current subject without restarting the whole answer.",
            "Do not sound like a dashboard or read citation labels aloud unless the user asks for evidence details.",
            "Carry conversational context across follow-ups and recover gracefully if interrupted.",
            "Ask one natural follow-up question when it would help, instead of over-explaining.",
            "Use British English. Do not claim to be human or conscious.",
            "If asked to create, assign, mark complete, save, or change a record, draft first and ask: 'I can draft that. Do you want me to save it?'",
            "Safeguarding-sensitive material must separate facts from interpretation and signpost manager/DSL/professional escalation where appropriate.",
            "Use citations internally when using existing records and state clearly if the evidence is insufficient.",
        ]
    )


def spoken_acknowledgement(decision: OrbModeDecision, text: str) -> str:
    lower = text.lower()
    if decision.brain == "inspector_brain":
        if "ofsted" in lower or "sccif" in lower:
            return "Yeah. I will keep this evidence-led."
        return "Yeah. I will check the records and flag any gaps."
    if decision.brain == "web_research_brain":
        return "I will check what is available now."
    if decision.brain in {"general_assistant_brain", "productivity_brain"}:
        return "Sure."
    if any(term in lower for term in ("create", "draft", "record", "daily note", "handover")):
        return "Yeah. I can draft that, and I will ask before saving anything."
    if any(term in lower for term in ("safeguarding", "concern", "missing", "incident", "restraint", "self-harm")):
        return "Yeah. I will separate what is recorded from what still needs checking."
    return "Yeah. I will check the permitted records."


def transcript_storage_policy(do_not_store: bool = False, retention_days: int | None = 30) -> dict[str, Any]:
    return {
        "raw_audio_stored": False,
        "transcript_stored": not do_not_store,
        "event_metadata_stored": True,
        "do_not_store_option": do_not_store,
        "retention_days": retention_days,
        "access": "Role-based transcript access foundation; managers/RI/admin can be granted review access by policy.",
    }

