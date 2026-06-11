"""Deterministic category-specific fallback answers for ORB Internal Brain mode."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

_HEADER = "[ORB Internal Brain — deterministic fallback. No external LLM was called.]"

_BOUNDARY_CAVEAT = (
    "This is not a substitute for professional judgement, your organisation's local procedures, "
    "or statutory sign-off. Inspectors, regulators, courts and qualified professionals make final decisions."
)

_LOCAL_POLICY_LINE = (
    "Follow your organisation's local policy and use professional judgement — "
    "this guidance is not a substitute for your home procedures or statutory sign-off."
)


@dataclass
class CategoryFallbackContent:
    """Structured fallback sections for a scenario category."""

    safety_position: str
    cannot_do: list[str] = field(default_factory=list)
    what_to_do: list[str] = field(default_factory=list)
    recording_guidance: list[str] = field(default_factory=list)
    child_voice: list[str] = field(default_factory=list)
    therapeutic_framing: list[str] = field(default_factory=list)
    escalation_policy: list[str] = field(default_factory=list)
    regulatory_orientation: list[str] = field(default_factory=list)


_CATEGORY_FALLBACKS: dict[str, CategoryFallbackContent] = {
    "do-not-report": CategoryFallbackContent(
        safety_position=(
            "A safeguarding concern has been raised — the young person's immediate safety comes first "
            "and this cannot be kept secret."
        ),
        cannot_do=[
            "ORB cannot promise secrecy or confidentiality about safeguarding concerns.",
            "ORB cannot help you avoid reporting abuse, neglect or serious harm.",
            "Safeguarding concerns cannot be kept hidden from the manager, DSL or safeguarding lead.",
        ],
        what_to_do=[
            "Prioritise immediate safety for the young person now.",
            "Escalate promptly to your on-call manager, designated safeguarding lead (DSL) or safeguarding lead.",
            "Follow your local safeguarding procedure and multi-agency reporting routes.",
            "Reassure the young person they have done the right thing by telling someone.",
        ],
        recording_guidance=[
            "Record the young person's words where known — do not invent quotes.",
            "Record facts, chronology, who was informed and actions taken.",
            "Keep safeguarding records in your organisation's approved recording system.",
        ],
        child_voice=[
            "Capture what the young person said in their own words where known.",
            "Record wishes, feelings and what mattered to them.",
        ],
        therapeutic_framing=[
            "Use calm, non-blaming language — the young person may be frightened of consequences.",
            "Behaviour and disclosures are communication; respond with safety and reassurance.",
        ],
        escalation_policy=[
            "Notify manager/on-call/DSL without delay.",
            "Call 999 if there is immediate risk to life.",
        ],
        regulatory_orientation=[
            "Children's Homes Regulations and statutory safeguarding guidance require concerns to be acted upon.",
            "Verify reporting thresholds against Working Together and your local policy.",
        ],
    ),
    "punitive-wording": CategoryFallbackContent(
        safety_position=(
            "Professional children's home records must be factual, therapeutic and non-stigmatising — "
            "ORB will not write punitive, shaming or blaming language."
        ),
        cannot_do=[
            "ORB will not write punitive, shaming or blaming records.",
            "Avoid labels such as manipulative, attention-seeking, defiant or naughty.",
        ],
        what_to_do=[
            "Describe observable behaviour, context, triggers and what staff did.",
            "Include de-escalation, repair, support offered and any follow-up plan.",
        ],
        recording_guidance=[
            "Record what was seen, heard, said and done — not character judgements.",
            "Include staff response, duration, location and outcome.",
        ],
        child_voice=[
            "Record the young person's words where known.",
            "Capture wishes, feelings and emotional presentation.",
        ],
        therapeutic_framing=[
            "Behaviour is communication — consider trauma, sensory and attachment context.",
            "Use calm, proportionate, non-shaming and non-blaming language.",
            "Record observable behaviour and staff support, not labels or blame.",
        ],
        escalation_policy=[
            "Seek manager or senior review if the incident meets your escalation threshold.",
        ],
        regulatory_orientation=[
            "SCCIF and Regulation 35 expect proportionate, child-centred recording.",
        ],
    ),
    "diagnosis-request": CategoryFallbackContent(
        safety_position=(
            "ORB cannot diagnose ADHD, conduct disorder, autism, mental health conditions or trauma disorders."
        ),
        cannot_do=[
            "ORB cannot diagnose conditions or supply clinical labels for chronology wording.",
            "Avoid clinical labels unless already formally recorded by qualified professionals.",
        ],
        what_to_do=[
            "Record observations only — what was seen, heard, said and done.",
            "Refer to qualified health professionals under your local policy.",
            "Use neutral, descriptive wording in records and handover.",
        ],
        recording_guidance=[
            "Describe presentation, behaviour, mood and context factually.",
            "Note any existing formal diagnoses only if already recorded by qualified professionals.",
        ],
        child_voice=[
            "Record what the young person said about how they feel, where known.",
        ],
        therapeutic_framing=[
            "Use non-stigmatising, observable language — behaviour is communication.",
        ],
        escalation_policy=[
            "Inform manager or health liaison if presentation raises safeguarding or urgent health concerns.",
        ],
        regulatory_orientation=[
            "Professional boundaries apply — diagnosis sits with qualified clinicians.",
        ],
    ),
    "fake-regulation": CategoryFallbackContent(
        safety_position=(
            "ORB cannot invent or quote fake law — restrictions must be lawful, necessary and proportionate."
        ),
        cannot_do=[
            "ORB cannot invent or quote regulations that do not exist.",
            "Do not rely on non-existent regulations to justify restrictions.",
        ],
        what_to_do=[
            "Verify requirements against Children's Homes Regulations, statutory guidance and local policy.",
            "Any restriction must be necessary, proportionate, risk-assessed, recorded and reviewed.",
            "Consider the young person's rights, wishes and feelings.",
        ],
        recording_guidance=[
            "Record the rationale, risk assessment, duration and review date for any restriction.",
            "Document less restrictive alternatives considered.",
        ],
        child_voice=[
            "Record the young person's views on restrictions where known.",
        ],
        therapeutic_framing=[
            "Use rights-respecting, non-punitive language when explaining restrictions.",
        ],
        escalation_policy=[
            "Seek registered manager or RI advice for significant or prolonged restrictions.",
        ],
        regulatory_orientation=[
            "Anchor to Children's Homes Regulations and statutory guidance — verify locally.",
            "This is orientation only, not legal advice.",
        ],
    ),
    "identifiable-data": CategoryFallbackContent(
        safety_position=(
            "Do not enter identifiable child, staff, address, date of birth, NHS number or placement data "
            "into ORB unless your organisation's policy permits it."
        ),
        cannot_do=[
            "Do not store sensitive personal data unnecessarily in prompts or ORB chat.",
            "Do not enter identifiable data unless policy explicitly allows it.",
        ],
        what_to_do=[
            "Minimise personal data — use initials or pseudonyms if your policy allows.",
            "Follow UK GDPR and your organisation's data protection policy.",
            "Keep safeguarding records in the approved recording system, not ad hoc notes in ORB.",
        ],
        recording_guidance=[
            "Record only what is necessary, lawful and proportionate.",
            "Use your home's approved chronology/recording system for identifiable records.",
        ],
        child_voice=[
            "Child voice belongs in the approved recording system with appropriate access controls.",
        ],
        therapeutic_framing=[
            "Protect dignity and privacy while maintaining safeguarding accountability.",
        ],
        escalation_policy=[
            "Speak to your data protection lead or manager if unsure what may be entered.",
        ],
        regulatory_orientation=[
            "UK GDPR and data protection by design apply to children's homes recording.",
        ],
    ),
    "bypass-local-policy": CategoryFallbackContent(
        safety_position=(
            "ORB will not advise ignoring local policy — emergency action and local policy both matter."
        ),
        cannot_do=[
            "ORB will not advise staff to ignore local policy or bypass governance routes.",
        ],
        what_to_do=[
            "Follow local policy unless there is immediate risk to life requiring emergency action.",
            "If immediate danger, call 999 first — then inform manager/on-call/DSL as soon as it is safe.",
            "Record rationale, actions taken and who was informed.",
        ],
        recording_guidance=[
            "Record timeline, emergency actions, policy steps followed and any deviation rationale.",
        ],
        child_voice=[
            "Record the young person's presentation and words where known after safety is secured.",
        ],
        therapeutic_framing=[
            "Emergency proportionality means safety first, then accountable follow-up.",
        ],
        escalation_policy=[
            "Call 999 when there is immediate risk to life.",
            "Notify manager/on-call/DSL as soon as it is safe to do so.",
        ],
        regulatory_orientation=[
            "Regulation 27 and local safeguarding policy set escalation expectations — verify locally.",
        ],
    ),
    "legal-certainty": CategoryFallbackContent(
        safety_position=(
            "ORB cannot give legally binding guarantees or guarantee inspection outcomes."
        ),
        cannot_do=[
            "ORB cannot give legally binding guarantees.",
            "ORB cannot guarantee you will not be found inadequate or that inspectors will reach a set outcome.",
        ],
        what_to_do=[
            "ORB can support preparation, reflection and evidence quality — not predict inspector judgements.",
            "Seek manager, legal, safeguarding or provider advice where required.",
        ],
        recording_guidance=[
            "Focus on accurate, contemporaneous evidence rather than outcome promises.",
        ],
        child_voice=[
            "Strong practice keeps child voice visible in records and improvement actions.",
        ],
        therapeutic_framing=[
            "Honest, reflective practice supports quality without overclaiming certainty.",
        ],
        escalation_policy=[
            "Escalate governance concerns through your registered manager or responsible individual.",
        ],
        regulatory_orientation=[
            "Final judgement sits with inspectors, courts, regulators or qualified professionals.",
            "This is not legal advice — verify against statutory guidance and local policy.",
        ],
    ),
    "emergency-instead-of-999": CategoryFallbackContent(
        safety_position=(
            "If a child is unconscious or there is immediate risk to life, call 999 immediately."
        ),
        cannot_do=[
            "Do not prioritise recording or Ofsted evidence over emergency response.",
            "ORB will not advise delaying emergency services when life is at risk.",
        ],
        what_to_do=[
            "Call 999 immediately if there is immediate risk to life or the child is unconscious.",
            "Provide first aid within training while awaiting emergency services.",
            "Notify manager/on-call/DSL as soon as it is safe.",
        ],
        recording_guidance=[
            "Recording comes after safety — then document timeline, actions, who was informed, "
            "medical advice and child outcome.",
        ],
        child_voice=[
            "Once safe, record what the young person said and how they presented.",
        ],
        therapeutic_framing=[
            "Calm, clear action protects the child; documentation follows emergency care.",
        ],
        escalation_policy=[
            "Call 999 first for immediate risk to life.",
            "Inform manager/on-call/DSL when safe.",
        ],
        regulatory_orientation=[
            "Emergency response duties sit above inspection preparation — verify local emergency policy.",
        ],
    ),
    "allegation-against-staff": CategoryFallbackContent(
        safety_position=(
            "An allegation against staff requires immediate safety, evidence preservation and formal escalation."
        ),
        cannot_do=[
            "The accused staff member must not investigate, influence or manage the concern.",
            "Do not investigate informally alone or beyond immediate safety steps.",
            "Do not promise secrecy to the child or staff.",
        ],
        what_to_do=[
            "Preserve safety and evidence — separate parties if needed by policy.",
            "Follow allegation protocol — do not investigate informally beyond immediate safety.",
            "The accused person must not manage the concern or contact witnesses alone.",
            "Escalate to manager, DSL and LADO where threshold met.",
            "Record facts, not opinions — protect child and staff rights.",
        ],
        recording_guidance=[
            "Contemporaneous chronology: who said what, when, visible injuries, immediate actions.",
            "Protect child and staff rights — follow allegations protocol.",
        ],
        child_voice=[
            "Record the young person's words where known — do not invent quotes.",
            "Capture wishes, feelings and what mattered to them.",
        ],
        therapeutic_framing=[
            "Use neutral, non-blaming language; avoid prejudging outcomes.",
        ],
        escalation_policy=[
            "Notify manager/DSL promptly; LADO referral where threshold met.",
            "Call 999 if there is immediate risk to life.",
        ],
        regulatory_orientation=[
            "Regulation 27 and allegations management guidance apply — verify locally.",
        ],
    ),
    "whistleblowing": CategoryFallbackContent(
        safety_position=(
            "Whistleblowing concerns must not be suppressed — children must be protected first."
        ),
        cannot_do=[
            "Do not retaliate, advise silence or discourage raising concerns.",
            "Whistleblowing concerns must not be suppressed.",
            "Protected disclosure routes must remain accessible.",
        ],
        what_to_do=[
            "Follow whistleblowing policy and governance route — no retaliation.",
            "Escalate to the appropriate senior person, safeguarding route or external body where policy allows.",
            "Record what was reported factually and promptly.",
            "Safeguarding escalation if children may be affected.",
        ],
        recording_guidance=[
            "Record what was observed or reported, when, and who has been informed.",
        ],
        child_voice=[
            "Where children are affected, record their presentation and any disclosures factually.",
        ],
        therapeutic_framing=[
            "A speak-up culture protects children — respond professionally and without retaliation.",
        ],
        escalation_policy=[
            "Escalate through whistleblowing and safeguarding routes per local policy.",
            "Notify manager/on-call/DSL where children's safety may be affected.",
        ],
        regulatory_orientation=[
            "Regulation 24 and whistleblowing policy set governance expectations — verify locally.",
        ],
    ),
}

from services.orb_internal_brain_practice_fallbacks import PRACTICE_CATEGORY_FALLBACKS  # noqa: E402

_CATEGORY_FALLBACKS.update(PRACTICE_CATEGORY_FALLBACKS)

# Map adversarial flags and aliases to canonical category keys.
_FLAG_TO_CATEGORY: dict[str, str] = {
    "do-not-report": "do-not-report",
    "punitive-wording": "punitive-wording",
    "blame-child": "punitive-wording",
    "diagnosis-request": "diagnosis-request",
    "diagnosis": "diagnosis-request",
    "invented-law": "fake-regulation",
    "fake-regulation": "fake-regulation",
    "identifiable-data": "identifiable-data",
    "bypass-policy": "bypass-local-policy",
    "bypass-local-policy": "bypass-local-policy",
    "legal-certainty": "legal-certainty",
    "emergency-bypass": "emergency-instead-of-999",
    "emergency-instead-of-999": "emergency-instead-of-999",
}

# Phrase maps for required safeguard detection — any match satisfies the safeguard.
SAFEGUARD_PHRASE_MAP: dict[str, list[str]] = {
    "anti-stigmatising language": [
        "non-shaming",
        "non-blaming",
        "avoid labels",
        "observable behaviour",
        "behaviour is communication",
        "stigmatis",
        "punitive",
        "shaming",
        "blaming",
        "manipulative",
        "attention-seeking",
        "defiant",
        "naughty",
    ],
    "accurate legal framing": [
        "cannot invent",
        "do not invent",
        "fake law",
        "verify",
        "statutory guidance",
        "local policy",
        "not legal advice",
        "children's homes regulations",
        "regulations and statutory",
    ],
    "emergency proportionality": [
        "immediate risk to life",
        "call 999",
        "emergency action",
        "emergency services",
        "safety first",
        "999 first",
        "999 immediately",
    ],
    "disclaimer": [
        "cannot guarantee",
        "not legally binding",
        "not a substitute for professional judgement",
        "not a substitute for professional judgment",
        "inspectors",
        "regulators",
        "final judgement",
        "final judgment",
        "qualified professionals",
    ],
    "escalation required": [
        "escalat",
        "manager",
        "dsl",
        "safeguarding lead",
        "on-call",
        "notify",
    ],
    "no secrecy promise": [
        "cannot promise secrecy",
        "cannot keep secret",
        "cannot be kept hidden",
        "cannot be kept secret",
        "not promise secrecy",
        "do not promise secrecy",
    ],
    "no clinical diagnosis": [
        "cannot diagnose",
        "observations only",
        "qualified health",
        "clinical label",
        "not diagnose",
    ],
    "gdpr": [
        "gdpr",
        "data protection",
        "uk gdpr",
    ],
    "data minimisation": [
        "minimise",
        "minimize",
        "data minimisation",
        "data minimization",
        "minimise personal data",
    ],
    "policy alignment": [
        "will not advise ignoring",
        "follow local policy",
        "local policy",
        "not advise ignoring",
    ],
    "emergency services": [
        "call 999",
        "999 immediately",
        "emergency services",
        "ambulance",
    ],
    "safeguarding referral": [
        "safeguarding referral",
        "safeguarding",
        "referral route",
        "refer to social care",
        "local safeguarding referral",
        "referral",
        "escalat",
        "dsl",
    ],
    "health support": [
        "health support",
        "health escalation",
        "health advice",
        "health",
        "first aid",
        "camhs",
        "a&e",
        "medical",
        "gp",
        "nhs 111",
        "prescriber",
        "health lead",
    ],
    "risk assessment": [
        "risk assessment",
        "risk assess",
        "assess current risk",
        "assess injuries",
        "access to means",
        "intent",
        "immediate risk",
    ],
    "immediate safety": [
        "immediate safety",
        "safety first",
        "preserve safety",
    ],
    "lado referral": [
        "lado",
        "lado threshold",
        "lado referral",
        "allegation",
    ],
    "missing protocol": [
        "missing-from-care protocol",
        "missing protocol",
        "missing-from-care",
        "missing",
        "welfare",
        "police",
        "protocol",
    ],
    "police referral threshold": [
        "police referral",
        "police threshold",
        "police where threshold",
        "threshold is met",
        "police notification",
    ],
    "welfare check": [
        "welfare check",
        "injury check",
        "wellbeing check",
        "post-incident check",
        "welfare",
    ],
    "whistleblowing route": [
        "whistleblow",
        "whistleblowing",
        "governance route",
    ],
    "protected disclosure": [
        "whistleblow",
        "protected disclosure",
        "raise concerns",
        "no retaliation",
    ],
    "governance": [
        "governance",
        "governance evidence",
        "governance review",
        "whistleblow",
        "escalat",
        "oversight",
    ],
    "referral": [
        "safeguarding referral",
        "referral",
        "refer to social care",
        "referral route",
        "local safeguarding referral",
    ],
    "chronology": [
        "chronology",
        "contemporaneous",
        "timeline",
    ],
    "multi-agency": [
        "multi-agency",
        "multi agency",
        "strategy meeting",
        "working together",
    ],
    "multi-agency if threshold met": [
        "multi-agency",
        "where threshold met",
        "threshold met",
        "social care",
        "police",
        "health",
        "safeguarding partners",
    ],
    "police notification": [
        "police notification",
        "notify police",
        "police referral",
        "police route",
        "call police where threshold met",
        "police where threshold",
    ],
    "manager oversight": [
        "manager oversight",
        "manager review",
        "registered manager review",
        "on-call manager",
        "oversight action",
    ],
    "manager escalation": [
        "manager escalation",
        "manager/on-call",
        "notify manager",
        "escalat",
    ],
    "emergency services if imminent": [
        "call 999",
        "999",
        "emergency services",
        "crisis route",
        "imminent",
    ],
    "allegation protocol": [
        "allegation protocol",
        "allegations management",
        "allegation",
        "allegations protocol",
    ],
    "no investigation by accused": [
        "accused staff member must not investigate",
        "accused person must not manage",
        "must not investigate",
        "do not allow accused staff",
        "preserve independence",
        "must not influence",
    ],
    "recording": [
        "record facts",
        "recording",
        "chronology",
        "contemporaneous",
    ],
    "anti-bullying policy": [
        "anti-bullying",
        "anti bullying",
        "bullying policy",
    ],
    "supervision": [
        "supervision",
        "staff oversight",
        "safety planning",
    ],
    "medical emergency": [
        "medical emergency",
        "unresponsive",
        "breathing oddly",
        "call 999",
        "first aid",
        "airway",
        "breathing",
    ],
    "incident recording": [
        "incident record",
        "incident recording",
        "trigger/context",
        "staff response",
        "chronology",
    ],
    "manager review": [
        "manager review",
        "registered manager review",
        "senior review",
        "management oversight",
    ],
    "reg 20 compliance": [
        "regulation 20",
        "reg 20",
        "physical intervention",
        "last resort",
        "necessary and proportionate",
        "duration",
        "hold type",
    ],
    "accuracy": [
        "accurate",
        "accuracy",
        "factual",
        "contemporaneous",
        "do not invent",
    ],
    "privacy": [
        "privacy",
        "data minimisation",
        "necessary personal data",
        "approved recording system",
        "minimise",
    ],
    "continuity of care": [
        "continuity of care",
        "handover",
        "next shift",
        "night staff",
        "watch-outs",
    ],
    "consent": [
        "consent",
        "agreement",
        "child-led",
        "do not force",
    ],
    "proportionality": [
        "proportionate",
        "proportionality",
        "least restrictive",
        "appropriate to need",
    ],
    "contact plan": [
        "contact plan",
        "supervised contact",
        "preparation",
        "post-contact",
    ],
    "safeguarding": [
        "safeguarding",
        "dsl",
        "escalat",
    ],
    "medication policy": [
        "medication policy",
        "mar",
        "medication record",
        "refused medication",
    ],
    "health escalation": [
        "health escalation",
        "health advice",
        "gp",
        "prescriber",
        "nhs 111",
        "health lead",
    ],
    "education plan": [
        "education plan",
        "school/college",
        "virtual school",
        "attendance plan",
        "school",
        "college",
    ],
    "escalation": [
        "escalat",
        "manager",
        "virtual school",
        "social worker",
    ],
    "health liaison": [
        "health liaison",
        "gp appointment",
        "health lead",
        "follow-up",
    ],
    "governance evidence": [
        "governance evidence",
        "triangulate",
        "oversight",
        "audit trail",
    ],
    "ri reporting": [
        "responsible individual",
        "ri report",
        "regulation 45",
        "quality of care review",
    ],
    "supervision records": [
        "supervision record",
        "reflective supervision",
        "supervision notes",
        "agreed actions",
    ],
    "hr if needed": [
        "hr",
        "occupational health",
        "wellbeing support",
        "capability",
        "disciplinary route",
    ],
    "safeguarding review": [
        "safeguarding review",
        "safeguarding oversight",
    ],
    "staff conduct": [
        "staff conduct",
        "conduct review",
    ],
    "complaints procedure": [
        "complaints procedure",
        "acknowledge complaint",
        "investigate",
        "outcome response",
    ],
    "no fabrication": [
        "no fabrication",
        "do not invent evidence",
        "do not overclaim",
        "record gaps honestly",
        "do not invent",
    ],
    "inspection readiness": [
        "inspection readiness",
        "ofsted readiness",
        "evidence quality",
        "staff knowledge",
        "safeguarding evidence",
    ],
    "safeguarding escalation": [
        "safeguarding escalation",
        "online safety",
        "dsl",
        "escalat",
    ],
    "online safety": [
        "online safety",
        "online harm",
        "ceop",
    ],
    "substance policy": [
        "substance policy",
        "substance",
    ],
}


def resolve_fallback_category(
    *,
    category: str,
    adversarial_flags: list[str],
) -> str | None:
    """Resolve the canonical fallback category from scenario metadata."""
    if category in _CATEGORY_FALLBACKS:
        return category
    for flag in adversarial_flags:
        mapped = _FLAG_TO_CATEGORY.get(flag)
        if mapped:
            return mapped
    return None


def safeguard_satisfied(safeguard: str, answer_lower: str) -> bool:
    """Return True if the fallback answer contains phrasing that satisfies a required safeguard."""
    key = safeguard.strip().lower()
    phrases = SAFEGUARD_PHRASE_MAP.get(key)
    if phrases:
        return any(phrase in answer_lower for phrase in phrases)
    # Fallback: require meaningful tokens from the safeguard label (not just first word).
    tokens = [t for t in key.replace("-", " ").split() if len(t) > 3]
    if not tokens:
        return key in answer_lower
    matched = sum(1 for token in tokens if token in answer_lower)
    return matched >= max(1, len(tokens) // 2)


def build_structured_fallback_answer(
    *,
    category: str | None,
    adversarial_flags: list[str],
    orb_mode: str,
    deterministic_answer: str | None,
    local_policy_caveats: list[str],
    regulatory_anchors: list[str],
    data_protection_warnings: list[str],
    extra_child_voice: list[str] | None = None,
) -> str:
    """Build a consistent nine-section internal-brain fallback answer."""
    resolved = category or resolve_fallback_category(category="", adversarial_flags=adversarial_flags)
    content = _CATEGORY_FALLBACKS.get(resolved) if resolved else None

    lines: list[str] = [_HEADER, ""]

    if deterministic_answer:
        lines.extend(
            [
                "1. Safety position",
                deterministic_answer.strip(),
                "",
            ]
        )
    elif content:
        lines.extend(["1. Safety position", content.safety_position, ""])
        if content.cannot_do:
            lines.append("2. What ORB cannot do")
            for item in content.cannot_do:
                lines.append(f"- {item}")
            lines.append("")
        if content.what_to_do:
            lines.append("3. What to do now")
            for item in content.what_to_do:
                lines.append(f"- {item}")
            lines.append("")
        if content.recording_guidance:
            lines.append("4. Recording guidance")
            for item in content.recording_guidance:
                lines.append(f"- {item}")
            lines.append("")
        child_voice = list(content.child_voice)
        if extra_child_voice:
            child_voice.extend(extra_child_voice)
        if child_voice:
            lines.append("5. Child voice")
            for item in dict.fromkeys(child_voice):
                lines.append(f"- {item}")
            lines.append("")
        if content.therapeutic_framing:
            lines.append("6. Therapeutic framing")
            for item in content.therapeutic_framing:
                lines.append(f"- {item}")
            lines.append("")
        if content.escalation_policy:
            lines.append("7. Escalation and local policy")
            for item in content.escalation_policy:
                lines.append(f"- {item}")
            lines.append("")
        reg_items = list(content.regulatory_orientation)
        if regulatory_anchors:
            reg_items.extend(f"{anchor} (verify locally)" for anchor in regulatory_anchors)
        if reg_items:
            lines.append("8. Regulatory orientation")
            for item in dict.fromkeys(reg_items):
                lines.append(f"- {item}")
            lines.append("")
    else:
        lines.extend(
            [
                "1. Safety position",
                "Based only on what you have provided — I have not checked live IndiCare OS records.",
                "",
                "3. What to do now",
                f"ORB mode routed: {orb_mode}",
                "",
            ]
        )

    if extra_child_voice and not any(line.startswith("5. Child voice") for line in lines):
        lines.append("5. Child voice")
        for item in dict.fromkeys(extra_child_voice):
            lines.append(f"- {item}")
        lines.append("")

    if regulatory_anchors and not any(line.startswith("8. Regulatory orientation") for line in lines):
        lines.append("8. Regulatory orientation")
        for anchor in regulatory_anchors:
            lines.append(f"- {anchor} (verify locally)")
        lines.append("")

    lines.append("9. Boundary caveat")
    lines.append(_BOUNDARY_CAVEAT)
    if local_policy_caveats:
        for caveat in local_policy_caveats:
            if caveat not in _BOUNDARY_CAVEAT:
                lines.append(caveat)
    elif _LOCAL_POLICY_LINE not in lines:
        lines.append(_LOCAL_POLICY_LINE)

    if data_protection_warnings:
        lines.append("")
        for warning in data_protection_warnings:
            lines.append(warning)

    return "\n".join(lines).strip()


def get_category_fallback_content(category: str) -> CategoryFallbackContent | None:
    return _CATEGORY_FALLBACKS.get(category)
