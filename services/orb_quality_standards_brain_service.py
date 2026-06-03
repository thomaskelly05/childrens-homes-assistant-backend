"""Quality Standards Brain — QS spine for ORB residential answers."""

from __future__ import annotations

import json
import os
from typing import Any

_QS_PATH = os.path.join(
    os.path.dirname(__file__), "..", "assistant", "knowledge", "orb_quality_standards_brain.json"
)

_TRIGGER_STANDARD_MAP: list[tuple[tuple[str, ...], list[str]]] = [
    (("missing", "safeguard", "exploit", "lado", "allegation"), ["qs7_protection"]),
    (("record", "rewrite", "daily log", "incident"), ["qs2_child_voice", "qs9_care_planning"]),
    (("ofsted", "inspection", "evidence"), ["qs8_leadership", "qs7_protection"]),
    (("reg 44", "reg 45", "visitor"), ["qs8_leadership"]),
    (("school", "education", "attendance", "ehcp"), ["qs3_education"]),
    (("self-harm", "health", "medication", "camhs"), ["qs5_health_wellbeing", "qs7_protection"]),
    (("restraint", "behaviour", "kicked off"), ["qs6_positive_relationships", "qs7_protection"]),
    (("listen", "voice", "wish", "feel"), ["qs2_child_voice"]),
    (("plan", "chronology", "risk assessment"), ["qs9_care_planning"]),
]


class OrbQualityStandardsBrainService:
    def __init__(self) -> None:
        self._data: dict[str, Any] | None = None

    def _load(self) -> dict[str, Any]:
        if self._data is None:
            with open(os.path.normpath(_QS_PATH), encoding="utf-8") as f:
                self._data = json.load(f)
        return self._data

    def list_standards(self) -> list[dict[str, Any]]:
        return list(self._load().get("standards") or [])

    def get_standard(self, standard_id: str) -> dict[str, Any] | None:
        for s in self.list_standards():
            if s.get("standard_id") == standard_id:
                return dict(s)
        return None

    def standards_for_message(self, message: str) -> list[dict[str, Any]]:
        lower = str(message or "").lower()
        ids: list[str] = []
        for triggers, standard_ids in _TRIGGER_STANDARD_MAP:
            if any(t in lower for t in triggers):
                for sid in standard_ids:
                    if sid not in ids:
                        ids.append(sid)
        if not ids:
            ids = ["qs1_quality_and_purpose", "qs7_protection"]
        return [self.get_standard(sid) for sid in ids if self.get_standard(sid)]

    def prompt_block(self, message: str) -> str:
        standards = self.standards_for_message(message)
        if not standards:
            return ""
        lines = ["Quality Standards lens (Children's Homes Regulations guide):"]
        for s in standards[:3]:
            lines.append(f"- {s.get('name')} ({s.get('regulation')}): child asks — {s.get('child_question')}")
            markers = s.get("evidence_markers") or []
            if markers:
                lines.append(f"  Evidence to look for: {', '.join(markers[:3])}")
            risks = s.get("risk_markers") or []
            if risks:
                lines.append(f"  Risk if weak: {', '.join(risks[:2])}")
        return "\n".join(lines)


orb_quality_standards_brain_service = OrbQualityStandardsBrainService()
