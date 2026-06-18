"""Central ORB prompt registry — surface/mode templates for shared brain policy.

Phase 1 registers Dictate generate prompts. Other surfaces delegate to legacy
builders until migrated.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

from schemas.orb_dictate import OrbDictateGenerateRequest
from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_dictate_speaker import participants_block_for_prompt, segments_to_plain_text
from services.orb_dictate_template_registry import get_dictate_template
from services.orb_recording_contract_service import build_recording_contract_prompt_block
from services.recording_intelligence_service import recording_intelligence_service

OrbPromptSurface = Literal["chat", "dictate", "voice", "write"]
PROMPT_REGISTRY_VERSION = "orb-prompt-registry-v1"


@dataclass(frozen=True)
class OrbPromptTemplateKey:
    surface: OrbPromptSurface
    mode: str
    record_type: str | None = None
    tone: str | None = None
    safeguarding_profile: str = "standard"


@dataclass
class OrbPromptBundle:
    system: str
    user: str
    template_key: OrbPromptTemplateKey
    prompt_version: str = f"{PROMPT_REGISTRY_VERSION}-dictate-generate"
    metadata: dict[str, Any] = field(default_factory=dict)


class OrbPromptRegistry:
    """Registers and resolves ORB prompt templates by surface and mode."""

    def build_dictate_generate_prompt(
        self,
        request: OrbDictateGenerateRequest,
        note_type: str,
    ) -> OrbPromptBundle:
        """Dictate generate prompts — migrated from legacy inline builder."""
        template = get_dictate_template(note_type)  # type: ignore[arg-type]
        transcript_body = (
            segments_to_plain_text(request.segments)
            if request.segments
            else request.input_text
        )
        intel_packet = indicare_intelligence_core_service.build_intelligence_packet(
            transcript_body,
            mode=request.mode or note_type,
        )
        recording_contract_block = build_recording_contract_prompt_block(
            transcript_body,
            note_type=note_type,
        )
        intelligence_block = "\n\n".join(
            part
            for part in (
                intel_packet.get("prompt_block"),
                recording_contract_block,
                recording_intelligence_service.build_prompt_block(transcript_body),
            )
            if part
        )
        speaker_block = participants_block_for_prompt(request.participants, request.segments)
        section_spec = "\n".join(
            f"- {s.title}: " + "; ".join(s.prompts)
            for s in template.sections
        )
        flags = []
        if request.include_child_voice:
            flags.append("Include child voice with direct quotes where known.")
        if request.include_safeguarding:
            flags.append("Include safeguarding considerations where relevant.")
        if request.include_manager_oversight:
            flags.append("Include manager oversight and notifications where relevant.")
        if request.include_ofsted_lens:
            flags.append("Add a short Ofsted/SCCIF evidence lens paragraph.")

        quality_guidance = (
            "Recording quality priorities: factual, observable wording; child-centred language; "
            "child voice with direct quotes where stated; staff response and support; clear outcome; "
            "follow-up actions; safeguarding considerations; manager oversight prompts where relevant; "
            "Ofsted/evidence relevance only when requested — never invent facts or evidence."
        )

        investigation_rules = ""
        if note_type == "investigation_meeting":
            investigation_rules = (
                "\nInvestigation meeting rules: use neutral language; do not state allegations as fact; "
                "do not make findings or conclusions unless explicitly provided in the input; "
                "attribute statements (e.g. 'X stated that…'); flag points requiring clarification."
            )

        system = (
            "You are ORB Dictate for ORB Residential — Powered by IndiCare Intelligence. "
            "Turn rough spoken notes into professional, factual recording wording. "
            "Return JSON only with keys: title, professional_note, summary, actions (array of strings), "
            "structured_actions (optional array of {action, owner, deadline, management_oversight}), "
            "ofsted_lens (string or null). "
            "For structured_actions: use owner/deadline only when explicitly stated in the transcript; "
            "otherwise omit or use 'Not stated'. Do not invent owners or deadlines. "
            "Never invent facts. Use [not stated] or section placeholders where detail is missing. "
            "Do not fabricate quotes, actions, outcomes, emotional states or follow-up plans. "
            "Use non-judgemental, child-centred language. "
            "Do not claim submission to any care system. "
            "When speakers are identified, attribute key points by name/role where useful — do not over-attribute."
            f"{investigation_rules}"
        )
        user = (
            f"Note type: {template.title}\n"
            f"Purpose: {template.purpose}\n"
            f"Audience: {request.audience}\n"
            f"Tone: {request.tone}\n"
            f"Source: {request.source}\n"
            f"Mode: {request.mode or note_type}\n\n"
            f"Required sections:\n{section_spec}\n\n"
            f"Instructions:\n" + "\n".join(f"- {f}" for f in flags) + "\n\n"
            f"{quality_guidance}\n\n"
            f"{speaker_block}\n\n"
            f"{intelligence_block}\n\n"
            f"Rough input / transcript:\n{transcript_body}"
        )
        template_key = OrbPromptTemplateKey(
            surface="dictate",
            mode=request.mode or note_type,
            record_type=note_type,
            tone=request.tone,
            safeguarding_profile="investigation" if note_type == "investigation_meeting" else "standard",
        )
        return OrbPromptBundle(
            system=system,
            user=user,
            template_key=template_key,
            metadata={
                "note_type": note_type,
                "template_title": template.title,
                "legacy_compatible": True,
            },
        )


orb_prompt_registry = OrbPromptRegistry()
