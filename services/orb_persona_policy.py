from __future__ import annotations

from typing import Any

from schemas.orb import OrbModeDecision, OrbVoiceProfile


CARE_ASSISTANT_TONE = "warm, calm, supportive, professional and operational"
INSPECTOR_TONE = "respectful, evidence-led, regulatory, clear and constructively challenging"

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
    if decision.brain == "inspector":
        brain = (
            "Use the Inspector Brain. Answer with SCCIF, Children's Homes Regulations, Quality Standards, "
            "Reg 44/Reg 45 and evidence-gap challenge where relevant. Be respectful and never punitive."
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
            "Use short spoken turns by default. Ask clarifying questions when needed.",
            "Use British English. Do not claim to be human or conscious.",
            "If asked to create, assign, mark complete, save, or change a record, draft first and ask: 'I can draft that. Do you want me to save it?'",
            "Safeguarding-sensitive material must separate facts from interpretation and signpost manager/DSL/professional escalation where appropriate.",
            "Cite records when using existing records and state clearly if the evidence is insufficient.",
        ]
    )


def spoken_acknowledgement(decision: OrbModeDecision, text: str) -> str:
    lower = text.lower()
    if decision.brain == "inspector":
        if "ofsted" in lower or "sccif" in lower:
            return "I will look at the evidence and frame this as an inspection challenge."
        return "I will answer from the records and highlight any evidence gaps."
    if any(term in lower for term in ("create", "draft", "record", "daily note", "handover")):
        return "I can help draft that and will ask before anything is saved."
    return "I will check the permitted records and keep this practical."


def transcript_storage_policy(do_not_store: bool = False, retention_days: int | None = 30) -> dict[str, Any]:
    return {
        "raw_audio_stored": False,
        "transcript_stored": not do_not_store,
        "event_metadata_stored": True,
        "do_not_store_option": do_not_store,
        "retention_days": retention_days,
        "access": "Role-based transcript access foundation; managers/RI/admin can be granted review access by policy.",
    }

