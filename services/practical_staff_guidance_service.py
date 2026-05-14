from __future__ import annotations

from typing import Any

from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, citation, record_text, safe_payload, scope_records


GUIDANCE_PATTERNS: tuple[tuple[str, tuple[str, ...], str], ...] = (
    ("family-contact-reassurance", ("family", "contact", "mum", "dad"), "records suggest quiet reassurance after family contact may help."),
    ("familiar-staff", ("familiar staff", "key worker", "trusted staff"), "records suggest familiar staff support may help tonight."),
    ("sleep-education", ("sleep", "tired", "education", "school"), "pattern suggests education refusal may increase when poor sleep is recorded."),
    ("positive-place", ("mcdonald", "park", "football", "cooking", "music"), "records indicate a familiar positive interest or place may support engagement."),
    ("calm-space", ("heightened", "anxious", "space", "calm voice"), "records suggest calm space and low-demand reassurance may help."),
)


class PracticalStaffGuidanceService:
    """Creates concise, child-centred prompts that reduce staff cognitive load."""

    def generate(
        self,
        *,
        records: list[dict[str, Any]],
        young_person_id: int | str,
        home_id: int | str | None = None,
        child: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        scoped = scope_records(records, young_person_id=young_person_id, home_id=home_id)
        prompts = []
        for key, terms, summary in GUIDANCE_PATTERNS:
            evidence = [citation(record, reason=f"evidence found: guidance pattern {key} appears in visible record.") for record in scoped if any(term in record_text(record).lower() for term in terms)]
            if evidence:
                prompts.append(
                    {
                        "guidance_id": key,
                        "prompt": summary,
                        "evidence_refs": evidence[:4],
                        "tone": "practical_child_centred",
                    }
                )
        if not prompts:
            prompts.append(
                {
                    "guidance_id": "review-current-plan",
                    "prompt": "consider checking the current plan, child voice and recent handover notes.",
                    "evidence_refs": [],
                    "tone": "practical_child_centred",
                }
            )
        payload = {
            "summary": "records indicate staff guidance prompts are draft support only.",
            "young_person_id": young_person_id,
            "prompts": prompts,
            "protective_factors": self._protective(child or {}, scoped),
            "limitations": ["review recommended: guidance should be checked against current presentation and source records."],
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        }
        return safe_payload(payload)

    def _protective(self, child: dict[str, Any], records: list[dict[str, Any]]) -> list[str]:
        factors = []
        likes = child.get("likes") or []
        if isinstance(likes, list) and likes:
            factors.append(f"records indicate interests may support engagement: {', '.join(map(str, likes[:3]))}.")
        text = " ".join(record_text(record).lower() for record in records)
        if "settled" in text:
            factors.append("evidence found: settled presentation appears in recent records.")
        if "positive" in text:
            factors.append("evidence found: positive engagement appears in recent records.")
        return factors


practical_staff_guidance_service = PracticalStaffGuidanceService()
