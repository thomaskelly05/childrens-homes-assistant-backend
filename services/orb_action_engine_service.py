"""Standalone ORB residential action engine — structured follow-ups without OS records."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from typing import Any

from services.ai_model_router_service import ai_model_router_service
from services.orb_data_vault_registry_service import orb_data_vault_registry_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_operating_brain_service import orb_operating_brain_service
from services.orb_standalone_brain_service import orb_standalone_brain_service
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
    }
)

DEEP_MODE_ACTIONS = frozenset(
    {
        "add_safeguarding_lens",
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

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _clip(text: str, limit: int = 6000) -> str:
    text = _text(text)
    if len(text) <= limit:
        return text
    return f"{text[:limit].rstrip()}..."


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
        backend_supported=False,
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
        backend_supported=False,
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
        backend_supported=False,
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
        backend_supported=False,
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
        backend_supported=False,
        frontend_fallback_safe=True,
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
    "shift_builder": "shift_handover_summary",
}


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


def analyse_what_missing_gaps(source_text: str) -> list[WhatMissingGap]:
    """Heuristic gap detection for What Am I Missing (standalone, no OS access)."""
    text = _text(source_text)
    lower = text.lower()
    gaps: list[WhatMissingGap] = []

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
        return tier

    def _combine_source(
        self,
        *,
        source_message: str | None,
        source_answer: str | None,
    ) -> str:
        parts = [_clip(source_message or ""), _clip(source_answer or "")]
        combined = "\n\n".join(p for p in parts if p)
        return combined or "(No source text provided.)"

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
    ) -> str:
        parts = [
            "You are ORB Care Companion running a structured residential children's homes action.",
            f"Action: {definition.label} ({definition.id})",
            f"Purpose: {definition.residential_purpose}",
            STANDALONE_BOUNDARY_PREFIX,
            "Never invent names, dates, chronology entries, notifications, or OS record lookups.",
            "Never claim you accessed IndiCare OS, chronology, or child records.",
            f"User mode context: {mode}",
        ]
        if prompt_tier == "deep":
            parts.append(
                "Use deep safeguarding-aware reasoning: facts vs concerns, gaps, escalation, "
                "recording requirements, and professional boundaries."
            )
        if self._vault_block(definition):
            parts.append(self._vault_block(definition))
        if operating_block:
            parts.append(operating_block)
        if grounding_context:
            parts.append(grounding_context)
        return "\n\n".join(parts)

    def _action_user_prompt(
        self,
        action_id: str,
        *,
        source_text: str,
        gaps: list[WhatMissingGap] | None = None,
    ) -> str:
        if action_id == "what_am_i_missing":
            gap_block = ""
            if gaps:
                gap_block = "\n\nHeuristic gaps already detected (incorporate and do not duplicate blindly):\n"
                gap_block += "\n".join(f"- {g.title}: {g.why_it_matters}" for g in gaps)
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
                f"{gap_block}\n\n"
                f"--- SOURCE MATERIAL ---\n{source_text}"
            )
        if action_id == "convert_to_recording_wording":
            return (
                "Convert the source into professional residential recording wording.\n"
                "Rules: factual, objective, child-centred, non-punitive, no diagnosis, "
                "no invented facts, preserve uncertainty, include child voice if provided, "
                "flag missing child voice if absent, and list what still needs recording.\n\n"
                f"--- SOURCE ---\n{source_text}"
            )
        if action_id == "create_manager_oversight_note":
            return (
                "Draft a manager oversight note with sections: Record reviewed; Key concern; "
                "Safeguarding/risk consideration; Child voice; Actions required; Plans/documents to review; "
                "Staff learning; Rationale; Follow-up (only if provided in source — do not invent dates/names).\n\n"
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
            return (
                "Apply a safeguarding lens covering: immediate safety; facts; concerns; gaps; escalation; "
                "manager/DSL/LADO/police/medical considerations; recording requirements; professional boundary.\n\n"
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

        title = definition.label
        sources = build_standalone_sources(answer, mode=definition.prompt_mode)

        return {
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
                "safety_level": definition.safety_level,
                "backend_supported": definition.backend_supported,
                "heuristic_gaps": [g.id for g in (gaps or [])],
            },
        }

    async def _llm_complete(
        self,
        *,
        user_prompt: str,
        system_prompt: str,
        mode: str,
        retrieval: dict[str, Any],
        prompt_tier: str,
    ) -> str:
        detail = "detailed" if prompt_tier in {"deep", "residential"} else "concise"
        response, _decision, _trace = await ai_model_router_service.complete_with_routing(
            message=user_prompt,
            system_prompt=system_prompt,
            history=[],
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

        mode_name = orb_standalone_brain_service.normalise_mode(mode or "Ask ORB")
        if action_id == "add_safeguarding_lens":
            mode_name = "Safeguarding Thinking"
        elif action_id == "add_ofsted_lens":
            mode_name = "Ofsted Lens"
        elif action_id == "convert_to_recording_wording":
            mode_name = "Record This Properly"

        source_text = self._combine_source(
            source_message=source_message,
            source_answer=source_answer,
        )
        gaps: list[WhatMissingGap] | None = None
        if action_id == "what_am_i_missing":
            gaps = analyse_what_missing_gaps(source_text)

        prompt_tier = self.resolve_prompt_tier(action_id, source_text=source_text, mode=mode_name)
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

        system = self._build_action_system_prompt(
            definition=definition,
            grounding_context=retrieval.get("grounding_context") or "",
            operating_block=operating_block,
            mode=mode_name,
            prompt_tier=prompt_tier,
        )
        user_prompt = self._action_user_prompt(action_id, source_text=source_text, gaps=gaps)

        answer = await self._llm_complete(
            user_prompt=user_prompt,
            system_prompt=system,
            mode=mode_name,
            retrieval=retrieval,
            prompt_tier=prompt_tier,
        )

        return self._build_structured_payload(
            action_id,
            answer=answer,
            definition=definition,
            gaps=gaps,
            prompt_tier=prompt_tier,
        )


orb_action_engine_service = OrbActionEngineService()
