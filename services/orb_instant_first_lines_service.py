"""Deterministic instant first-lines for ORB streaming — no external AI, <50ms target."""

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import Pattern

from services.orb_universal_answer_contract_map_service import detect_contract_family

# Category-first-line mappings (1–3 lines, residential children's home language).
_CATEGORY_FIRST_LINES: dict[str, tuple[str, ...]] = {
    "daily_recording": (
        "I'm treating this as a daily recording question.",
        "Start with what happened, what the young person said or showed, how staff responded, and what happened next.",
    ),
    "morning_bedtime_routines": (
        "I'm treating this as a morning or bedtime routine recording question.",
        "Record presentation, what was offered, how staff supported, and the outcome without blame language.",
    ),
    "food_meals_eating": (
        "I'm treating this as a food and eating concern.",
        "Record choices offered, the young person's response, staff support, and any health or safeguarding cues.",
    ),
    "personal_care_hygiene": (
        "I'm treating this as a personal care recording question.",
        "Record dignity, choice, what support was offered, and the outcome proportionately.",
    ),
    "activities_hobbies_ordinary_life": (
        "I'm treating this as an ordinary life and activities recording question.",
        "Capture what the young person did, how they engaged, and what mattered to them.",
    ),
    "independence_life_skills": (
        "I'm treating this as an independence and life skills question.",
        "Record the skill practised, support level, progress, and any plan updates.",
    ),
    "emotional_distress": (
        "I'm treating this as emotional distress support and recording.",
        "Record presentation, co-regulation used, adult response, and whether risk escalated.",
    ),
    "self_harm_suicide": (
        "This may involve immediate safety.",
        "Stay with the young person if there is concern, inform the manager/on-call, and follow the home's safeguarding and self-harm procedure.",
    ),
    "mental_health_camhs": (
        "I'm treating this as a mental health and CAMHS support recording question.",
        "Record presentation, professional input, advice given, and follow-up actions.",
    ),
    "relationships_with_staff": (
        "I'm treating this as a staff relationship and relational practice question.",
        "Record what happened in the relationship, repair steps, and any boundary concerns.",
    ),
    "peer_relationships_home": (
        "I'm treating this as a peer relationship recording question.",
        "Record peer interactions factually, staff facilitation, and the outcome.",
    ),
    "bullying_peer_harm": (
        "I'm treating this as peer-on-peer harm.",
        "Record facts, child voice, immediate safety, and follow the home's safeguarding procedure.",
    ),
    "contact_family_time": (
        "I'm treating this as a family time / contact recording question.",
        "Record preparation, presentation on return, co-regulation, and any safeguarding cues.",
    ),
    "family_risk_disclosures_contact": (
        "This may involve a safeguarding disclosure after contact.",
        "Preserve the young person's exact words, keep them safe, inform the manager/on-call, and follow local safeguarding procedures.",
    ),
    "identity_culture_religion": (
        "I'm treating this as an identity, culture and belonging recording question.",
        "Record the young person's voice, reasonable adjustments, and any discrimination concerns.",
    ),
    "life_story_memory": (
        "I'm treating this as life story and memory work.",
        "Record sensitively, note what the young person shared, and flag therapeutic follow-up if distress emerged.",
    ),
    "school_refusal_attendance": (
        "I'm treating this as school refusal / attendance recording.",
        "Record barriers not defiance, advocacy offered, and liaison with education partners if needed.",
    ),
    "school_incidents_education_safeguarding": (
        "I'm treating this as an education safeguarding liaison question.",
        "Share factual chronology proportionately and liaise with the Registered Manager and school safeguarding lead.",
    ),
    "pep_virtual_school_progress": (
        "I'm treating this as PEP / Virtual School progress recording.",
        "Record actions, owners, review dates, and barriers to learning.",
    ),
    "autism_sensory_overwhelm": (
        "I'm treating this as autism / sensory support recording.",
        "Record triggers, reasonable adjustments, co-regulation, and what helped.",
    ),
    "learning_disability_communication": (
        "I'm treating this as learning disability / communication differences recording.",
        "Record adapted support, what was communicated, and reasonable adjustments used.",
    ),
    "aac_symbols_gestures": (
        "I'm treating this as AAC / symbols / gestures child voice evidence.",
        "Record what was observed, how the young person communicated, and do not invent direct quotes.",
    ),
    "orb_communicate": (
        "I'm treating this as a communication support request.",
        "I'll create clear language, visual card suggestions, staff guidance and reflect-and-record prompts.",
    ),
    "incident_recording": (
        "I'm treating this as incident recording.",
        "Start with immediate safety, factual chronology, child voice, staff response, and notifications.",
    ),
    "physical_intervention_restraint": (
        "I'm treating this as physical intervention recording.",
        "Check everyone is safe, record why intervention was necessary and proportionate, and plan the debrief.",
    ),
    "damage_to_property": (
        "I'm treating this as property damage incident recording.",
        "Record observed facts, immediate safety, staff response, and restorative follow-up.",
    ),
    "sanctions_consequences_incentives": (
        "I'm treating this as consequences and restorative repair recording.",
        "Record the agreed response proportionately, child voice, and manager oversight where required.",
    ),
    "de_escalation_co_regulation": (
        "I'm treating this as de-escalation and co-regulation recording.",
        "Record triggers, strategies used, what helped, and the outcome.",
    ),
    "missing_from_care": (
        "This looks like a missing-from-care concern.",
        "Follow the home's missing procedure, inform the manager/on-call, and record times, actions and decisions clearly.",
    ),
    "exploitation_contextual_safeguarding": (
        "This looks like exploitation or contextual safeguarding.",
        "Record observable facts without criminalising language, inform the manager/on-call, and follow multi-agency procedures.",
    ),
    "online_safety": (
        "I'm treating this as an online safety concern.",
        "Record platforms, content, immediate safety, and escalate per safeguarding threshold.",
    ),
    "harmful_sexual_behaviour": (
        "This may involve harmful sexual behaviour concerns.",
        "Keep the young person safe, record facts, inform the manager/on-call, and follow specialist HSB routes.",
    ),
    "substance_use": (
        "I'm treating this as a substance use concern.",
        "Record presentation, chronology, health advice sought, and manager notification.",
    ),
    "weapons_violence_police": (
        "This may involve weapons, violence or police involvement.",
        "Check immediate safety, inform the manager/on-call, and record chronology and notifications clearly.",
    ),
    "allegations_lado": (
        "This looks like an allegation involving staff.",
        "Make sure the young person is safe, preserve their exact words, inform the manager/on-call, and follow the LADO/local allegations route.",
    ),
    "whistleblowing_staff_conduct": (
        "I'm treating this as a whistleblowing / staff conduct concern.",
        "Record facts without retaliation, inform the Registered Manager, and follow governance procedures.",
    ),
    "fire_setting_ligatures_environmental": (
        "This may involve immediate environmental safety.",
        "Secure the area, keep the young person safe, inform the manager/on-call, and record actions and observations.",
    ),
    "medication_refusal_support": (
        "I'm treating this as a medication refusal.",
        "Record the refusal on the MAR, follow the home's medication policy, and seek health advice where risk is present.",
    ),
    "medication_error": (
        "I'm treating this as a medication error incident.",
        "Record the error factually, notify the manager and prescriber, seek health advice, and follow incident procedures.",
    ),
    "physical_health_illness_injury": (
        "I'm treating this as a physical health / illness / injury recording question.",
        "Record presentation, first aid, advice sought, and follow-up actions.",
    ),
    "appointments_health_communication": (
        "I'm treating this as health appointment communication recording.",
        "Record the appointment, advice given, and who needs to know.",
    ),
    "complaints": (
        "I'm treating this as a complaint recording question.",
        "Acknowledge the young person's voice, record their words, and follow the complaints procedure.",
    ),
    "advocacy_independent_visitor": (
        "I'm treating this as advocacy / independent visitor recording.",
        "Record the young person's participation, advocacy input, and outcomes agreed.",
    ),
    "choice_consent_participation": (
        "I'm treating this as choice, consent and participation recording.",
        "Record wishes, views, what was explained, and how the young person participated.",
    ),
    "regulation_44": (
        "I'm treating this as Regulation 44 evidence preparation.",
        "Focus on independent scrutiny evidence, actions closed, and manager oversight.",
    ),
    "regulation_45": (
        "I'm treating this as Regulation 45 quality of care reporting.",
        "Structure themes, child experience findings, actions and RI reporting.",
    ),
    "ofsted_sccif_readiness": (
        "I'm treating this as Ofsted / SCCIF readiness.",
        "Focus on help and protection evidence, child experience, and proportionate inspection preparation.",
    ),
    "management_oversight_drift": (
        "I'm treating this as management oversight and drift.",
        "Record patterns, actions taken, review dates, and RI oversight where needed.",
    ),
    "supervision_staff_development": (
        "I'm treating this as supervision and staff development.",
        "Structure practice discussion, safeguarding reflections, learning and agreed actions.",
    ),
    "handover_team_communication": (
        "I'm treating this as handover and team communication.",
        "Cover risks, key events, safeguarding flags, and tasks for the next shift.",
    ),
    "privacy_pii_sensitive": (
        "I'm treating this as a privacy / sensitive records question.",
        "Apply data minimisation, approved systems, and manager guidance where unsure.",
    ),
    "recording_quality": (
        "I'm treating this as a recording quality question.",
        "Separate observation from interpretation, use child-centred language, and keep records proportionate.",
    ),
    "reports_summaries_chronologies": (
        "I'm treating this as reports / summaries / chronologies.",
        "Build factual chronology, themes, sources, and manager review before sharing.",
    ),
    "provider_policy_local_procedure": (
        "I'm treating this as a provider policy / local procedure question.",
        "Apply local policy and professional judgement — I won't claim guaranteed compliance.",
    ),
}

_CONTRACT_TO_CATEGORY: dict[str, str] = {
    "daily_record": "daily_recording",
    "incident_record": "incident_recording",
    "missing_return_record": "missing_from_care",
    "suicidal_self_harm": "self_harm_suicide",
    "allegation_lado": "allegations_lado",
    "abuse_disclosure": "exploitation_contextual_safeguarding",
    "medication_refusal_guidance": "medication_refusal_support",
    "contact_distress_recording": "contact_family_time",
    "school_refusal_recording": "school_refusal_attendance",
    "child_voice_evidence_recording": "aac_symbols_gestures",
    "accessible_child_support_plan": "orb_communicate",
    "communicate_support_pack": "orb_communicate",
    "manager_oversight_note": "management_oversight_drift",
    "reg44_visitor": "regulation_44",
    "ofsted_preparation": "ofsted_sccif_readiness",
    "policy_practice_question": "provider_policy_local_procedure",
    "keywork_session": "supervision_staff_development",
    "template_generation": "handover_team_communication",
}

_CATEGORY_PATTERNS: list[tuple[Pattern[str], str]] = [
    (re.compile(r"missing from care|absent|awol|late return|whereabouts", re.I), "missing_from_care"),
    (re.compile(r"self[- ]?harm|suicidal|want to die|blade", re.I), "self_harm_suicide"),
    (re.compile(r"allegation|lado|staff member touched|staff grabbed", re.I), "allegations_lado"),
    (re.compile(r"medication error|wrong dose|double dose", re.I), "medication_error"),
    (re.compile(r"refused medication|medication refusal|will not take.*tablet", re.I), "medication_refusal_support"),
    (re.compile(r"communication support pack|communicate support pack", re.I), "orb_communicate"),
    (re.compile(r"physical intervention|restraint|\bhold\b", re.I), "physical_intervention_restraint"),
    (re.compile(r"reg\s*44|regulation\s*44", re.I), "regulation_44"),
    (re.compile(r"reg\s*45|regulation\s*45", re.I), "regulation_45"),
    (re.compile(r"ofsted|sccif|inspection", re.I), "ofsted_sccif_readiness"),
    (re.compile(r"handover", re.I), "handover_team_communication"),
    (re.compile(r"whistleblow|protected disclosure|falsifying records", re.I), "whistleblowing_staff_conduct"),
    (re.compile(r"county lines|exploitation|contextual safeguarding", re.I), "exploitation_contextual_safeguarding"),
    (re.compile(r"ligature|fire setting|burn marks", re.I), "fire_setting_ligatures_environmental"),
    (re.compile(r"school refused|refused school|school anxiety", re.I), "school_refusal_attendance"),
    (re.compile(r"gestures? and symbols?|aac|symbol board|widgets?", re.I), "aac_symbols_gestures"),
    (re.compile(r"daily record|quiet evening|breakfast", re.I), "daily_recording"),
    (re.compile(r"incident report|incident record", re.I), "incident_recording"),
]


@dataclass(frozen=True)
class InstantFirstLinesResult:
    lines: tuple[str, ...]
    category_id: str
    contract_family: str | None
    risk_level: str
    source_surface: str
    elapsed_ms: float

    @property
    def text(self) -> str:
        return "\n".join(self.lines)


def detect_playbook_category(
    message: str,
    *,
    contract_family: str | None = None,
) -> str:
    text = (message or "").strip()
    if not text:
        return "daily_recording"
    family = contract_family or detect_contract_family(text)
    if family and family in _CONTRACT_TO_CATEGORY:
        mapped = _CONTRACT_TO_CATEGORY[family]
        if family == "incident_record" and re.search(r"medication error|wrong dose", text, re.I):
            return "medication_error"
        if family == "incident_record" and re.search(r"whistleblow|protected disclosure", text, re.I):
            return "whistleblowing_staff_conduct"
        if family == "abuse_disclosure" and re.search(r"sexual|hsb", text, re.I):
            return "harmful_sexual_behaviour"
        if family == "daily_record" and re.search(r"complaint", text, re.I):
            return "complaints"
        return mapped
    for pattern, category_id in _CATEGORY_PATTERNS:
        if pattern.search(text):
            return category_id
    return "daily_recording"


def _risk_level_for_category(category_id: str) -> str:
    high_risk = {
        "self_harm_suicide",
        "missing_from_care",
        "allegations_lado",
        "family_risk_disclosures_contact",
        "harmful_sexual_behaviour",
        "weapons_violence_police",
        "fire_setting_ligatures_environmental",
        "medication_error",
        "exploitation_contextual_safeguarding",
    }
    if category_id in high_risk:
        return "high"
    elevated = {
        "physical_intervention_restraint",
        "substance_use",
        "online_safety",
        "bullying_peer_harm",
        "whistleblowing_staff_conduct",
    }
    if category_id in elevated:
        return "elevated"
    return "routine"


def instant_first_lines_for_message(
    message: str,
    *,
    route: str = "/orb/standalone/conversation/stream",
    contract_family: str | None = None,
    category_id: str | None = None,
    risk_level: str | None = None,
    source_surface: str = "orb_standalone",
) -> InstantFirstLinesResult:
    started = time.perf_counter()
    text = (message or "").strip()
    family = contract_family or detect_contract_family(text)
    category = category_id or detect_playbook_category(text, contract_family=family)
    lines = _CATEGORY_FIRST_LINES.get(category) or _CATEGORY_FIRST_LINES["daily_recording"]
    elapsed_ms = (time.perf_counter() - started) * 1000
    return InstantFirstLinesResult(
        lines=lines[:3],
        category_id=category,
        contract_family=family,
        risk_level=risk_level or _risk_level_for_category(category),
        source_surface=source_surface,
        elapsed_ms=elapsed_ms,
    )


def should_skip_instant_lines(
    *,
    expert_depth: str,
    guarded_stream_delivery: bool,
) -> bool:
    if guarded_stream_delivery:
        return True
    return expert_depth == "general_light"


def merge_instant_lines_with_answer(
    *,
    instant_lines: str,
    full_answer: str,
) -> str:
    instant = (instant_lines or "").strip()
    answer = (full_answer or "").strip()
    if not instant:
        return answer
    if not answer:
        return instant
    if answer.lower().startswith(instant.lower()):
        return answer
    first_line = instant.split("\n", 1)[0].strip().lower()
    if answer.lower().startswith(first_line):
        return answer
    return f"{instant}\n\n{answer}"


def strip_duplicate_instant_prefix(streamed_text: str, instant_lines: str) -> str:
    """Remove instant prefix from streamed text when full answer will repeat it."""
    streamed = (streamed_text or "").strip()
    instant = (instant_lines or "").strip()
    if not streamed or not instant:
        return streamed_text
    if streamed.lower().startswith(instant.lower()):
        remainder = streamed[len(instant) :].lstrip("\n")
        return remainder
    first_line = instant.split("\n", 1)[0].strip()
    if streamed.lower().startswith(first_line.lower()):
        remainder = streamed[len(first_line) :].lstrip(" .\n")
        return remainder
    return streamed_text
