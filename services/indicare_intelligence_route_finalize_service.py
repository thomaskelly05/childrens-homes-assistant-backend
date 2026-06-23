"""Shared post-route IndiCare Intelligence Core handling for ORB and OS assistant paths."""

from __future__ import annotations

import logging
from typing import Any

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_final_answer_repair_service import repair_and_validate_final_answer
from assistant.knowledge.adult_identity_language import sanitize_visible_final_answer
from services.orb_universal_answer_contract_map_service import detect_contract_family
from services.orb_chat_timing_service import OrbChatTimingTracker
from services.orb_response_support_service import build_response_support_chips

logger = logging.getLogger("indicare.intelligence_finalize")

CARE_RELATED_ACTION_IDS = frozenset(
    {
        "what_am_i_missing",
        "add_safeguarding_lens",
        "add_ofsted_lens",
        "convert_to_recording_wording",
        "create_manager_oversight_note",
        "create_chronology_suggestion",
        "create_checklist",
        "shift_handover_summary",
        "build_shift_plan",
        "add_child_voice_prompt",
        "therapeutic_reframe",
        "supervision_prompt",
        "incident_to_reflective_learning",
        "map_to_nvq_evidence",
        "identify_learning_evidence_gaps",
        "create_reflective_account_plan",
    }
)


def intelligence_context_summary(
    indicare_intelligence: dict[str, Any] | None,
    *,
    quality_gate: dict[str, Any] | None = None,
    mode: str | None = None,
) -> dict[str, Any]:
    """Compact metadata for API context_used / frontend indicare_intelligence_core."""
    packet = dict(indicare_intelligence or {})
    if not packet:
        return {}
    gaps = packet.get("gaps") or []
    missingness = packet.get("missingness_graph") or {}
    missing_evidence = _missing_evidence_chips(gaps, missingness)
    gate = quality_gate or packet.get("quality_gate_preview")
    response_support = build_response_support_chips(packet, quality_gate=gate, mode=mode)
    return {
        "version": packet.get("version"),
        "expert_depth": packet.get("expert_depth"),
        "care_relevance_score": packet.get("care_relevance_score"),
        "active_intelligence_layers": packet.get("active_intelligence_layers"),
        "registered_home_domains": packet.get("registered_home_domains"),
        "quality_standard_hits": packet.get("quality_standard_hits"),
        "professional_lens_hits": packet.get("professional_lens_hits"),
        "source_basis": packet.get("source_basis"),
        "gaps": gaps,
        "missing_evidence": missing_evidence,
        "quality_gate_preview": packet.get("quality_gate_preview"),
        "response_support": response_support,
    }


def _missing_evidence_chips(
    gaps: list[dict[str, Any]],
    missingness: dict[str, Any],
) -> list[dict[str, str]]:
    chips: list[dict[str, str]] = []
    seen: set[str] = set()

    def add(chip_id: str, label: str) -> None:
        if chip_id in seen:
            return
        seen.add(chip_id)
        chips.append({"id": chip_id, "label": label})

    gap_labels = {
        "child_voice": "Child voice",
        "manager_review": "Manager review",
        "chronology": "Chronology",
        "risk_assessment_update": "Risk assessment update",
        "care_plan_update": "Care plan update",
        "social_worker_notification": "Social worker notification",
        "lado_consideration": "LADO consideration",
        "return_home_interview": "Return home interview",
        "exploitation_indicators": "Exploitation indicators",
        "reg_40_consideration": "Reg 40 consideration",
        "reg_44_45_action": "Reg 44/45 action",
    }
    for gap in gaps:
        gap_id = str(gap.get("gap_id") or gap.get("id") or "").strip()
        if not gap_id:
            continue
        add(gap_id, gap_labels.get(gap_id, str(gap.get("title") or gap_id).replace("_", " ").title()))

    for node in missingness.get("nodes") or []:
        node_id = str(node.get("id") or node.get("node_id") or "").strip()
        if node_id:
            add(node_id, gap_labels.get(node_id, str(node.get("label") or node_id).replace("_", " ").title()))

    return chips


def apply_quality_gate_answer_fixes(
    answer: str,
    *,
    quality_gate: dict[str, Any],
    message: str,
    mode: str,
    sanitize_closer: Any | None = None,
) -> str:
    if quality_gate.get("passed"):
        return answer
    for flag in quality_gate.get("critical_flags") or []:
        if flag == "grade_prediction" and "inadequate" not in answer.lower():
            continue
        if flag == "fake_os_access":
            suffix = "\n\n(ORB does not access live IndiCare OS records in standalone mode.)"
            if sanitize_closer:
                return sanitize_closer(answer + suffix, message=message, mode=mode)
            return answer + suffix
    return answer


def finalize_standalone_intelligence(
    *,
    indicare_intelligence: dict[str, Any] | None,
    answer: str,
    prompt_text: str,
    message: str | None = None,
    mode: str | None = None,
    record_learning: bool = True,
    apply_gate_fixes: bool = True,
    sanitize_closer: Any | None = None,
    timing: OrbChatTimingTracker | None = None,
) -> tuple[str, dict[str, Any]]:
    """Run quality gate + optional learning ledger; return answer and context fragments."""
    packet = dict(indicare_intelligence or {})
    meta: dict[str, Any] = {}
    if not packet:
        return answer, meta

    if timing:
        timing.mark("finalise_start")

    quality_gate = indicare_intelligence_core_service.evaluate_answer(packet, answer)
    meta["answer_quality_gate"] = quality_gate

    summary = intelligence_context_summary(packet, quality_gate=quality_gate, mode=mode)
    meta["indicare_intelligence"] = summary
    meta["indicare_intelligence_core"] = summary

    if timing:
        timing.mark("quality_gate_complete")

    if apply_gate_fixes and not quality_gate.get("passed"):
        answer = apply_quality_gate_answer_fixes(
            answer,
            quality_gate=quality_gate,
            message=message or prompt_text,
            mode=mode or "Ask ORB",
            sanitize_closer=sanitize_closer,
        )

    family_id = detect_contract_family(message or prompt_text)

    repaired_answer, contract_meta = repair_and_validate_final_answer(
        answer,
        contract_family=family_id,
        message=message or prompt_text,
        mode=mode,
        fast_opening=None,
    )
    answer = repaired_answer
    answer = sanitize_visible_final_answer(answer, source_text=message or prompt_text)
    meta["selected_contract"] = family_id
    meta["final_answer_validation_passed"] = contract_meta.get("final_answer_validation_passed")
    meta["final_answer_repair_applied"] = contract_meta.get("repair_applied", False)
    meta["answer_repaired"] = contract_meta.get("answer_repaired", False)
    if contract_meta.get("repair_reason"):
        meta["repair_reason"] = contract_meta.get("repair_reason")
    if packet.get("prompt_char_estimate") is not None:
        meta["prompt_chars"] = packet.get("prompt_char_estimate")
    if packet.get("retrieval_count") is not None:
        meta["retrieval_count"] = packet.get("retrieval_count")
    if packet.get("embedding_calls") is not None:
        meta["embedding_calls"] = packet.get("embedding_calls")

    if record_learning:
        try:
            learning = indicare_intelligence_core_service.record_learning(packet, prompt_text=prompt_text)
            meta["learning_ledger"] = learning
        except Exception as exc:
            logger.warning(
                "learning_ledger_record_failed error_type=%s",
                type(exc).__name__,
            )
            meta["learning_ledger"] = {
                "recorded": False,
                "error": type(exc).__name__,
            }
        if timing:
            timing.mark("ledger_complete")

    return answer, meta


def merge_intelligence_into_context(
    context_used: dict[str, Any],
    intelligence_meta: dict[str, Any],
) -> dict[str, Any]:
    merged = dict(context_used)
    for key in ("indicare_intelligence", "indicare_intelligence_core", "answer_quality_gate", "learning_ledger"):
        if key in intelligence_meta:
            merged[key] = intelligence_meta[key]
    return merged


def is_care_related_action(action_id: str) -> bool:
    return action_id in CARE_RELATED_ACTION_IDS


def legacy_expert_brain_alias(retrieval_bundle: dict[str, Any]) -> dict[str, Any]:
    """Map legacy expert_brain_9 consumers to indicare_intelligence_core summary."""
    intel = retrieval_bundle.get("indicare_intelligence") or {}
    legacy = retrieval_bundle.get("expert_brain_9") or {}
    summary = intelligence_context_summary(intel)
    if summary:
        return {**legacy, "indicare_intelligence_core": summary, "active": True}
    return legacy
