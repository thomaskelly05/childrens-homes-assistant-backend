"""Post-generation repair for ORB final answers that fail contract validation."""

from __future__ import annotations

import re
from typing import Any

from services.orb_fast_opening_service import strip_streaming_artifacts_from_answer
from services.orb_final_answer_contract_validator_service import validate_final_answer_contract
from services.orb_placeholder_quality_guard_service import sanitize_placeholders_in_answer
from services.orb_execution_policy_service import (
    MISSING_FROM_CARE_ACTIVE_DETERMINISTIC_ANSWER,
    MISSING_RETURN_SUBSTANCE_DETERMINISTIC_ANSWER,
    deterministic_answer_for_missing_contract,
    is_active_missing_from_care_prompt,
)
from services.orb_mandatory_response_contract_service import find_inappropriate_lado_reference
from assistant.knowledge.adult_identity_language import (
    build_simple_daily_record_draft,
    is_daily_record_draft_mode,
    looks_like_daily_record_draft_violation,
    sanitize_visible_final_answer,
)
from assistant.knowledge.residential_safeguarding_terminology import (
    find_inappropriate_dsl_reference,
    find_inappropriate_medication_error_reference,
)
from services.orb_communicate_support_pack_service import orb_communicate_support_pack_service
from services.orb_recording_contract_service import extract_known_incident_facts
from services.orb_recording_output_contract_service import (
    has_recording_contract_sections,
    is_recording_contract_prompt,
    recording_contract_blocked_by_safeguarding,
    sanitize_corrupted_placeholders,
    strip_unsupported_pathway_language,
    try_build_recording_contract_answer,
    find_pathway_drift_issues,
)
from services.orb_therapeutic_language_contract_service import (
    apply_deterministic_therapeutic_repairs,
    build_convert_to_recording_scaffold,
    detect_adult_shorthand,
    is_convert_to_recording_request,
)

ACCESSIBLE_CHILD_SUPPORT_PLAN_TEMPLATE = """
# My Support Plan

This is my plan. It helps adults understand me, listen to me and support my future.

## 1. About me

My name is: [Add my preferred name]
I am 17.
Things I like: [Add my interests, favourite people, places, activities and sensory likes]
Things I want adults to know about me: [Add what matters to me]

## 2. My dreams and future

Things I would like to do:

* [Add a dream or aspiration using my widget, symbol, photo or words]
* [Add another dream or aspiration]

Things I want to learn:

* [Add independence skill]
* [Add social, home, education or community goal]

## 3. My widgets and how I communicate

I use: [Add widgets/AAC/symbols/photos/device/objects of reference]
Adults help me best when they:

* give me time
* offer clear choices
* show me the widget/symbol/photo
* check what I mean
* do not rush me

## 4. How I tell people important things

Yes: [Add how I show yes]
No: [Add how I show no]
Stop: [Add how I show stop]
Help: [Add how I ask for help]
Pain/unwell: [Add how I show pain, discomfort or feeling unwell]
Worried/upset: [Add how I show worry or upset]
Happy/calm: [Add how I show I am happy or calm]

## 5. What helps me feel calm and safe

[Add people, routines, sensory items, communication supports, places]

## 6. What makes things hard for me

[Add triggers, communication barriers, sensory difficulties, changes, waiting, noise, transitions]

## 7. My daily support

Morning:
Daytime:
Evening:
Night-time:

## 8. My independence goals

This month I am practising:
In the next 6 months I would like to:
Before adulthood I would like to:

## 9. People who help me

Trusted adult:
Family/social worker/advocate/education/health:
Who I want involved in reviews:

## 10. How adults should support me

Adults should:

* use my widgets
* offer choices visually
* allow processing time
* speak to me respectfully
* check my understanding
* record my views using my communication method

## 11. Things adults should not do

Adults should not:

* speak over me
* guess without checking
* rush my answer
* ignore my widget choices
* talk about me as if I am not there

## 12. Reviewing my plan

We will review this plan on: [Add date]
I will show what I think by: [Add widgets/symbols/photos/traffic lights/choice board]
Things to change after review: [Add updates]

## Adult guidance for using this plan

Use this plan with the young person, not just about them. Check meaning, give time, record the young person's communication clearly, and link goals to preparing for adulthood, independence, relationships and quality of life.
""".strip()


def _extract_age_from_message(message: str) -> str | None:
    match = re.search(r"\b(\d{1,2})[- ]year[- ]old\b", message or "", re.I)
    if match:
        return match.group(1)
    return None


def _personalise_support_plan_template(message: str) -> str:
    template = ACCESSIBLE_CHILD_SUPPORT_PLAN_TEMPLATE
    age = _extract_age_from_message(message)
    if age:
        template = template.replace("I am 17.", f"I am {age}.")
    lower = (message or "").lower()
    if "widget" in lower:
        template = template.replace(
            "[Add widgets/AAC/symbols/photos/device/objects of reference]",
            "[Add widgets the young person uses to communicate]",
        )
    if "gdd" in lower or "global developmental delay" in lower:
        template = template.replace(
            "[Add what matters to me]",
            "[Add what matters to me — including how GDD affects my communication and daily life]",
        )
    return template


def _resolve_recording_policy(message: str) -> Any:
    from services.orb_execution_policy_service import orb_execution_policy_service

    return orb_execution_policy_service.resolve(message)


def _answer_looks_like_generic_recording_stub(answer: str) -> bool:
    lower = str(answer or "").lower()
    if has_recording_contract_sections(answer):
        return False
    generic_phrases = (
        "paste what happened",
        "i can help you draft",
        "tell me more about",
        "happy to help",
        "absolutely — paste",
        "help me draft a factual incident",
    )
    if any(phrase in lower for phrase in generic_phrases):
        return True
    return len(str(answer or "").strip()) < 120


def repair_accessible_child_support_plan(answer: str, *, message: str = "") -> str:
    """Deterministic rewrite into the canonical child-facing support plan structure."""
    _ = answer
    return _personalise_support_plan_template(message)


def repair_communicate_support_pack(answer: str, *, message: str = "") -> str:
    """Deterministic Communication Support Pack for Chat communicate prompts."""
    _ = answer
    output = orb_communicate_support_pack_service.build_support_pack_from_message(message)
    return orb_communicate_support_pack_service.format_support_pack_for_chat(output)


def apply_deterministic_repairs(
    answer: str,
    *,
    contract_family: str | None,
    message: str = "",
    fast_opening: str | None = None,
) -> tuple[str, dict[str, Any]]:
    """Apply lightweight deterministic fixes before validation retry."""
    repair_meta: dict[str, Any] = {"therapeutic_repairs": []}
    cleaned = strip_streaming_artifacts_from_answer(answer, fast_opening=fast_opening)
    cleaned, _ = sanitize_placeholders_in_answer(cleaned)
    cleaned, corrupted_ph = sanitize_corrupted_placeholders(cleaned)
    if corrupted_ph:
        repair_meta["placeholder_repairs"] = corrupted_ph
    cleaned = strip_unsupported_pathway_language(cleaned, message)
    policy = _resolve_recording_policy(message)
    recording_allowed = (
        is_recording_contract_prompt(
            message,
            execution_policy=policy.execution_policy,
            contract_family=policy.selected_contract,
        )
        and not recording_contract_blocked_by_safeguarding(
            message,
            execution_policy=policy.execution_policy,
            contract_family=policy.selected_contract,
        )
    )
    if recording_allowed:
        drift = find_pathway_drift_issues(cleaned, message)
        needs_contract = drift or not has_recording_contract_sections(cleaned)
        if needs_contract and _answer_looks_like_generic_recording_stub(cleaned):
            rebuilt = try_build_recording_contract_answer(
                message,
                execution_policy=policy.execution_policy,
                contract_family=policy.selected_contract,
            )
            if rebuilt:
                cleaned = rebuilt
                repair_meta["repair_reason"] = "recording_output_contract"
    cleaned, therapeutic_repairs = apply_deterministic_therapeutic_repairs(cleaned)
    if therapeutic_repairs:
        repair_meta["therapeutic_repairs"] = therapeutic_repairs
        repair_meta["repair_reason"] = "therapeutic_language"
    if contract_family == "missing_return_record":
        cleaned = repair_missing_return_record(cleaned, message=message)
    if is_convert_to_recording_request(message) and (
        detect_adult_shorthand(message) or extract_known_incident_facts(message).get("shorthand_behaviour")
    ):
        cleaned = build_convert_to_recording_scaffold(message)
        repair_meta["repair_reason"] = "therapeutic_language"
    if contract_family == "accessible_child_support_plan":
        lower = cleaned.lower()
        needs_full_rewrite = any(
            phrase in lower
            for phrase in (
                "creating a child-friendly support plan",
                "here's a structured template",
                "here is a structured template",
                "tailored to their individual needs",
                "requires a focus on",
            )
        ) or len(cleaned) < 400
        if needs_full_rewrite:
            return repair_accessible_child_support_plan(cleaned, message=message), repair_meta
    if contract_family == "communicate_support_pack":
        lower = cleaned.lower()
        needs_pack = any(
            phrase in lower
            for phrase in (
                "you could create",
                "consider creating",
                "here are some tips",
                "you might want to prepare",
                "communication support pack could",
            )
        ) or "## Easy-read explanation" not in cleaned
        if needs_pack:
            return repair_communicate_support_pack(cleaned, message=message), {
                **repair_meta,
                "repair_reason": "communicate_support_pack",
            }
    if contract_family == "daily_record" and is_daily_record_draft_mode(message):
        if looks_like_daily_record_draft_violation(cleaned):
            return build_simple_daily_record_draft(message), {
                **repair_meta,
                "repair_reason": "daily_record_draft",
            }
    return cleaned, repair_meta


def _apply_record_output_discipline(answer: str, *, message: str) -> str:
    polished = sanitize_visible_final_answer(answer, source_text=message)
    return polished


def _apply_residential_answer_polish(answer: str, *, message: str) -> str:
    return _apply_record_output_discipline(answer, message=message)


def repair_and_validate_final_answer(
    answer: str,
    *,
    contract_family: str | None,
    message: str = "",
    depth_tier: str | None = None,
    mode: str | None = None,
    fast_opening: str | None = None,
) -> tuple[str, dict[str, Any]]:
    """Repair failed answers and re-validate; returns final answer and validation metadata."""
    validation = validate_final_answer_contract(
        answer,
        contract_family=contract_family,
        depth_tier=depth_tier,
        mode=mode,
        fast_opening=fast_opening,
        source_text=message,
    )
    original_had_judgemental = bool(
        (validation.get("therapeutic_validation") or {}).get("judgemental_phrases")
    )
    if validation["passed"]:
        sanitized = _apply_residential_answer_polish(validation["sanitized_answer"], message=message)
        return sanitized, {
            "final_answer_validation_passed": True,
            "repair_applied": original_had_judgemental or sanitized != validation["sanitized_answer"],
            "answer_repaired": original_had_judgemental or sanitized != validation["sanitized_answer"],
            "repair_reason": "therapeutic_language" if original_had_judgemental else (
                "live_record_discipline" if sanitized != validation["sanitized_answer"] else None
            ),
            "validation": validation,
        }

    repaired, repair_meta = apply_deterministic_repairs(
        answer,
        contract_family=contract_family,
        message=message,
        fast_opening=fast_opening,
    )
    revalidation = validate_final_answer_contract(
        repaired,
        contract_family=contract_family,
        depth_tier=depth_tier,
        mode=mode,
        fast_opening=fast_opening,
        source_text=message,
    )
    if contract_family == "accessible_child_support_plan" and not revalidation["passed"]:
        repaired = repair_accessible_child_support_plan(repaired, message=message)
        revalidation = validate_final_answer_contract(
            repaired,
            contract_family=contract_family,
            depth_tier=depth_tier,
            mode=mode,
            fast_opening=fast_opening,
            source_text=message,
        )
    if contract_family == "communicate_support_pack" and (
        not revalidation["passed"] or "## Easy-read explanation" not in repaired
    ):
        repaired = repair_communicate_support_pack(repaired, message=message)
        revalidation = validate_final_answer_contract(
            repaired,
            contract_family=contract_family,
            depth_tier=depth_tier,
            mode=mode,
            fast_opening=fast_opening,
            source_text=message,
        )
    validation = revalidation

    repair_reason = (
        repair_meta.get("repair_reason")
        or validation.get("repair_reason")
        or ("therapeutic_language" if original_had_judgemental else None)
    )
    answer_repaired = bool(
        repair_meta.get("therapeutic_repairs")
        or original_had_judgemental
        or repair_reason == "therapeutic_language"
    )
    final_answer = _apply_residential_answer_polish(validation["sanitized_answer"], message=message)
    if final_answer != validation["sanitized_answer"]:
        answer_repaired = True
        repair_reason = repair_reason or "live_record_discipline"
    validation_passed = bool(validation["passed"])
    return final_answer, {
        "final_answer_validation_passed": validation_passed,
        "validation_failed_but_returned": not validation_passed,
        "repair_applied": answer_repaired or not validation_passed,
        "answer_repaired": answer_repaired,
        "repair_reason": repair_reason,
        "therapeutic_repairs": repair_meta.get("therapeutic_repairs") or [],
        "validation": validation,
    }


# Deterministic canonical final answers for offline QA — one per high-priority family.
CANONICAL_QA_ANSWERS: dict[str, str] = {
    "daily_record": """
Daily record — [date]

What happened (factual):
At breakfast she was calm and chose toast. She ate independently and engaged briefly with staff.

Staff response:
Staff offered breakfast choices and supported her to make her own selection. Staff observed her presentation and mood.

Outcome:
Breakfast completed without incident. No follow-up required at this stage.
""".strip(),
    "incident_record": """
Incident record — [date/time]

Immediate safety:
Jamie was supported to a safe space. No injuries observed. Other children were kept safe.

What happened:
After family contact Jamie became dysregulated and kicked furniture. Staff used de-escalation.

Staff response:
Two staff responded calmly, offered space, and used agreed strategies. Manager notified.

Outcome:
Jamie settled within 20 minutes. Repair conversation planned with key worker.
""".strip(),
    "missing_return_record": MISSING_RETURN_SUBSTANCE_DETERMINISTIC_ANSWER,
    "allegation_lado": """
Allegation against staff — immediate actions

Child safety first. Do not investigate or decide truth.

Manager and responsible individual notified immediately. LADO / designated officer consideration under local procedure.
Social worker and police contacted as required by local safeguarding procedure.

Record exact words and actions. Allegation management is separate from any disciplinary judgement.
""".strip(),
    "abuse_disclosure": """
Abuse disclosure — immediate actions

Listen calmly without leading questions. Do not investigate or decide truth.

Immediate safety and current risk check completed. Manager / on-call manager notified.

Social worker and police contacted under local procedure. Child's words recorded accurately.
Trauma-informed support offered. Chronology and risk plan to be updated.
""".strip(),
    "suicidal_self_harm": """
Self-harm / suicidal ideation — immediate actions

Treat this as an immediate safeguarding and wellbeing concern. Stay with the young person if there is any current risk, keep the environment safe, and inform the manager/on-call without delay.

Immediate safety:
Do not leave alone while immediate risk remains. Remove or secure any means of harm where possible without escalating risk.

Direct safety questions asked. Crisis route considered if risk escalates.

Manager / on-call notified. Follow the home's self-harm / safeguarding procedure.
Exact words and actions recorded.
Call 999 or urgent health support if there is immediate danger.
""".strip(),
    "parent_removal_conflict": """
Parent demanding removal — immediate actions

Child welfare and legal status:
Confirm legal authority before any removal. Do not allow removal without proper authority.

Manager direction sought immediately. Police and social worker contacted where required.

Child voice and distress considered. Factual record of words and actions to be completed.
""".strip(),
    "manager_oversight_note": """
Manager oversight note — repeated missing episodes

What is known:
Three missing episodes this month. Return conversations and notifications completed.

What is missing:
Updated contextual safeguarding analysis and placement plan review dates.

Decision and rationale:
Threshold review convened. Missing plan and risk assessment to be updated this week.

Follow-up:
Staff briefing on recording standards. Evidence trail for Reg 44 and Ofsted chronology.
""".strip(),
    "reg44_visitor": """
What a Reg 44 visitor should look for in a children's home — evidence-focused:

Lived experience of children
* Do children feel safe, listened to and involved in decisions?
* Quality of relationships, warmth and nurture
* Child voice and influence in daily life

Safeguarding effectiveness
* Missing episodes, restraints, consequences/sanctions, incidents, complaints, medication where relevant
* Staff responses to behaviour and distress
* Whether records match practice

Consultation and triangulation
* Speak with children, staff, parents/carers, placing authorities and professionals
* Review records, chronologies and plans sampled

Manager oversight and learning
* Action from previous Regulation 44 visits — shortfalls, actions, owner and timescale
* Whether the home is learning and improving

Record factually what you saw, heard and reviewed — evidence not assertion. Do not predict Ofsted judgement grades.
""".strip(),
    "what_am_i_missing": """
Gaps in this incident note

Missing factual detail:
Time, location, antecedents and exact words are incomplete.

Child voice missing:
What the child said and how they presented is not recorded.

Next steps:
Add staff response, outcome, manager notification and follow-up actions.
Professional curiosity: any pattern, contextual risk or plan update needed?
""".strip(),
    "convert_to_recording_wording": """
Recording wording scaffold:

On [add date/time], the young person was observed to [add specific behaviours].
Staff remained curious about what the young person may have been communicating and
supported them by [add staff response]. The young person responded by [add outcome].

Observation (factual): record what was seen and heard in observable terms.
Include child voice, staff response and outcome.
Use appeared / was observed where facts are not yet confirmed.
""".strip(),
}


def repair_missing_return_record(answer: str, *, message: str = "") -> str:
    """Replace answers that wrongly route to LADO, miss markers, or treat active missing as return."""
    target = deterministic_answer_for_missing_contract(message)
    if is_active_missing_from_care_prompt(message):
        lower = (answer or "").lower()
        if re.search(r"missing\s+return\s*[—\-]", answer or "", re.I):
            return target
        if "welcome back" in lower and "when the young person returns" not in lower:
            return target
        if find_inappropriate_lado_reference(answer, message):
            return target
        required = ("missing", "manager", "procedure", "record")
        if sum(1 for marker in required if marker in lower) < 3:
            return target
        return answer
    if find_inappropriate_lado_reference(answer, message):
        return MISSING_RETURN_SUBSTANCE_DETERMINISTIC_ANSWER
    lower = (answer or "").lower()
    required = ("welfare", "missing", "manager", "social worker", "exploitation")
    if sum(1 for marker in required if marker in lower) < 4:
        return MISSING_RETURN_SUBSTANCE_DETERMINISTIC_ANSWER
    return answer


def canonical_answer_for_qa(contract_family: str, *, message: str = "") -> str | None:
    """Deterministic canonical answer for offline QA validation."""
    from services.orb_recording_output_contract_service import try_build_recording_contract_answer

    recording = try_build_recording_contract_answer(message)
    if recording:
        return recording
    if contract_family == "accessible_child_support_plan":
        return repair_accessible_child_support_plan("", message=message)
    if contract_family == "convert_to_recording_wording" and is_convert_to_recording_request(message):
        facts = extract_known_incident_facts(message)
        if detect_adult_shorthand(message) or facts.get("shorthand_behaviour"):
            return build_convert_to_recording_scaffold(message)
    if contract_family == "missing_return_record":
        return deterministic_answer_for_missing_contract(message)
    return CANONICAL_QA_ANSWERS.get(contract_family)


orb_final_answer_repair_service = type(
    "OrbFinalAnswerRepairService",
    (),
    {
        "ACCESSIBLE_CHILD_SUPPORT_PLAN_TEMPLATE": ACCESSIBLE_CHILD_SUPPORT_PLAN_TEMPLATE,
        "CANONICAL_QA_ANSWERS": CANONICAL_QA_ANSWERS,
        "repair_accessible_child_support_plan": staticmethod(repair_accessible_child_support_plan),
        "apply_deterministic_repairs": staticmethod(apply_deterministic_repairs),
        "repair_and_validate_final_answer": staticmethod(repair_and_validate_final_answer),
        "canonical_answer_for_qa": staticmethod(canonical_answer_for_qa),
    },
)()
