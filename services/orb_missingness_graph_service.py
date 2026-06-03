"""Missingness graph linking gaps, standards, lenses and sequences."""

from __future__ import annotations

import json
import os
from typing import Any

from services.orb_gap_detection_service import orb_gap_detection_service
from services.orb_quality_standards_brain_service import orb_quality_standards_brain_service
from services.orb_whole_child_lens_service import orb_whole_child_lens_service

_SEQ_PATH = os.path.join(os.path.dirname(__file__), "..", "assistant", "knowledge", "orb_scenario_sequences.json")


class OrbMissingnessGraphService:
    def build_graph(
        self,
        message: str,
        *,
        risk_level: str | None = None,
        sequence_id: str | None = None,
    ) -> dict[str, Any]:
        gaps = orb_gap_detection_service.detect_from_message(message)
        lens = orb_whole_child_lens_service.map_scenario(message, risk_level=risk_level)
        standards = orb_quality_standards_brain_service.standards_for_message(message)
        sequence = self._sequence(sequence_id, message)

        nodes = []
        for g in gaps:
            nodes.append({"type": "gap", "id": g["gap_id"], "severity": g["severity"]})
        for d in lens.get("domains") or []:
            nodes.append({"type": "domain", "id": d})
        for s in standards:
            nodes.append({"type": "quality_standard", "id": s.get("standard_id")})

        edges = []
        for g in gaps:
            if g.get("quality_standard"):
                edges.append({"from": g["gap_id"], "to": g["quality_standard"], "relation": "affects"})
            if g.get("professional_lens"):
                edges.append({"from": g["gap_id"], "to": g["professional_lens"], "relation": "lens"})

        return {
            "nodes": nodes,
            "edges": edges,
            "gaps": gaps,
            "sequence": sequence,
            "whole_child_lens": lens,
            "quality_standards": [s.get("standard_id") for s in standards],
            "manager_review_required": any(g.get("manager_review_required") for g in gaps),
        }

    def _sequence(self, sequence_id: str | None, message: str) -> dict[str, Any] | None:
        with open(os.path.normpath(_SEQ_PATH), encoding="utf-8") as f:
            data = json.load(f)
        sequences = data.get("sequences") or {}
        if sequence_id and sequence_id in sequences:
            return sequences[sequence_id]
        lower = str(message or "").lower()
        if "missing" in lower:
            return sequences.get("missing_episode")
        if "allegation" in lower or "staff" in lower and "hurt" in lower:
            return sequences.get("allegation_against_staff")
        if "self-harm" in lower or "self harm" in lower:
            return sequences.get("self_harm")
        if "restraint" in lower:
            return sequences.get("restraint")
        if "ofsted" in lower:
            return sequences.get("ofsted_readiness")
        if "snapchat" in lower or "social media" in lower:
            return sequences.get("professional_boundary_social_media")
        if "reg 44" in lower or "reg 45" in lower:
            return sequences.get("reg44_reg45")
        if "nobody listens" in lower or "hate living" in lower:
            return sequences.get("child_voice_mismatch")
        return None


orb_missingness_graph_service = OrbMissingnessGraphService()
