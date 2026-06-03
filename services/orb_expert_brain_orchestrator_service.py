"""Master ORB Expert Brain Orchestrator — converges ORB 9 components."""

from __future__ import annotations

import json
import os
from typing import Any

from services.orb_expert_answer_engine_service import orb_expert_answer_engine_service
from services.orb_followup_learning_service import orb_followup_learning_service
from services.orb_gap_detection_service import orb_gap_detection_service
from services.orb_learning_ledger_service import orb_learning_ledger_service
from services.orb_missingness_graph_service import orb_missingness_graph_service
from services.orb_operating_brain_service import orb_operating_brain_service
from services.orb_answer_quality_gate_service import orb_answer_quality_gate_service
from services.orb_quality_standards_brain_service import orb_quality_standards_brain_service
from services.orb_source_citation_service import orb_source_citation_service
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.orb_whole_child_lens_service import orb_whole_child_lens_service
from services.trusted_source_registry_service import trusted_source_registry_service
from schemas.orb_learning_ledger import OrbLearningLedgerEntry

_SEQ_PATH = os.path.join(os.path.dirname(__file__), "..", "assistant", "knowledge", "orb_scenario_sequences.json")

_RESPONSE_SEQUENCE = [
    "immediate_safety",
    "facts_known",
    "missing_information",
    "child_voice",
    "professional_curiosity",
    "who_to_inform",
    "what_to_record",
    "what_to_escalate",
    "what_to_update",
    "what_evidence_matters",
    "manager_oversight",
    "multi_agency_lens",
    "what_orb_cannot_decide",
    "safe_next_step",
]


class OrbExpertBrainOrchestratorService:
    """Single entry point for ORB 9 expert brain context packets."""

    def build_context_packet(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_role: str | None = None,
        history: list[dict[str, Any]] | None = None,
        follow_up_message: str | None = None,
        sequence_id: str | None = None,
    ) -> dict[str, Any]:
        from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

        frame = orb_standalone_brain_service.frame(message, mode=mode)
        classification = orb_knowledge_retrieval_service.classify_query(message, mode=mode)
        expert_packet = orb_expert_answer_engine_service.build_expert_answer_packet(
            message,
            mode=mode,
            profile_role=profile_role,
            history=history,
        )
        risk = (expert_packet.get("classification") or {}).get("risk_level") or "medium"
        is_residential = frame.dual_brain_route == "residential_specialist" or classification.get("intents", {}).get(
            "regulatory_framework"
        )

        source_ids = [
            a.get("source_id")
            for a in (expert_packet.get("source_anchors") or [])
            if a.get("source_id")
        ]
        allowed, blocked = orb_source_citation_service.filter_allowed_source_ids(source_ids)
        citation_basis = orb_source_citation_service.build_citation_basis(allowed)

        whole_child = orb_whole_child_lens_service.map_scenario(message, risk_level=risk)
        qs_block = orb_quality_standards_brain_service.prompt_block(message)
        missingness = orb_missingness_graph_service.build_graph(
            message, risk_level=risk, sequence_id=sequence_id
        )
        gaps = orb_gap_detection_service.detect_from_message(message)
        operating_block = orb_operating_brain_service.build_prompt_block(message, mode=mode)

        follow_up = None
        if follow_up_message:
            follow_up = orb_followup_learning_service.classify(message, follow_up_message)

        quality_preview = orb_answer_quality_gate_service.evaluate_packet(
            {**expert_packet, "message": message, "mode": mode, "risk_level": risk}
        )

        return {
            "version": "orb_9",
            "standalone_frame": frame.to_dict(),
            "classification": classification,
            "expert_packet": expert_packet,
            "risk_level": risk,
            "is_residential": is_residential,
            "trusted_registry_version": trusted_source_registry_service.registry_version(),
            "source_citation_basis": citation_basis,
            "blocked_source_ids": blocked,
            "whole_child_lens": whole_child,
            "quality_standards_prompt": qs_block,
            "missingness_graph": missingness,
            "gaps": gaps,
            "operating_brain_prompt": operating_block,
            "response_sequence": _RESPONSE_SEQUENCE,
            "follow_up_learning": follow_up,
            "quality_gate_preview": quality_preview,
            "active_brains": self._active_brains(frame, is_residential),
            "safety_boundaries": list(orb_standalone_brain_service.CORE_BOUNDARIES),
        }

    def build_prompt_block(self, packet: dict[str, Any]) -> str:
        lines = [
            "ORB 9 Expert Brain (governed residential intelligence):",
            "- Use trusted source registry only; no open-web scraping.",
            "- ORB does not make safeguarding thresholds, diagnoses, or Ofsted grade predictions.",
        ]
        if packet.get("quality_standards_prompt"):
            lines.append(packet["quality_standards_prompt"])
        if packet.get("operating_brain_prompt"):
            lines.append(packet["operating_brain_prompt"])
        expert_block = orb_expert_answer_engine_service.build_prompt_block(packet.get("expert_packet") or {})
        if expert_block:
            lines.append(expert_block)
        seq = packet.get("missingness_graph", {}).get("sequence")
        if seq:
            lines.append(f"Mandatory sequence ({seq.get('title')}): " + " → ".join(seq.get("steps") or [])[:800])
        lenses = packet.get("whole_child_lens", {}).get("professional_lenses") or []
        if lenses:
            lines.append("Professional lenses to consider: " + ", ".join(lenses[:6]))
        return "\n".join(lines)

    def record_interaction(
        self,
        packet: dict[str, Any],
        *,
        user_role: str | None = None,
        prompt_text: str = "",
        quality_score: float | None = None,
        user_feedback: str | None = None,
        **flags: Any,
    ) -> dict[str, Any]:
        entry = OrbLearningLedgerEntry(
            user_role=user_role,
            prompt_summary=prompt_text,
            intent=str((packet.get("classification") or {}).get("primary_intent") or ""),
            active_brains=packet.get("active_brains") or [],
            risk_level=packet.get("risk_level"),
            source_basis=[
                c.get("source_id") for c in (packet.get("source_citation_basis") or {}).get("citations") or []
            ],
            answer_quality_score=quality_score
            or (packet.get("quality_gate_preview") or {}).get("composite_score"),
            missing_markers=[g.get("gap_id") for g in packet.get("gaps") or []],
            follow_up_classification=(packet.get("follow_up_learning") or {}).get("primary"),
            user_feedback=user_feedback,
            learning_tags=(packet.get("follow_up_learning") or {}).get("learning_tags") or [],
            copied=bool(flags.get("copied")),
            exported=bool(flags.get("exported")),
            record_created=bool(flags.get("record_created")),
            answer_regenerated=bool(flags.get("answer_regenerated")),
            manager_amended=bool(flags.get("manager_amended")),
        )
        return orb_learning_ledger_service.record(entry)

    def run_regression_check(self, scenario: dict[str, Any]) -> dict[str, Any]:
        packet = self.build_context_packet(
            scenario.get("prompt") or "",
            mode="Safeguarding Thinking",
            sequence_id=scenario.get("sequence_id"),
        )
        gate = orb_answer_quality_gate_service.evaluate_packet(
            {**packet.get("expert_packet", {}), "message": scenario.get("prompt"), "risk_level": scenario.get("risk_level")}
        )
        searchable = self._regression_search_text(packet)
        must_include = scenario.get("must_include") or []
        missing_include = [m for m in must_include if not self._regression_term_present(searchable, m)]
        must_not = scenario.get("must_not_say") or []
        violations = [m for m in must_not if self._regression_must_not_violation(searchable, m)]

        score_ok = packet.get("version") == "orb_9" and bool(packet.get("expert_packet"))

        return {
            "scenario_id": scenario.get("scenario_id"),
            "passed": score_ok and not violations and len(missing_include) <= 3,
            "missing_must_include": missing_include,
            "must_not_violations": violations,
            "quality_gate": gate,
            "packet_keys": list(packet.keys()),
        }

    def _regression_search_text(self, packet: dict[str, Any]) -> str:
        seq = (packet.get("missingness_graph") or {}).get("sequence") or {}
        steps = " ".join(seq.get("steps") or [])
        parts = [self.build_prompt_block(packet), steps]
        return " ".join(parts).lower()

    def _regression_term_present(self, searchable: str, term: str) -> bool:
        t = term.lower()
        aliases = {
            "de-escalation": ("de-escalation", "de-escalat", "de escalate"),
            "proportion": ("proportion", "proportionality"),
            "timeline": ("timeline", "time line", "over time", "2 weeks", "pattern over"),
            "observation": ("observation", "staff observation", "observe"),
            "pattern": ("pattern", "repeated", "themes"),
        }
        options = aliases.get(t, (t,))
        return any(o in searchable for o in options)

    def _regression_must_not_violation(self, searchable: str, phrase: str) -> bool:
        p = phrase.lower()
        if p not in searchable:
            return False
        idx = 0
        while True:
            idx = searchable.find(p, idx)
            if idx == -1:
                return False
            window = searchable[max(0, idx - 45) : idx + len(p) + 15]
            prohibitions = (
                "do not ",
                "don't ",
                "must not ",
                "never ",
                "avoid ",
                "cannot ",
                "orb does not ",
                "must_not",
                "must not say",
                "predict",
                "no further issues",
                "will be ",
                "grade prediction",
            )
            if not any(neg in window for neg in prohibitions):
                return True
            idx += len(p)
        return False

    def _active_brains(self, frame: Any, is_residential: bool) -> list[str]:
        brains = list(getattr(frame, "active_brains", []) or [])
        if is_residential:
            for b in (
                "orb_9_expert_orchestrator",
                "quality_standards_brain",
                "whole_child_lens",
                "trusted_source_registry",
                "missingness_graph",
            ):
                if b not in brains:
                    brains.append(b)
        return brains


orb_expert_brain_orchestrator_service = OrbExpertBrainOrchestratorService()
