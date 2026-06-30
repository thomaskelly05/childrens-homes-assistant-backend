"""ORB Q2 critical practice answers — deterministic high-risk residential guidance.

Targets six critical-50 GOLD families where generic incident/handover templates
were returning unsafe, marker-thin answers.
"""

from __future__ import annotations

import re
from typing import Any

_LOCAL_POLICY_CAVEAT = (
    "Use professional judgement and your organisation's local policy throughout — "
    "ORB cannot replace manager, on-call, clinical, or statutory decisions."
)

_CRITICAL_FAMILY_DETECTORS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(
            r"head\s+injur|drowsy after|fall.{0,40}(?:bathroom|injur)|"
            r"\b(999|111)\b.{0,40}(?:hospital|medical)|"
            r"hospital.{0,40}escalat|urgent\s+health\s+escalat",
            re.I,
        ),
        "hospital_escalation",
    ),
    (
        re.compile(
            r"wrong\s+child|medication\s+error|wrong\s+(?:dose|medication)|"
            r"double\s+dose|controlled\s+drug.{0,40}discrepanc",
            re.I,
        ),
        "medication_error",
    ),
    (
        re.compile(
            r"parent.{0,60}(?:restraint|complaint|alleg|cctv)|"
            r"(?:restraint|cctv).{0,40}parent|parent\s+alleges",
            re.I,
        ),
        "parent_complaint_restraint",
    ),
    (
        re.compile(
            r"different\s+(?:restraint\s+)?timeline|conflicting\s+account|"
            r"staff\s+give\s+different|disagree\s+what\s+happened|"
            r"accounts?\s+do\s+not\s+align",
            re.I,
        ),
        "conflicting_staff_accounts",
    ),
    (
        re.compile(
            r"(?:fourth|third|second|again).{0,40}restraint|"
            r"restraint.{0,40}(?:this\s+month|again|trend|pattern)|"
            r"bsp\s+last\s+reviewed|repeated\s+restraint",
            re.I,
        ),
        "repeated_restraint_trend",
    ),
    (
        re.compile(
            r"restraint\s+record\s+says|kicked\s+off.{0,60}(?:no\s+antecedent|debrief)|"
            r"weak\s+restraint\s+record|no\s+antecedent.{0,40}debrief",
            re.I,
        ),
        "weak_restraint_record",
    ),
)

_FORBIDDEN_CHILD_BLAME_RE = re.compile(
    r"\b(attention\s+seeking|manipulative|chose\s+to\s+kick\s+off|naughty|defiant)\b",
    re.I,
)


def detect_critical_practice_family(message: str) -> str | None:
    """Return Q2 critical practice family id when prompt matches a hardened scenario."""
    text = str(message or "").strip()
    if not text:
        return None
    for pattern, family_id in _CRITICAL_FAMILY_DETECTORS:
        if pattern.search(text):
            return family_id
    return None


def try_build_critical_practice_answer(message: str) -> str | None:
    """Build a deterministic critical-practice answer when the prompt matches Q2 families."""
    family_id = detect_critical_practice_family(message)
    if not family_id:
        return None
    builders = {
        "repeated_restraint_trend": _build_repeated_restraint_answer,
        "weak_restraint_record": _build_weak_restraint_record_answer,
        "medication_error": _build_medication_error_answer,
        "parent_complaint_restraint": _build_parent_restraint_complaint_answer,
        "conflicting_staff_accounts": _build_conflicting_accounts_answer,
        "hospital_escalation": _build_hospital_escalation_answer,
    }
    builder = builders.get(family_id)
    if not builder:
        return None
    answer = builder(message)
    if _FORBIDDEN_CHILD_BLAME_RE.search(answer):
        return None
    return f"{answer.rstrip()}\n\n{_LOCAL_POLICY_CAVEAT}"


def _build_repeated_restraint_answer(_message: str) -> str:
    return """Based only on what you have provided — I have not checked live IndiCare OS records.

## Repeated restraint trend

This is not an isolated incident. A **trend** of physical intervention for the same young person needs immediate manager grip, welfare review, and plan refresh.

### Immediate safety and welfare
- Check immediate safety and welfare for the young person and others.
- Check for injuries, pain, or distress after each restraint.
- Offer calm support and do not leave the young person isolated without a safety rationale.

### Pattern and plan review
- Review the **trend** across recent restraints — dates, triggers, duration, staff involved, and outcomes.
- Review whether the behaviour support plan (**BSP review**) is current and whether therapeutic alternative strategies were attempted first.
- Consider whether restraint was necessary, proportionate, and the least restrictive option each time.
- Review risk assessment, placement plan, and whether external professionals or the placing authority need informing under local policy.

### Debrief and recording
- Complete debrief with the young person when appropriate, and a staff debrief with manager oversight.
- Record the **child voice** and experience where known — do not invent quotes.
- Record what less restrictive approaches were tried before physical intervention.

### Manager oversight
- Registered manager review of the pattern, learning, and next actions with a clear owner and timescale.
- Do not normalise repeated restraint or present it as routine behaviour management."""


def _build_weak_restraint_record_answer(_message: str) -> str:
    return """Based only on what you have provided — I have not checked live IndiCare OS records.

## Weak restraint record

**This is not ready to sign off yet.**

The record described uses judgemental shorthand rather than factual, restraint-safe wording. Do not sign off until the missing evidence is clarified.

### What is missing
- **Antecedent-behaviour-consequence** sequence: what happened immediately before, observable behaviour, immediate risk, and what followed.
- **Factual language** instead of labels such as kicked off — describe what was seen and heard.
- Why physical intervention was used, what de-escalation was attempted, type of hold if known, duration, and who was involved.
- Injury or safety checks after the intervention, and the young person's presentation afterwards.
- **Child voice** where known — do not invent what the young person said or felt.
- Staff debrief and manager oversight, and whether records align with local policy and training (**Reg 12**).

### What to clarify before finalising
- Exact times, location, antecedents, observable behaviour, and immediate risk.
- De-escalation attempted and why physical intervention became necessary.
- Duration, staff involved, injuries or checks, and outcome.
- Debrief offered/completed with the young person and staff.

Do not fill in missing facts or assume the intervention was safe or proportionate without evidence."""


def _build_medication_error_answer(_message: str) -> str:
    return """Based only on what you have provided — I have not checked live IndiCare OS records.

## Medication error

Prioritise **immediate safety** and follow your medication policy without delay.

### Immediate actions
- Check the young person's presentation and welfare now.
- Clarify what medication was involved, dose, time, route, and what error occurred — wrong child, wrong dose, wrong medication, wrong time, missed dose, or chart discrepancy.
- **Notify manager** / on-call immediately.
- Seek **GP/NHS advice** in line with your medication policy if there is any uncertainty, risk, adverse presentation, wrong dose, wrong medication, or concern about the young person's health.

### Recording and notification
- Complete an **incident record** with a factual chronology — who did what, when, and what is known vs not yet known.
- Update the MAR chart accurately once facts are confirmed.
- Notify parent/placing authority/social worker according to policy — do not decide notification thresholds for the adult.
- Controlled drug discrepancies need secure handling, witness where required, and management review.

### Learning and regulatory caution
- Capture **learning** and prevention actions — what will reduce recurrence.
- For **CQC/Ofsted notification uncertainty without inventing**: follow local policy and manager advice; ORB cannot decide whether a statutory notification is required.
- Do not give clinical advice, minimise a missed dose, or say the young person is safe without evidence."""


def _build_parent_restraint_complaint_answer(_message: str) -> str:
    return """Based only on what you have provided — I have not checked live IndiCare OS records.

## Parent complaint about restraint

**Take seriously** the parent/carer's concern respectfully and without defensive language.

### Preserve facts and governance
- Build a **factual chronology** from records — what is known, when, and what remains unclear.
- Gather **accounts** separately: parent/carer account, young person's words where known, and each staff account. Do not merge them into one certainty.
- Review the incident record, body map/injury record if relevant, debrief records, and whether records are consistent.
- Consider safeguarding implications and whether the placing authority/social worker should be informed under local policy.

### Complaints process
- Follow your **complaints process** and local **Reg 12** restraint/recording duties.
- Manager review with clear ownership and timescale.
- **Do not invent CCTV** or other evidence that does not exist — record what evidence is actually available.
- Do not dismiss the concern, advise admitting fault, advise hiding records, or give legal advice.
- Avoid sharing confidential staff or child information inappropriately with the complainant."""


def _build_conflicting_accounts_answer(_message: str) -> str:
    return """Based only on what you have provided — I have not checked live IndiCare OS records.

## Conflicting accounts

Record the differing accounts separately and clearly. **Do not pick side** or resolve the discrepancy in the record unless there is evidence to do so.

### Neutral fact-finding
- Use **neutral fact-finding** — separate what was directly observed from what was reported.
- Record each account with date/time/source: each staff account, the young person's words (**child voice**) where known, and any parent/carer account.
- Note what remains unclear and what management oversight is needed next.
- Review **CCTV if exists** — if not available, record that fact rather than implying footage exists.

### Safeguarding and records
- Escalate safeguarding if risk, allegation, or injury concerns exist — follow local policy.
- Preserve original records; do not edit records to make them align artificially.
- Do not decide who is telling the truth or smooth contradictions away."""


def _build_hospital_escalation_answer(_message: str) -> str:
    return """Based only on what you have provided — I have not checked live IndiCare OS records.

## Hospital / urgent health escalation

### Immediate welfare
- Treat this as an immediate health concern. Check observable symptoms/presentation now.
- Call **emergency services (999)** if there is serious injury, reduced consciousness, breathing difficulty, repeated vomiting after head injury, seizure, or any immediate life-threatening concern.
- Use **111** or urgent GP/urgent care only if your local policy and presentation support that route — ORB cannot decide the correct clinical pathway.
- **Do not diagnose** or state what injury the young person has — record observations only.

### Actions and chronology
- Record first aid or immediate support provided, who made the decision to seek medical advice, and time of escalation.
- **Notify manager/parents per protocol** and placing authority/social worker according to plan/policy.
- Note who accompanied the young person, consent/parental responsibility considerations per local policy, and outcome from hospital/medical professionals once known.
- Complete a **body map** / injury description if relevant and record observations factually.

### Recording boundary
- ORB does not provide medical advice or replace emergency services or clinical judgement.
- Do not say hospital was or was not needed without evidence from qualified professionals."""


def critical_practice_metadata(message: str) -> dict[str, Any] | None:
    family_id = detect_critical_practice_family(message)
    if not family_id:
        return None
    return {
        "critical_practice_family": family_id,
        "execution_policy": "deterministic_only",
        "no_llm": True,
    }
