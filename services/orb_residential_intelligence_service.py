from __future__ import annotations

"""Shared ORB Residential intelligence service.

This is the convergence bridge between standalone /orb and the deeper
assistant/ intelligence stack.

Design rule:
- One brain: IndiCare residential intelligence, response contracts, knowledge and quality checks.
- Two surfaces: standalone ORB Residential and operational IndiCare OS ORB.
- Different context adapters enforce record boundaries.

Standalone ORB Residential must never imply live OS record access. It may only
reason from user-supplied notes, uploaded documents, voice transcripts, local
profile preferences and built-in knowledge.
"""

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

from assistant.answer_quality import check_answer_quality
from assistant.knowledge_loader import (
    build_knowledge_source_summary,
    select_relevant_python_knowledge,
)
from assistant.modes import detect_mode, get_mode_metadata
from assistant.response_contracts import (
    build_contract_prompt_block,
    contract_to_ui_schema,
    get_required_sections,
    normalise_contract_mode,
)
from services.orb_recording_contract_service import (
    build_incident_report_prompt_block,
    is_incident_report_draft_request,
)
from services.orb_therapeutic_language_contract_service import (
    build_residential_scenario_prompt_block,
    is_residential_incident_scenario,
)
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.recording_intelligence_service import recording_intelligence_service
from services.safeguarding_intelligence_service import safeguarding_intelligence_service
from services.therapeutic_intelligence_service import therapeutic_intelligence_service

OrbSurface = Literal["standalone", "operational"]


STANDALONE_CONTEXT_ADAPTER_RULES = [
    "Use only user-supplied context, uploaded documents, voice transcripts, profile preferences and built-in knowledge.",
    "Do not access or imply access to live child records, live chronology, staff records, provider dashboards, actions or OS evidence.",
    "If record-level conclusions are requested, ask the user to paste/upload the relevant information or use IndiCare OS ORB.",
    "State evidence limitations clearly where the user has not supplied enough detail.",
]

OPERATIONAL_CONTEXT_ADAPTER_RULES = [
    "Use permissioned IndiCare OS context only when explicitly supplied by the operational context builder.",
    "Cite visible evidence references where record evidence is used.",
    "Do not infer beyond supplied records, chronology, actions or dashboard evidence.",
    "Keep final decisions human-led and manager-owned.",
]


@dataclass(frozen=True)
class OrbResidentialContextPacket:
    surface: OrbSurface
    message: str
    requested_mode: str | None
    detected_mode: str
    contract_mode: str
    mode_metadata: dict[str, Any]
    standalone_brain_frame: dict[str, Any]
    selected_knowledge_modules: list[dict[str, str]]
    required_sections: list[str]
    contract_ui_schema: dict[str, Any]
    guardrails: list[str] = field(default_factory=list)
    supplied_context_types: list[str] = field(default_factory=list)
    live_record_access: bool = False
    os_linked: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class OrbShiftBuilderDraft:
    daily_note_prompt: str
    handover_prompt: str
    incident_flags_prompt: str
    safeguarding_prompt: str
    manager_review_prompt: str
    therapeutic_reflection_prompt: str
    missing_information_prompt: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


class OrbResidentialIntelligenceService:
    """Converged intelligence façade for ORB Residential and OS ORB.

    This service does not call the LLM directly. It builds the brain/context
    packet and post-processes answers through the shared quality system.
    """

    def build_context_packet(
        self,
        message: str,
        *,
        mode: str | None = None,
        surface: OrbSurface = "standalone",
        supplied_context_types: list[str] | None = None,
    ) -> OrbResidentialContextPacket:
        text = str(message or "").strip()
        detected_mode = detect_mode(text)
        requested_mode = str(mode).strip() if mode else None
        contract_mode = normalise_contract_mode(requested_mode or detected_mode)
        if is_residential_incident_scenario(text):
            contract_mode = "incident"
            if detected_mode == "guidance":
                detected_mode = "incident"
        brain_frame = orb_standalone_brain_service.context_payload(text, mode=requested_mode or detected_mode)
        knowledge_modules = select_relevant_python_knowledge(text, max_modules=6)
        guardrails = self._guardrails_for_surface(surface)

        return OrbResidentialContextPacket(
            surface=surface,
            message=text,
            requested_mode=requested_mode,
            detected_mode=detected_mode,
            contract_mode=contract_mode,
            mode_metadata=get_mode_metadata(detected_mode),
            standalone_brain_frame=brain_frame,
            selected_knowledge_modules=build_knowledge_source_summary(knowledge_modules),
            required_sections=get_required_sections(contract_mode),
            contract_ui_schema=contract_to_ui_schema(contract_mode),
            guardrails=guardrails,
            supplied_context_types=supplied_context_types or [],
            live_record_access=surface == "operational",
            os_linked=surface == "operational",
        )

    def build_prompt_block(
        self,
        message: str,
        *,
        mode: str | None = None,
        surface: OrbSurface = "standalone",
        supplied_context_types: list[str] | None = None,
    ) -> str:
        packet = self.build_context_packet(
            message,
            mode=mode,
            surface=surface,
            supplied_context_types=supplied_context_types,
        )
        knowledge_modules = select_relevant_python_knowledge(message, max_modules=6)
        contract_block = build_contract_prompt_block(
            packet.contract_mode,
            assistant_surface=surface,
            requires_evidence_grounding=surface == "operational",
        )
        brain_block = orb_standalone_brain_service.build_prompt_block(
            message,
            mode=packet.requested_mode or packet.detected_mode,
        )

        lines = [
            "ORB RESIDENTIAL CONVERGED INTELLIGENCE",
            "",
            f"Surface: {packet.surface}",
            f"Detected assistant mode: {packet.detected_mode}",
            f"Response contract mode: {packet.contract_mode}",
            f"Live record access: {packet.live_record_access}",
            f"OS linked: {packet.os_linked}",
            "",
            "Context adapter guardrails:",
            *[f"- {rule}" for rule in packet.guardrails],
            "",
            brain_block,
            "",
            contract_block,
            "",
            "Selected knowledge modules:",
        ]

        if knowledge_modules:
            for name, content in knowledge_modules.items():
                clipped = str(content or "").strip()
                if len(clipped) > 2200:
                    clipped = clipped[:2200].rstrip() + "\n...[truncated for prompt budget]"
                lines.append(f"\n## {name.replace('_', ' ').title()}\n{clipped}")
        else:
            lines.append("- No specialist knowledge module selected; use general safe practice reasoning.")

        mode_key = (packet.requested_mode or packet.detected_mode or "").lower()
        if surface == "standalone" and any(
            term in mode_key for term in ("safeguarding", "safeguard")
        ):
            lines.extend(["", safeguarding_intelligence_service.build_prompt_block(message)])
        if surface == "standalone" and (
            any(term in mode_key for term in ("record", "recording", "write up", "daily note"))
            or is_residential_incident_scenario(message)
        ):
            lines.extend(["", recording_intelligence_service.build_prompt_block(message)])
        if surface == "standalone" and (
            any(term in mode_key for term in ("therapeutic", "reframe", "behaviour"))
            or is_residential_incident_scenario(message)
        ):
            lines.extend(["", therapeutic_intelligence_service.build_prompt_block(message)])
        if is_incident_report_draft_request(message):
            lines.extend(["", build_incident_report_prompt_block(message)])
        elif is_residential_incident_scenario(message):
            lines.extend(["", build_residential_scenario_prompt_block(message)])

        return "\n".join(lines).strip()

    def process_answer(
        self,
        *,
        answer_text: str,
        message: str,
        mode: str | None = None,
        surface: OrbSurface = "standalone",
        sources: list[dict[str, Any]] | None = None,
        evidence_index: list[dict[str, Any]] | None = None,
        runtime: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        packet = self.build_context_packet(message, mode=mode, surface=surface)
        quality = check_answer_quality(
            answer_text=answer_text,
            mode=packet.detected_mode,
            output_type=packet.contract_mode,
            assistant_surface=surface,
            safeguarding_level=self._safeguarding_level(message, mode=mode),
            requires_evidence_grounding=surface == "operational",
            sources=sources or [],
            evidence_index=evidence_index or [],
            runtime=runtime or {},
        )
        return {
            "answer": answer_text,
            "context_packet": packet.to_dict(),
            "quality": quality,
            "safe_to_show": bool(quality.get("is_usable", True)) and quality.get("severity") != "blocker",
        }

    def build_shift_builder_draft(self, notes: str) -> OrbShiftBuilderDraft:
        """Create structured prompts for the paid Shift Builder workflow.

        This is intentionally prompt-level so it can be used safely by standalone
        ORB without requiring OS records. The user-supplied notes remain the only
        evidence base.
        """
        supplied = str(notes or "").strip()
        base = (
            "Use only the supplied shift notes. Do not invent times, events, risks, actions or outcomes. "
            "Where information is missing, say what needs confirming. Keep wording suitable for a residential children's home."
        )
        return OrbShiftBuilderDraft(
            daily_note_prompt=(
                f"{base}\n\n{recording_intelligence_service.build_prompt_block(supplied)}\n\n"
                "Create a factual, child-centred daily note from these notes:\n"
                f"{supplied}\n\nInclude: what happened, child voice/presentation, staff response, outcome and follow-up."
            ),
            handover_prompt=(
                f"{base}\n\nCreate a shift handover from these notes:\n{supplied}\n\n"
                "Include: summary, current risks, positives, actions for next shift and manager review points."
            ),
            incident_flags_prompt=(
                f"{base}\n\nReview these shift notes for possible incident-recording flags:\n{supplied}\n\n"
                "Do not decide thresholds. Flag possible incident, missing, restraint, injury, allegation, medication, safeguarding or manager review needs."
            ),
            safeguarding_prompt=(
                f"{base}\n\n{safeguarding_intelligence_service.build_prompt_block(supplied)}\n\n"
                "Separate known facts, concerns, missing information and possible escalation routes."
            ),
            manager_review_prompt=(
                f"{base}\n\nCreate manager review prompts from these notes:\n{supplied}\n\n"
                "Focus on oversight, evidence gaps, action ownership, plan review and supervision/learning points."
            ),
            therapeutic_reflection_prompt=(
                f"{base}\n\n{therapeutic_intelligence_service.build_prompt_block(supplied)}\n\n"
                "Create a therapeutic reflection using trauma-informed and behaviour-as-communication thinking."
            ),
            missing_information_prompt=(
                f"{base}\n\nIdentify missing information from these notes before they are relied upon:\n{supplied}\n\n"
                "Focus on facts, child voice, staff response, outcome, risk, actions, people informed and review needs."
            ),
        )

    def _guardrails_for_surface(self, surface: OrbSurface) -> list[str]:
        if surface == "operational":
            return list(OPERATIONAL_CONTEXT_ADAPTER_RULES)
        return list(STANDALONE_CONTEXT_ADAPTER_RULES)

    def _safeguarding_level(self, message: str, *, mode: str | None = None) -> str:
        text = f"{message or ''} {mode or ''}".lower()
        urgent_terms = (
            "immediate danger",
            "right now",
            "emergency",
            "suicidal",
            "self harm now",
            "police",
            "serious injury",
            "disclosure",
            "allegation",
            "lado",
        )
        heightened_terms = (
            "safeguarding",
            "missing",
            "exploitation",
            "injury",
            "bruise",
            "risk",
            "harm",
            "concern",
        )
        if any(term in text for term in urgent_terms):
            return "urgent"
        if any(term in text for term in heightened_terms):
            return "heightened"
        return "normal"


orb_residential_intelligence_service = OrbResidentialIntelligenceService()
