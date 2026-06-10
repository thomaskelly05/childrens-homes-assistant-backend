"""Universal ORB response contracts — mode/feature/action surfaces via assistant contracts.

Extends mandatory high-risk contracts with structured shapes for daily recording,
incidents, manager oversight, inspection and document surfaces. Reuses
``assistant.response_contracts`` — does not duplicate contract definitions.
"""

from __future__ import annotations

from typing import Any

from assistant.response_contracts import build_contract_prompt_block, get_contract, normalise_contract_mode
from services.orb_universal_answer_contract_map_service import (
    detect_contract_family,
    get_contract_family,
)

# Extra shape hints per resolved contract mode (orchestrator-selected, not separate brains).
SURFACE_CONTRACT_HINTS: dict[str, list[str]] = {
    "recording": [
        "Factual language; no invented facts.",
        "Child voice where known; observation vs interpretation.",
        "Staff response, outcome, plan/next steps if relevant; manager review if significant.",
    ],
    "incident": [
        "Immediate safety; what happened; antecedents/triggers.",
        "Child voice; staff response; de-escalation/co-regulation.",
        "Injuries/damage/notifications if relevant; recording boundaries; follow-up and learning.",
    ],
    "guidance": [
        "Answer directly in residential children's home context.",
        "Clarify standalone limitations; do not pretend to access policy unless supplied.",
        "Suggest what to check locally.",
    ],
    "manager_review": [
        "What is known; what is missing; threshold/decision rationale.",
        "Plan updates; patterns; staff learning; evidence trail; follow-up owner/date.",
    ],
    "ofsted_view": [
        "Evidence; child experience; safeguarding effectiveness; leadership oversight.",
        "Progress since last review; shortfalls/actions; avoid predicting judgement grades.",
    ],
    "reg45": [
        "Evidence; child experience; safeguarding effectiveness; leadership oversight.",
        "Progress since last review; shortfalls/actions; avoid predicting judgement grades.",
    ],
    "handover": [
        "Concise shift-ready priorities, risks, child experience and manager attention.",
    ],
    "safeguarding": [
        "Immediate safety; facts vs concerns; escalation boundaries; recording requirements.",
    ],
    "rewrite": [
        "Transcript/document understanding; recording quality; no invented facts.",
        "Speaker/role awareness if available; template-specific structure.",
    ],
}

MODE_TO_CONTRACT: dict[str, str] = {
    "ask orb": "guidance",
    "general knowledge": "guidance",
    "policy explainer": "knowledge",
    "record this properly": "recording",
    "safeguarding thinking": "safeguarding",
    "ofsted lens": "ofsted_view",
    "manager copilot": "manager_review",
    "staff coach": "guidance",
    "reg 44 / reg 45 prep": "reg45",
    "therapeutic reframe": "guidance",
    "reflect with orb": "reflection",
    "scenario simulator": "guidance",
}

FEATURE_TO_CONTRACT: dict[str, str] = {
    "conversation": "guidance",
    "action_engine": "guidance",
    "dictate": "recording",
    "dictate_analyze": "recording",
    "dictate_edit": "rewrite",
    "write": "recording",
    "voice": "guidance",
    "template": "recording",
    "document_intelligence": "guidance",
    "review_this": "manager_review",
    "learning_micro": "guidance",
}

ACTION_TO_CONTRACT: dict[str, str] = {
    "what_am_i_missing": "manager_review",
    "convert_to_recording_wording": "recording",
    "create_manager_oversight_note": "manager_review",
    "add_safeguarding_lens": "safeguarding",
    "add_ofsted_lens": "ofsted_view",
    "shift_handover_summary": "handover",
    "build_shift_plan": "handover",
    "add_child_voice_prompt": "recording",
    "therapeutic_reframe": "guidance",
    "supervision_prompt": "supervision",
    "create_chronology_suggestion": "chronology",
}

NOTE_TYPE_TO_CONTRACT: dict[str, str] = {
    "daily_record": "recording",
    "incident_record": "incident",
    "keywork_session": "guidance",
    "handover_note": "handover",
    "supervision_reflection": "supervision",
    "team_meeting": "recording",
    "staff_debrief": "reflection",
}

LENS_TO_CONTRACT: dict[str, str] = {
    "reg44": "reg45",
    "reg45": "reg45",
    "ofsted": "ofsted_view",
    "safeguarding": "safeguarding",
    "manager_oversight": "manager_review",
    "recording_quality": "recording",
    "what_is_missing": "manager_review",
}

PUBLIC_CONSIDERATION_MAP: dict[str, str] = {
    "safeguarding": "Safeguarding responsibilities",
    "recording": "Child-centred recording",
    "incident": "Child-centred recording",
    "manager_review": "Leadership and oversight",
    "ofsted_view": "Inspection readiness",
    "reg45": "Inspection readiness",
    "guidance": "Residential childcare practice",
    "knowledge": "Residential childcare practice",
    "rewrite": "Recording quality",
    "handover": "Professional accountability",
    "reflection": "Therapeutic language",
    "supervision": "Professional accountability",
    "chronology": "Recording quality",
    "accessible_child_support_plan": "Child-centred planning",
    "template_generation": "Child-centred planning",
}

DEFAULT_PUBLIC = (
    "Residential childcare practice",
    "Therapeutic language",
    "Trauma-informed practice",
    "Child-centred recording",
    "Professional curiosity",
    "Recording quality",
)


class OrbUniversalResponseContractService:
    VERSION = "orb-universal-response-contract-v1"

    def resolve_contract_mode(
        self,
        *,
        mode: str | None = None,
        feature: str | None = None,
        requested_action: str | None = None,
        note_type: str | None = None,
        document_lens: str | None = None,
        source_surface: str | None = None,
    ) -> str:
        if requested_action:
            action_key = str(requested_action).strip().lower()
            if action_key in ACTION_TO_CONTRACT:
                return ACTION_TO_CONTRACT[action_key]
        if note_type:
            note_key = str(note_type).strip().lower()
            if note_key in NOTE_TYPE_TO_CONTRACT:
                return NOTE_TYPE_TO_CONTRACT[note_key]
        if document_lens:
            lens_key = str(document_lens).strip().lower()
            if lens_key in LENS_TO_CONTRACT:
                return LENS_TO_CONTRACT[lens_key]
        if feature:
            feature_key = str(feature).strip().lower()
            if feature_key in FEATURE_TO_CONTRACT:
                return FEATURE_TO_CONTRACT[feature_key]
        if source_surface:
            surface_key = str(source_surface).strip().lower()
            if surface_key in FEATURE_TO_CONTRACT:
                return FEATURE_TO_CONTRACT[surface_key]
            if surface_key == "voice":
                return "guidance"
        mode_key = str(mode or "Ask ORB").strip().lower()
        return MODE_TO_CONTRACT.get(mode_key, normalise_contract_mode(mode))

    def contract_lines_for_surface(
        self,
        *,
        mode: str | None = None,
        feature: str | None = None,
        requested_action: str | None = None,
        note_type: str | None = None,
        document_lens: str | None = None,
        source_surface: str | None = None,
    ) -> list[str]:
        contract_mode = self.resolve_contract_mode(
            mode=mode,
            feature=feature,
            requested_action=requested_action,
            note_type=note_type,
            document_lens=document_lens,
            source_surface=source_surface,
        )
        contract = get_contract(contract_mode)
        lines: list[str] = []
        purpose = contract.get("purpose")
        if purpose:
            lines.append(f"Universal contract ({contract.get('ui_label', contract_mode)}): {purpose}")
        for section in contract.get("required_sections") or []:
            lines.append(f"Include: {section}")
        lines.extend(SURFACE_CONTRACT_HINTS.get(contract_mode, []))
        if source_surface == "voice":
            lines.extend(
                [
                    "Conversational, short turns; immediate safety if risk.",
                    "Offer to turn into record/template/action; same brain route as text.",
                ]
            )
        return _dedupe(lines)

    def build_prompt_block(
        self,
        *,
        mode: str | None = None,
        feature: str | None = None,
        requested_action: str | None = None,
        note_type: str | None = None,
        document_lens: str | None = None,
        source_surface: str | None = None,
    ) -> str:
        contract_mode = self.resolve_contract_mode(
            mode=mode,
            feature=feature,
            requested_action=requested_action,
            note_type=note_type,
            document_lens=document_lens,
            source_surface=source_surface,
        )
        base = build_contract_prompt_block(contract_mode, assistant_surface="standalone")
        hints = SURFACE_CONTRACT_HINTS.get(contract_mode) or []
        if not hints:
            return base
        hint_block = "Surface shape hints:\n" + "\n".join(f"- {line}" for line in hints)
        return f"{base}\n\n{hint_block}".strip()

    def public_considerations_for(
        self,
        *,
        contract_mode: str | None = None,
        scenario_types: list[str] | None = None,
        risk_level: str = "low",
        active_brains: list[str] | None = None,
        contract_family: str | None = None,
        message: str | None = None,
        requested_action: str | None = None,
        note_type: str | None = None,
        source_surface: str | None = None,
        feature: str | None = None,
    ) -> list[str]:
        considerations: list[str] = []
        family_id = contract_family or detect_contract_family(
            message or "",
            scenario_types=scenario_types,
            requested_action=requested_action,
            note_type=note_type,
            source_surface=source_surface,
            feature=feature,
        )
        family = get_contract_family(family_id)
        if family:
            considerations.extend(family.get("public_considerations") or [])
        if scenario_types or risk_level in {"high", "critical"}:
            considerations.append("Safeguarding responsibilities")
        if contract_mode:
            mapped = PUBLIC_CONSIDERATION_MAP.get(contract_mode)
            if mapped:
                considerations.append(mapped)
        brains_text = " ".join(active_brains or []).lower()
        if "recording" in brains_text or "child_voice" in brains_text:
            considerations.append("Child-centred recording")
        if "therapeutic" in brains_text:
            considerations.append("Therapeutic language")
        if "manager" in brains_text or "leadership" in brains_text or "governance" in brains_text:
            considerations.append("Leadership and oversight")
        if "ofsted" in brains_text or "inspection" in brains_text or "regulatory" in brains_text:
            considerations.append("Inspection readiness")
        for item in DEFAULT_PUBLIC:
            considerations.append(item)
        return _dedupe(considerations)[:8]

    def resolve_contract_family(
        self,
        *,
        message: str,
        scenario_types: list[str] | None = None,
        requested_action: str | None = None,
        note_type: str | None = None,
        source_surface: str | None = None,
        feature: str | None = None,
    ) -> str | None:
        return detect_contract_family(
            message,
            scenario_types=scenario_types,
            requested_action=requested_action,
            note_type=note_type,
            source_surface=source_surface,
            feature=feature,
        )

    def depth_tier_for(
        self,
        *,
        scenario_types: list[str] | None = None,
        risk_level: str = "low",
        contract_mode: str | None = None,
        feature: str | None = None,
        requested_action: str | None = None,
        message: str | None = None,
        source_surface: str | None = None,
        note_type: str | None = None,
    ) -> str:
        family_id = detect_contract_family(
            message or "",
            scenario_types=scenario_types,
            requested_action=requested_action,
            note_type=note_type,
            source_surface=source_surface,
            feature=feature,
        )
        family = get_contract_family(family_id)
        if family and family.get("depth_tier"):
            return str(family["depth_tier"])
        if scenario_types:
            return "mandatory"
        if risk_level == "critical":
            return "mandatory"
        enhanced_modes = {"manager_review", "ofsted_view", "reg45", "safeguarding"}
        enhanced_features = {
            "document_intelligence",
            "review_this",
            "dictate_analyze",
        }
        enhanced_actions = {
            "what_am_i_missing",
            "create_manager_oversight_note",
            "add_safeguarding_lens",
            "add_ofsted_lens",
        }
        if contract_mode in enhanced_modes:
            return "enhanced"
        if feature in enhanced_features:
            return "enhanced"
        if requested_action in enhanced_actions:
            return "enhanced"
        standard_features = {"dictate", "write", "template", "action_engine", "conversation"}
        standard_modes = {"recording", "incident", "handover", "rewrite", "chronology"}
        if feature in standard_features or contract_mode in standard_modes:
            return "standard"
        return "light"


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


orb_universal_response_contract_service = OrbUniversalResponseContractService()
