"""IndiCare Intelligence Core — single always-on brain entry for /ORB and IndiCare OS.

ORB is the shell. IndiCare Intelligence is the brain.
"""

from __future__ import annotations

from typing import Any

from services.orb_expert_brain_orchestrator_service import orb_expert_brain_orchestrator_service
from services.orb_operating_brain_service import orb_operating_brain_service
from services.orb_institutional_depth_frame_service import orb_institutional_depth_frame_service
from services.orb_indicare_intelligence_convergence_service import (
    INTELLIGENCE_LAYERS,
    orb_indicare_intelligence_convergence_service,
)
from services.orb_quality_standards_brain_service import orb_quality_standards_brain_service
from services.orb_whole_child_lens_service import orb_whole_child_lens_service
from services.orb_gap_detection_service import orb_gap_detection_service
from services.orb_missingness_graph_service import orb_missingness_graph_service
from services.orb_answer_quality_gate_service import orb_answer_quality_gate_service
from services.orb_followup_learning_service import orb_followup_learning_service
from services.orb_learning_ledger_service import orb_learning_ledger_service
from services.orb_scenario_playbook_service import orb_scenario_playbook_service
from services.indicare_registered_home_domain_brain_service import indicare_registered_home_domain_brain_service
from services.indicare_source_convergence_service import indicare_source_convergence_service
from schemas.orb_learning_ledger import OrbLearningLedgerEntry

EXPERT_DEPTHS = (
    "general_light",
    "residential_light",
    "residential_standard",
    "residential_deep",
    "safeguarding_critical",
)

RESIDENTIAL_MODES = {
    "Record This Properly",
    "Ofsted Lens",
    "Therapeutic Reframe",
    "Manager Copilot",
    "Staff Coach",
    "Reg 44 / Reg 45 Prep",
    "Behaviour Support",
    "Policy Explainer",
    "Scenario Simulator",
    "Reflect with ORB",
    "Safeguarding Thinking",
    "Safeguarding",
}

SAFEGUARDING_CRITICAL_TERMS = (
    "immediate danger",
    "suicide",
    "self-harm",
    "self harm",
    "weapon",
    "abuse",
    "sexual harm",
    "exploitation",
    "county lines",
    "lado",
    "allegation",
    "hurt me",
    "missing from care",
    "medication error",
    "peer-on-peer",
    "peer on peer",
    "emergency",
)

CARE_RELEVANCE_FLAGS = {
    "childrens_home": ("children's home", "childrens home", "registered home", "care home"),
    "young_person_child": ("young person", "yp ", "child", "resident", "placement"),
    "staff_home": ("staff", "on shift", "key worker", "rota"),
    "vague_what_do_i_do": ("what do i do", "not sure", "help me", "what should i"),
    "distress_behaviour": ("angry", "withdrawn", "refusal", "dysregulated", "meltdown", "kicked off"),
    "family_contact": ("family time", "contact", "parent", "sibling"),
    "school_education": ("school", "education", "pep", "attendance", "ehcp", "send"),
    "health_mental": ("health", "mental health", "camhs", "gp", "self-harm", "self harm"),
    "missing_whereabouts": ("missing", "absent", "awol", "late return", "whereabouts"),
    "substance_use": ("cannabis", "alcohol", "substance", "drugs"),
    "exploitation": ("exploit", "cse", "cce", "county lines", "grooming"),
    "multi_agency": ("police", "social worker", "iro", "lado", "ofsted", "placing authority"),
    "recording_plan": ("record", "incident", "risk assessment", "plan", "chronology", "report"),
    "staff_conduct": ("staff conduct", "boundaries", "social media", "inappropriate"),
    "medication_emergency": ("medication", "mar", "prn", "fire", "999", "ambulance"),
    "complaints_rights": ("complaint", "advocacy", "rights"),
}


class IndicareIntelligenceCoreService:
    """Always-on intelligence packet for every /ORB request."""

    def estimate_expert_depth(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
    ) -> str:
        """Lightweight depth estimate before full retrieval (stream status / UX)."""
        mode_name = str(mode or "Ask ORB").strip() or "Ask ORB"
        from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

        classification = orb_knowledge_retrieval_service.classify_query(
            message, mode=mode_name, profile_context=profile_context
        )
        care_score, _, _ = self._score_care_relevance(
            message, mode=mode_name, classification=classification
        )
        return self._resolve_expert_depth(
            message,
            mode=mode_name,
            care_score=care_score,
            classification=classification,
        )

    def build_intelligence_packet(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_role: str | None = None,
        history: list[dict[str, Any]] | None = None,
        profile_context: bool = False,
        follow_up_message: str | None = None,
        sequence_id: str | None = None,
    ) -> dict[str, Any]:
        mode_name = str(mode or "Ask ORB").strip() or "Ask ORB"
        from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

        classification = orb_knowledge_retrieval_service.classify_query(
            message, mode=mode_name, profile_context=profile_context
        )
        care_score, care_flags, hidden_flags = self._score_care_relevance(message, mode=mode_name, classification=classification)
        expert_depth = self._resolve_expert_depth(
            message,
            mode=mode_name,
            care_score=care_score,
            classification=classification,
        )

        if expert_depth == "general_light" and care_score < 20:
            return self._build_general_light_packet(
                message,
                mode=mode_name,
                classification=classification,
                care_score=care_score,
                care_flags=care_flags,
                hidden_flags=hidden_flags,
                profile_role=profile_role,
                history=history,
                follow_up_message=follow_up_message,
            )

        orb9_packet = orb_expert_brain_orchestrator_service.build_context_packet(
            message,
            mode=mode_name,
            profile_role=profile_role,
            history=history,
            follow_up_message=follow_up_message,
            sequence_id=sequence_id,
        )
        risk = str(orb9_packet.get("risk_level") or "medium").lower()

        convergence = orb_indicare_intelligence_convergence_service.route(message, mode=mode_name)
        active_layers = list(convergence.get("active_engines") or [])
        for layer in active_layers:
            if layer not in INTELLIGENCE_LAYERS and layer.replace("_intelligence", "") + "_intelligence" in INTELLIGENCE_LAYERS:
                pass

        domain_ctx = indicare_registered_home_domain_brain_service.context_payload(message, mode=mode_name)
        whole_child = orb_whole_child_lens_service.map_scenario(message, risk_level=risk)
        qs_hits = [
            s.get("standard_id")
            for s in orb_quality_standards_brain_service.standards_for_message(message)
            if s
        ]
        prof_lenses = list(whole_child.get("professional_lenses") or [])
        prof_lenses.extend(convergence.get("active_lenses") or [])

        pack_keys = classification.get("pack_keys") or []
        source_basis = indicare_source_convergence_service.build_source_basis(
            message=message,
            pack_keys=pack_keys,
            profile_context=profile_context,
        )

        gaps = orb_gap_detection_service.detect_from_message(message)
        missingness = orb_missingness_graph_service.build_graph(
            message, risk_level=risk, sequence_id=sequence_id
        )
        playbook = orb_scenario_playbook_service.detect_playbook(message)
        scenario_sequences: list[str] = []
        if playbook:
            scenario_sequences.append(playbook.topic)
        seq = missingness.get("sequence") or {}
        if seq.get("sequence_id"):
            scenario_sequences.append(str(seq["sequence_id"]))

        depth_frame_block = ""
        if expert_depth != "general_light":
            depth_frame_block = orb_institutional_depth_frame_service.prompt_block(
                message=message, mode=mode_name
            )

        quality_preview = orb_answer_quality_gate_service.evaluate_packet(
            {**orb9_packet, "message": message, "mode": mode_name, "risk_level": risk}
        )

        follow_up = None
        if follow_up_message:
            follow_up = orb_followup_learning_service.classify(message, follow_up_message)

        active_brains = self._active_brains(expert_depth, orb9_packet, domain_ctx)
        prompt_block = self.build_prompt_block(
            expert_depth=expert_depth,
            orb9_packet=orb9_packet,
            domain_block=indicare_registered_home_domain_brain_service.prompt_block(message, mode=mode_name),
            depth_frame_block=depth_frame_block,
            operating_block=orb_operating_brain_service.build_prompt_block(message, mode=mode_name),
            qs_block=orb_quality_standards_brain_service.prompt_block(message),
            care_score=care_score,
        )

        return {
            "version": "indicare_intelligence_10",
            "orb_shell": True,
            "expert_depth": expert_depth,
            "care_relevance_score": care_score,
            "hidden_care_relevance_flags": hidden_flags,
            "active_intelligence_layers": active_layers,
            "active_brains": active_brains,
            "registered_home_domains": domain_ctx.get("matched_domain_ids") or [],
            "quality_standard_hits": qs_hits,
            "professional_lens_hits": list(dict.fromkeys(prof_lenses))[:12],
            "whole_child_domains": whole_child.get("domains") or [],
            "scenario_sequences": scenario_sequences,
            "source_basis": source_basis,
            "gaps": gaps,
            "missingness_graph": missingness,
            "quality_gate_preview": quality_preview,
            "learning_tags": (follow_up or {}).get("learning_tags") or [],
            "prompt_block": prompt_block,
            "orb9_packet": orb9_packet,
            "classification": classification,
            "convergence": convergence,
            "domain_context": domain_ctx,
            "ofsted_learning_note": (
                "Ofsted report intelligence is anonymised practice learning only; "
                "never predict grades or auto-apply statutory updates."
            ),
        }

    def _build_general_light_packet(
        self,
        message: str,
        *,
        mode: str,
        classification: dict[str, Any],
        care_score: int,
        care_flags: list[str],
        hidden_flags: list[str],
        profile_role: str | None = None,
        history: list[dict[str, Any]] | None = None,
        follow_up_message: str | None = None,
    ) -> dict[str, Any]:
        """Fast path: safety shell without residential domain/gap/missingness scans."""
        expert_depth = "general_light"
        orb9_packet = orb_expert_brain_orchestrator_service.build_context_packet(
            message,
            mode=mode,
            profile_role=profile_role,
            history=history,
            follow_up_message=follow_up_message,
        )
        risk = str(orb9_packet.get("risk_level") or "low").lower()
        convergence = orb_indicare_intelligence_convergence_service.route(message, mode=mode)
        active_layers = list(convergence.get("active_engines") or [])[:6]
        pack_keys = classification.get("pack_keys") or []
        source_basis = indicare_source_convergence_service.build_source_basis(
            message=message,
            pack_keys=pack_keys[:2],
            profile_context=False,
        )
        quality_preview = orb_answer_quality_gate_service.evaluate_packet(
            {**orb9_packet, "message": message, "mode": mode, "risk_level": risk}
        )
        prompt_block = self.build_prompt_block(
            expert_depth=expert_depth,
            orb9_packet=orb9_packet,
            domain_block="",
            depth_frame_block="",
            operating_block="",
            qs_block="",
            care_score=care_score,
        )
        return {
            "version": "indicare_intelligence_10",
            "orb_shell": True,
            "expert_depth": expert_depth,
            "care_relevance_score": care_score,
            "hidden_care_relevance_flags": hidden_flags,
            "active_intelligence_layers": active_layers,
            "active_brains": list(dict.fromkeys(["indicare_intelligence_core", "general_assistant"])),
            "registered_home_domains": [],
            "quality_standard_hits": [],
            "professional_lens_hits": [],
            "whole_child_domains": [],
            "scenario_sequences": [],
            "source_basis": source_basis,
            "gaps": [],
            "missingness_graph": {"nodes": [], "edges": []},
            "quality_gate_preview": quality_preview,
            "learning_tags": [],
            "prompt_block": prompt_block,
            "orb9_packet": orb9_packet,
            "classification": classification,
            "convergence": convergence,
            "domain_context": {"matched_domain_ids": []},
            "ofsted_learning_note": (
                "Ofsted report intelligence is anonymised practice learning only; "
                "never predict grades or auto-apply statutory updates."
            ),
            "general_light_fast_path": True,
        }

    def build_prompt_block(
        self,
        *,
        expert_depth: str,
        orb9_packet: dict[str, Any],
        domain_block: str,
        depth_frame_block: str,
        operating_block: str,
        qs_block: str,
        care_score: int,
    ) -> str:
        lines = [
            "IndiCare Intelligence 10 (ORB shell — intelligence brain active):",
            f"- Answer depth: {expert_depth} (care relevance {care_score}/100).",
            "- ORB does not diagnose, predict Ofsted grades, claim live OS access, or make referral thresholds.",
        ]
        if expert_depth == "general_light":
            lines.append(
                "- General question: answer concisely and usefully without forcing residential/Ofsted framing."
            )
            lines.append("- Still apply safety boundaries if risk language appears.")
            return "\n".join(lines)

        if expert_depth in ("safeguarding_critical", "residential_deep"):
            lines.append(
                "- High risk: include immediate safety, manager/on-call/local procedure, recording and plan update."
            )

        if qs_block and expert_depth != "general_light":
            lines.append(qs_block)
        if domain_block:
            lines.append(domain_block)
        if depth_frame_block and expert_depth in (
            "residential_light",
            "residential_standard",
            "residential_deep",
            "safeguarding_critical",
        ):
            lines.append(depth_frame_block)
        orb9_block = orb_expert_brain_orchestrator_service.build_prompt_block(orb9_packet)
        if orb9_block:
            lines.append(orb9_block)
        elif operating_block:
            lines.append(operating_block)
        return "\n".join(lines)

    def evaluate_answer(
        self,
        packet: dict[str, Any],
        answer_text: str,
    ) -> dict[str, Any]:
        orb9 = packet.get("orb9_packet") or {}
        return orb_answer_quality_gate_service.evaluate_packet(
            {**orb9, "message": orb9.get("message"), "draft_answer": answer_text},
            draft_answer=answer_text,
        )

    def record_learning(
        self,
        packet: dict[str, Any],
        *,
        prompt_text: str = "",
        user_role: str | None = None,
        user_feedback: str | None = None,
        **flags: Any,
    ) -> dict[str, Any]:
        orb9 = packet.get("orb9_packet") or packet
        entry = OrbLearningLedgerEntry(
            user_role=user_role,
            prompt_summary=prompt_text[:500],
            intent=str((packet.get("classification") or {}).get("primary_intent") or packet.get("expert_depth") or ""),
            active_brains=packet.get("active_brains") or [],
            risk_level=(orb9.get("risk_level") if isinstance(orb9, dict) else None),
            source_basis=packet.get("source_basis", {}).get("trusted_source_ids") or [],
            answer_quality_score=(packet.get("quality_gate_preview") or {}).get("composite_score"),
            missing_markers=[g.get("gap_id") for g in packet.get("gaps") or []],
            learning_tags=packet.get("learning_tags") or [],
            user_feedback=user_feedback,
            copied=bool(flags.get("copied")),
            exported=bool(flags.get("exported")),
            record_created=bool(flags.get("record_created")),
        )
        return orb_learning_ledger_service.record(entry)

    def _score_care_relevance(
        self,
        message: str,
        *,
        mode: str,
        classification: dict[str, Any],
    ) -> tuple[int, list[str], list[str]]:
        lower = str(message or "").lower()
        text = f"{lower} {mode.lower()}"
        flags: list[str] = []
        hidden: list[str] = []
        score = 0

        for flag_id, terms in CARE_RELEVANCE_FLAGS.items():
            if any(t in text for t in terms):
                flags.append(flag_id)
                score += 8

        intents = classification.get("intents") or {}
        if intents.get("residential_childrens_homes"):
            flags.append("residential_intent")
            score += 15
        if intents.get("safeguarding_principles"):
            flags.append("safeguarding_intent")
            score += 20
        if intents.get("regulatory_framework"):
            score += 10
        if mode in RESIDENTIAL_MODES:
            score += 25
            flags.append("residential_mode")

        if len(lower.split()) < 12 and "what do i do" in lower:
            hidden.append("vague_care_prompt")
            score = max(score, 35)

        score = min(100, score)
        if not flags and score < 20:
            return score, flags, hidden
        return score, flags, hidden

    def _resolve_expert_depth(
        self,
        message: str,
        *,
        mode: str,
        care_score: int,
        classification: dict[str, Any],
    ) -> str:
        from services.orb_universal_answer_contract_map_service import (
            detect_contract_family,
            get_contract_family,
        )

        lower = str(message or "").lower()
        if any(t in lower for t in SAFEGUARDING_CRITICAL_TERMS):
            return "safeguarding_critical"

        family_id = detect_contract_family(message)
        family = get_contract_family(family_id)
        family_cap = (family or {}).get("expert_depth_cap")

        if mode in RESIDENTIAL_MODES or mode in ("Safeguarding Thinking", "Safeguarding"):
            if care_score >= 60 or classification.get("intents", {}).get("safeguarding_principles"):
                depth = "residential_deep" if care_score >= 70 else "residential_standard"
            else:
                depth = "residential_standard"
        elif care_score >= 70:
            depth = "residential_deep"
        elif care_score >= 35:
            depth = "residential_light"
        elif care_score >= 20:
            depth = "residential_light"
        else:
            depth = "general_light"

        if family_cap and depth != "safeguarding_critical":
            cap_order = (
                "general_light",
                "residential_light",
                "residential_standard",
                "residential_deep",
                "safeguarding_critical",
            )
            if cap_order.index(depth) > cap_order.index(str(family_cap)):
                depth = str(family_cap)
        return depth

    def _active_brains(
        self,
        expert_depth: str,
        orb9_packet: dict[str, Any],
        domain_ctx: dict[str, Any],
    ) -> list[str]:
        brains = list(orb9_packet.get("active_brains") or [])
        brains.extend(
            [
                "indicare_intelligence_core",
                "registered_home_domain_brain",
                "quality_standards_brain",
                "whole_child_lens",
                "institutional_depth_frame",
                "knowledge_retrieval",
                "operating_brain",
                "source_convergence",
            ]
        )
        if expert_depth != "general_light":
            brains.append("residential_brain_catalog_merged")
        if domain_ctx.get("matched_domain_ids"):
            brains.append("domain_map_v10")
        return list(dict.fromkeys(brains))


indicare_intelligence_core_service = IndicareIntelligenceCoreService()
