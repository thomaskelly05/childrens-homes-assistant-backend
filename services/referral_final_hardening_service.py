from __future__ import annotations

from typing import Any

from services.referral_matching_service import CAPABILITY_MAP, REGULATORY_MAPPING, ReferralMatchingService
from services.referral_risk_review_service import ReferralRiskReviewService


class ReferralFinalHardeningService:
    @staticmethod
    def ensure_schema(conn) -> None:
        ReferralMatchingService.ensure_schema(conn)
        ReferralRiskReviewService.ensure_schema(conn)

    @staticmethod
    def reviewed_flags(conn, *, referral_id: int) -> list[dict[str, Any]]:
        ReferralFinalHardeningService.ensure_schema(conn)
        flags = ReferralRiskReviewService.list_flags(conn, referral_id=referral_id)
        reviewed: list[dict[str, Any]] = []
        for flag in flags:
            status = flag.get("manager_review_status") or "pending"
            if status == "dismissed":
                continue
            item = dict(flag)
            item["effective_label"] = item.get("manager_override_label") or item.get("flag_label")
            item["effective_severity"] = item.get("manager_override_severity") or item.get("severity") or "medium"
            item["review_weighting"] = {
                "confirmed": 1.0,
                "overridden": 1.0,
                "needs_more_information": 0.75,
                "pending": 0.5,
            }.get(status, 0.5)
            reviewed.append(item)
        return reviewed

    @staticmethod
    def score_home_reviewed(conn, *, referral_id: int, home_id: int, actor_user_id: int | None = None) -> dict[str, Any]:
        ReferralFinalHardeningService.ensure_schema(conn)
        caps = ReferralMatchingService.list_capabilities(conn, home_id=home_id)
        capability = caps[0] if caps else {}
        flags = ReferralFinalHardeningService.reviewed_flags(conn, referral_id=referral_id)
        unmet: list[dict[str, Any]] = []
        matched: dict[str, Any] = {}
        risk_score = 0.0
        fit_score = 75.0
        pending_count = 0
        needs_info_count = 0

        for flag in flags:
            key = flag.get("flag_key")
            cap_key = CAPABILITY_MAP.get(key)
            accepted = bool(capability.get(cap_key)) if cap_key else False
            severity = flag.get("effective_severity") or "medium"
            review_status = flag.get("manager_review_status") or "pending"
            review_weight = float(flag.get("review_weighting") or 0.5)
            if review_status == "pending":
                pending_count += 1
            if review_status == "needs_more_information":
                needs_info_count += 1
            weight = (16 if severity == "high" else 8) * review_weight
            matched[key] = {
                "accepted_by_home": accepted,
                "review_status": review_status,
                "severity": severity,
                "label": flag.get("effective_label"),
            }
            if accepted:
                fit_score += 2
            else:
                fit_score -= weight
                risk_score += weight
                unmet.append({
                    "flag_key": key,
                    "label": flag.get("effective_label"),
                    "severity": severity,
                    "review_status": review_status,
                })

        if capability.get("current_capacity", 0) <= 0 and not capability.get("emergency_bed_available"):
            fit_score -= 30
            risk_score += 20
            unmet.append({"flag_key": "capacity", "label": "No current capacity", "severity": "high", "review_status": "system"})

        peer_weightings = ReferralMatchingService.weight_peer_risk(conn, referral_id=referral_id, home_id=home_id)
        peer_weight = sum(float(item.get("risk_weight") or 0) for item in peer_weightings)
        risk_score += peer_weight
        fit_score -= min(35.0, peer_weight / 2)
        fit_score = max(0.0, min(100.0, fit_score))

        if needs_info_count:
            status = "needs_more_information"
        elif pending_count:
            status = "needs_review"
        elif fit_score >= 70 and not unmet and peer_weight < 20:
            status = "potential_match"
        elif fit_score >= 45:
            status = "needs_review"
        else:
            status = "not_recommended"

        rationale = {
            **REGULATORY_MAPPING,
            "reviewed_risk_flag_count": len(flags),
            "pending_risk_review_count": pending_count,
            "needs_more_information_count": needs_info_count,
            "dismissed_flags_excluded": True,
            "manager_overrides_applied": True,
            "unmet_needs_count": len(unmet),
            "fit_score": fit_score,
            "risk_score": risk_score,
            "peer_risk_weight": peer_weight,
            "peer_weighting_count": len(peer_weightings),
        }
        peer_summary = ReferralMatchingService.peer_impact_summary(peer_weightings)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO referral_matching_assessments (
                    referral_id, home_id, manager_user_id, fit_score, risk_score,
                    compatibility_status, matched_capabilities, unmet_needs,
                    peer_impact_summary, recommendation, regulatory_rationale,
                    created_by, updated_by
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (referral_id, home_id) DO UPDATE SET
                    fit_score = EXCLUDED.fit_score,
                    risk_score = EXCLUDED.risk_score,
                    compatibility_status = EXCLUDED.compatibility_status,
                    matched_capabilities = EXCLUDED.matched_capabilities,
                    unmet_needs = EXCLUDED.unmet_needs,
                    peer_impact_summary = EXCLUDED.peer_impact_summary,
                    recommendation = EXCLUDED.recommendation,
                    regulatory_rationale = EXCLUDED.regulatory_rationale,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = NOW()
                RETURNING *
                """,
                (
                    referral_id,
                    home_id,
                    capability.get("manager_user_id"),
                    fit_score,
                    risk_score,
                    status,
                    matched,
                    unmet,
                    peer_summary,
                    status,
                    rationale,
                    actor_user_id,
                    actor_user_id,
                ),
            )
            row = dict(cur.fetchone())
        conn.commit()
        return row

    @staticmethod
    def evidence_review(conn, *, referral_id: int) -> dict[str, Any]:
        ReferralFinalHardeningService.ensure_schema(conn)
        referral = ReferralMatchingService.get_referral(conn, referral_id)
        return {
            "referral_id": referral_id,
            "documents": referral.get("documents") or [],
            "risk_flags": referral.get("risk_flags") or [],
            "risk_review_summary": ReferralRiskReviewService.summary(conn, referral_id=referral_id),
            "matching_assessments": referral.get("matching_assessments") or [],
            "peer_weightings": referral.get("peer_weightings") or [],
            "regulatory_mapping": REGULATORY_MAPPING,
        }

    @staticmethod
    def qa_audit(conn, *, referral_id: int) -> dict[str, Any]:
        ReferralFinalHardeningService.ensure_schema(conn)
        referral = ReferralMatchingService.get_referral(conn, referral_id)
        risk_summary = ReferralRiskReviewService.summary(conn, referral_id=referral_id)
        documents = referral.get("documents") or []
        matching = referral.get("matching_assessments") or []
        converted_id = referral.get("converted_young_person_id")
        checks = {
            "referral_exists": bool(referral.get("id")),
            "has_document_evidence": bool(documents),
            "has_extracted_or_uploaded_metadata": any((doc.get("extracted_text") or doc.get("extracted_metadata")) for doc in documents),
            "risk_flags_reviewed_or_none": risk_summary.get("total", 0) == 0 or risk_summary.get("pending", 0) == 0,
            "has_matching_assessment": bool(matching),
            "manager_decision_recorded": bool(referral.get("manager_decision")),
            "converted_to_young_person": bool(converted_id),
        }
        status = "ready_for_conversion" if all(checks[key] for key in ["referral_exists", "has_document_evidence", "risk_flags_reviewed_or_none", "has_matching_assessment", "manager_decision_recorded"]) else "needs_attention"
        if converted_id:
            status = "converted"
        return {
            "ok": True,
            "referral_id": referral_id,
            "status": status,
            "checks": checks,
            "risk_review_summary": risk_summary,
            "documents_count": len(documents),
            "matching_assessment_count": len(matching),
            "converted_young_person_id": converted_id,
            "regulatory_mapping": REGULATORY_MAPPING,
            "needs_attention": [key for key, value in checks.items() if not value and key != "converted_to_young_person"],
        }
