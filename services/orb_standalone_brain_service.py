from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class StandaloneBrainFrame:
    mode: str
    active_brains: list[str]
    intent_summary: str
    response_contract: list[str] = field(default_factory=list)
    safety_boundaries: list[str] = field(default_factory=list)
    reflective_questions: list[str] = field(default_factory=list)
    evidence_prompts: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbStandaloneBrainService:
    """Standalone ORB sector brain for residential children's homes.

    This service does not access live IndiCare OS records. It creates a reasoning
    frame for the standalone assistant so answers sound like an experienced
    children's homes practitioner, not a generic chatbot.
    """

    CORE_BOUNDARIES = [
        "Standalone ORB supports reflection and guidance only; it does not make safeguarding threshold decisions.",
        "It must not claim access to live IndiCare OS records, child files, staff files, chronology or dashboards.",
        "Where immediate risk may be present, advise escalation through local safeguarding procedures and relevant emergency routes.",
        "Do not diagnose children, decide abuse occurred, predict Ofsted grades, or replace managers, DSLs, LADO, social workers, police, health professionals or local policy.",
    ]

    MODE_ALIASES = {
        "safeguarding": "Safeguarding Thinking",
        "safeguarding thinking": "Safeguarding Thinking",
        "reflect": "Reflect with ORB",
        "reflect with orb": "Reflect with ORB",
        "ofsted lens": "Ofsted Lens",
        "record this properly": "Record This Properly",
        "behaviour support": "Therapeutic Reframe",
        "behavior support": "Therapeutic Reframe",
        "therapeutic reframe": "Therapeutic Reframe",
        "manager copilot": "Manager Copilot",
        "staff coach": "Staff Coach",
        "policy explainer": "Policy Explainer",
        "scenario simulator": "Scenario Simulator",
        "ask orb": "Ask ORB",
    }

    def normalise_mode(self, mode: str | None) -> str:
        key = str(mode or "Ask ORB").strip().lower()
        return self.MODE_ALIASES.get(key, str(mode or "Ask ORB").strip() or "Ask ORB")

    def frame(self, message: str, *, mode: str | None = None) -> StandaloneBrainFrame:
        text = str(message or "").lower()
        resolved_mode = self.normalise_mode(mode)
        brains = ["standalone_boundary_brain", "residential_children_homes_practice_brain"]

        if self._is_safeguarding(text, resolved_mode):
            brains.extend(["safeguarding_brain", "regulatory_brain", "evidence_gap_brain"])
        if self._is_regulatory(text, resolved_mode):
            brains.extend(["regulatory_brain", "ofsted_brain", "evidence_graph_brain"])
        if self._is_recording(text, resolved_mode):
            brains.extend(["recording_quality_brain", "therapeutic_language_brain", "child_voice_brain"])
        if self._is_therapeutic(text, resolved_mode):
            brains.extend(["therapeutic_brain", "co_regulation_brain", "repair_brain"])
        if self._is_manager(text, resolved_mode):
            brains.extend(["manager_copilot_brain", "leadership_and_management_brain", "evidence_gap_brain"])
        if self._is_staff_support(text, resolved_mode):
            brains.extend(["staff_coach_brain", "reflection_brain", "wellbeing_brain"])
        if self._is_policy(text, resolved_mode):
            brains.extend(["policy_explainer_brain", "regulatory_brain"])
        if self._is_scenario(text, resolved_mode):
            brains.extend(["scenario_simulator_brain", "risk_reflection_brain", "safe_next_steps_brain"])

        brains = self._dedupe(brains)
        return StandaloneBrainFrame(
            mode=resolved_mode,
            active_brains=brains,
            intent_summary=self._intent_summary(text, resolved_mode, brains),
            response_contract=self._response_contract(brains, resolved_mode),
            safety_boundaries=self.CORE_BOUNDARIES,
            reflective_questions=self._reflective_questions(brains),
            evidence_prompts=self._evidence_prompts(brains),
        )

    def build_prompt_block(self, message: str, *, mode: str | None = None) -> str:
        frame = self.frame(message, mode=mode)
        lines = [
            "Standalone ORB sector brain frame:",
            f"- Mode: {frame.mode}",
            f"- Intent summary: {frame.intent_summary}",
            "- Active brains: " + ", ".join(frame.active_brains),
            "",
            "Answer contract:",
            *[f"- {item}" for item in frame.response_contract],
            "",
            "Evidence prompts to consider:",
            *[f"- {item}" for item in frame.evidence_prompts],
            "",
            "Reflective prompts to consider:",
            *[f"- {item}" for item in frame.reflective_questions],
            "",
            "Safety boundaries:",
            *[f"- {item}" for item in frame.safety_boundaries],
        ]
        return "\n".join(lines)

    def context_payload(self, message: str, *, mode: str | None = None) -> dict[str, Any]:
        return self.frame(message, mode=mode).to_dict()

    def _response_contract(self, brains: list[str], mode: str) -> list[str]:
        contract = [
            "Speak in British English with calm, practitioner-level confidence.",
            "Be practical and residential-children's-homes specific.",
            "Avoid generic AI phrasing and avoid over-disclaiming.",
            "Give the user a usable answer first, then add cautions where needed.",
        ]
        if "safeguarding_brain" in brains:
            contract.extend([
                "Separate known facts, concerns, missing information and escalation considerations.",
                "Do not decide thresholds; support safe thinking and remind local procedures.",
            ])
        if "regulatory_brain" in brains or "ofsted_brain" in brains:
            contract.extend([
                "Explain why this matters through Regulations, Quality Standards and SCCIF evidence expectations.",
                "Do not predict Ofsted grades; explain what an inspector may look for.",
            ])
        if "recording_quality_brain" in brains:
            contract.extend([
                "Focus on factual, child-centred, non-punitive recording language.",
                "Identify missing evidence such as child voice, staff response, outcome, manager review and follow-up.",
            ])
        if "therapeutic_brain" in brains or "therapeutic_language_brain" in brains:
            contract.extend([
                "Use behaviour-as-communication thinking and trauma-informed language.",
                "Consider emotional containment, co-regulation, repair and relational safety.",
            ])
        if "manager_copilot_brain" in brains:
            contract.extend([
                "Frame the answer for oversight, learning, audit and leadership action.",
                "Highlight evidence gaps and what needs manager review.",
            ])
        if mode == "Policy Explainer":
            contract.append("Explain policy or guidance in plain English and show how it applies on shift.")
        return self._dedupe(contract)

    def _evidence_prompts(self, brains: list[str]) -> list[str]:
        prompts = [
            "What happened?",
            "What did adults do and why?",
            "What did the child say, show or communicate?",
            "What changed afterwards?",
        ]
        if "safeguarding_brain" in brains:
            prompts.extend([
                "Who needs to be informed or consulted?",
                "What immediate safety plan or protective action is needed?",
                "Is LADO, social worker, police, health, Ofsted notification or local safeguarding advice potentially relevant?",
            ])
        if "recording_quality_brain" in brains:
            prompts.extend([
                "Is the record factual rather than judgemental?",
                "Is the child voice visible?",
                "Is manager oversight/sign-off needed?",
            ])
        if "ofsted_brain" in brains or "evidence_graph_brain" in brains:
            prompts.extend([
                "Where is the evidence trail?",
                "What would demonstrate impact, not just activity?",
                "Are actions reviewed and closed with learning?",
            ])
        return self._dedupe(prompts)

    def _reflective_questions(self, brains: list[str]) -> list[str]:
        questions = ["What might be the child's lived experience of this?", "What would safe, curious practice look like next?"]
        if "therapeutic_brain" in brains:
            questions.append("What need might sit underneath the behaviour?")
        if "manager_copilot_brain" in brains:
            questions.append("What should leadership know, review and evidence?")
        if "staff_coach_brain" in brains:
            questions.append("What support, learning or debrief might the adult need?")
        if "safeguarding_brain" in brains:
            questions.append("What is known, what is unknown, and what cannot wait?")
        return self._dedupe(questions)

    def _intent_summary(self, text: str, mode: str, brains: list[str]) -> str:
        if "allegation" in text or "lado" in text:
            return "Allegation or staff-conduct safeguarding reflection in a children's home context."
        if "recording_quality_brain" in brains:
            return "Recording quality and professional wording support."
        if "ofsted_brain" in brains:
            return "Ofsted/SCCIF evidence and inspection-readiness reflection."
        if "therapeutic_brain" in brains:
            return "Therapeutic practice and behaviour-as-communication reflection."
        if "safeguarding_brain" in brains:
            return "Safeguarding thinking and safe escalation reflection."
        if mode == "Ask ORB":
            return "General standalone ORB guidance with residential care awareness."
        return f"{mode} support request."

    def _is_safeguarding(self, text: str, mode: str) -> bool:
        terms = ("safeguarding", "abuse", "exploitation", "missing", "self harm", "self-harm", "allegation", "lado", "harm", "risk", "police")
        return mode == "Safeguarding Thinking" or any(term in text for term in terms)

    def _is_regulatory(self, text: str, mode: str) -> bool:
        terms = ("ofsted", "sccif", "regulation", "quality standard", "reg 44", "reg 45", "inspection", "evidence", "lado", "allegation")
        return mode in {"Ofsted Lens", "Policy Explainer", "Manager Copilot"} or any(term in text for term in terms)

    def _is_recording(self, text: str, mode: str) -> bool:
        terms = ("record", "recording", "daily note", "incident", "wording", "write this", "professional", "language")
        return mode == "Record This Properly" or any(term in text for term in terms)

    def _is_therapeutic(self, text: str, mode: str) -> bool:
        terms = ("trauma", "therapeutic", "pace", "repair", "co-regulation", "coregulation", "behaviour", "behavior", "dysregulated", "shame", "attachment")
        return mode in {"Therapeutic Reframe", "Reflect with ORB", "Staff Coach"} or any(term in text for term in terms)

    def _is_manager(self, text: str, mode: str) -> bool:
        terms = ("manager", "leadership", "oversight", "audit", "reg 44", "reg 45", "supervision", "quality assurance", "governance")
        return mode == "Manager Copilot" or any(term in text for term in terms)

    def _is_staff_support(self, text: str, mode: str) -> bool:
        terms = ("staff", "shift", "debrief", "supervision", "confidence", "wellbeing", "what should i do next time")
        return mode in {"Staff Coach", "Reflect with ORB"} or any(term in text for term in terms)

    def _is_policy(self, text: str, mode: str) -> bool:
        terms = ("policy", "procedure", "guidance", "explain", "what does", "what should")
        return mode == "Policy Explainer" or any(term in text for term in terms)

    def _is_scenario(self, text: str, mode: str) -> bool:
        terms = ("scenario", "situation", "what if", "young person", "staff member", "child", "home")
        return mode == "Scenario Simulator" or any(term in text for term in terms)

    def _dedupe(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in items:
            if item in seen:
                continue
            seen.add(item)
            out.append(item)
        return out


orb_standalone_brain_service = OrbStandaloneBrainService()
