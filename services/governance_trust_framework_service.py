from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class GovernanceTrustSnapshot:
    created_at: str
    surface: str
    cognition_version: str
    confidence: str
    human_review_required: bool
    safeguarding_boundary_active: bool
    ofsted_grade_prediction_blocked: bool
    live_record_access_claimed: bool
    evidence_lineage_present: bool
    explainability_present: bool
    governance_notes: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class GovernanceTrustFrameworkService:
    """Governance trust framework for regulated ORB cognition.

    This is a persistence-ready audit snapshot builder. It does not write to the
    database yet, but it creates the structure needed for future audit trails,
    AI assurance, safeguarding defensibility and provider governance review.
    """

    VERSION = "governance-trust-framework-v1"

    def build_snapshot(
        self,
        *,
        surface: str,
        cognition_context: dict[str, Any] | None = None,
        confidence: str | None = None,
    ) -> dict[str, Any]:
        context = cognition_context or {}
        standalone = context.get("standalone_boundaries") or {}
        trust = GovernanceTrustSnapshot(
            created_at=datetime.now(timezone.utc).isoformat(),
            surface=surface,
            cognition_version=str(context.get("version") or self.VERSION),
            confidence=confidence or str((context.get("confidence_calibration") or {}).get("confidence") or "medium"),
            human_review_required=bool(standalone.get("human_review_required_for_safeguarding", True)),
            safeguarding_boundary_active=True,
            ofsted_grade_prediction_blocked=bool(standalone.get("no_ofsted_grade_prediction", True)),
            live_record_access_claimed=bool(standalone.get("live_records_accessed") is True),
            evidence_lineage_present=bool(context.get("evidence_lineage")),
            explainability_present=bool(context.get("explainability")),
            governance_notes=tuple(self._notes(context)),
        )
        return trust.to_dict()

    def prompt_addendum(self, *, surface: str, cognition_context: dict[str, Any] | None = None) -> str:
        snapshot = self.build_snapshot(surface=surface, cognition_context=cognition_context)
        lines = [
            "Governance trust framework:",
            f"- Surface: {snapshot['surface']}",
            f"- Cognition version: {snapshot['cognition_version']}",
            f"- Confidence: {snapshot['confidence']}",
            f"- Human review required: {snapshot['human_review_required']}",
            f"- Evidence lineage present: {snapshot['evidence_lineage_present']}",
            f"- Explainability present: {snapshot['explainability_present']}",
            f"- Ofsted grade prediction blocked: {snapshot['ofsted_grade_prediction_blocked']}",
        ]
        if snapshot["governance_notes"]:
            lines.append("- Governance notes: " + "; ".join(snapshot["governance_notes"]))
        return "\n".join(lines)

    def _notes(self, context: dict[str, Any]) -> list[str]:
        notes = [
            "ORB guidance must remain advisory and bounded by professional judgement.",
            "Safeguarding decisions must remain with humans and local procedures.",
        ]
        confidence = str((context.get("confidence_calibration") or {}).get("confidence") or "").lower()
        if confidence == "low":
            notes.append("Low confidence response should state uncertainty and ask for missing evidence.")
        priority = str((context.get("priority") or {}).get("top_priority") or "")
        if priority == "safeguarding_first":
            notes.append("Safeguarding priority detected; response should foreground safety and escalation boundaries.")
        return notes


governance_trust_framework_service = GovernanceTrustFrameworkService()
