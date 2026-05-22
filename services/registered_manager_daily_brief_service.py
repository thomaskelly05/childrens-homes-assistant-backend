from __future__ import annotations

from typing import Any

from services.evidence_graph_intelligence_service import evidence_graph_intelligence_service
from services.ofsted_judgement_simulation_service import ofsted_judgement_simulation_service
from services.pattern_detection_service import pattern_detection_service
from services.record_quality_intelligence_service import record_quality_intelligence_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, field


class RegisteredManagerDailyBriefService:
    """Registered Manager daily brief — decision support only."""

    def build_daily_brief(
        self,
        records: list[dict[str, Any]] | None = None,
        *,
        home_id: int | str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        days: int = 1,
    ) -> dict[str, Any]:
        items = list(records or [])
        patterns = pattern_detection_service.detect(records=items, home_id=home_id, days=max(1, days))
        quality = record_quality_intelligence_service.review_records(items)
        simulation = ofsted_judgement_simulation_service.simulate(items)
        graph = evidence_graph_intelligence_service.build(items)

        urgent: list[str] = []
        safeguarding: list[str] = []
        children: list[str] = []
        staff_support: list[str] = []
        signoff: list[str] = []
        overdue: list[str] = []
        ofsted_risks: list[str] = []
        recording: list[str] = []
        positive: list[str] = []
        actions: list[str] = []

        for pattern in patterns:
            if pattern.severity in {"high", "critical"} or pattern.manager_review_required:
                urgent.append(pattern.summary)
            if pattern.pattern_type in {
                "safeguarding_concern_repeated",
                "missing_episode_increase",
                "incident_increase",
                "restraint_increase",
                "manager_review_missing",
            }:
                safeguarding.append(pattern.summary)
            if pattern.pattern_type in {"child_voice_missing", "education_refusal_pattern", "medication_refusal_pattern"}:
                children.append(pattern.summary)
            if pattern.pattern_type in {"staff_debrief_missing", "weak_recording_quality"}:
                staff_support.append(pattern.summary)
            if pattern.pattern_type == "overdue_actions":
                overdue.append(pattern.summary)
            if pattern.recommended_reviews:
                actions.append(f"review recommended: {pattern.recommended_reviews[0]}")

        for review in quality:
            if review.manager_review_required or review.therapeutic_language_flags:
                recording.append(
                    f"Record {review.record_id} ({review.record_type}): evidence suggests recording review may be helpful."
                )
            if review.child_voice_present and review.overall_quality in {"good", "strong"}:
                positive.append(f"Record {review.record_id}: child voice appears present; source review still required.")

        for item in simulation:
            if item.evidence_strength in {"limited", "emerging"}:
                ofsted_risks.append(
                    f"Current evidence appears {item.evidence_strength} for {item.judgement_area.replace('_', ' ')}; manager review recommended."
                )
            for strength in item.likely_strengths[:1]:
                positive.append(strength)

        self._missing_episode_rhi_gaps(items, urgent=urgent, safeguarding=safeguarding)
        self._safeguarding_without_review(items, urgent=urgent, safeguarding=safeguarding)
        self._reg_actions_open(items, overdue=overdue, actions=actions)
        signoff.extend(graph.missing_expected_links[:4])

        theme_count = len({*urgent, *safeguarding, *children, *overdue})
        headline = (
            f"Records indicate {theme_count} areas may need manager review today."
            if theme_count
            else "Records indicate a calm day for oversight review; source checks remain recommended."
        )

        return {
            "headline": headline,
            "urgent_review": urgent[:12],
            "safeguarding_signals": safeguarding[:12],
            "children_to_review": children[:12],
            "staff_support_signals": staff_support[:10],
            "records_needing_signoff": signoff[:10],
            "overdue_actions": overdue[:10],
            "ofsted_evidence_risks": ofsted_risks[:10],
            "quality_of_recording": recording[:12],
            "positive_progress": positive[:10],
            "suggested_manager_actions": actions[:12],
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
            "home_id": home_id,
            "date_from": date_from,
            "date_to": date_to,
        }

    def _missing_episode_rhi_gaps(
        self,
        records: list[dict[str, Any]],
        *,
        urgent: list[str],
        safeguarding: list[str],
    ) -> None:
        missing_ids = {str(r.get("id")) for r in records if str(r.get("record_type")) in {"missing_episode", "missing"}}
        rhi_linked = set()
        for record in records:
            if str(record.get("record_type")) != "return_home_interview":
                continue
            for link in record.get("linked_records") or []:
                rhi_linked.add(str(link))
        if missing_ids and len(rhi_linked) < len(missing_ids):
            msg = (
                "records indicate missing episode evidence without a visible return home interview link; "
                "review recommended."
            )
            urgent.append(msg)
            safeguarding.append(msg)

    def _safeguarding_without_review(
        self,
        records: list[dict[str, Any]],
        *,
        urgent: list[str],
        safeguarding: list[str],
    ) -> None:
        for record in records:
            if str(record.get("record_type")) not in {"safeguarding_concern", "safeguarding"}:
                continue
            if record.get("manager_review_completed") or record.get("manager_reviewed"):
                continue
            msg = (
                f"Safeguarding record {record.get('id')}: manager oversight suggested; "
                "source review required — do not treat as a final decision."
            )
            urgent.append(msg)
            safeguarding.append(msg)

    def _reg_actions_open(
        self,
        records: list[dict[str, Any]],
        *,
        overdue: list[str],
        actions: list[str],
    ) -> None:
        for record in records:
            rtype = str(record.get("record_type") or "")
            if rtype not in {"reg44", "reg45", "action"}:
                continue
            status = str(record.get("status") or "").lower()
            if status in {"completed", "closed", "done"}:
                continue
            if record.get("overdue") is True or rtype == "action":
                overdue.append(f"records indicate open {rtype} item {record.get('id')} may need manager review.")
                actions.append(f"review recommended: check {rtype} action closure and impact evidence.")


registered_manager_daily_brief_service = RegisteredManagerDailyBriefService()
