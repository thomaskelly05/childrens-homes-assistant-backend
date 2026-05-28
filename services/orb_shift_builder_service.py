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

from schemas.orb_shift_builder import (
    OrbShiftBuilderRequest,
    OrbShiftBuilderResponse,
    OrbShiftBuilderSection,
)
from services.orb_residential_intelligence_service import orb_residential_intelligence_service


class OrbShiftBuilderService:
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
            mode=payload.mode,
            sections=sections,
            context_packet=context_packet,
            guardrails=[
                "Standalone ORB does not access live IndiCare OS records.",
                "Use only the supplied shift notes.",
                "Escalate safeguarding concerns through local procedures.",
                "Human review is required before finalising organisational records.",
            ],
            next_step_hint=(
                "Run one section at a time through ORB Residential for structured outputs, or use the full shift pack as a guided workflow."
            ),
        )


orb_shift_builder_service = OrbShiftBuilderService()
