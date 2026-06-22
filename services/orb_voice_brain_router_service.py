"""ORB Voice v2 intent detection and two-speed brain tier routing."""

from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

from services.orb_voice_protocol_service import protocol_block_for_intent, suggested_record_type_for_intent
from services.orb_voice_protocol_progression_service import update_protocol_slots

logger = logging.getLogger(__name__)

OrbVoiceBrainTier = Literal["voice_fast", "voice_specialist", "voice_safeguarding"]
OrbVoiceRiskLevel = Literal["low", "medium", "high"]

_MODE_INTENT: dict[str, str] = {
    "incident_reflection": "incident_reflection",
    "safeguarding_thinking": "safeguarding_thinking",
    "supervision_prep": "supervision_prep",
    "daily_reflection": "daily_reflection",
    "missing_from_home_debrief": "missing_from_home",
    "wording_support": "recording_wording",
    "manager_oversight": "manager_oversight",
    "key_work_prep": "supervision_prep",
    "just_talk": "general_reflection",
}

_SAFEGUARDING_KEYWORDS = (
    "abuse",
    "assault",
    "suicide",
    "self-harm",
    "self harm",
    "weapon",
    "sexual",
    "exploitation",
    "neglect",
    "disclosure",
    "child protection",
    "cp conference",
    "police",
    "ambulance",
    "a&e",
    "injury",
    "harm",
    "allegation",
)

_HIGH_RISK_KEYWORDS = (
    "suicide",
    "self-harm",
    "self harm",
    "weapon",
    "sexual",
    "exploitation",
    "police",
    "ambulance",
    "not breathing",
    "unconscious",
)

_INTENT_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("bullying_or_peer_conflict", re.compile(
        r"\b(bullying|bullied|intimidat|threat|name[\s-]?call|targeting|coercion|exclusion|peer conflict)\b",
        re.I,
    )),
    ("restraint_or_physical_intervention", re.compile(
        r"\b(restraint|restrained|physical intervention|hold|pinned|taken to the floor)\b",
        re.I,
    )),
    ("missing_from_home", re.compile(
        r"\b(missing from home|abscond|ran away|left the home|went missing)\b",
        re.I,
    )),
    ("allegation_or_complaint", re.compile(
        r"\b(allegation|complaint|accused|reported (?:us|staff|a member))\b",
        re.I,
    )),
    ("safeguarding_thinking", re.compile(
        r"\b(safeguarding|child protection|significant harm|mash|local authority)\b",
        re.I,
    )),
    ("incident_reflection", re.compile(
        r"\b(incident|escalat|fight|assault|damage|broken|smashed)\b",
        re.I,
    )),
    ("recording_wording", re.compile(
        r"\b(record|wording|write(?:ing)? (?:it|this) up|daily note|log(?:book)?|factual)\b",
        re.I,
    )),
    ("supervision_prep", re.compile(
        r"\b(supervision|supervise|line manager discussion)\b",
        re.I,
    )),
    ("manager_oversight", re.compile(
        r"\b(manager|management oversight|duty manager|on-?call|escalat(?:e|ion) to)\b",
        re.I,
    )),
    ("daily_reflection", re.compile(
        r"\b(today|shift|handover|end of (?:the )?day|this evening)\b",
        re.I,
    )),
]

_YOUNG_PERSON_RE = re.compile(
    r"\b(?:young person|yp|child|resident|he|she|they)\b",
    re.I,
)


@dataclass
class OrbVoiceRouteDecision:
    intent: str
    brain_tier: OrbVoiceBrainTier
    risk_level: OrbVoiceRiskLevel
    should_use_safety_boundary: bool
    suggested_protocol: str
    protocol_block: str = ""
    retrieval_needed: bool = False

    def to_log_dict(self) -> dict[str, str]:
        return {
            "intent": self.intent,
            "tier": self.brain_tier,
            "risk_level": self.risk_level,
        }


@dataclass
class OrbVoiceSessionMemory:
    possible_record_type: str | None = None
    key_people_mentioned: list[str] = field(default_factory=list)
    known_facts: list[str] = field(default_factory=list)
    missing_info: list[str] = field(default_factory=list)
    possible_follow_up: list[str] = field(default_factory=list)
    last_intent: str | None = None
    last_brain_tier: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v not in (None, [], "")}


def _combined_text(transcript: str, recent_turns: list[dict[str, Any]] | None) -> str:
    parts = [transcript.strip()]
    for turn in recent_turns or []:
        text = str(turn.get("text") or turn.get("content") or "").strip()
        if text:
            parts.append(text)
    return " ".join(parts)


def _detect_intent_from_text(text: str, mode: str | None) -> str:
    normalised_mode = (mode or "just_talk").strip().lower()
    mode_intent = _MODE_INTENT.get(normalised_mode)
    for intent, pattern in _INTENT_PATTERNS:
        if pattern.search(text):
            return intent
    if mode_intent and mode_intent != "general_reflection":
        return mode_intent
    return "general_reflection"


def _risk_level(text: str, intent: str) -> OrbVoiceRiskLevel:
    lower = text.lower()
    if any(keyword in lower for keyword in _HIGH_RISK_KEYWORDS):
        return "high"
    if intent in {
        "safeguarding_thinking",
        "restraint_or_physical_intervention",
        "allegation_or_complaint",
        "missing_from_home",
    }:
        return "medium"
    if any(keyword in lower for keyword in _SAFEGUARDING_KEYWORDS):
        return "medium"
    return "low"


def _brain_tier(intent: str, risk_level: OrbVoiceRiskLevel, text: str) -> OrbVoiceBrainTier:
    lower = text.lower()
    if risk_level == "high" or any(keyword in lower for keyword in _SAFEGUARDING_KEYWORDS):
        if intent in {"safeguarding_thinking", "allegation_or_complaint"} or risk_level == "high":
            return "voice_safeguarding"
    specialist_intents = {
        "bullying_or_peer_conflict",
        "incident_reflection",
        "missing_from_home",
        "restraint_or_physical_intervention",
        "allegation_or_complaint",
        "supervision_prep",
        "recording_wording",
        "manager_oversight",
        "safeguarding_thinking",
    }
    if intent in specialist_intents or risk_level == "medium":
        return "voice_specialist" if risk_level != "high" else "voice_safeguarding"
    if intent in {"daily_reflection", "general_reflection"}:
        return "voice_fast"
    return "voice_fast"


def _should_use_safety_boundary(
    text: str,
    mode: str | None,
    intent: str,
    risk_level: OrbVoiceRiskLevel,
) -> bool:
    lower = text.lower()
    if risk_level in {"medium", "high"}:
        return True
    if intent in {
        "safeguarding_thinking",
        "restraint_or_physical_intervention",
        "allegation_or_complaint",
        "missing_from_home",
    }:
        return True
    if any(keyword in lower for keyword in _SAFEGUARDING_KEYWORDS):
        return True
    normalised_mode = (mode or "").strip().lower()
    return "safeguard" in normalised_mode


def classify_voice_intent(
    *,
    transcript: str,
    mode: str | None = None,
    recent_turns: list[dict[str, Any]] | None = None,
) -> OrbVoiceRouteDecision:
    text = _combined_text(transcript, recent_turns)
    intent = _detect_intent_from_text(text, mode)
    risk = _risk_level(text, intent)
    tier = _brain_tier(intent, risk, text)
    if risk == "high":
        tier = "voice_safeguarding"
    protocol = protocol_block_for_intent(intent)
    retrieval = tier != "voice_fast" and intent in {
        "safeguarding_thinking",
        "recording_wording",
        "incident_reflection",
    }
    return OrbVoiceRouteDecision(
        intent=intent,
        brain_tier=tier,
        risk_level=risk,
        should_use_safety_boundary=_should_use_safety_boundary(text, mode, intent, risk),
        suggested_protocol=intent,
        protocol_block=protocol,
        retrieval_needed=retrieval,
    )


def _extract_people_mentions(text: str) -> list[str]:
    mentions: list[str] = []
    if _YOUNG_PERSON_RE.search(text):
        mentions.append("young person mentioned")
    if re.search(r"\btwo young people\b", text, re.I):
        mentions.append("two young people")
    if re.search(r"\bstaff|keyworker|manager\b", text, re.I):
        mentions.append("staff/management mentioned")
    return mentions


def _missing_info_for_intent(intent: str) -> list[str]:
    hints = {
        "bullying_or_peer_conflict": [
            "who was involved",
            "what was observed vs reported",
            "immediate adult response",
            "current safety",
        ],
        "safeguarding_thinking": [
            "immediate safety",
            "known vs suspected",
            "who has been informed",
        ],
        "incident_reflection": ["sequence of events", "child presentation", "adult response"],
    }
    return hints.get(intent, [])


def update_session_memory(
    existing: dict[str, Any] | None,
    *,
    transcript: str,
    route: OrbVoiceRouteDecision,
) -> dict[str, Any]:
    memory = OrbVoiceSessionMemory(
        possible_record_type=existing.get("possibleRecordType") or existing.get("possible_record_type"),
        key_people_mentioned=list(existing.get("keyPeopleMentioned") or existing.get("key_people_mentioned") or []),
        known_facts=list(existing.get("knownFacts") or existing.get("known_facts") or []),
        missing_info=list(existing.get("missingInfo") or existing.get("missing_info") or []),
        possible_follow_up=list(existing.get("possibleFollowUp") or existing.get("possible_follow_up") or []),
        last_intent=existing.get("lastIntent") or existing.get("last_intent"),
        last_brain_tier=existing.get("lastBrainTier") or existing.get("last_brain_tier"),
    )
    trimmed = transcript.strip()
    if trimmed and trimmed not in memory.known_facts:
        memory.known_facts.append(trimmed[:240])
        memory.known_facts = memory.known_facts[-6:]
    for person in _extract_people_mentions(trimmed):
        if person not in memory.key_people_mentioned:
            memory.key_people_mentioned.append(person)
    record_type = suggested_record_type_for_intent(route.intent)
    if record_type:
        memory.possible_record_type = record_type
    for gap in _missing_info_for_intent(route.intent):
        if gap not in memory.missing_info:
            memory.missing_info.append(gap)
    if route.should_use_safety_boundary and "management oversight" not in memory.possible_follow_up:
        memory.possible_follow_up.append("management oversight")
    memory.last_intent = route.intent
    memory.last_brain_tier = route.brain_tier
    result = memory.to_dict()
    protocol_slots = update_protocol_slots(result, transcript=trimmed, intent=route.intent)
    if protocol_slots:
        result["protocolSlots"] = protocol_slots
    return result


def log_voice_brain_route(route: OrbVoiceRouteDecision, *, elapsed_ms: int) -> None:
    logger.info(
        "orb_voice_v2_brain_route intent=%s tier=%s risk_level=%s elapsed_ms=%s",
        route.intent,
        route.brain_tier,
        route.risk_level,
        elapsed_ms,
    )
