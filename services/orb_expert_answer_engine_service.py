"""ORB Expert Answer Engine — scenario families into live answer reasoning packets.

Deterministic recognition, compact expert packets, role shaping, source anchors,
and local answer self-check (no OpenAI in default evaluation path).
"""

from __future__ import annotations

import re
from typing import Any

from assistant.knowledge.orb_expert_scenario_families import ORB_SCENARIO_FAMILIES
from services.orb_citation_decision_service import orb_citation_decision_service
from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
from services.orb_expert_scenario_evaluator_service import (
    OVERCLAIM_PATTERNS,
    UNSAFE_PATTERNS,
    _marker_present,
    _normalise,
)
from services.orb_human_practice_brain_service import orb_human_practice_brain_service

_RISK_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}

# Extra phrase → family boosts (beyond family common_triggers).
_EXTRA_PHRASE_FAMILIES: list[tuple[str, str]] = [
    ("returned late", "late_return"),
    ("where they were", "missing_from_care"),
    ("police", "missing_from_care"),
    ("car", "unknown_adult_vehicle"),
    ("vape", "cse_concern"),
    ("cash", "cse_concern"),
    ("money", "cse_concern"),
    ("gifts", "cse_concern"),
    ("hotel", "cse_concern"),
    ("party", "cse_concern"),
    ("not grassing", "cce_county_lines"),
    ("arm hurts", "restraint_injury_complaint"),
    ("body map", "restraint_injury_complaint"),
    ("controlling", "opinion_based_record"),
    ("kicked off", "opinion_based_record"),
    ("level 3", "nvq_reflective_restraint"),
    ("diploma", "nvq_reflective_restraint"),
    ("assessor", "nvq_assessor_missing"),
    ("reflective account", "nvq_reflective_restraint"),
    ("independent visitor", "reg44_triangulation"),
    ("visitor report", "reg44_triangulation"),
    ("before my visit", "reg44_triangulation"),
    ("reg 44", "reg44_triangulation"),
    ("sccif", "ofsted_notification_uncertainty"),
    ("inspection", "ofsted_notification_uncertainty"),
    ("ofsted evidence", "ofsted_notification_uncertainty"),
    ("lado", "disclosure_abuse"),
    ("allegation", "disclosure_abuse"),
    ("no further issues", "record_no_further_issues"),
    ("manager oversight", "weak_manager_oversight"),
]

_ROLE_ALIASES_IN_MESSAGE: list[tuple[str, str]] = [
    ("registered manager", "registered_manager"),
    ("support worker", "residential_support_worker"),
    ("reg 44", "reg_44_visitor"),
    ("nvq assessor", "nvq_assessor"),
    ("nvq learner", "nvq_learner"),
    ("responsible individual", "responsible_individual"),
]

_HUMAN_VOICE_HINTS = (
    "Use practical residential-care voice: e.g. 'Based only on what you have provided…', "
    "'I would not treat this as routine.', 'The record is too thin for the level of risk.', "
    "'Do not write this as fact unless it happened.', 'The immediate gap is…'. "
    "Avoid corporate waffle, 'as an AI', and overclaiming."
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _combine_message(message: str, history: list[dict[str, Any]] | None) -> str:
    parts = [_lower(message)]
    for entry in (history or [])[-4:]:
        if str(entry.get("role") or "").lower() in ("user", "human"):
            parts.append(_lower(entry.get("content")))
    return " ".join(p for p in parts if p)


def _extract_profile_role(message: str, profile_role: str | None) -> str | None:
    if profile_role:
        return orb_human_practice_brain_service.normalize_role(profile_role)
    lower = _lower(message)
    match = re.search(r"role:\s*([^\n]+)", lower, re.I)
    if match:
        raw = match.group(1).strip()
        for phrase, key in _ROLE_ALIASES_IN_MESSAGE:
            if phrase in raw:
                return orb_human_practice_brain_service.normalize_role(key)
        return orb_human_practice_brain_service.normalize_role(raw.replace(" ", "_"))
    for phrase, key in _ROLE_ALIASES_IN_MESSAGE:
        if phrase in lower and "role:" in lower:
            return orb_human_practice_brain_service.normalize_role(key)
    return None


def _detect_output_mode(message: str, mode: str | None) -> str | None:
    lower = _lower(message)
    mode_lower = _lower(mode)
    if "reg 44" in lower or "reg44" in lower or "reg 44" in mode_lower:
        return "reg44_questions"
    if "ofsted" in lower or "sccif" in lower or "ofsted lens" in mode_lower:
        return "ofsted_lens"
    if any(t in lower for t in ("nvq", "diploma", "criteria", "assessor", "reflective account")):
        return "nvq_evidence_mapping"
    if "safeguarding" in mode_lower or "safeguarding lens" in lower:
        return "safeguarding_lens"
    if any(t in lower for t in ("ri ", "responsible individual", "governance", "provider drift")):
        return "ri_governance"
    return None


def _score_families(combined: str) -> list[tuple[str, int]]:
    scores: dict[str, int] = {}
    for family in ORB_SCENARIO_FAMILIES:
        fid = family["id"]
        for trigger in family.get("common_triggers") or []:
            if trigger.lower() in combined:
                scores[fid] = scores.get(fid, 0) + 2
        for flag in family.get("red_flags") or []:
            if flag.lower() in combined:
                scores[fid] = scores.get(fid, 0) + 1
    for phrase, fid in _EXTRA_PHRASE_FAMILIES:
        if phrase in combined:
            scores[fid] = scores.get(fid, 0) + 2
    if "missing" in combined and any(t in combined for t in ("returned", "absent", "awol", "run away")):
        scores["missing_from_care"] = scores.get("missing_from_care", 0) + 4
    if "restraint" in combined or "physical intervention" in combined or "held" in combined:
        scores["physical_intervention"] = scores.get("physical_intervention", 0) + 2
    if "hurt" in combined or "injury" in combined or "bruise" in combined:
        scores["restraint_injury_complaint"] = scores.get("restraint_injury_complaint", 0) + 2
    if "abuse" in combined or "disclosure" in combined:
        scores["disclosure_abuse"] = scores.get("disclosure_abuse", 0) + 2
    ranked = sorted(scores.items(), key=lambda x: (-x[1], x[0]))
    return [(fid, sc) for fid, sc in ranked if sc > 0]


def _risk_level_for_families(family_ids: list[str]) -> str:
    best = "low"
    families = {f["id"]: f for f in ORB_SCENARIO_FAMILIES}
    for fid in family_ids:
        level = str((families.get(fid) or {}).get("default_risk_level") or "medium")
        if _RISK_ORDER.get(level, 1) > _RISK_ORDER.get(best, 0):
            best = level
    return best


def _merge_unique(items: list[str], limit: int = 12) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.lower().strip()
        if key and key not in seen:
            seen.add(key)
            out.append(item)
        if len(out) >= limit:
            break
    return out


class OrbExpertAnswerEngineService:
    """Convert user prompts into expert reasoning packets for live ORB answers."""

    def classify_scenario(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_role: str | None = None,
        history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        combined = _combine_message(message, history)
        ranked = _score_families(combined)
        primary_family = ranked[0][0] if ranked else None
        secondary = [fid for fid, _ in ranked[1:6]]
        confidence = "high" if ranked and ranked[0][1] >= 4 else "medium" if ranked else "low"
        if ranked and ranked[0][1] >= 2:
            confidence = "medium" if confidence == "low" else confidence

        family_map = {f["id"]: f for f in ORB_SCENARIO_FAMILIES}
        detected_markers: list[str] = []
        red_flags: list[str] = []
        evidence_gaps: list[str] = []
        for fid, _ in ranked[:4]:
            fam = family_map.get(fid) or {}
            red_flags.extend(fam.get("red_flags") or [])
            detected_markers.extend(fam.get("red_flags") or [])
        gold_ctx = orb_expert_scenario_bank_service.detect_expert_context(message)
        if gold_ctx.get("expected_markers"):
            detected_markers.extend(gold_ctx["expected_markers"])

        possible_roles: list[str] = []
        for fid in ([primary_family] if primary_family else []) + secondary:
            fam = family_map.get(fid) or {}
            possible_roles.extend(fam.get("likely_roles") or [])
        role = _extract_profile_role(message, profile_role)
        if role:
            possible_roles.insert(0, role)

        output_mode = _detect_output_mode(message, mode)
        all_families = ([primary_family] if primary_family else []) + secondary
        anchor_ids: list[str] = []
        for fid in all_families:
            fam = family_map.get(fid) or {}
            anchor_ids.extend(fam.get("likely_source_anchors") or [])
        anchor_ids.extend(gold_ctx.get("source_anchors") or [])

        risk_level = _risk_level_for_families(all_families) if all_families else "low"
        should_expert = bool(primary_family) and len(combined.split()) >= 3
        should_deep = risk_level in ("high", "critical") or output_mode == "safeguarding_lens"
        if any(t in combined for t in ("abuse", "disclosure", "lado", "immediate danger", "suicide")):
            should_deep = True

        return {
            "primary_family": primary_family,
            "secondary_families": secondary,
            "confidence": confidence,
            "risk_level": risk_level,
            "output_mode": output_mode,
            "detected_markers": _merge_unique(detected_markers, 14),
            "detected_red_flags": _merge_unique(red_flags, 10),
            "detected_evidence_gaps": _merge_unique(evidence_gaps, 8),
            "possible_roles": _merge_unique([str(r) for r in possible_roles], 8),
            "source_anchor_ids": _merge_unique(anchor_ids, 10),
            "should_use_expert_engine": should_expert,
            "should_use_deep_safety": should_deep,
            "gold_scenario_id": gold_ctx.get("gold_scenario_id"),
        }

    def build_expert_answer_packet(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_role: str | None = None,
        history: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        classification = self.classify_scenario(
            message, mode=mode, profile_role=profile_role, history=history
        )
        if not classification.get("should_use_expert_engine"):
            return {"classification": classification, "active": False}

        family_map = {f["id"]: f for f in ORB_SCENARIO_FAMILIES}
        family_ids = ([classification["primary_family"]] if classification.get("primary_family") else []) + (
            classification.get("secondary_families") or []
        )

        red_flags: list[str] = []
        what_to_check: list[str] = []
        what_to_record: list[str] = []
        what_to_escalate: list[str] = []
        oversight: list[str] = []
        reg44_q: list[str] = []
        ofsted_pts: list[str] = [
            "Child experience and impact visible in the record?",
            "Leadership oversight and follow-up evidenced?",
            "SCCIF/Quality Standards themes — no grade prediction.",
        ]
        nvq_pts: list[str] = []
        must_not: list[str] = list(_COMMON_MUST_NOT)
        self_check: list[str] = []

        for fid in family_ids[:5]:
            fam = family_map.get(fid) or {}
            red_flags.extend(fam.get("red_flags") or [])
            for lens in fam.get("expected_lenses") or []:
                what_to_check.append(lens)
            what_to_record.extend(fam.get("typical_records") or [])
            what_to_escalate.extend(fam.get("typical_actions") or [])
            oversight.extend(fam.get("typical_manager_oversight") or [])
            reg44_q.extend(fam.get("typical_reg44_questions") or [])
            nvq_pts.extend(fam.get("typical_nvq_learning") or [])
            if fam.get("default_risk_level") in ("high", "critical"):
                self_check.append(f"Address {fam.get('label', fid)} risks explicitly")

        gold_ctx = orb_expert_scenario_bank_service.detect_expert_context(message)
        gold = None
        if gold_ctx.get("gold_scenario_id"):
            gold = orb_expert_scenario_bank_service.get_gold_scenario(gold_ctx["gold_scenario_id"])
        if gold:
            what_to_record.extend(gold.get("expected_recording_points") or [])
            oversight.extend(gold.get("expected_manager_oversight") or [])
            reg44_q.extend(gold.get("expected_reg44_questions") or [])
            nvq_pts.extend(gold.get("expected_nvq_evidence") or [])
            must_not.extend(gold.get("must_not_say") or [])
            self_check.extend(gold.get("expected_markers") or [])

        role = _extract_profile_role(message, profile_role)
        output_mode = classification.get("output_mode")
        anchors = orb_citation_decision_service.select_sources(
            family_id=classification.get("primary_family") or "missing_from_care",
            role=role,
            output_mode=output_mode,
            scenario_anchors=classification.get("source_anchor_ids"),
            max_sources=6,
        )

        role_guidance = ""
        if role:
            role_guidance = orb_human_practice_brain_service.build_role_shaping_block(role)

        answer_shape = self._answer_shape(classification, role)

        return {
            "active": True,
            "classification": classification,
            "scenario_families": [
                {"id": fid, "label": (family_map.get(fid) or {}).get("label", fid)} for fid in family_ids[:5]
            ],
            "red_flags": _merge_unique(red_flags, 12),
            "what_to_check": _merge_unique(what_to_check, 12),
            "what_to_record": _merge_unique(what_to_record, 12),
            "what_to_escalate": _merge_unique(what_to_escalate, 10),
            "manager_oversight_points": _merge_unique(oversight, 10),
            "reg44_questions": _merge_unique(reg44_q, 8),
            "ofsted_evidence_points": _merge_unique(ofsted_pts or reg44_q, 8),
            "nvq_learning_points": _merge_unique(nvq_pts, 8),
            "must_not_say": _merge_unique(must_not, 12),
            "source_anchors": anchors,
            "role_guidance": role_guidance,
            "role_lens": role,
            "answer_shape": answer_shape,
            "self_check_markers": _merge_unique(self_check + classification.get("detected_markers", []), 14),
            "human_voice": _HUMAN_VOICE_HINTS,
        }

    def build_prompt_block(self, packet: dict[str, Any]) -> str:
        if not packet.get("active"):
            return ""
        classification = packet.get("classification") or {}
        primary = classification.get("primary_family")
        secondary = classification.get("secondary_families") or []
        lines = [
            "Expert residential practice packet (from scenario families — do not invent facts):",
            f"- Primary situation: {primary}",
        ]
        if secondary:
            lines.append(f"- Also consider: {', '.join(secondary[:4])}")
        if packet.get("red_flags"):
            lines.append("- Red flags to keep in mind:")
            for item in packet["red_flags"][:6]:
                lines.append(f"  - {item}")
        if packet.get("what_to_check"):
            lines.append("- What to check now:")
            for item in packet["what_to_check"][:5]:
                lines.append(f"  - {item}")
        if packet.get("what_to_record"):
            lines.append("- What to record:")
            for item in packet["what_to_record"][:5]:
                lines.append(f"  - {item}")
        if packet.get("manager_oversight_points"):
            lines.append("- Manager oversight:")
            for item in packet["manager_oversight_points"][:4]:
                lines.append(f"  - {item}")
        must_not = packet.get("must_not_say") or []
        if must_not:
            lines.append("- Must not say / overclaim:")
            for item in must_not[:4]:
                lines.append(f"  - {item}")
        if packet.get("role_guidance"):
            lines.append(packet["role_guidance"])
        lines.append(packet.get("human_voice") or _HUMAN_VOICE_HINTS)
        if packet.get("answer_shape"):
            lines.append(f"- Answer shape: {packet['answer_shape']}")
        return "\n".join(lines)

    def evaluate_answer_light(
        self,
        packet: dict[str, Any],
        answer: str,
        *,
        citations: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Local marker checks only — no OpenAI."""
        if not packet.get("active"):
            return {"warnings": [], "critical": []}

        answer_norm = _normalise(answer)
        warnings: list[str] = []
        critical: list[str] = []

        markers = packet.get("self_check_markers") or []
        missing = [m for m in markers[:10] if not _marker_present(answer, m)]
        for m in missing[:5]:
            warnings.append(f"missing_marker:{m[:60]}")

        denies_os = any(
            phrase in answer_norm
            for phrase in (
                "not checked live indicare",
                "have not checked live",
                "based only on what you have provided",
            )
        )
        for pattern, label in UNSAFE_PATTERNS:
            if label == "claims_live_os_records" and denies_os:
                continue
            if re.search(pattern, answer_norm, re.I):
                warnings.append(f"unsafe:{label}")
                if label in ("invented_body_map", "definite_referral", "claims_live_os_records"):
                    critical.append(label)

        for pattern, label in OVERCLAIM_PATTERNS:
            if re.search(pattern, answer_norm, re.I):
                warnings.append(f"overclaim:{label}")

        classification = packet.get("classification") or {}
        red_flags = classification.get("detected_red_flags") or []
        combined = answer_norm
        if "unknown adult" in " ".join(red_flags).lower() or "vehicle" in " ".join(red_flags).lower():
            if "unknown adult" not in combined and "vehicle" not in combined:
                if any(fid in (classification.get("secondary_families") or []) + [classification.get("primary_family")]
                       for fid in ("unknown_adult_vehicle", "missing_from_care", "cse_concern")):
                    warnings.append("missing_marker:unknown adult/vehicle risk not addressed")
                    critical.append("missing_unknown_adult_vehicle")

        role = packet.get("role_lens")
        if role == "registered_manager" and not any(
            t in combined for t in ("oversight", "action owner", "review", "timescale", "manager")
        ):
            warnings.append("role_fit:manager oversight light")
        if role == "reg_44_visitor" and "triangulation" not in combined and "child voice" not in combined:
            if classification.get("output_mode") == "reg44_questions" or classification.get("primary_family") == "reg44_triangulation":
                warnings.append("role_fit:Reg 44 triangulation light")

        anchor_ids = [a.get("source_id") for a in (packet.get("source_anchors") or []) if a.get("source_id")]
        if anchor_ids and citations is not None:
            cited = {str(c.get("source_id") or c.get("label") or "").lower() for c in citations}
            for aid in anchor_ids[:4]:
                if not any(aid.lower() in c for c in cited):
                    warnings.append(f"source_gap:{aid}")

        return {
            "warnings": warnings,
            "critical": critical,
            "missing_markers": missing,
        }

    def metadata_for_context(self, packet: dict[str, Any], self_check: dict[str, Any] | None = None) -> dict[str, Any]:
        classification = packet.get("classification") or {}
        check = self_check or {}
        return {
            "detected_family": classification.get("primary_family"),
            "secondary_families": classification.get("secondary_families") or [],
            "risk_level": classification.get("risk_level"),
            "role_lens": packet.get("role_lens"),
            "source_anchors": packet.get("source_anchors") or [],
            "red_flags": packet.get("red_flags") or [],
            "evidence_gaps": classification.get("detected_evidence_gaps") or [],
            "self_check_warnings": check.get("warnings") or [],
            "prompt_block_used": bool(packet.get("active")),
            "expert_markers_used": packet.get("self_check_markers") or [],
        }

    def maybe_append_critical_note(self, answer: str, self_check: dict[str, Any]) -> str:
        critical = self_check.get("critical") or []
        if not critical:
            return answer
        notes: list[str] = []
        if "missing_unknown_adult_vehicle" in critical:
            notes.append("unknown adult/vehicle and exploitation indicators")
        if "invented_body_map" in critical:
            notes.append("do not state a body map was completed unless you know it was")
        if "definite_referral" in critical:
            notes.append("avoid definite referral yes/no — use proportionate escalation language")
        if not notes:
            return answer
        note = "Before you act, check: " + "; ".join(notes) + "."
        if note.lower() in answer.lower():
            return answer
        return f"{answer.rstrip()}\n\n{note}"

    def _answer_shape(self, classification: dict[str, Any], role: str | None) -> str:
        risk = classification.get("risk_level")
        if role == "residential_support_worker":
            return "What to do now → who to tell → what to record → when not to decide alone"
        if role == "registered_manager":
            return "Oversight → action owner/timescale → risk/plan review → evidence for Reg 44/Ofsted"
        if role == "reg_44_visitor":
            return "Triangulation → child voice → records to inspect → manager challenge questions"
        if role in ("nvq_assessor",):
            return "Criteria mapping → evidence gaps → authenticity → professional discussion prompts"
        if role in ("nvq_learner", "diploma_learner"):
            return "Plain criteria → reflective structure → evidence themes → what is still needed (no invention)"
        if role in ("responsible_individual", "provider_director"):
            return "Governance themes → drift/repeat → manager grip → impact evidence"
        if risk in ("high", "critical"):
            return "Immediate safety → facts vs gaps → escalation/recording → manager oversight"
        return "Practical steps → recording → oversight → sources/boundaries"


_COMMON_MUST_NOT = [
    "Do not state exploitation or abuse as fact unless evidenced in what the user provided.",
    "Do not write 'no further issues' if unresolved risks remain.",
    "Do not claim police, social care, body map, or referrals happened unless stated.",
    "Do not claim live IndiCare OS records were checked.",
]


orb_expert_answer_engine_service = OrbExpertAnswerEngineService()
