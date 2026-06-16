from __future__ import annotations

"""ORB-branded voice profiles — maps user-facing profile IDs to OpenAI voices and browser hints."""

import os
from typing import Any, Literal, TypedDict

OrbVoiceProfileProvider = Literal["openai", "browser"]

DEFAULT_ORB_VOICE_PROFILE_ID = os.getenv("ORB_VOICE_DEFAULT_PROFILE", "orb_british_female").strip() or "orb_british_female"

# OpenAI Realtime / TTS voice IDs used internally (not shown to end users by default).
OPENAI_PROFILE_VOICES: dict[str, str] = {
    "orb_british_female": "coral",
    "orb_calm_professional": "marin",
    "orb_reflective": "sage",
    "orb_clear_guidance": "cedar",
    "orb_friendly_coach": "nova",
    "orb_serious_safeguarding": "onyx",
    "system_fallback": "browser_default",
}

# Legacy preset IDs from earlier sprints → current profile IDs.
LEGACY_PROFILE_ALIASES: dict[str, str] = {
    "orb_british_calm": "orb_calm_professional",
    "orb_british_professional": "orb_clear_guidance",
}

MODE_DEFAULT_PROFILES: dict[str, str] = {
    "conversational": "orb_british_female",
    "reflective_practice": "orb_reflective",
    "recording_support": "orb_calm_professional",
    "inspection_readiness": "orb_clear_guidance",
    "safeguarding_support": "orb_serious_safeguarding",
    "learning_coach": "orb_friendly_coach",
}

ORB_VOICE_PROFILES: list[dict[str, Any]] = [
    {
        "id": "orb_british_female",
        "label": "ORB British Female",
        "description": "Warm, calm, supportive and professional.",
        "provider": "openai",
        "openai_voice": "coral",
        "fallback_voice_keywords": ["en-GB", "female", "Samantha", "Serena", "Kate"],
        "instructions": (
            "Speak in a warm British female professional style. Be calm, conversational and reassuring. "
            "Sound like an experienced residential childcare colleague. Use British English. "
            "Keep answers concise and natural. Ask one helpful follow-up question where appropriate."
        ),
        "best_for": ["Conversational", "General guidance", "Day-to-day support"],
    },
    {
        "id": "orb_calm_professional",
        "label": "ORB Calm Professional",
        "description": "Clear, balanced and steady for day-to-day guidance.",
        "provider": "openai",
        "openai_voice": "marin",
        "fallback_voice_keywords": ["en-GB", "professional", "Sonia", "Serena"],
        "instructions": (
            "Speak clearly and steadily in British English. Use a professional, balanced tone. "
            "Keep the answer structured but conversational."
        ),
        "best_for": ["Recording support", "Structured updates", "Manager briefings"],
    },
    {
        "id": "orb_reflective",
        "label": "ORB Reflective",
        "description": "Gentle and thoughtful for supervision, reflection and therapeutic practice.",
        "provider": "openai",
        "openai_voice": "sage",
        "fallback_voice_keywords": ["en-GB", "gentle", "female", "Serena"],
        "instructions": (
            "Speak gently and reflectively in British English. Support supervision, reflective practice "
            "and emotional meaning. Avoid rushing. Ask thoughtful questions."
        ),
        "best_for": ["Reflective practice", "Supervision", "Debriefs"],
    },
    {
        "id": "orb_clear_guidance",
        "label": "ORB Clear Guidance",
        "description": "Crisp and structured for Ofsted, policies and instructions.",
        "provider": "openai",
        "openai_voice": "cedar",
        "fallback_voice_keywords": ["en-GB", "clear", "Daniel", "Google UK English Male"],
        "instructions": (
            "Speak crisply and clearly in British English. Give practical steps. Avoid waffle. "
            "Use short sections where helpful."
        ),
        "best_for": ["Inspection evidence preparation", "Policies", "Procedures"],
    },
    {
        "id": "orb_friendly_coach",
        "label": "ORB Friendly Coach",
        "description": "Encouraging and approachable for learning and staff support.",
        "provider": "openai",
        "openai_voice": "nova",
        "fallback_voice_keywords": ["en-GB", "friendly", "Jenny", "Aria"],
        "instructions": (
            "Speak warmly and encouragingly in British English. Make learning feel simple, supportive and achievable."
        ),
        "best_for": ["Learning coach", "Staff training", "Micro-learning"],
    },
    {
        "id": "orb_serious_safeguarding",
        "label": "ORB Serious Safeguarding",
        "description": "Calm, concise and serious for safeguarding and risk discussions.",
        "provider": "openai",
        "openai_voice": "onyx",
        "fallback_voice_keywords": ["en-GB", "male", "David", "serious"],
        "instructions": (
            "Speak calmly and seriously in British English. Be concise, measured and safety-aware. "
            "Do not sound alarmist. Remind the user to follow local safeguarding procedures where risk is present."
        ),
        "best_for": ["Safeguarding support", "Risk discussions", "Escalation prep"],
    },
    {
        "id": "system_fallback",
        "label": "System fallback",
        "description": "Uses your device's available voice if realtime voice is unavailable.",
        "provider": "browser",
        "openai_voice": None,
        "fallback_voice_keywords": [],
        "instructions": "Use the closest available device voice. Keep British English where possible.",
        "best_for": ["Offline", "Unsupported browsers", "Device default"],
    },
]

_PROFILE_BY_ID = {p["id"]: p for p in ORB_VOICE_PROFILES}


def normalise_profile_id(profile_id: str | None) -> str:
    raw = (profile_id or DEFAULT_ORB_VOICE_PROFILE_ID).strip()
    if not raw:
        return DEFAULT_ORB_VOICE_PROFILE_ID
    return LEGACY_PROFILE_ALIASES.get(raw, raw)


def get_voice_profile(profile_id: str | None) -> dict[str, Any]:
    normalised = normalise_profile_id(profile_id)
    return _PROFILE_BY_ID.get(normalised) or _PROFILE_BY_ID[DEFAULT_ORB_VOICE_PROFILE_ID]


def resolve_openai_voice(profile_id: str | None) -> str | None:
    profile = get_voice_profile(profile_id)
    if profile.get("provider") == "browser" or profile.get("openai_voice") == "browser_default":
        return None
    voice = str(profile.get("openai_voice") or OPENAI_PROFILE_VOICES.get(profile["id"], "")).strip().lower()
    return voice or None


def default_profile_for_mode(mode: str | None) -> str:
    key = (mode or "conversational").strip()
    return MODE_DEFAULT_PROFILES.get(key, DEFAULT_ORB_VOICE_PROFILE_ID)


def build_residential_voice_instructions(
    *,
    profile_id: str | None,
    mode: str = "conversational",
) -> str:
    profile = get_voice_profile(profile_id)
    mode_key = (mode or "conversational").strip()
    mode_lines = {
        "conversational": (
            "You are ORB Voice for ORB Residential. The user is asking through voice — keep responses concise, "
            "natural and easy to follow."
        ),
        "reflective_practice": (
            "In Reflective Practice mode, support supervision and professional curiosity. Separate facts, "
            "staff actions, child voice and learning."
        ),
        "recording_support": (
            "In Recording Support mode, help separate facts, child voice, staff response, outcome and manager "
            "oversight. Offer to generate the full written record in chat."
        ),
        "inspection_readiness": (
            "In Inspection evidence preparation mode, focus on evidence, chronology and quality standards calmly."
        ),
        "safeguarding_support": (
            "In Safeguarding Support mode, be procedure-aware. If immediate danger is mentioned, advise following "
            "home procedures and emergency services where required."
        ),
        "learning_coach": (
            "In Learning Coach mode, turn the topic into brief, practical micro-learning for residential staff."
        ),
    }
    base = (
        "You are ORB Voice — an AI assistant for ORB Residential, not a human colleague. "
        "Introduce yourself as ORB when helpful. Speak as an experienced residential childcare professional would: "
        "calm, child-centred and safeguarding-aware. Use British English. "
        "Keep spoken turns short and natural — one idea at a time, one question at a time. "
        "Give brief acknowledgements without filling every silence. "
        "Separate observation from interpretation. Do not diagnose, blame the child, or make safeguarding decisions. "
        "If immediate risk, disclosure, missing child, self-harm, serious injury, exploitation or abuse is mentioned, "
        "calmly prompt following local safeguarding procedures and emergency help where needed. "
        "Support reflection before recording. Offer to turn the conversation into a record when enough facts are present. "
        "Adult review and professional judgement always come first. Do not expose internal reasoning."
    )
    return "\n\n".join(
        [
            base,
            str(profile.get("instructions") or ""),
            mode_lines.get(mode_key, mode_lines["conversational"]),
        ]
    ).strip()


class ResolvedVoiceProfile(TypedDict):
    selected_voice_profile: str
    profile_label: str
    provider_voice: str | None
    provider_kind: str


def resolve_voice_profile_for_session(profile_id: str | None) -> ResolvedVoiceProfile:
    profile = get_voice_profile(profile_id)
    openai_voice = resolve_openai_voice(profile["id"])
    return {
        "selected_voice_profile": profile["id"],
        "profile_label": profile["label"],
        "provider_voice": openai_voice,
        "provider_kind": "browser" if profile.get("provider") == "browser" else "openai",
    }
