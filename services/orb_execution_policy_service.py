"""ORB internal-knowledge-first execution policy.

Every request still flows through brain convergence orchestration first.
This service decides the cheapest safe execution method after contract selection:
deterministic internal answers, internal templates, compact OpenAI, enhanced OpenAI,
or mandatory safeguarding generation.
"""

from __future__ import annotations

import re
import time
from dataclasses import asdict, dataclass, field
from typing import Any

from services.orb_universal_answer_contract_map_service import (
    detect_contract_family,
    get_contract_family,
    validate_contract_answer,
)

EXECUTION_POLICIES = frozenset(
    {
        "deterministic_only",
        "internal_template_plus_validator",
        "openai_compact",
        "openai_enhanced",
        "openai_mandatory_safeguarding",
    }
)

MANDATORY_SAFEGUARDING_FAMILIES = frozenset(
    {
        "missing_return_record",
        "allegation_lado",
        "abuse_disclosure",
        "suicidal_self_harm",
        "parent_removal_conflict",
    }
)

MANDATORY_SAFEGUARDING_SCENARIOS = frozenset(
    {
        "missing_return_substance_risk",
        "allegation_against_staff",
        "historic_sexual_abuse_disclosure",
        "suicide_self_harm",
        "parent_forced_removal",
        "exploitation_county_lines",
        "peer_on_peer_harm",
    }
)

DETERMINISTIC_TEMPLATE_FAMILIES = frozenset(
    {
        "daily_record",
        "keywork_session",
        "handover",
        "manager_oversight_note",
        "reg44_visitor",
        "template_generation",
        "incident_record",
    }
)

STRUCTURE_ONLY_PATTERNS: dict[str, re.Pattern[str]] = {
    "daily_record": re.compile(
        r"^(help\s+me\s+)?(write|word|record|draft)\s+(a\s+)?daily\s+(note|record|log)|"
        r"^(give\s+me\s+)?(a\s+)?daily\s+(note|record)\s+structure|"
        r"^what\s+should\s+(i\s+)?include\s+in\s+a\s+daily\s+(note|record)|"
        r"^daily\s+(note|record)\s+(structure|template|headings?)\??$",
        re.I,
    ),
    "keywork_session": re.compile(
        r"^(help\s+me\s+)?(write|word|record|draft)\s+(a\s+)?key\s*[- ]?work|"
        r"^(give\s+me\s+)?headings?\s+for\s+a\s+key\s*[- ]?work|"
        r"^key\s*[- ]?work\s+(session\s+)?(structure|template|headings?)\??$",
        re.I,
    ),
    "handover": re.compile(
        r"^(help\s+me\s+)?(write|word|draft)\s+(a\s+)?handover|"
        r"^what\s+should\s+(i\s+)?include\s+in\s+a\s+handover|"
        r"^handover\s+(structure|template|headings?)\??$",
        re.I,
    ),
    "manager_oversight_note": re.compile(
        r"^(help\s+me\s+)?(write|word|draft)\s+(a\s+)?manager\s+oversight|"
        r"^what\s+should\s+a\s+manager\s+oversight\s+note\s+include|"
        r"^manager\s+oversight\s+(structure|template|headings?)\??$",
        re.I,
    ),
    "reg44_visitor": re.compile(
        r"^(give\s+me\s+)?(a\s+)?reg\s*44\s+(evidence\s+)?checklist|"
        r"^reg\s*44\s+(structure|template|headings?|evidence)\??$",
        re.I,
    ),
    "incident_record": re.compile(
        r"^(help\s+me\s+)?(write|word|draft)\s+(an\s+)?incident\s+(report|record|template)|"
        r"^incident\s+(report|record)\s+(structure|template|headings?)\??$",
        re.I,
    ),
}

ROUGH_NOTES_INDICATORS = re.compile(
    r"\b(was|were|said|told|did|happened|because|after|before|when|calm|upset|"
    r"aggressive|missing|returned|injury|hurt|blade|cannabis|disclosed|"
    r"breakfast|tea|bedtime|school|contact|medication)\b",
    re.I,
)

GENERATION_REQUIRED_PATTERNS = re.compile(
    r"\b(convert|rewrite|reword|turn\s+this|from\s+these\s+notes|make\s+this|"
    r"bespoke|therapeutic\s+rewrite|rough\s+notes|paste|here\s+are|she\s+was|he\s+was|"
    r"they\s+were|young\s+person\s+(was|said|did))\b",
    re.I,
)

DAILY_NOTE_DETERMINISTIC_ANSWER = """Absolutely — paste your rough notes and I'll turn them into a clear, factual, child-centred daily note.

Use this structure:

Daily note
Date/time:
Young person:
Mood/presentation:
What happened:
Child's voice:
Staff support:
Outcome:
Follow-up:

When you send the rough notes, include what was seen/heard, what the child said, what staff did and what happened next."""

KEYWORK_SESSION_DETERMINISTIC_ANSWER = """Absolutely — paste your rough notes and I'll help you turn them into a clear key-work session record.

Use this structure:

Key-work session
Date/time:
Young person:
Focus/theme:
What we talked about:
Child's voice:
What mattered to them:
Staff support offered:
Progress/observations:
Agreed next steps:
Follow-up:

When you send rough notes, include what the young person said in their own words, what you explored together, and any agreed actions."""

HANDOVER_DETERMINISTIC_ANSWER = """Absolutely — paste your shift notes and I'll help you shape a clear handover.

Use this structure:

Handover
Date/time:
Young person(s):
Overall presentation/mood:
Key events this shift:
Safeguarding/welfare updates:
Medication/health:
Contact/education:
Outstanding tasks:
Risks to watch:
Follow-up for incoming staff:

Keep it factual, child-centred and focused on what incoming staff need to know."""

MANAGER_OVERSIGHT_DETERMINISTIC_ANSWER = """Absolutely — paste your rough notes and I'll help you shape a manager oversight note.

Use this structure:

Manager oversight note
Date/time:
Young person/home:
Reason for oversight:
What was reviewed:
Patterns/themes noticed:
Child's voice considered:
Actions/decisions taken:
Escalation/safeguarding considerations:
Follow-up and review date:

Include what you observed, what you checked, and what difference your oversight made."""

INCIDENT_TEMPLATE_DETERMINISTIC_ANSWER = """Absolutely — paste what happened and I'll help you draft a factual incident record.

Use this structure:

Incident record
Date/time:
Location:
Young person(s) involved:
Immediate safety actions:
What happened (antecedents):
Child's voice:
Staff response:
Injury/damage:
Outcome/de-escalation:
Notifications/escalation:
Follow-up/repair:

Do not invent facts — include only what was seen, heard and done."""

REG44_CHECKLIST_DETERMINISTIC_ANSWER = """Reg 44 evidence checklist — use this to structure your visitor note:

Reg 44 visit evidence
Date of visit:
Visitor name/role:
Young people spoken to (initials only unless authorised):
Views of young people captured:
Records reviewed:
Safeguarding/welfare observations:
Quality of care observations:
Staff supervision/training seen:
Actions/recommendations:
Follow-up required:

Keep evidence factual, child-centred and linked to what you actually saw and heard."""

CHILD_VOICE_GUIDANCE_ANSWER = """To capture the child's voice in daily recording:

- Write what the young person actually said, in their words where possible — use quote marks for exact phrases.
- Note how they communicated (speech, widgets, behaviour, body language).
- Record what mattered to them, not just what staff wanted to happen.
- Separate facts (what you saw/heard) from your interpretation.
- Include their choices, refusals, and preferences — these are part of their voice.

Paste your rough notes and I can help turn them into clear, factual, child-centred recording wording."""

DETERMINISTIC_ANSWERS: dict[str, str] = {
    "daily_record": DAILY_NOTE_DETERMINISTIC_ANSWER,
    "keywork_session": KEYWORK_SESSION_DETERMINISTIC_ANSWER,
    "handover": HANDOVER_DETERMINISTIC_ANSWER,
    "manager_oversight_note": MANAGER_OVERSIGHT_DETERMINISTIC_ANSWER,
    "incident_record": INCIDENT_TEMPLATE_DETERMINISTIC_ANSWER,
    "reg44_visitor": REG44_CHECKLIST_DETERMINISTIC_ANSWER,
}


@dataclass
class OrbExecutionPolicyDecision:
    selected_contract: str | None = None
    depth_tier: str = "standard"
    execution_policy: str = "openai_compact"
    retrieval_policy: str = "minimal"
    openai_policy: str = "after_internal_selection"
    deterministic_answer_available: bool = False
    scenario_bank_policy: str = "skip_unless_required"
    embedding_policy: str = "skip_unless_required"
    repair_policy: str = "local_validator_first"
    validation_policy: str = "contract_validator"
    openai_allowed: bool = True
    embeddings_allowed: bool = False
    scenario_bank_allowed: bool = False
    prompt_chars_cap: int | None = None
    openai_reason: str | None = None
    optimisation_gap: str | None = None
    internal_knowledge_markers: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbExecutionPolicyService:
    """Decide internal-first execution after brain convergence and contract selection."""

    VERSION = "orb-execution-policy-v1"

    def resolve(
        self,
        message: str,
        *,
        brain_convergence: dict[str, Any] | None = None,
        retrieval_bundle: dict[str, Any] | None = None,
        mode: str | None = None,
        note_type: str | None = None,
        requested_action: str | None = None,
    ) -> OrbExecutionPolicyDecision:
        convergence = dict(brain_convergence or {})
        bundle = dict(retrieval_bundle or {})
        scenario_types = list(convergence.get("scenario_types") or [])
        risk_level = str(convergence.get("risk_level") or "low").lower()
        contract_family = (
            convergence.get("contract_family")
            or bundle.get("selected_contract")
            or detect_contract_family(
                message,
                scenario_types=scenario_types,
                note_type=note_type,
                requested_action=requested_action,
            )
            or self._detect_custom_family(message)
        )
        family = get_contract_family(contract_family) or {}
        depth_tier = str(
            convergence.get("depth_tier") or family.get("depth_tier") or "standard"
        )

        if scenario_types and any(s in MANDATORY_SAFEGUARDING_SCENARIOS for s in scenario_types):
            return self._mandatory_safeguarding_decision(
                contract_family=contract_family,
                depth_tier=depth_tier,
                scenario_types=scenario_types,
            )
        if contract_family in MANDATORY_SAFEGUARDING_FAMILIES or depth_tier == "mandatory":
            return self._mandatory_safeguarding_decision(
                contract_family=contract_family,
                depth_tier=depth_tier,
                scenario_types=scenario_types,
            )
        if (
            risk_level in {"high", "critical", "safeguarding"}
            and scenario_types
            and not self._is_structure_only_request(message, contract_family)
        ):
            return self._mandatory_safeguarding_decision(
                contract_family=contract_family,
                depth_tier="mandatory",
                scenario_types=scenario_types,
            )

        if self._is_child_voice_guidance(message):
            markers = self._internal_markers_for_family("daily_record")
            return OrbExecutionPolicyDecision(
                selected_contract="daily_record",
                depth_tier=depth_tier,
                execution_policy="internal_template_plus_validator",
                retrieval_policy="contract_only",
                openai_policy="never",
                deterministic_answer_available=True,
                scenario_bank_policy="skip",
                embedding_policy="skip",
                repair_policy="local_validator_first",
                validation_policy="contract_validator",
                openai_allowed=False,
                embeddings_allowed=False,
                scenario_bank_allowed=False,
                prompt_chars_cap=1000,
                internal_knowledge_markers=markers,
            )

        if self._is_structure_only_request(message, contract_family):
            markers = self._internal_markers_for_family(contract_family)
            return OrbExecutionPolicyDecision(
                selected_contract=contract_family,
                depth_tier=depth_tier,
                execution_policy="deterministic_only",
                retrieval_policy="none",
                openai_policy="never",
                deterministic_answer_available=True,
                scenario_bank_policy="skip",
                embedding_policy="skip",
                repair_policy="none",
                validation_policy="local_template_validator",
                openai_allowed=False,
                embeddings_allowed=False,
                scenario_bank_allowed=False,
                prompt_chars_cap=800,
                openai_reason=None,
                internal_knowledge_markers=markers,
            )

        if contract_family in DETERMINISTIC_TEMPLATE_FAMILIES and not self._has_generation_content(message):
            markers = self._internal_markers_for_family(contract_family)
            return OrbExecutionPolicyDecision(
                selected_contract=contract_family,
                depth_tier=depth_tier,
                execution_policy="internal_template_plus_validator",
                retrieval_policy="contract_only",
                openai_policy="never",
                deterministic_answer_available=contract_family in DETERMINISTIC_ANSWERS,
                scenario_bank_policy="skip",
                embedding_policy="skip",
                repair_policy="local_validator_first",
                validation_policy="contract_validator",
                openai_allowed=False,
                embeddings_allowed=False,
                scenario_bank_allowed=False,
                prompt_chars_cap=1200,
                internal_knowledge_markers=markers,
            )

        if self._needs_enhanced_reasoning(message, contract_family, depth_tier, mode=mode):
            return OrbExecutionPolicyDecision(
                selected_contract=contract_family,
                depth_tier=depth_tier,
                execution_policy="openai_enhanced",
                retrieval_policy="full_internal_first",
                openai_policy="enhanced_after_contract",
                deterministic_answer_available=False,
                scenario_bank_policy="load_if_complex",
                embedding_policy="allow_if_rag_needed",
                repair_policy="contract_repair_then_validator",
                validation_policy="contract_validator",
                openai_allowed=True,
                embeddings_allowed=True,
                scenario_bank_allowed=True,
                openai_reason="complex_professional_reasoning",
                internal_knowledge_markers=self._internal_markers_for_family(contract_family),
            )

        return OrbExecutionPolicyDecision(
            selected_contract=contract_family,
            depth_tier=depth_tier,
            execution_policy="openai_compact",
            retrieval_policy="contract_first_minimal",
            openai_policy="compact_after_contract",
            deterministic_answer_available=False,
            scenario_bank_policy="skip_unless_risk",
            embedding_policy="skip_unless_rag",
            repair_policy="local_validator_first",
            validation_policy="contract_validator",
            openai_allowed=True,
            embeddings_allowed=False,
            scenario_bank_allowed=False,
            openai_reason="generation_required",
            internal_knowledge_markers=self._internal_markers_for_family(contract_family),
        )

    def try_deterministic_answer(
        self,
        message: str,
        *,
        policy: OrbExecutionPolicyDecision | dict[str, Any] | None = None,
        brain_convergence: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        decision = policy if isinstance(policy, OrbExecutionPolicyDecision) else None
        if decision is None and isinstance(policy, dict):
            decision = OrbExecutionPolicyDecision(**{
                k: v for k, v in policy.items() if k in OrbExecutionPolicyDecision.__dataclass_fields__
            })
        if decision is None:
            decision = self.resolve(message, brain_convergence=brain_convergence)

        if decision.execution_policy not in {
            "deterministic_only",
            "internal_template_plus_validator",
        }:
            return None
        if not decision.deterministic_answer_available:
            return None

        family_id = decision.selected_contract
        answer = DETERMINISTIC_ANSWERS.get(family_id or "")
        if not answer and self._is_child_voice_guidance(message):
            answer = CHILD_VOICE_GUIDANCE_ANSWER
            family_id = family_id or "daily_record"

        if not answer:
            return None

        validation = validate_contract_answer(answer, family_id=family_id)
        return {
            "answer": validation.get("sanitized_answer") or answer,
            "sources": [],
            "citations": [],
            "no_llm": True,
            "execution_policy": decision.execution_policy,
            "validation": validation,
        }

    def build_execution_telemetry(
        self,
        *,
        policy: OrbExecutionPolicyDecision | dict[str, Any],
        openai_called: bool,
        embeddings_called: bool = False,
        embeddings_count: int = 0,
        scenario_bank_loaded: bool = False,
        prompt_chars: int = 0,
        first_token_ms: int | None = None,
        total_ms: int | None = None,
        final_answer_validation_passed: bool | None = None,
        answer_repaired: bool = False,
        public_explainability_labels: list[str] | None = None,
    ) -> dict[str, Any]:
        policy_dict = policy.to_dict() if isinstance(policy, OrbExecutionPolicyDecision) else dict(policy)
        telemetry: dict[str, Any] = {
            "execution_policy_version": self.VERSION,
            "selected_contract": policy_dict.get("selected_contract"),
            "execution_policy": policy_dict.get("execution_policy"),
            "depth_tier": policy_dict.get("depth_tier"),
            "retrieval_policy": policy_dict.get("retrieval_policy"),
            "openai_called": openai_called,
            "openai_reason": policy_dict.get("openai_reason"),
            "embeddings_called": embeddings_called,
            "embeddings_count": embeddings_count,
            "scenario_bank_loaded": scenario_bank_loaded,
            "prompt_chars": prompt_chars,
            "final_answer_validation_passed": final_answer_validation_passed,
            "answer_repaired": answer_repaired,
            "internal_first": not openai_called,
            "cost_control_pass": not openai_called or policy_dict.get("openai_allowed", True),
        }
        if first_token_ms is not None:
            telemetry["first_token_ms"] = first_token_ms
        if total_ms is not None:
            telemetry["total_ms"] = total_ms
        if public_explainability_labels:
            telemetry["public_explainability_labels"] = list(public_explainability_labels)
        if (
            openai_called
            and policy_dict.get("deterministic_answer_available")
            and policy_dict.get("execution_policy") in {"deterministic_only", "internal_template_plus_validator"}
        ):
            telemetry["optimisation_gap"] = "deterministic template available"
        elif policy_dict.get("optimisation_gap"):
            telemetry["optimisation_gap"] = policy_dict.get("optimisation_gap")
        return telemetry

    def _mandatory_safeguarding_decision(
        self,
        *,
        contract_family: str | None,
        depth_tier: str,
        scenario_types: list[str],
    ) -> OrbExecutionPolicyDecision:
        return OrbExecutionPolicyDecision(
            selected_contract=contract_family,
            depth_tier="mandatory",
            execution_policy="openai_mandatory_safeguarding",
            retrieval_policy="safeguarding_contract_first",
            openai_policy="mandatory_with_validator",
            deterministic_answer_available=False,
            scenario_bank_policy="load_for_risk",
            embedding_policy="skip_unless_required",
            repair_policy="mandatory_contract_repair",
            validation_policy="mandatory_contract_validator",
            openai_allowed=True,
            embeddings_allowed=False,
            scenario_bank_allowed=True,
            openai_reason="mandatory_safeguarding_generation",
            internal_knowledge_markers=["safeguarding", "escalation_boundary", "do_not_investigate"],
        )

    def _is_structure_only_request(self, message: str, family_id: str | None) -> bool:
        if not family_id:
            return False
        text = str(message or "").strip()
        if not text:
            return False
        pattern = STRUCTURE_ONLY_PATTERNS.get(family_id)
        if pattern and pattern.search(text):
            return not self._has_generation_content(text)
        if family_id == "template_generation" and re.search(
            r"\b(structure|template|headings?|checklist)\b", text, re.I
        ):
            return not self._has_generation_content(text)
        return False

    def _has_generation_content(self, message: str) -> bool:
        text = str(message or "").strip()
        if len(text.split()) > 18:
            return True
        if GENERATION_REQUIRED_PATTERNS.search(text):
            return True
        if ROUGH_NOTES_INDICATORS.search(text) and not STRUCTURE_ONLY_PATTERNS.get("daily_record", re.compile("$^")).fullmatch(
            text
        ):
            # Rough factual content present alongside a template ask
            lower = text.lower()
            if any(
                p in lower
                for p in (
                    "help me write",
                    "help me word",
                    "convert",
                    "rewrite",
                )
            ):
                return True
            if len(text.split()) > 10:
                return True
        return False

    def _needs_enhanced_reasoning(
        self,
        message: str,
        family_id: str | None,
        depth_tier: str,
        *,
        mode: str | None = None,
    ) -> bool:
        lower = str(message or "").lower()
        mode_name = str(mode or "").strip()
        if depth_tier in {"enhanced", "mandatory", "deep"}:
            return True
        if mode_name in {
            "Manager Copilot",
            "Reg 44 / Reg 45 Prep",
            "Ofsted Lens",
            "Scenario Simulator",
        }:
            return True
        enhanced_terms = (
            "ofsted preparation",
            "ofsted prep",
            "document review",
            "support plan",
            "multi-factor",
            "repeated pattern",
            "manager oversight review",
            "placement plan review",
            "risk assessment review",
            "quality of care",
            "leadership and management",
            "sccif",
        )
        return any(term in lower for term in enhanced_terms)

    def _is_child_voice_guidance(self, message: str) -> bool:
        text = str(message or "").strip().lower()
        return bool(
            re.search(r"child'?s?\s+voice", text)
            and re.search(r"\b(how|capture|record|recording|include)\b", text)
            and not self._has_generation_content(message)
        )

    def _detect_custom_family(self, message: str) -> str | None:
        text = str(message or "").strip()
        if not text:
            return None
        if STRUCTURE_ONLY_PATTERNS["handover"].search(text) or re.search(
            r"\bhandover\b", text, re.I
        ):
            return "handover"
        if re.search(r"key\s*[- ]?work", text, re.I):
            return "keywork_session"
        if STRUCTURE_ONLY_PATTERNS["reg44_visitor"].search(text) or re.search(
            r"\breg\s*44\b", text, re.I
        ):
            return "reg44_visitor"
        if re.search(r"child'?s?\s+voice", text, re.I) and re.search(
            r"\b(record|recording|capture|daily)\b", text, re.I
        ):
            return "daily_record"
        return None

    def _internal_markers_for_family(self, family_id: str | None) -> list[str]:
        family = get_contract_family(family_id) or {}
        markers = list(family.get("required_markers") or [])
        if family_id == "daily_record":
            markers.extend(["child voice", "factual", "structure"])
        elif family_id == "handover":
            markers.extend(["handover", "shift", "follow-up"])
        elif family_id in MANDATORY_SAFEGUARDING_FAMILIES:
            markers.extend(["safeguarding", "escalation"])
        return markers[:12]


orb_execution_policy_service = OrbExecutionPolicyService()
