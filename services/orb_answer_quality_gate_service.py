"""ORB 9 answer quality gate — 12 dimensions with residential thresholds."""

from __future__ import annotations

import re
from typing import Any

from services.orb_answer_quality_service import orb_answer_quality_service
from services.orb_gap_detection_service import orb_gap_detection_service
from services.orb_source_citation_service import orb_source_citation_service
from schemas.orb_evaluation import OrbEvaluationRequest

_DIMENSIONS = (
    "safe",
    "specific",
    "residential",
    "child_centred",
    "trauma_informed",
    "source_grounded",
    "recording_aware",
    "manager_aware",
    "multi_agency_aware",
    "evidence_aware",
    "ofsted_aware",
    "missingness_aware",
)

_THRESHOLDS = {
    "critical": 85,
    "high": 85,
    "ofsted": 80,
    "reg44": 80,
    "recording": 75,
    "general": 65,
}

_UNSAFE_PATTERNS = [
    (r"\bwill be (outstanding|inadequate|good|requires improvement)\b", "grade_prediction"),
    (r"\b(diagnos(e|is|ed)|adhd confirmed|autism confirmed)\b", "diagnosis"),
    (r"\bchecked live indicare\b", "fake_os_access"),
    (r"\b(referral is|referral not) (required|needed)\b", "definite_referral"),
]


def _has_diagnosis_violation(text: str) -> bool:
    """True when answer makes a diagnostic claim — excludes negated safety disclaimers."""
    lower = str(text or "").lower()
    if re.search(r"\bnot a diagnos", lower):
        return False
    if re.search(r"\bnot diagnostic\b", lower):
        return False
    if re.search(r"\bcannot diagnos", lower):
        return False
    if re.search(r"\bdon'?t diagnos", lower):
        return False
    if re.search(r"\bdo not diagnos", lower):
        return False
    if re.search(r"\borb does not (?:provide|make)", lower) and "diagnos" in lower:
        return False
    return bool(re.search(r"\b(diagnos(e|is|ed)|adhd confirmed|autism confirmed)\b", lower, re.I))


class OrbAnswerQualityGateService:
    def evaluate_packet(
        self,
        packet: dict[str, Any],
        *,
        draft_answer: str | None = None,
    ) -> dict[str, Any]:
        classification = packet.get("classification") or {}
        risk = str(classification.get("risk_level") or packet.get("risk_level") or "medium").lower()
        message = str(packet.get("message") or classification.get("message") or "")
        answer = str(draft_answer or packet.get("draft_answer") or "")

        scores = self._score_dimensions(packet, answer, message, risk)
        composite = round(sum(scores.values()) / len(scores), 1) if scores else 0.0
        threshold = self._threshold_for(packet, risk)
        passed = composite >= threshold and scores.get("safe", 0) >= 0.85

        critical_flags = []
        lower = answer.lower()
        for pattern, label in _UNSAFE_PATTERNS:
            if label == "diagnosis":
                if _has_diagnosis_violation(answer):
                    critical_flags.append(label)
                    passed = False
                continue
            if re.search(pattern, lower, re.I):
                critical_flags.append(label)
                passed = False

        result = {
            "passed": passed,
            "composite_score": composite,
            "threshold": threshold,
            "dimension_scores": scores,
            "critical_flags": critical_flags,
            "rewrite_instructions": [] if passed else self._rewrite_instructions(scores, critical_flags),
            "expose_as": "final" if passed else "draft_internal",
        }
        return result

    def evaluate_text(
        self,
        answer_text: str,
        *,
        message: str = "",
        risk_level: str = "medium",
        source_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        packet = {
            "classification": {"risk_level": risk_level, "message": message},
            "message": message,
            "source_anchors": [{"source_id": s} for s in (source_ids or [])],
        }
        return self.evaluate_packet(packet, draft_answer=answer_text)

    def _threshold_for(self, packet: dict[str, Any], risk: str) -> int:
        mode = str(packet.get("mode") or "").lower()
        if risk in ("critical", "high"):
            return _THRESHOLDS["high"]
        if "ofsted" in mode or packet.get("output_mode") == "ofsted_lens":
            return _THRESHOLDS["ofsted"]
        if "reg 44" in mode or "reg 45" in mode:
            return _THRESHOLDS["reg44"]
        if "record" in mode:
            return _THRESHOLDS["recording"]
        return _THRESHOLDS["general"]

    def _score_dimensions(
        self,
        packet: dict[str, Any],
        answer: str,
        message: str,
        risk: str,
    ) -> dict[str, float]:
        lower = answer.lower()
        source_ids = [
            a.get("source_id")
            for a in (packet.get("source_anchors") or [])
            if a.get("source_id")
        ]
        citation = orb_source_citation_service.build_citation_basis(source_ids)
        gaps = orb_gap_detection_service.detect_from_message(message)
        gap_answer = orb_gap_detection_service.detect_from_answer(
            answer, expected_gaps=[g["gap_id"] for g in gaps[:5]]
        )

        if answer:
            legacy = orb_answer_quality_service.evaluate(
                OrbEvaluationRequest(answer_text=answer, sources=citation.get("citations"))
            )
            base_safe = min(d.score for d in legacy.dimensions if d.dimension == "standalone_boundary") if legacy.dimensions else 1.0
        else:
            base_safe = 1.0

        return {
            "safe": base_safe,
            "specific": 0.9 if len(answer) > 120 and message[:20].lower() in lower[:200] or any(
                w in lower for w in ("missing", "manager", "record", "child")
            ) else 0.5,
            "residential": 0.85 if any(t in lower for t in ("young person", "home", "placement", "staff")) else 0.55,
            "child_centred": 0.85 if any(t in lower for t in ("child", "voice", "young person")) else 0.5,
            "trauma_informed": 0.8 if not any(t in lower for t in ("manipulative", "attention seeking", "naughty")) else 0.3,
            "source_grounded": min(1.0, citation.get("source_confidence", 0.5) + (0.15 if "source" in lower or "basis" in lower else 0)),
            "recording_aware": 0.85 if "record" in lower else 0.55,
            "manager_aware": 0.85 if "manager" in lower or risk in ("high", "critical") else 0.6,
            "multi_agency_aware": 0.8 if any(t in lower for t in ("social worker", "police", "health", "lado")) else 0.55,
            "evidence_aware": 0.75 if any(t in lower for t in ("evidence", "impact", "oversight")) else 0.55,
            "ofsted_aware": 0.85 if ("ofsted" in lower or "sccif" in lower) and "grade" not in lower else 0.7,
            "missingness_aware": 0.85 if gap_answer or "missing" in lower or "gap" in lower else 0.55,
        }

    def _rewrite_instructions(self, scores: dict[str, float], critical: list[str]) -> list[str]:
        instructions = []
        for dim, score in scores.items():
            if score < 0.7:
                instructions.append(f"Strengthen {dim.replace('_', ' ')}")
        for flag in critical:
            instructions.append(f"Remove or fix: {flag}")
        if not instructions:
            instructions.append("Increase specificity, child voice, manager oversight and source basis")
        return instructions


orb_answer_quality_gate_service = OrbAnswerQualityGateService()
