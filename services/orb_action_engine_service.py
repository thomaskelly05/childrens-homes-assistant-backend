"""Standalone ORB residential action engine — structured follow-ups without OS records."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any

from services.ai_model_router_service import ai_model_router_service
from services.orb_data_vault_registry_service import orb_data_vault_registry_service
from services.orb_academy_nvq_anchor_service import (
    NVQ_AUTHENTICITY_BOUNDARY,
    orb_academy_nvq_anchor_service,
)
from services.orb_human_practice_brain_service import orb_human_practice_brain_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_operating_brain_service import orb_operating_brain_service
from services.orb_brain_metadata_service import attach_to_payload
from services.indicare_intelligence_route_finalize_service import (
    finalize_standalone_intelligence,
    intelligence_context_summary,
    is_care_related_action,
)
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_brain_visibility_service import build_public_explainability
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.orb_therapeutic_language_contract_service import (
    build_therapeutic_language_contract_block,
    is_residential_incident_scenario,
    is_short_residential_scenario,
)
from services.orb_expert_answer_engine_service import orb_expert_answer_engine_service
from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
from services.orb_standalone_sources import build_standalone_sources

STANDALONE_BOUNDARY_PREFIX = (
    "Based only on what you have provided — I have not checked live IndiCare OS records."
)

CHILD_VOICE_MARKERS = (
    "child said",
    "young person said",
    "yp said",
    "their words",
    "child's view",
    "child voice",
    "in their words",
    "told staff",
    "shared with staff",
    "expressed that",
    "said to staff",
)

PUNITIVE_MARKERS = (
    "defiant",
    "manipulative",
    "attention seeking",
    "attention-seeking",
    "chose to",
    "refused to behave",
    "naughty",
    "disrespectful",
    "won't listen",
)

HIGH_RISK_ACTIONS = frozenset(
    {
        "what_am_i_missing",
        "add_safeguarding_lens",
        "create_manager_oversight_note",
        "shift_handover_summary",
        "build_shift_plan",
    }
)

DEEP_MODE_ACTIONS = frozenset(
    {
        "add_safeguarding_lens",
    }
)

HIGH_RISK_SOURCE_TERMS = (
    "immediate danger",
    "suicide",
    "self-harm",
    "self harm",
    "abuse",
    "missing",
    "assault",
    "emergency",
    "injury",
    "bruise",
    "disclosure",
    "allegation",
    "weapon",
    "hospital",
    "police",
)

TRANSFORM_ACTIONS = frozenset(
    {
        "make_more_concise",
        "make_more_detailed",
        "therapeutic_reframe",
        "supervision_prompt",
        "shift_handover_summary",
        "build_shift_plan",
        "add_child_voice_prompt",
    }
)


@dataclass(frozen=True)
class OrbActionDefinition:
    id: str
    label: str
    description: str
    residential_purpose: str
    required_input: str
    output_type: str
    safety_level: str
    prompt_mode: str
    data_vaults: tuple[str, ...]
    knowledge_modules: tuple[str, ...]
    standalone_boundary: str
    backend_supported: bool
    frontend_fallback_safe: bool
    role_suitability: tuple[str, ...] = ()
    academy_nvq_purpose: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _clip(text: str, limit: int = 6000) -> str:
    text = _text(text)
    if len(text) <= limit:
        return text
    return f"{text[:limit].rstrip()}..."


def _source_suggests_high_risk(source_text: str) -> bool:
    lower = _text(source_text).lower()
    return any(term in lower for term in HIGH_RISK_SOURCE_TERMS)


def _academy_action(
    *,
    id: str,
    label: str,
    description: str,
    purpose: str,
    output_type: str,
    safety_level: str = "medium",
    prompt_mode: str = "residential",
    roles: tuple[str, ...],
    vaults: tuple[str, ...] = ("Academy Learning Vault", "Qualification Evidence Vault"),
) -> OrbActionDefinition:
    return OrbActionDefinition(
        id=id,
        label=label,
        description=description,
        residential_purpose=purpose,
        required_input="source_message and/or source_answer; criteria text optional in source",
        output_type=output_type,
        safety_level=safety_level,
        prompt_mode=prompt_mode,
        data_vaults=vaults,
        knowledge_modules=("reflective_practice", "team_learning_loop"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
        role_suitability=roles,
        academy_nvq_purpose=purpose,
    )


ORB_ACTION_REGISTRY: dict[str, OrbActionDefinition] = {
    "what_am_i_missing": OrbActionDefinition(
        id="what_am_i_missing",
        label="What am I missing?",
        description="Gap analysis for recording, safeguarding, chronology and professional curiosity.",
        residential_purpose="Help staff see what may be absent before sign-off or escalation.",
        required_input="source_message and/or source_answer",
        output_type="structured_sections",
        safety_level="high",
        prompt_mode="residential_deep",
        data_vaults=("Recording Quality Vault", "Safeguarding Vault", "Leadership/Governance Vault"),
        knowledge_modules=("safe_recording", "contextual_safeguarding", "leadership_management"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "convert_to_recording_wording": OrbActionDefinition(
        id="convert_to_recording_wording",
        label="Convert to recording wording",
        description="Rewrite rough notes into factual, child-centred residential recording language.",
        residential_purpose="Improve log quality without inventing facts.",
        required_input="source_message or source_answer",
        output_type="recording_draft",
        safety_level="medium",
        prompt_mode="residential",
        data_vaults=("Recording Quality Vault", "Therapeutic Vault"),
        knowledge_modules=("safe_recording", "therapeutic_language"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "create_manager_oversight_note": OrbActionDefinition(
        id="create_manager_oversight_note",
        label="Manager oversight note",
        description="Draft RM/RI oversight reflection from provided material only.",
        residential_purpose="Support manager grip without OS record access.",
        required_input="source_message and/or source_answer",
        output_type="manager_note",
        safety_level="high",
        prompt_mode="residential_deep",
        data_vaults=("Leadership/Governance Vault", "Safeguarding Vault"),
        knowledge_modules=("leadership_management", "safe_recording"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "create_chronology_suggestion": OrbActionDefinition(
        id="create_chronology_suggestion",
        label="Chronology suggestion",
        description="Suggest chronology entry structure — not inserted into any system.",
        residential_purpose="Help staff sequence and evidence significant events.",
        required_input="source_message and/or source_answer",
        output_type="chronology_draft",
        safety_level="medium",
        prompt_mode="residential",
        data_vaults=("Recording Quality Vault",),
        knowledge_modules=("safe_recording", "regulation_citations"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "add_safeguarding_lens": OrbActionDefinition(
        id="add_safeguarding_lens",
        label="Safeguarding lens",
        description="Safeguarding reflection: safety, facts, gaps, escalation, recording.",
        residential_purpose="Structured safeguarding thinking without threshold decisions.",
        required_input="source_message and/or source_answer",
        output_type="lens_sections",
        safety_level="critical",
        prompt_mode="deep_safety",
        data_vaults=("Safeguarding Vault", "Recording Quality Vault"),
        knowledge_modules=("contextual_safeguarding", "working_together", "safe_recording"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "add_ofsted_lens": OrbActionDefinition(
        id="add_ofsted_lens",
        label="Ofsted lens",
        description="Inspection-quality lens on child experience, safety, progress and evidence.",
        residential_purpose="Help staff think like an inspector without predicting grades.",
        required_input="source_message and/or source_answer",
        output_type="lens_sections",
        safety_level="medium",
        prompt_mode="residential",
        data_vaults=("Ofsted/SCCIF Vault", "Leadership/Governance Vault"),
        knowledge_modules=("inspection_readiness", "ofsted_sccif", "quality_standards"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "create_checklist": OrbActionDefinition(
        id="create_checklist",
        label="Checklist",
        description="Practical staff follow-up checklist from provided context.",
        residential_purpose="Turn reflection into actionable shift tasks.",
        required_input="source_message and/or source_answer",
        output_type="checklist",
        safety_level="low",
        prompt_mode="residential",
        data_vaults=("Recording Quality Vault",),
        knowledge_modules=("safe_recording",),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "make_more_concise": OrbActionDefinition(
        id="make_more_concise",
        label="More concise",
        description="Shorten while keeping safeguarding and escalation points.",
        residential_purpose="Busy-shift readable output.",
        required_input="source_answer",
        output_type="text",
        safety_level="low",
        prompt_mode="fast",
        data_vaults=(),
        knowledge_modules=(),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "make_more_detailed": OrbActionDefinition(
        id="make_more_detailed",
        label="More detailed",
        description="Expand structure, actions and follow-up.",
        residential_purpose="Richer handover or briefing text.",
        required_input="source_answer",
        output_type="text",
        safety_level="low",
        prompt_mode="residential",
        data_vaults=("Recording Quality Vault",),
        knowledge_modules=("safe_recording",),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "therapeutic_reframe": OrbActionDefinition(
        id="therapeutic_reframe",
        label="Therapeutic reframe",
        description="Trauma-informed reframing of events and staff responses.",
        residential_purpose="Support relational, non-punitive practice reflection.",
        required_input="source_message and/or source_answer",
        output_type="text",
        safety_level="medium",
        prompt_mode="residential",
        data_vaults=("Therapeutic Vault",),
        knowledge_modules=("trauma_informed", "therapeutic_language"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "supervision_prompt": OrbActionDefinition(
        id="supervision_prompt",
        label="Supervision prompts",
        description="Questions for supervision from the provided scenario.",
        residential_purpose="Prepare reflective supervision.",
        required_input="source_message and/or source_answer",
        output_type="prompt_list",
        safety_level="medium",
        prompt_mode="residential",
        data_vaults=("Leadership/Governance Vault", "Therapeutic Vault"),
        knowledge_modules=("leadership_management",),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "shift_handover_summary": OrbActionDefinition(
        id="shift_handover_summary",
        label="Shift handover summary",
        description="Handover bullets: priorities, risks, child experience, manager attention.",
        residential_purpose="Structured shift communication.",
        required_input="source_message and/or source_answer",
        output_type="handover",
        safety_level="medium",
        prompt_mode="residential",
        data_vaults=("Recording Quality Vault", "Safeguarding Vault"),
        knowledge_modules=("safe_recording",),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "add_child_voice_prompt": OrbActionDefinition(
        id="add_child_voice_prompt",
        label="Child voice prompt",
        description="Identify missing child voice and suggest safe capture wording.",
        residential_purpose="Strengthen child-centred recording without inventing views.",
        required_input="source_message and/or source_answer",
        output_type="prompt_list",
        safety_level="medium",
        prompt_mode="residential",
        data_vaults=("Recording Quality Vault", "Therapeutic Vault"),
        knowledge_modules=("safe_recording", "therapeutic_language"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "build_shift_plan": OrbActionDefinition(
        id="build_shift_plan",
        label="Build shift plan",
        description="Structured shift priorities, risks, handover and reflection from provided notes only.",
        residential_purpose="End-of-shift planning and handover without live OS records.",
        required_input="source_message and/or source_answer",
        output_type="shift_plan",
        safety_level="medium",
        prompt_mode="residential",
        data_vaults=("Recording Quality Vault", "Safeguarding Vault", "Ofsted/SCCIF Vault"),
        knowledge_modules=("safe_recording", "contextual_safeguarding"),
        standalone_boundary=STANDALONE_BOUNDARY_PREFIX,
        backend_supported=True,
        frontend_fallback_safe=True,
    ),
    "map_to_nvq_evidence": _academy_action(
        id="map_to_nvq_evidence",
        label="Map to NVQ evidence",
        description="Map described practice to possible criteria/themes without inventing events.",
        purpose="Support assessors and learners to map authentic practice to qualification criteria.",
        output_type="nvq_evidence_map",
        roles=("nvq_assessor", "nvq_learner", "diploma_learner", "trainer_consultant", "registered_manager"),
    ),
    "explain_nvq_criteria": _academy_action(
        id="explain_nvq_criteria",
        label="Explain NVQ criteria",
        description="Explain criteria in plain English for residential childcare diplomas.",
        purpose="Help learners understand what assessors look for.",
        output_type="criteria_explainer",
        safety_level="low",
        roles=("nvq_learner", "diploma_learner", "nvq_assessor", "trainer_consultant"),
    ),
    "create_reflective_account_plan": _academy_action(
        id="create_reflective_account_plan",
        label="Reflective account plan",
        description="Structure a reflective account plan from described practice only.",
        purpose="Turn real practice into reflection without fabricating incidents.",
        output_type="reflective_account_plan",
        roles=("nvq_learner", "diploma_learner", "nvq_assessor", "residential_support_worker"),
    ),
    "review_reflective_account": _academy_action(
        id="review_reflective_account",
        label="Review reflective account",
        description="Review a reflective account draft for structure, gaps and authenticity.",
        purpose="Assessor/learner support — draft only, not official assessment.",
        output_type="reflective_review",
        roles=("nvq_assessor", "nvq_learner", "diploma_learner", "registered_manager"),
    ),
    "create_professional_discussion_prompts": _academy_action(
        id="create_professional_discussion_prompts",
        label="Professional discussion prompts",
        description="Generate professional discussion questions from described evidence.",
        purpose="Prepare PD that tests understanding without inventing practice.",
        output_type="prompt_list",
        roles=("nvq_assessor", "trainer_consultant"),
    ),
    "create_witness_testimony_prompt": _academy_action(
        id="create_witness_testimony_prompt",
        label="Witness testimony prompt",
        description="Suggest witness testimony focus areas from described practice.",
        purpose="Help identify suitable witnesses and testimony scope.",
        output_type="prompt_list",
        roles=("nvq_assessor", "senior_support_worker", "registered_manager"),
    ),
    "identify_learning_evidence_gaps": _academy_action(
        id="identify_learning_evidence_gaps",
        label="Evidence gaps",
        description="Identify gaps in learning evidence from what was described.",
        purpose="Gap analysis for portfolios — no live learner records.",
        output_type="gap_analysis",
        roles=("nvq_assessor", "nvq_learner", "diploma_learner", "registered_manager"),
    ),
    "create_learner_action_plan": _academy_action(
        id="create_learner_action_plan",
        label="Learner action plan",
        description="Draft action plan for missing evidence collection.",
        purpose="Support learners to collect authentic evidence over time.",
        output_type="action_plan",
        roles=("nvq_assessor", "nvq_learner", "diploma_learner"),
    ),
    "assessor_feedback_draft": _academy_action(
        id="assessor_feedback_draft",
        label="Assessor feedback draft",
        description="Draft assessor feedback: strengths, gaps, PD questions — not official sign-off.",
        purpose="Draft support for assessor judgement only.",
        output_type="assessor_feedback",
        roles=("nvq_assessor",),
    ),
    "supervision_to_learning_evidence": _academy_action(
        id="supervision_to_learning_evidence",
        label="Supervision to evidence",
        description="Link supervision themes to possible learning evidence.",
        purpose="Connect supervision reflection to qualification evidence mapping.",
        output_type="learning_evidence",
        roles=("nvq_learner", "diploma_learner", "nvq_assessor", "registered_manager"),
    ),
    "incident_to_reflective_learning": _academy_action(
        id="incident_to_reflective_learning",
        label="Incident to reflective learning",
        description="Turn described incident into reflective learning structure.",
        purpose="Learning from practice without inventing facts.",
        output_type="reflective_account_plan",
        roles=("nvq_learner", "diploma_learner", "residential_support_worker", "senior_support_worker"),
    ),
    "policy_to_learning_questions": _academy_action(
        id="policy_to_learning_questions",
        label="Policy to learning questions",
        description="Generate learning/knowledge questions from policy or training text supplied.",
        purpose="Support trainers and learners to connect policy to practice.",
        output_type="prompt_list",
        safety_level="low",
        roles=("trainer_consultant", "nvq_learner", "diploma_learner", "registered_manager"),
    ),
}

BACKEND_SUPPORTED_ACTION_IDS = frozenset(
    action_id for action_id, definition in ORB_ACTION_REGISTRY.items() if definition.backend_supported
)

FRONTEND_TO_BACKEND_ACTION: dict[str, str] = {
    "what_missing": "what_am_i_missing",
    "recording_wording": "convert_to_recording_wording",
    "manager_oversight": "create_manager_oversight_note",
    "chronology": "create_chronology_suggestion",
    "ofsted_lens": "add_ofsted_lens",
    "safeguarding_lens": "add_safeguarding_lens",
    "checklist": "create_checklist",
    "more_concise": "make_more_concise",
    "more_detailed": "make_more_detailed",
    "improve_wording": "convert_to_recording_wording",
    "shift_builder": "build_shift_plan",
    "child_voice": "add_child_voice_prompt",
    "therapeutic_reframe": "therapeutic_reframe",
    "supervision_prompt": "supervision_prompt",
    "shift_handover": "shift_handover_summary",
    "build_shift_plan": "build_shift_plan",
    "nvq_evidence_map": "map_to_nvq_evidence",
    "explain_criteria": "explain_nvq_criteria",
    "reflective_learning": "create_reflective_account_plan",
    "review_reflective": "review_reflective_account",
    "pd_prompts": "create_professional_discussion_prompts",
    "witness_prompt": "create_witness_testimony_prompt",
    "evidence_gaps": "identify_learning_evidence_gaps",
    "learner_action_plan": "create_learner_action_plan",
    "assessor_feedback": "assessor_feedback_draft",
    "supervision_evidence": "supervision_to_learning_evidence",
    "incident_reflective": "incident_to_reflective_learning",
    "policy_learning": "policy_to_learning_questions",
}

ACADEMY_NVQ_ACTION_IDS = frozenset(
    {
        "map_to_nvq_evidence",
        "explain_nvq_criteria",
        "create_reflective_account_plan",
        "review_reflective_account",
        "create_professional_discussion_prompts",
        "create_witness_testimony_prompt",
        "identify_learning_evidence_gaps",
        "create_learner_action_plan",
        "assessor_feedback_draft",
        "supervision_to_learning_evidence",
        "incident_to_reflective_learning",
        "policy_to_learning_questions",
    }
)


@dataclass
class WhatMissingGap:
    id: str
    title: str
    why_it_matters: str
    what_to_check: str
    what_to_record: str
    escalation_hint: str = ""

    def to_section(self) -> dict[str, str]:
        return {
            "heading": self.title,
            "body": (
                f"**Why it matters:** {self.why_it_matters}\n\n"
                f"**What to check:** {self.what_to_check}\n\n"
                f"**What to record:** {self.what_to_record}"
                + (f"\n\n**Review:** {self.escalation_hint}" if self.escalation_hint else "")
            ),
        }


def analyse_what_missing_gaps(
    source_text: str,
    *,
    profile_role: str | None = None,
) -> list[WhatMissingGap]:
    """Heuristic gap detection for What Am I Missing (standalone, no OS access)."""
    text = _text(source_text)
    lower = text.lower()
    gaps: list[WhatMissingGap] = []

    expert_packet = orb_expert_answer_engine_service.build_expert_answer_packet(
        text, profile_role=profile_role
    )
    expert_markers = list(expert_packet.get("self_check_markers") or [])
    if not expert_markers:
        expert_ctx = orb_expert_scenario_bank_service.detect_expert_context(text)
        expert_markers = list(expert_ctx.get("expected_markers") or [])
    for marker in expert_markers[:6]:
        marker_id = re.sub(r"[^a-z0-9]+", "_", marker.lower())[:48]
        gaps.append(
            WhatMissingGap(
                id=f"expert_{marker_id}",
                title=marker[:80],
                why_it_matters="Expert scenario marker — a skilled RM/RI/Reg 44 visitor would expect this in the response.",
                what_to_check=f"Does the record or plan address: {marker[:120]}?",
                what_to_record=f"Factual detail and actions relevant to: {marker[:120]}.",
            )
        )

    for hint in orb_human_practice_brain_service.role_what_missing_gaps(profile_role):
        gaps.append(
            WhatMissingGap(
                id=hint["id"],
                title=hint["title"],
                why_it_matters=hint["why"],
                what_to_check=hint["check"],
                what_to_record=hint["record"],
            )
        )

    if text and not any(marker in lower for marker in CHILD_VOICE_MARKERS):
        gaps.append(
            WhatMissingGap(
                id="missing_child_voice",
                title="Child voice may be missing",
                why_it_matters="Inspectors and safeguarding reviewers expect the child's experience and words where safe to record.",
                what_to_check="Did you capture what the child said, showed, or communicated (verbal/non-verbal)?",
                what_to_record="Direct quotes or paraphrase with context; how staff responded to the child's view.",
                escalation_hint="If the child disclosed harm or fear, ensure safeguarding escalation is considered.",
            )
        )

    if any(marker in lower for marker in PUNITIVE_MARKERS):
        gaps.append(
            WhatMissingGap(
                id="punitive_language",
                title="Opinion-based or punitive language detected",
                why_it_matters="Recording should be factual and child-centred, not judgmental.",
                what_to_check="Replace labels with observable behaviour and staff responses.",
                what_to_record="What happened, what was seen/heard, interventions, and impact.",
            )
        )

    if text and not re.search(
        r"\b\d{1,2}[:/.]\d{1,2}|\b\d{4}\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|"
        r"\b(at\s+\d|around\s+\d|before\s+\d|after\s+\d|am\b|pm\b)",
        lower,
    ):
        gaps.append(
            WhatMissingGap(
                id="unclear_timeline",
                title="Timeline may be unclear",
                why_it_matters="Chronology and safeguarding decisions rely on sequence and timing.",
                what_to_check="Can you place events in order with approximate times?",
                what_to_record="Date, time (or sequence), location, who was present, and what followed.",
            )
        )

    evidence_markers = ("observed", "witnessed", "staff saw", "staff heard", "cctv", "reported", "recorded")
    if text and len(text) > 120 and not any(m in lower for m in evidence_markers):
        gaps.append(
            WhatMissingGap(
                id="weak_evidence",
                title="Evidence basis may be weak",
                why_it_matters="Professional records should distinguish fact from inference.",
                what_to_check="What did staff directly observe vs hear from others?",
                what_to_record="Source of information and any corroboration still needed.",
            )
        )

    if text and "manager" not in lower and "rm " not in lower and "registered manager" not in lower:
        if any(w in lower for w in ("concern", "risk", "harm", "injury", "missing", "police", "hospital")):
            gaps.append(
                WhatMissingGap(
                    id="missing_manager_review",
                    title="Manager review may be needed",
                    why_it_matters="Higher-risk events usually need timely RM/RI oversight.",
                    what_to_check="Has the registered manager or on-call been informed?",
                    what_to_record="Who was notified, when, and agreed next steps.",
                    escalation_hint="Consider DSL/LADO pathways per local policy if safeguarding thresholds may apply.",
                )
            )

    safeguarding_terms = ("safeguarding", "dsl", "lado", "social worker", "police", "a&e", "hospital")
    if text and any(t in lower for t in ("hurt", "injury", "abuse", "missing", "sexual", "weapon")):
        if not any(t in lower for t in safeguarding_terms):
            gaps.append(
                WhatMissingGap(
                    id="safeguarding_consideration",
                    title="Safeguarding consideration",
                    why_it_matters="High-impact events need explicit safeguarding reflection in the record.",
                    what_to_check="Immediate safety, who is responsible, and whether escalation is required.",
                    what_to_record="Safeguarding actions taken or why not yet; advice sought.",
                    escalation_hint="Follow local safeguarding procedures — ORB cannot decide thresholds.",
                )
            )

    if "chronology" not in lower and "chronol" not in lower and len(text) > 200:
        gaps.append(
            WhatMissingGap(
                id="missing_chronology_entry",
                title="Chronology entry may be needed",
                why_it_matters="Significant events should be traceable across the child's story.",
                what_to_check="Does this event meet your home's chronology criteria?",
                what_to_record="Factual summary, significance, and follow-up for chronology.",
            )
        )

    if "follow-up" not in lower and "follow up" not in lower and "next step" not in lower:
        gaps.append(
            WhatMissingGap(
                id="no_follow_up_action",
                title="Follow-up action may be missing",
                why_it_matters="Care should show what will happen next and who owns it.",
                what_to_check="What needs to happen after this event?",
                what_to_record="Actions, owners, and review dates where known.",
            )
        )

    if "because" not in lower and "rationale" not in lower and "reason" not in lower and len(text) > 150:
        gaps.append(
            WhatMissingGap(
                id="no_rationale",
                title="Rationale may be missing",
                why_it_matters="Decisions (especially restrictions or consequences) need professional reasoning.",
                what_to_check="Why was this response chosen? What alternatives were considered?",
                what_to_record="Rationale linked to the child's needs and plan.",
            )
        )

    curiosity_markers = ("curious", "wonder", "pattern", "previous", "history", "trend")
    if text and not any(m in lower for m in curiosity_markers) and len(text) > 180:
        gaps.append(
            WhatMissingGap(
                id="professional_curiosity",
                title="Professional curiosity",
                why_it_matters="Repeated or escalating patterns can indicate unmet need or risk.",
                what_to_check="Is this new? Has something similar happened before?",
                what_to_record="Patterns noticed and questions for supervision or review.",
            )
        )

    return gaps


class OrbActionEngineService:
    """Runs structured standalone ORB actions with Knowledge Spine, Operating Brain and vaults."""

    def list_actions(self) -> list[dict[str, Any]]:
        return [definition.to_dict() for definition in ORB_ACTION_REGISTRY.values()]

    def get_action(self, action_id: str) -> OrbActionDefinition | None:
        return ORB_ACTION_REGISTRY.get(_text(action_id))

    def resolve_backend_action_id(self, action: str) -> str:
        raw = _text(action)
        if raw in ORB_ACTION_REGISTRY:
            return raw
        mapped = FRONTEND_TO_BACKEND_ACTION.get(raw)
        if mapped:
            return mapped
        return raw

    def is_backend_supported(self, action_id: str) -> bool:
        resolved = self.resolve_backend_action_id(action_id)
        return resolved in BACKEND_SUPPORTED_ACTION_IDS

    def resolve_prompt_tier(
        self,
        action_id: str,
        *,
        source_text: str,
        mode: str | None = None,
    ) -> str:
        definition = self.get_action(action_id)
        if definition and definition.prompt_mode == "deep_safety":
            return "deep"
        if action_id in DEEP_MODE_ACTIONS:
            return "deep"
        if action_id in HIGH_RISK_ACTIONS:
            return "deep"
        bundle = orb_knowledge_retrieval_service.prepare_request_bundle(
            source_text,
            mode=mode or "Ask ORB",
        )
        tier = bundle.get("prompt_tier") or "residential"
        if action_id in {"add_safeguarding_lens"}:
            return "deep"
        if action_id in TRANSFORM_ACTIONS and _source_suggests_high_risk(source_text):
            return "deep"
        return tier

    def _combine_source(
        self,
        *,
        source_message: str | None,
        source_answer: str | None,
        context: dict[str, Any] | None = None,
    ) -> str:
        ctx = context or {}
        chat_history = ctx.get("chat_history") or ctx.get("conversation_history")
        selected = _text(ctx.get("selected_message")) or None
        if action_context := ctx.get("incident_context"):
            selected = selected or _text(action_context)
        return orb_academy_nvq_anchor_service.combine_source_material(
            source_message=source_message,
            source_answer=source_answer,
            chat_history=list(chat_history) if chat_history else None,
            selected_message=selected,
        )

    def _vault_block(self, definition: OrbActionDefinition) -> str:
        if not definition.data_vaults:
            return ""
        details = orb_data_vault_registry_service.describe_domains(list(definition.data_vaults))
        lines = ["## ORB data vaults (built-in practice knowledge, not live OS records)"]
        for item in details:
            lines.append(f"- {item.get('name')}: {item.get('description')}")
        return "\n".join(lines)

    def _build_action_system_prompt(
        self,
        *,
        definition: OrbActionDefinition,
        grounding_context: str,
        operating_block: str,
        mode: str,
        prompt_tier: str,
        profile_role: str | None = None,
        source_text: str = "",
        convergence_block: str = "",
    ) -> str:
        parts = [
            "You are ORB Care Companion running a structured residential children's homes action.",
            f"Action: {definition.label} ({definition.id})",
            f"Purpose: {definition.residential_purpose}",
            STANDALONE_BOUNDARY_PREFIX,
            orb_human_practice_brain_service.human_voice_block(),
            "Never invent names, dates, chronology entries, notifications, or OS record lookups.",
            "Never claim you accessed IndiCare OS, chronology, child records, or live Academy learner records.",
            f"User mode context: {mode}",
        ]
        if definition.academy_nvq_purpose or definition.id in ACADEMY_NVQ_ACTION_IDS:
            parts.append(NVQ_AUTHENTICITY_BOUNDARY)
            parts.append(
                "Never substitute a generic example (no Child A, group activity, or invented incident). "
                "Anchor every section to the supplied source and chat context only."
            )
        if profile_role:
            parts.append(orb_human_practice_brain_service.build_role_shaping_block(profile_role))
        if prompt_tier == "deep":
            parts.append(
                "Use deep safeguarding-aware reasoning: facts vs concerns, gaps, escalation, "
                "recording requirements, and professional boundaries."
            )
        if self._vault_block(definition):
            parts.append(self._vault_block(definition))
        source_for_expert = _text(source_text) or (grounding_context[:2000] if grounding_context else "")
        expert_packet = orb_expert_answer_engine_service.build_expert_answer_packet(
            source_for_expert, profile_role=profile_role, mode=mode
        )
        expert_block = orb_expert_answer_engine_service.build_prompt_block(expert_packet)
        if not expert_block:
            expert_block = orb_expert_scenario_bank_service.expert_prompt_block(source_for_expert)
        if expert_block:
            parts.append(expert_block)
        if convergence_block:
            parts.append(convergence_block)
        if operating_block:
            parts.append(operating_block)
        if grounding_context:
            parts.append(grounding_context)
        if definition.id in {
            "what_am_i_missing",
            "convert_to_recording_wording",
            "create_manager_oversight_note",
            "add_safeguarding_lens",
            "therapeutic_reframe",
            "add_child_voice_prompt",
        } or is_residential_incident_scenario(source_text):
            parts.append(build_therapeutic_language_contract_block())
        return "\n\n".join(parts)

    def _action_user_prompt(
        self,
        action_id: str,
        *,
        source_text: str,
        gaps: list[WhatMissingGap] | None = None,
        profile_role: str | None = None,
    ) -> str:
        if action_id == "what_am_i_missing":
            gap_block = ""
            if gaps:
                gap_block = "\n\nHeuristic gaps already detected (incorporate and do not duplicate blindly):\n"
                gap_block += "\n".join(f"- {g.title}: {g.why_it_matters}" for g in gaps)
            role_note = ""
            if profile_role:
                profile = orb_human_practice_brain_service.get_profile(profile_role)
                role_note = (
                    f"\nShape gaps for a {profile.label}: {profile.needs_from_orb}\n"
                    f"Prioritise: {profile.priorities}"
                )
            if is_short_residential_scenario(source_text):
                return (
                    "Review what is missing before this residential record can be finalised.\n"
                    "Respond concisely with a checklist only — no long essay.\n"
                    "Cover: observable behaviour, child voice, staff response, risk/harm/damage, outcome, "
                    "manager oversight if relevant. Do not invent facts.\n"
                    f"{role_note}{gap_block}\n\n"
                    f"--- SOURCE MATERIAL ---\n{source_text}"
                )
            return (
                "Review the source material for what may be missing in residential recording and oversight.\n"
                "Structure your response with these sections (use markdown headings):\n"
                "1. What may be missing\n"
                "2. Why it matters\n"
                "3. What to check\n"
                "4. What to record\n"
                "5. What may need manager/safeguarding review\n"
                "6. Suggested next action\n"
                "7. Confidence / boundary\n"
                f"{role_note}{gap_block}\n\n"
                f"--- SOURCE MATERIAL ---\n{source_text}"
            )
        if action_id in ACADEMY_NVQ_ACTION_IDS:
            return orb_academy_nvq_anchor_service.action_user_prompt(action_id, source_text=source_text)
        if action_id == "convert_to_recording_wording":
            concise_note = ""
            if is_short_residential_scenario(source_text) or is_residential_incident_scenario(source_text):
                concise_note = (
                    "Keep output short and recording-ready. Use bracketed placeholders for missing facts.\n"
                    "Do not state dysregulation or motivation as fact. Use appeared / was described as where needed.\n"
                )
            return (
                "Convert the source into professional residential recording wording.\n"
                "Rules: factual, objective, child-centred, non-punitive, no diagnosis, "
                "no invented facts, preserve uncertainty, include child voice if provided, "
                "flag missing child voice if absent, and list what still needs recording.\n"
                "Treat adult shorthand (e.g. kicked off, played up) as wording to clarify — not as final record language.\n"
                "Do not use weak generic phrases such as 'challenging moment', 'therapeutic interventions', "
                "'It is essential…', or 'subsequent escalation'.\n"
                f"{concise_note}\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "create_manager_oversight_note":
            concise = (
                "Keep this concise — short manager lens only, with placeholders for missing detail.\n"
                if is_short_residential_scenario(source_text)
                else ""
            )
            return (
                f"{concise}"
                "Draft a manager oversight note with sections: Record reviewed; Key concern; "
                "Safeguarding/risk consideration; Child voice; Actions required; Plans/documents to review; "
                "Staff learning; Rationale; Follow-up.\n"
                "Rules: use placeholders for any section not supported by the source; do not invent manager "
                "actions, notifications, decisions, dates, names, outcomes or follow-up plans.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "create_chronology_suggestion":
            return (
                "Suggest a chronology entry (NOT inserted anywhere) with: short title; date placeholder if unknown; "
                "factual summary; significance; risk/safeguarding relevance; action/follow-up; source basis.\n"
                "State clearly this is a draft suggestion only.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "add_safeguarding_lens":
            concise = (
                "Keep this concise — practical risk lens for a busy shift, not a generic safeguarding essay.\n"
                if is_short_residential_scenario(source_text)
                else ""
            )
            return (
                f"{concise}"
                "Apply a safeguarding lens covering: immediate safety; facts; concerns; gaps; escalation; "
                "manager/DSL/LADO/police/medical considerations; recording requirements; professional boundary.\n"
                "Do not invent facts or outcomes. Use placeholders where detail is missing.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "add_ofsted_lens":
            return (
                "Apply an Ofsted/SCCIF lens covering: child experience; safety; progress; leadership impact; "
                "evidence sufficiency; manager grip; Reg 44/45 relevance where applicable; quality standards.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "create_checklist":
            return (
                "Create a practical numbered checklist for staff follow-up from the source. "
                "Each item should be actionable on shift.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "make_more_concise":
            return (
                "Make the source more concise for a busy residential shift.\n"
                "Rules: produce a SHORTER version — not another long essay; preserve meaning; remove waffle "
                "and generic headings; keep safeguarding/risk points; do not invent facts; do not remove "
                "concerns or hide poor practice; preserve uncertainty and placeholders where facts are missing.\n"
                "For residential recording support, keep: safety line, shorthand warning if present, "
                "What is known, What to clarify, Recording wording scaffold.\n"
                "Avoid: 'It is essential…', 'therapeutic interventions', 'challenging moment'.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "make_more_detailed":
            return (
                "Expand the source with clearer structure, checks, next steps, and evidence prompts.\n"
                "Rules: do not invent facts, names, dates, or outcomes; add structure only from "
                "what is known or explicitly flagged as missing; preserve safeguarding concerns.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "therapeutic_reframe":
            return (
                "Provide a trauma-informed therapeutic reframe of the source material.\n"
                "Use PACE/attachment-aware language; treat behaviour as communication; avoid "
                "diagnosis; avoid blame and punitive language; suggest repair/restorative follow-up "
                "where appropriate; do not invent facts or minimise risk.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "supervision_prompt":
            return (
                "Create supervision and reflection prompts from the source scenario.\n"
                "Include sections for: what went well; concerns; staff support; learning; risk; "
                "child voice; next practice step. Do not invent facts.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "shift_handover_summary":
            return (
                "Turn the source into a practical shift handover for residential children's homes.\n"
                "Include: priority risks; key observations; actions for next shift; manager attention; "
                "recording reminders; safeguarding considerations; what may still be missing.\n"
                "Do not invent facts or imply live records were checked.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "build_shift_plan":
            return (
                "Build a standalone shift plan from the provided material only (no live OS records).\n"
                "Structure with markdown headings:\n"
                "1. Shift priorities\n"
                "2. Known risks (from provided info only)\n"
                "3. Recording reminders\n"
                "4. Manager attention points\n"
                "5. Safeguarding prompts\n"
                "6. Child voice prompts\n"
                "7. Handover summary\n"
                "8. End-of-shift reflection\n"
                "9. What am I missing?\n"
                "10. Outstanding actions\n"
                "11. Evidence / Ofsted relevance (where appropriate)\n"
                "State clearly this is based only on supplied notes — not live IndiCare OS records.\n"
                "Do not invent facts.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "add_child_voice_prompt":
            gaps = analyse_what_missing_gaps(source_text)
            child_voice_gap = any(g.id == "missing_child_voice" for g in gaps)
            gap_note = ""
            if child_voice_gap:
                gap_note = (
                    "\n\nHeuristic: child voice may be absent in the source — address this explicitly."
                )
            return (
                "Review the source for child voice and perspective.\n"
                "Identify where child voice is missing; suggest safe ways to capture child voice; "
                "if child voice was provided, suggest clearer wording for recording.\n"
                "Never invent the child's views, quotes, or feelings.\n"
                f"{gap_note}\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        return f"Perform action {action_id} on:\n\n{source_text}"

    def _parse_sections_from_answer(self, answer: str) -> list[dict[str, str]]:
        sections: list[dict[str, str]] = []
        current_heading = ""
        current_lines: list[str] = []
        for line in answer.splitlines():
            if re.match(r"^#{1,3}\s+", line) or re.match(r"^\d+\.\s+", line):
                if current_heading or current_lines:
                    sections.append(
                        {
                            "heading": current_heading or "Section",
                            "body": "\n".join(current_lines).strip(),
                        }
                    )
                current_heading = re.sub(r"^#{1,3}\s+|\d+\.\s+", "", line).strip()
                current_lines = []
            else:
                current_lines.append(line)
        if current_heading or current_lines:
            sections.append(
                {
                    "heading": current_heading or "Summary",
                    "body": "\n".join(current_lines).strip(),
                }
            )
        return [s for s in sections if s.get("body")]

    def _parse_checklist(self, answer: str) -> list[str]:
        items: list[str] = []
        for line in answer.splitlines():
            m = re.match(r"^[\s]*[-*•]\s+(.+)$", line) or re.match(r"^[\s]*\d+[.)]\s+(.+)$", line)
            if m:
                items.append(m.group(1).strip())
        return items[:20]

    def _build_structured_payload(
        self,
        action_id: str,
        *,
        answer: str,
        definition: OrbActionDefinition,
        gaps: list[WhatMissingGap] | None = None,
        prompt_tier: str,
        indicare_intelligence: dict[str, Any] | None = None,
        intelligence_meta: dict[str, Any] | None = None,
        brain_convergence: dict[str, Any] | None = None,
        public_explainability: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        sections = self._parse_sections_from_answer(answer)
        if action_id == "what_am_i_missing" and gaps and not sections:
            sections = [g.to_section() for g in gaps]
        checklist = self._parse_checklist(answer)
        if action_id == "create_checklist" and not checklist:
            checklist = [line.strip("- ").strip() for line in answer.splitlines() if line.strip().startswith("-")]

        confidence = "medium"
        if not _text(answer) or len(answer) < 80:
            confidence = "low"
        if prompt_tier == "deep":
            confidence = "medium"

        suggested: list[dict[str, str]] = []
        if action_id == "what_am_i_missing":
            suggested.append({"action": "convert_to_recording_wording", "label": "Convert to recording wording"})
            suggested.append({"action": "create_manager_oversight_note", "label": "Manager oversight note"})
        elif action_id == "convert_to_recording_wording":
            suggested.append({"action": "what_am_i_missing", "label": "What am I missing?"})
        elif action_id == "add_safeguarding_lens":
            suggested.append({"action": "create_manager_oversight_note", "label": "Manager oversight note"})
        elif action_id in {"shift_handover_summary", "build_shift_plan"}:
            suggested.append({"action": "what_am_i_missing", "label": "What am I missing?"})
            suggested.append({"action": "create_checklist", "label": "Checklist"})
        elif action_id == "add_child_voice_prompt":
            suggested.append({"action": "convert_to_recording_wording", "label": "Convert to recording wording"})
        elif action_id == "supervision_prompt":
            suggested.append({"action": "therapeutic_reframe", "label": "Therapeutic reframe"})
        elif action_id in ACADEMY_NVQ_ACTION_IDS:
            suggested.append({"action": "identify_learning_evidence_gaps", "label": "Evidence gaps"})
            suggested.append({"action": "create_reflective_account_plan", "label": "Reflective account plan"})
        elif action_id == "incident_to_reflective_learning":
            suggested.append({"action": "map_to_nvq_evidence", "label": "Map to NVQ evidence"})
        elif action_id == "make_more_concise":
            suggested.append({"action": "make_more_detailed", "label": "More detailed"})
        elif action_id == "make_more_detailed":
            suggested.append({"action": "make_more_concise", "label": "More concise"})

        title = definition.label
        sources = build_standalone_sources(answer, mode=definition.prompt_mode)

        payload: dict[str, Any] = {
            "action": action_id,
            "title": title,
            "answer": answer,
            "sections": sections,
            "checklist": checklist,
            "confidence": confidence,
            "sources": sources,
            "standalone": True,
            "os_records_accessed": False,
            "suggested_next_actions": suggested,
            "action_engine": {
                "prompt_tier": prompt_tier,
                "depth_tier": (brain_convergence or {}).get("depth_tier"),
                "safety_level": definition.safety_level,
                "backend_supported": definition.backend_supported,
                "heuristic_gaps": [g.id for g in (gaps or [])],
            },
        }
        if brain_convergence:
            payload["brain_convergence"] = brain_convergence
        if public_explainability:
            payload["explainability"] = public_explainability
        if indicare_intelligence:
            summary = intelligence_context_summary(indicare_intelligence)
            payload["indicare_intelligence_core"] = summary
            payload["context_used"] = {
                "indicare_intelligence": summary,
                "indicare_intelligence_core": summary,
                **(intelligence_meta or {}),
            }
        return attach_to_payload(
            payload,
            surface="orb_standalone",
            mode=definition.prompt_mode,
            lens=action_id,
            feature="action_engine",
            sources=sources,
        )

    async def _llm_complete(
        self,
        *,
        user_prompt: str,
        system_prompt: str,
        mode: str,
        retrieval: dict[str, Any],
        prompt_tier: str,
        history: list[dict[str, Any]] | None = None,
    ) -> str:
        detail = "detailed" if prompt_tier in {"deep", "residential"} else "concise"
        response, _decision, _trace = await ai_model_router_service.complete_with_routing(
            message=user_prompt,
            system_prompt=system_prompt,
            history=history or [],
            images=[],
            mode=mode,
            retrieval_context=retrieval,
            detail_level=detail,
            research_intent=False,
            voice_mode=False,
        )
        text = _text(getattr(response, "text", None) or response)
        if not text:
            return (
                f"{STANDALONE_BOUNDARY_PREFIX}\n\n"
                "ORB could not complete this action right now. "
                "Try again or use the composer fallback."
            )
        if STANDALONE_BOUNDARY_PREFIX.split("—")[0].strip() not in text:
            text = f"{STANDALONE_BOUNDARY_PREFIX}\n\n{text}"
        return text

    async def run_action(
        self,
        *,
        action: str,
        source_message: str | None = None,
        source_answer: str | None = None,
        mode: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        action_id = self.resolve_backend_action_id(action)
        definition = self.get_action(action_id)
        if not definition:
            raise ValueError(f"Unknown ORB action: {action}")
        if not definition.backend_supported:
            raise ValueError(f"Action not backend-supported yet: {action_id}")

        profile_role: str | None = None
        if context:
            profile_role = _text(context.get("profile_role")) or None

        mode_name = orb_standalone_brain_service.normalise_mode(mode or "Ask ORB")
        if action_id in ACADEMY_NVQ_ACTION_IDS:
            mode_name = "Staff Coach"
        if action_id == "add_safeguarding_lens":
            mode_name = "Safeguarding Thinking"
        elif action_id == "add_ofsted_lens":
            mode_name = "Ofsted Lens"
        elif action_id == "convert_to_recording_wording":
            mode_name = "Record This Properly"
        elif action_id in {"build_shift_plan", "shift_handover_summary"}:
            mode_name = "Record This Properly"
        elif action_id == "supervision_prompt":
            mode_name = "Staff Coach"

        source_text = self._combine_source(
            source_message=source_message,
            source_answer=source_answer,
            context=context,
        )
        gaps: list[WhatMissingGap] | None = None
        if action_id == "what_am_i_missing":
            gaps = analyse_what_missing_gaps(source_text, profile_role=profile_role)

        brain_convergence = orb_brain_convergence_orchestrator_service.build_brain_decision(
            source_text,
            mode=mode_name,
            requested_action=action_id,
            feature="action_engine",
            source_surface="action_engine",
            route="/orb/standalone/actions/run",
        )
        depth_tier = brain_convergence.depth_tier
        prompt_tier = self.resolve_prompt_tier(action_id, source_text=source_text, mode=mode_name)
        if depth_tier == "mandatory":
            prompt_tier = "deep"
        elif depth_tier == "enhanced" and prompt_tier == "fast":
            prompt_tier = "residential"
        retrieval = orb_knowledge_retrieval_service.prepare_request_bundle(
            source_text,
            mode=mode_name,
        )
        max_modules = {"fast": 0, "residential": 4, "deep": 8}.get(prompt_tier, 4)
        operating_block = ""
        if prompt_tier == "deep":
            operating_block = orb_operating_brain_service.build_prompt_block(source_text, mode=mode_name)
        elif max_modules:
            operating_block = orb_operating_brain_service.build_prompt_block(source_text, mode=mode_name)
        convergence_block = orb_brain_convergence_orchestrator_service.build_convergence_prompt_block(
            brain_convergence
        )

        system = self._build_action_system_prompt(
            definition=definition,
            grounding_context=retrieval.get("grounding_context") or "",
            operating_block=operating_block,
            mode=mode_name,
            prompt_tier=prompt_tier,
            profile_role=profile_role,
            source_text=source_text,
            convergence_block=convergence_block,
        )
        user_prompt = self._action_user_prompt(
            action_id,
            source_text=source_text,
            gaps=gaps,
            profile_role=profile_role,
        )

        llm_history: list[dict[str, Any]] = []
        if context and action_id in ACADEMY_NVQ_ACTION_IDS:
            raw_history = context.get("chat_history") or context.get("conversation_history")
            if raw_history:
                llm_history = list(raw_history)[-12:]

        answer = await self._llm_complete(
            user_prompt=user_prompt,
            system_prompt=system,
            mode=mode_name,
            retrieval=retrieval,
            prompt_tier=prompt_tier,
            history=llm_history,
        )

        if action_id in ACADEMY_NVQ_ACTION_IDS:
            answer = orb_academy_nvq_anchor_service.sanitize_nvq_answer(
                answer,
                message=source_text,
            )

        indicare_intelligence = retrieval.get("indicare_intelligence") or {}
        intelligence_meta: dict[str, Any] = {}
        if indicare_intelligence and (
            is_care_related_action(action_id) or indicare_intelligence.get("expert_depth") != "general_light"
        ):
            answer, intelligence_meta = finalize_standalone_intelligence(
                indicare_intelligence=indicare_intelligence,
                answer=answer,
                prompt_text=source_text,
                message=source_text,
                mode=mode_name,
                record_learning=True,
                apply_gate_fixes=True,
            )

        convergence_meta = orb_brain_convergence_orchestrator_service.convergence_metadata(
            brain_convergence,
            route="/orb/standalone/actions/run",
        )
        public_explainability = build_public_explainability(
            {
                "standalone_only_reasoning": True,
                "public_considerations": brain_convergence.public_considerations,
            },
            mode=mode_name,
        )

        return self._build_structured_payload(
            action_id,
            answer=answer,
            definition=definition,
            gaps=gaps,
            prompt_tier=prompt_tier,
            indicare_intelligence=indicare_intelligence if indicare_intelligence else None,
            intelligence_meta=intelligence_meta or None,
            brain_convergence=convergence_meta,
            public_explainability=public_explainability,
        )


orb_action_engine_service = OrbActionEngineService()
