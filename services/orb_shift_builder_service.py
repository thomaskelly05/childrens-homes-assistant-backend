from __future__ import annotations

"""ORB Residential Shift Builder.

Commercial objective:

This is intended to become the primary paid daily workflow for ORB Residential.

The Shift Builder helps residential staff turn rough notes into:
- structured daily recording
- handovers
- safeguarding reflections
- chronology prompts
- manager review prompts
- therapeutic reflections
- evidence gap checks

Important:
- standalone ORB never accesses live records
- all reasoning must come from user supplied notes only
"""

import re
from typing import Any

from schemas.orb_shift_builder import (
    OrbShiftBuilderFocus,
    OrbShiftBuilderGenerateRequest,
    OrbShiftBuilderGenerateResponse,
    OrbShiftBuilderOutputSection,
    OrbShiftBuilderRequest,
    OrbShiftBuilderResponse,
    OrbShiftBuilderSection,
)
from services.orb_brain_metadata_service import attach_to_payload, build_brain_metadata
from services.orb_residential_intelligence_service import orb_residential_intelligence_service

_OS_FORBIDDEN_KEYS = frozenset(
    {
        "child_id",
        "young_person_id",
        "staff_id",
        "home_id",
        "record_id",
        "chronology_id",
    }
)

SHIFT_BUILDER_BOUNDARY_GUARDRAILS = [
    "Based only on the shift notes you provide.",
    "Review before handing over or saving.",
    "Standalone ORB does not access live care records.",
]

FOCUS_MODES: list[dict[str, str]] = [
    {
        "id": "full_shift_plan",
        "label": "Full shift plan",
        "description": "Priorities, risks, handover, reflection and gaps.",
    },
    {
        "id": "handover_only",
        "label": "Handover only",
        "description": "Concise handover for the next shift.",
    },
    {
        "id": "manager_review",
        "label": "Manager review",
        "description": "Oversight, evidence and manager attention.",
    },
    {
        "id": "safeguarding_review",
        "label": "Safeguarding review",
        "description": "Facts, concerns and escalation prompts.",
    },
    {
        "id": "recording_quality",
        "label": "Recording quality",
        "description": "Child-centred recording reminders.",
    },
    {
        "id": "end_of_shift_reflection",
        "label": "End-of-shift reflection",
        "description": "Reflective close and learning points.",
    },
    {
        "id": "what_am_i_missing",
        "label": "What am I missing?",
        "description": "Evidence gaps before you sign off.",
    },
]

CONTEXT_TAG_OPTIONS: list[dict[str, str]] = [
    {"id": "evening_shift", "label": "Evening shift"},
    {"id": "night_shift", "label": "Night shift"},
    {"id": "wake_up", "label": "Wake-up / morning"},
    {"id": "education", "label": "Education / school"},
    {"id": "contact", "label": "Family contact"},
    {"id": "community", "label": "Community / off-site"},
    {"id": "health", "label": "Health / medication"},
    {"id": "behaviour", "label": "Behaviour / crisis"},
    {"id": "safeguarding", "label": "Safeguarding concern"},
    {"id": "new_placement", "label": "New placement / admission"},
]

CANONICAL_SECTIONS: list[tuple[str, str, tuple[str, ...]]] = [
    ("shift_summary", "Shift summary", ("shift summary", "overview", "summary")),
    (
        "immediate_priorities",
        "Immediate priorities",
        ("shift priorities", "immediate priorities", "priorities"),
    ),
    (
        "known_risks",
        "Known risks from supplied notes",
        ("known risks", "risks", "risk"),
    ),
    (
        "safeguarding_considerations",
        "Safeguarding considerations",
        ("safeguarding", "safeguarding prompts", "safeguarding considerations"),
    ),
    (
        "recording_reminders",
        "Recording reminders",
        ("recording reminders", "recording", "record this"),
    ),
    (
        "child_voice_prompts",
        "Child voice prompts",
        ("child voice", "child voice prompts", "child perspective"),
    ),
    (
        "manager_attention",
        "Manager attention points",
        ("manager attention", "manager review", "manager oversight"),
    ),
    (
        "outstanding_actions",
        "Outstanding actions",
        ("outstanding actions", "actions", "follow-up"),
    ),
    (
        "handover_summary",
        "Handover summary",
        ("handover summary", "handover"),
    ),
    (
        "end_of_shift_reflection",
        "End-of-shift reflection",
        ("end-of-shift reflection", "reflection", "therapeutic"),
    ),
    (
        "what_am_i_missing",
        "What am I missing?",
        ("what am i missing", "missing", "gaps", "evidence gap"),
    ),
    (
        "ofsted_evidence",
        "Ofsted/evidence relevance",
        ("ofsted", "evidence", "inspection", "quality standards"),
    ),
]

FOCUS_SECTION_IDS: dict[str, frozenset[str]] = {
    "full_shift_plan": frozenset(s[0] for s in CANONICAL_SECTIONS),
    "handover_only": frozenset(
        {
            "shift_summary",
            "immediate_priorities",
            "known_risks",
            "handover_summary",
            "outstanding_actions",
            "safeguarding_considerations",
        }
    ),
    "manager_review": frozenset(
        {
            "shift_summary",
            "manager_attention",
            "safeguarding_considerations",
            "outstanding_actions",
            "ofsted_evidence",
            "known_risks",
        }
    ),
    "safeguarding_review": frozenset(
        {
            "safeguarding_considerations",
            "known_risks",
            "child_voice_prompts",
            "what_am_i_missing",
            "manager_attention",
        }
    ),
    "recording_quality": frozenset(
        {
            "recording_reminders",
            "child_voice_prompts",
            "shift_summary",
            "what_am_i_missing",
        }
    ),
    "end_of_shift_reflection": frozenset(
        {
            "end_of_shift_reflection",
            "shift_summary",
            "child_voice_prompts",
            "what_am_i_missing",
        }
    ),
    "what_am_i_missing": frozenset({"what_am_i_missing", "recording_reminders", "known_risks"}),
}

FOCUS_ACTION_HINTS: dict[str, str] = {
    "full_shift_plan": "Produce the full shift plan with all standard sections.",
    "handover_only": "Focus on a safe, concise handover for the incoming shift. Omit lengthy reflection.",
    "manager_review": "Emphasise manager oversight, evidence gaps and governance — not operational OS data.",
    "safeguarding_review": "Emphasise safeguarding facts, concerns, gaps and escalation prompts only from supplied notes.",
    "recording_quality": "Emphasise child-centred recording quality, child voice and factual wording.",
    "end_of_shift_reflection": "Emphasise reflective close, learning and staff support — no invented events.",
    "what_am_i_missing": "Focus on evidence gaps, missing facts and what to confirm before handover.",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _reject_os_identifiers(payload: dict[str, Any]) -> None:
    scopes = [payload, payload.get("metadata") or {}, payload.get("context") or {}]
    for scope in scopes:
        if not isinstance(scope, dict):
            continue
        for key in _OS_FORBIDDEN_KEYS:
            if scope.get(key) is not None:
                raise ValueError(f"Shift Builder must not include {key}.")


class OrbShiftBuilderService:
    def list_focus_modes(self) -> list[dict[str, str]]:
        return list(FOCUS_MODES)

    def list_context_tags(self) -> list[dict[str, str]]:
        return list(CONTEXT_TAG_OPTIONS)

    def build(self, payload: OrbShiftBuilderRequest) -> OrbShiftBuilderResponse:
        notes = str(payload.notes or "").strip()

        draft = orb_residential_intelligence_service.build_shift_builder_draft(notes)

        context_packet = orb_residential_intelligence_service.build_context_packet(
            notes,
            mode="Record This Properly",
            surface="standalone",
            supplied_context_types=["shift_notes"],
        ).to_dict()

        sections: list[OrbShiftBuilderSection] = []

        def add_section(title: str, purpose: str, prompt: str, output_type: str, caution: str | None = None):
            sections.append(
                OrbShiftBuilderSection(
                    title=title,
                    purpose=purpose,
                    prompt=prompt,
                    output_type=output_type,
                    caution=caution,
                )
            )

        if payload.mode in {"full_shift_pack", "daily_note"}:
            add_section(
                title="Daily Note Builder",
                purpose="Create a factual, child-centred daily note.",
                prompt=draft.daily_note_prompt,
                output_type="daily_note",
            )

        if payload.mode in {"full_shift_pack", "handover"}:
            add_section(
                title="Handover Builder",
                purpose="Create a concise and safe handover for the next shift.",
                prompt=draft.handover_prompt,
                output_type="handover",
            )

        if payload.mode in {"full_shift_pack", "incident_review"}:
            add_section(
                title="Incident & Recording Flags",
                purpose="Identify whether further recording or escalation may be needed.",
                prompt=draft.incident_flags_prompt,
                output_type="incident_review",
                caution="ORB does not decide safeguarding thresholds or organisational policy requirements.",
            )

        if payload.mode in {"full_shift_pack", "safeguarding_review"}:
            add_section(
                title="Safeguarding Thinking",
                purpose="Separate facts, concerns, gaps and escalation considerations.",
                prompt=draft.safeguarding_prompt,
                output_type="safeguarding_reflection",
                caution="Escalate through local safeguarding procedures where risk may be present.",
            )

        if payload.include_manager_prompts or payload.mode == "manager_review":
            add_section(
                title="Manager Review Prompts",
                purpose="Highlight oversight, evidence and review considerations.",
                prompt=draft.manager_review_prompt,
                output_type="manager_review",
            )

        if payload.mode in {"full_shift_pack", "therapeutic_reflection"}:
            add_section(
                title="Therapeutic Reflection",
                purpose="Encourage trauma-informed and behaviour-as-communication thinking.",
                prompt=draft.therapeutic_reflection_prompt,
                output_type="therapeutic_reflection",
            )

        if payload.mode in {"full_shift_pack", "missing_information"}:
            add_section(
                title="Missing Information Check",
                purpose="Identify evidence gaps before finalising records.",
                prompt=draft.missing_information_prompt,
                output_type="evidence_gap_review",
            )

        if payload.include_ofsted_lens:
            add_section(
                title="Ofsted & Quality Standards Lens",
                purpose="Reflect on whether the notes demonstrate lived experience, safeguarding and leadership oversight.",
                prompt=(
                    "Using only the supplied notes, review whether the recording demonstrates child-centred care, safeguarding awareness, "
                    "reflection, action ownership and evidence of supportive relationships. Do not predict inspection outcomes."
                ),
                output_type="ofsted_lens",
            )

        return OrbShiftBuilderResponse(
            surface="orb_residential",
            mode=payload.mode,
            sections=sections,
            context_packet=context_packet,
            guardrails=list(SHIFT_BUILDER_BOUNDARY_GUARDRAILS),
            next_step_hint=(
                "Run one section at a time through ORB Residential for structured outputs, or use the full shift pack as a guided workflow."
            ),
        )

    def _combine_user_inputs(self, payload: OrbShiftBuilderGenerateRequest) -> str:
        parts: list[str] = []
        notes = _text(payload.shift_notes)
        if notes:
            parts.append(f"--- SHIFT NOTES ---\n{notes}")
        handover = _text(payload.handover_text)
        if handover:
            parts.append(f"--- PASTED HANDOVER ---\n{handover}")
        chat = _text(payload.chat_output)
        if chat:
            parts.append(f"--- ORB CHAT OUTPUT ---\n{chat}")
        child = _text(payload.child_context)
        if child:
            parts.append(
                "--- USER-PROVIDED CONTEXT (not live records) ---\n"
                f"{child}"
            )
        role = _text(payload.staff_role)
        if role:
            parts.append(f"Staff role (user-provided): {role}")
        tags = [t.strip() for t in payload.context_tags if t and str(t).strip()]
        if tags:
            parts.append("Context tags selected by user: " + ", ".join(tags))
        return "\n\n".join(parts).strip()

    def _resolve_action_for_focus(self, focus: OrbShiftBuilderFocus) -> str:
        if focus == "what_am_i_missing":
            return "what_am_i_missing"
        if focus == "handover_only":
            return "shift_handover_summary"
        return "build_shift_plan"

    def _normalize_sections(self, raw_sections: list[dict[str, Any]], answer: str) -> list[OrbShiftBuilderOutputSection]:
        parsed = list(raw_sections or [])
        if not parsed and answer:
            from services.orb_action_engine_service import orb_action_engine_service

            parsed = orb_action_engine_service._parse_sections_from_answer(answer)

        by_id: dict[str, OrbShiftBuilderOutputSection] = {}
        for section in parsed:
            heading = _text(section.get("heading") or section.get("title"))
            body = _text(section.get("body"))
            if not body:
                continue
            lowered = heading.lower()
            section_id = "general"
            for canonical_id, canonical_heading, aliases in CANONICAL_SECTIONS:
                if any(alias in lowered for alias in aliases):
                    section_id = canonical_id
                    heading = canonical_heading
                    break
            items: list[str] = []
            for line in body.splitlines():
                m = re.match(r"^[\s]*[-*•]\s+(.+)$", line) or re.match(r"^[\s]*\d+[.)]\s+(.+)$", line)
                if m:
                    items.append(m.group(1).strip())
            existing = by_id.get(section_id)
            merged_body = body if not existing else f"{existing.body}\n\n{body}"
            merged_items = list(dict.fromkeys((existing.items if existing else []) + items))
            by_id[section_id] = OrbShiftBuilderOutputSection(
                id=section_id,
                heading=heading or "Section",
                body=merged_body,
                items=merged_items[:20],
            )

        ordered: list[OrbShiftBuilderOutputSection] = []
        for canonical_id, canonical_heading, _aliases in CANONICAL_SECTIONS:
            if canonical_id in by_id:
                ordered.append(by_id[canonical_id])
        for section_id, section in by_id.items():
            if section_id not in {s[0] for s in CANONICAL_SECTIONS}:
                ordered.append(section)
        return ordered

    def _filter_sections_for_focus(
        self, sections: list[OrbShiftBuilderOutputSection], focus: OrbShiftBuilderFocus
    ) -> list[OrbShiftBuilderOutputSection]:
        allowed = FOCUS_SECTION_IDS.get(focus) or FOCUS_SECTION_IDS["full_shift_plan"]
        filtered = [s for s in sections if s.id in allowed]
        return filtered or sections

    def _title_for_focus(self, focus: OrbShiftBuilderFocus) -> str:
        label = next((m["label"] for m in FOCUS_MODES if m["id"] == focus), "Shift Builder")
        return f"Shift Builder — {label}"

    async def generate(self, payload: OrbShiftBuilderGenerateRequest) -> OrbShiftBuilderGenerateResponse:
        from services.orb_action_engine_service import orb_action_engine_service

        _reject_os_identifiers(payload.model_dump())

        source = self._combine_user_inputs(payload)
        if not source:
            raise ValueError("Provide shift notes or pasted context.")

        focus = payload.focus
        action_id = self._resolve_action_for_focus(focus)
        focus_hint = FOCUS_ACTION_HINTS.get(focus, "")
        instruction = (
            f"{focus_hint}\n\n"
            "Use only the supplied material. Do not access or invent IndiCare OS live records.\n"
            "Structure output with clear markdown headings matching the requested shift plan sections."
        ).strip()

        result = await orb_action_engine_service.run_action(
            action=action_id,
            source_answer=source,
            source_message=instruction,
            mode="Record This Properly",
            context={"focus": focus, "profile_role": _text(payload.staff_role) or None},
        )

        answer = _text(result.get("answer"))
        raw_sections = result.get("sections") if isinstance(result.get("sections"), list) else []
        sections = self._normalize_sections(raw_sections, answer)
        sections = self._filter_sections_for_focus(sections, focus)

        checklist = [str(item) for item in (result.get("checklist") or []) if str(item).strip()][:20]
        suggested = [
            {"action": str(item.get("action") or ""), "label": str(item.get("label") or "")}
            for item in (result.get("suggested_next_actions") or [])
            if isinstance(item, dict) and item.get("action")
        ]

        risks: list[str] = []
        for section in sections:
            if section.id in {"known_risks", "what_am_i_missing", "safeguarding_considerations"}:
                if section.items:
                    risks.extend(section.items[:8])
                elif section.body:
                    risks.append(section.body[:400])
        engine_gaps = (result.get("action_engine") or {}).get("heuristic_gaps") or []
        for gap in engine_gaps:
            label = str(gap).replace("_", " ").strip()
            if label and label not in risks:
                risks.append(label)

        summary_section = next((s for s in sections if s.id == "shift_summary"), None)
        handover_section = next((s for s in sections if s.id == "handover_summary"), None)
        summary = (
            _text(summary_section.body if summary_section else "")
            or _text(handover_section.body if handover_section else "")
            or answer[:600]
        )

        title = self._title_for_focus(focus)
        data = OrbShiftBuilderGenerateResponse(
            title=title,
            focus=focus,
            summary=summary,
            sections=sections,
            checklist=checklist,
            actions=[],
            risks_or_gaps=risks[:15],
            suggested_next_actions=suggested,
            answer=answer,
            guardrails=list(SHIFT_BUILDER_BOUNDARY_GUARDRAILS),
        )

        envelope = attach_to_payload(
            data.model_dump(),
            surface="orb_residential",
            mode="Record This Properly",
            feature="shift_builder",
            extra={"focus": focus},
        )
        brain = envelope.get("brain_metadata") or build_brain_metadata(
            surface="orb_residential",
            mode="Record This Properly",
            feature="shift_builder",
            extra={"focus": focus},
        )
        brain["focus"] = focus
        envelope["brain_metadata"] = brain
        return OrbShiftBuilderGenerateResponse.model_validate(envelope)


orb_shift_builder_service = OrbShiftBuilderService()
