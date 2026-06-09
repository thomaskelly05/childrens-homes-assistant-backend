"""ORB recording contract — no invented facts in residential records.

Single source for prompt guardrails, incident-report scaffolding, and heuristic
validation used across chat, Dictate, Write, and action flows.
"""

from __future__ import annotations

import re
from typing import Any

INCIDENT_REPORT_DRAFT_RE = re.compile(
    r"(help me (to )?write|draft|write).*(incident report|incident record)",
    re.I,
)

KICKING_OFF_RE = re.compile(
    r"\b("
    r"kicked off|kicking off|played up|attention[\s-]?seeking|had a meltdown|"
    r"was aggressive|refused meds|refused medication"
    r")\b",
    re.I,
)

AFTER_CONTACT_RE = re.compile(
    r"\bafter\s+(contact|family time|family contact|a phone call|phone call)\b",
    re.I,
)

# Phrases that commonly indicate invented incident detail when absent from source.
_INVENTED_INCIDENT_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bkicked furniture\b", re.I), "furniture kicking"),
    (re.compile(r"\bkicked (the )?(chair|table|door|wall)\b", re.I), "furniture/property kicking"),
    (re.compile(r"\bshouted\b[^.\n]{0,80}[\"“]", re.I), "fabricated direct quote"),
    (
        re.compile(
            r'["“]([^"”]{10,})["”]',
            re.I,
        ),
        "direct quote",
    ),
    (re.compile(r"\bvisibly upset\b|\bexpressed feelings of (frustration|sadness|anger)\b", re.I), "assumed emotional state"),
    (re.compile(r"\bmoved to a quieter area\b", re.I), "staff relocation action"),
    (re.compile(r"\bteam meeting will\b|\bsupport plan review will be scheduled\b", re.I), "fabricated follow-up plan"),
    (re.compile(r"\badded to chronology\b", re.I), "fabricated chronology action"),
    (re.compile(r"\bmanager (was )?notified\b|\binformed the manager\b", re.I), "manager notification"),
    (re.compile(r"\bsettled with support\b|\bcalmed down\b|\blater shared that\b", re.I), "assumed outcome"),
    (re.compile(r"\bstaff (said|offered|used|responded with)\b[^.\n]{0,60}[\"“']", re.I), "fabricated staff dialogue"),
)

INCIDENT_MISSING_INFORMATION_CHECKLIST: tuple[str, ...] = (
    "Exact date and time",
    "Location",
    "Who was present",
    "What shorthand behaviour looked like in observable terms",
    "Jamie's words/views",
    "Staff response",
    "Any harm, damage or risk",
    "Whether physical intervention was used",
    "Whether manager was informed",
    "Whether social worker/family/EDT/police were contacted",
    "Outcome",
    "Follow-up actions",
)

_PLACEHOLDER_MARKERS: tuple[str, ...] = (
    "[add ",
    "[insert ",
    "[not stated",
    "[child's words",
    "[add time",
    "[add location",
    "*add ",
    "add exactly what was seen",
    "add observable",
)


def is_incident_report_draft_request(text: str) -> bool:
    return bool(INCIDENT_REPORT_DRAFT_RE.search(str(text or "")))


def extract_young_person_name(text: str) -> str | None:
    value = str(text or "").strip()
    if not value:
        return None
    _NON_NAMES = frozenset(
        {
            "help",
            "please",
            "young",
            "the",
            "after",
            "today",
            "this",
            "following",
            "turn",
            "create",
            "what",
            "how",
        }
    )
    patterns = (
        r"\b([A-Z][a-z]+)\b(?=\s+(?:was|is|had|became|refused|played|kicked|did|has|have)\b)",
        r"^([A-Z][a-z]+)\b",
    )
    for pattern in patterns:
        match = re.search(pattern, value)
        if not match:
            continue
        name = match.group(1)
        if name.lower() not in _NON_NAMES:
            return name
    return None


def extract_known_incident_facts(source_text: str) -> dict[str, Any]:
    """Parse only what the adult explicitly provided."""
    text = str(source_text or "").strip()
    lowered = text.lower()
    name = extract_young_person_name(text)
    facts: dict[str, Any] = {
        "young_person": name,
        "shorthand_behaviour": None,
        "followed_family_contact": False,
        "followed_contact": False,
        "refused_school": False,
        "happened_today": False,
        "happened_morning": False,
        "wants_incident_report": is_incident_report_draft_request(text),
    }
    behaviour_priority = (
        "kicked off",
        "kicking off",
        "played up",
        "had a meltdown",
        "attention seeking",
        "attention-seeking",
        "was aggressive",
        "refused meds",
        "refused medication",
    )
    for term in behaviour_priority:
        if term in lowered:
            facts["shorthand_behaviour"] = term
            break
    if not facts["shorthand_behaviour"]:
        shorthand_match = KICKING_OFF_RE.search(text)
        if shorthand_match:
            facts["shorthand_behaviour"] = shorthand_match.group(1).lower()
    if "family contact" in lowered or "family time" in lowered:
        facts["followed_family_contact"] = True
    if AFTER_CONTACT_RE.search(text) or "after contact" in lowered:
        facts["followed_contact"] = True
    if "refused school" in lowered or re.search(r"\brefused\s+school\b", lowered):
        facts["refused_school"] = True
    if re.search(r"\btoday\b", lowered):
        facts["happened_today"] = True
    if re.search(r"\bthis morning\b|\bmorning\b", lowered):
        facts["happened_morning"] = True
    return facts


def shorthand_to_observable_prompt(shorthand: str | None) -> str:
    if not shorthand:
        return (
            "Add exactly what was seen or heard in observable terms — for example shouting, swearing, "
            "crying, refusing support, damaging property, threatening harm, attempting to leave, "
            "or presenting as emotionally distressed."
        )
    return (
        f'The adult described this as "{shorthand}". Convert this into observable behaviour only if the '
        "adult provides detail. Do not assume what it looked like. Prompt for what was seen or heard."
    )


def build_no_invented_facts_contract_block(*, record_kind: str = "general") -> str:
  lines = [
      "============================================================",
      "NO INVENTED FACTS RECORDING CONTRACT",
      "",
      "For records, incident reports, safeguarding notes, daily logs, manager oversight notes, "
      "chronologies and Ofsted-ready outputs:",
      "",
      "Distinguish clearly:",
      "• known facts — only what the adult provided",
      "• adult-provided wording — quote or paraphrase their shorthand faithfully",
      "• missing information — use placeholders and a checklist",
      "• suggested prompts — questions to help the adult complete the record",
      "• possible considerations — never present these as facts",
      "",
      "Never invent or assume:",
      "• physical actions not described",
      "• direct quotes from the child or staff",
      "• emotional states (upset, angry, sad, frustrated) unless stated",
      "• injuries, damage, harm or risk not described",
      "• staff actions, de-escalation, relocation or dialogue",
      "• outcomes (settled, calmed, repaired)",
      "• manager/social worker/police/EDT contact",
      "• follow-up plans, meetings, plan reviews or chronology entries",
      "",
      "Use placeholders such as [Add time], [Add location], [Add observable behaviour], "
      "[Child's words not stated], [Add staff response], [Add outcome].",
      "Say clearly: 'I'll only use what you have provided.'",
      "Flag missing information before the record is finalised.",
  ]
  if record_kind == "incident_report":
      lines.extend(
          [
              "",
              "Incident-report specific rules:",
              "• Treat shorthand such as 'kicking off' as adult wording that must be clarified — not as a factual behaviour.",
              "• Use 'became unsettled' or 'became dysregulated' only if supported by the adult's description.",
              "• Keep the child central with therapeutic, factual, person-centred language.",
              "• Provide structure + placeholders + missing-information checklist + follow-up prompts.",
          ]
      )
  return "\n".join(lines)


def build_incident_report_prompt_block(source_text: str) -> str:
    facts = extract_known_incident_facts(source_text)
    name = facts.get("young_person") or "the young person"
    contract = build_no_invented_facts_contract_block(record_kind="incident_report")
    known_lines = [
        "Known from the adult (use only this):",
        f"• Young person: {name}",
    ]
    if facts.get("happened_today"):
        known_lines.append("• Timing: today (exact time still needed)")
    if facts.get("followed_family_contact"):
        known_lines.append("• Context: followed family contact")
    if facts.get("shorthand_behaviour"):
        known_lines.append(f'• Adult shorthand: "{facts["shorthand_behaviour"]}" — clarify into observable behaviour')
    known_lines.append("• Request: help writing an incident report")

    structure = [
        "",
        "Required response shape for incident-report drafting:",
        "1. Immediate safety reminder (brief).",
        "2. State you will only use what was provided.",
        "3. Structured incident report draft with placeholders for every missing section.",
        "4. Missing information checklist.",
        "5. Suggested follow-up prompts (questions, not invented answers).",
        "6. Option to open in ORB Write or convert to recording wording.",
        "",
        "Incident report sections (use placeholders where missing):",
        "• Record type / Date / Time / Location / Young person",
        "• Reason for record",
        "• What happened (observable facts only)",
        "• Child's presentation",
        "• Child's voice",
        "• Adult response",
        "• Risk and safeguarding",
        "• Outcome",
        "• Follow-up",
    ]
    return "\n".join([contract, "", *known_lines, *structure])


def build_safe_incident_report_scaffold(source_text: str) -> str:
    """Deterministic safe incident draft — placeholders only, no invented facts."""
    facts = extract_known_incident_facts(source_text)
    name = facts.get("young_person") or "[Young person]"
    date_line = "Today / [insert date]" if facts.get("happened_today") else "[Add date]"
    reason = (
        f"{name} became unsettled following family contact."
        if facts.get("followed_family_contact")
        else f"{name} became unsettled."
    )
    if facts.get("shorthand_behaviour"):
        happened = (
            f"Following family contact today, {name} was described as "
            f'"{facts["shorthand_behaviour"]}". '
            if facts.get("followed_family_contact") and facts.get("happened_today")
            else f'{name} was described as "{facts["shorthand_behaviour"]}". '
        )
        happened += shorthand_to_observable_prompt(facts["shorthand_behaviour"])
    else:
        happened = "[Add observable sequence of events — facts only.]"

    missing = "\n".join(f"• {item}" for item in incident_missing_checklist(name))

    return f"""### Immediate safety
Check everyone is safe now. If there is immediate risk, follow your home's safeguarding procedure.

I'll only use what you have provided and I'll flag what needs adding before this is finalised.

### Incident report draft

**Record type:** Incident report

**Date:** {date_line}

**Time:** [Add time]

**Location:** [Add location]

**Young person:** {name}

**Reason for record:** {reason}

**What happened:**
{happened}

**Child's presentation:**
[Add observable presentation. Avoid assumptions. Describe what {name} looked/sounded like and any words used.]

**Child's voice:**
[Add {name}'s words if known. If {name} was not ready to speak, record that staff will seek their views when they are calm.]

**Adult response:**
[Add what staff did to support {name}, reduce risk and help them regulate.]

**Risk and safeguarding:**
[Add whether there was any risk to {name}, others, staff or property. Add whether any safeguarding escalation, physical intervention, manager notification or external agency contact was required.]

**Outcome:**
[Add how the incident ended, whether {name} settled, whether anyone was harmed, whether anything was damaged, and what happened next.]

**Follow-up:**
[Add any agreed actions, such as restorative conversation, key-work session, contact plan review, risk assessment update or manager oversight.]

### Missing information before finalising

{missing}

### Suggested follow-up prompts
• What exactly did you see or hear when you say "{facts['shorthand_behaviour'] or 'this happened'}"?
• Where were you and who else was present?
• What did {name} say, if anything?
• What did staff do to support and keep everyone safe?
• How did things end?
• Does a manager need to review this today?

### Next steps
You can open this in ORB Write to complete each section, or ask me to convert any part to recording wording once you add the facts."""


def incident_missing_checklist(young_person_name: str | None = None) -> list[str]:
    name = young_person_name or "the young person"
    return [
        item.replace("Jamie", name) if young_person_name else item.replace("Jamie's", "Child's")
        for item in INCIDENT_MISSING_INFORMATION_CHECKLIST
    ]


def _normalise_for_match(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "").lower())


def _quoted_phrases(text: str) -> set[str]:
    phrases: set[str] = set()
    for match in re.finditer(r'["“]([^"”]+)["”]', str(text or "")):
        phrase = match.group(1).strip().lower()
        if phrase:
            phrases.add(phrase)
    return phrases


def _source_supports_pattern(source: str, pattern_id: str) -> bool:
    lowered = _normalise_for_match(source)
    if pattern_id == "furniture kicking":
        return bool(
            re.search(r"\bkicked\s+(furniture|the\s+)?(chair|table|door|wall)\b", lowered)
            or re.search(r"\bfurniture\b.{0,20}\bkick", lowered)
            or re.search(r"\bdamage\b|\bdamaged\b", lowered)
        )
    if pattern_id == "fabricated direct quote" or pattern_id == "direct quote":
        if _quoted_phrases(source):
            return True
        return bool(re.search(r"\b(said|shouted|told|asked)\b", lowered) and ('"' in source or "“" in source))
    if pattern_id == "assumed emotional state":
        return bool(
            re.search(
                r"\bupset\b|\bangry\b|\bsad\b|\bfrustrat|\bdysregulat|\bcry|\btear",
                lowered,
            )
        )
    if pattern_id == "staff relocation action":
        return bool(re.search(r"\bquieter\b|\bmoved\b|\brelocated\b|\bspace\b", lowered))
    if pattern_id == "fabricated follow-up plan":
        return bool(re.search(r"\bteam meeting\b|\bplan review\b|\bscheduled\b|\bfollow[- ]up\b", lowered))
    if pattern_id == "fabricated chronology action":
        return "chronology" in lowered
    if pattern_id == "manager notification":
        return bool(re.search(r"\bmanager\b|\binformed\b|\bnotified\b", lowered))
    if pattern_id == "assumed outcome":
        return bool(re.search(r"\bsettled\b|\bcalm\b|\bshared\b|\bended\b|\boutcome\b", lowered))
    if pattern_id == "fabricated staff dialogue":
        return bool(re.search(r"\bstaff\b.{0,40}\b(said|told|offered)\b", lowered)) and (
            '"' in source or "“" in source
        )
    return False


def detect_invented_incident_facts(output_text: str, source_text: str) -> list[str]:
    """Heuristic detector for tests — flags likely invented incident content."""
    issues: list[str] = []
    output = str(output_text or "")
    source = str(source_text or "")
    if not output.strip():
        return issues
    source_lower = _normalise_for_match(source)
    allowed_quotes = _quoted_phrases(source)
    for pattern, label in _INVENTED_INCIDENT_PATTERNS:
        if not pattern.search(output):
            continue
        if label in {"fabricated direct quote", "direct quote"}:
            invented_quotes = {
                quote
                for quote in (_quoted_phrases(output) - allowed_quotes)
                if quote not in source_lower and len(quote) >= 10
            }
            if not invented_quotes:
                continue
        if not _source_supports_pattern(source, label):
            if label not in issues:
                issues.append(label)
    return issues


def output_includes_required_placeholders(text: str) -> bool:
    lowered = str(text or "").lower()
    required_any = (
        "[add time]",
        "[add location]",
        "[add observable",
        "[child's words",
        "[add what staff",
        "[add how the incident",
        "[add any agreed",
        "missing information",
    )
    return sum(1 for marker in required_any if marker in lowered) >= 4


def treats_kicking_off_as_shorthand(text: str) -> bool:
    from services.orb_therapeutic_language_contract_service import treats_shorthand_as_clarification_needed

    lowered = str(text or "").lower()
    if not any(term in lowered for term in ("kicking off", "kicked off", "played up")):
        return True
    return treats_shorthand_as_clarification_needed(text, "kicked off")


def build_recording_contract_prompt_block(source_text: str, *, note_type: str | None = None) -> str:
    from services.orb_therapeutic_language_contract_service import (
        build_residential_scenario_prompt_block,
        build_therapeutic_language_contract_block,
        is_residential_incident_scenario,
    )

    text = str(source_text or "")
    if note_type == "incident_record" or is_incident_report_draft_request(text):
        return "\n\n".join(
            [build_therapeutic_language_contract_block(), build_incident_report_prompt_block(text)]
        )
    if is_residential_incident_scenario(text):
        return build_residential_scenario_prompt_block(text)
    return "\n\n".join(
        [build_therapeutic_language_contract_block(include_headings=False), build_no_invented_facts_contract_block()]
    )


orb_recording_contract_service = type(
    "OrbRecordingContractService",
    (),
    {
        "INCIDENT_MISSING_INFORMATION_CHECKLIST": INCIDENT_MISSING_INFORMATION_CHECKLIST,
        "is_incident_report_draft_request": staticmethod(is_incident_report_draft_request),
        "extract_known_incident_facts": staticmethod(extract_known_incident_facts),
        "build_no_invented_facts_contract_block": staticmethod(build_no_invented_facts_contract_block),
        "build_incident_report_prompt_block": staticmethod(build_incident_report_prompt_block),
        "build_safe_incident_report_scaffold": staticmethod(build_safe_incident_report_scaffold),
        "build_recording_contract_prompt_block": staticmethod(build_recording_contract_prompt_block),
        "detect_invented_incident_facts": staticmethod(detect_invented_incident_facts),
        "output_includes_required_placeholders": staticmethod(output_includes_required_placeholders),
        "treats_kicking_off_as_shorthand": staticmethod(treats_kicking_off_as_shorthand),
        "incident_missing_checklist": staticmethod(incident_missing_checklist),
        "shorthand_to_observable_prompt": staticmethod(shorthand_to_observable_prompt),
    },
)()
