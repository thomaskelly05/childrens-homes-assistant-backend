from __future__ import annotations

from typing import Any

from services.child_documents_service import ChildDocumentsService
from services.referral_matching_service import REGULATORY_MAPPING, ReferralMatchingService
from services.young_people_linking_service import YoungPeopleLinkingService

DECISIONS = {"accepted_in_principle", "declined", "more_information_requested"}


class ReferralDecisionService:
    @staticmethod
    def _safe_int(value: Any) -> int | None:
        try:
            if value in (None, ""):
                return None
            return int(value)
        except Exception:
            return None

    @staticmethod
    def record_decision(
        conn,
        *,
        referral_id: int,
        decision: str,
        payload: dict[str, Any] | None = None,
        actor_user_id: int | None = None,
    ) -> dict[str, Any]:
        ReferralMatchingService.ensure_schema(conn)
        if decision not in DECISIONS:
            raise ValueError("Unsupported referral decision")

        data = dict(payload or {})
        status = {
            "accepted_in_principle": "accepted_in_principle",
            "declined": "declined",
            "more_information_requested": "more_information_requested",
        }[decision]
        reason = data.get("decision_reason") or data.get("reason") or data.get("note")
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE referral_cases
                SET status = %s,
                    manager_decision = %s,
                    decision_reason = %s,
                    recommended_home_id = COALESCE(%s, recommended_home_id),
                    updated_by = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING *
                """,
                (
                    status,
                    decision,
                    reason,
                    ReferralDecisionService._safe_int(data.get("home_id")),
                    actor_user_id,
                    referral_id,
                ),
            )
            row = cur.fetchone()
        if not row:
            raise ValueError("Referral not found")
        conn.commit()
        return dict(row)

    @staticmethod
    def _copy_referral_documents_to_child(
        *,
        referral: dict[str, Any],
        young_person_id: int,
        home_id: int,
        current_user: dict[str, Any],
    ) -> list[dict[str, Any]]:
        service = ChildDocumentsService()
        copied: list[dict[str, Any]] = []
        documents = referral.get("documents") or []
        for doc in documents:
            title = doc.get("title") or doc.get("file_name") or "Referral document"
            sections = {
                "Referral source": doc.get("document_type") or "referral_document",
                "Extracted text": doc.get("extracted_text") or "",
                "Original file": doc.get("file_name") or doc.get("file_url") or "Not recorded",
                "Manager review": "Review and confirm relevance before finalising placement plans.",
            }
            payload = {
                "young_person_id": young_person_id,
                "home_id": home_id,
                "provider_id": current_user.get("provider_id"),
                "document_type": "Referral Evidence",
                "document_group": "Care and placement",
                "title": f"Referral evidence - {title}",
                "editable_title": f"Referral evidence - {title}",
                "status": "draft",
                "sections": sections,
                "metadata": {
                    "source": "referral_conversion",
                    "referral_id": referral.get("id"),
                    "referral_document_id": doc.get("id"),
                    "document_type": doc.get("document_type"),
                    "file_name": doc.get("file_name"),
                    "file_url": doc.get("file_url"),
                    "extracted_metadata": doc.get("extracted_metadata") or {},
                    "regulatory_mapping": REGULATORY_MAPPING,
                },
            }
            result = service.create_document(payload=payload, current_user=current_user)
            if result.get("ok"):
                copied.append(result.get("document") or result)
        return copied

    @staticmethod
    def _create_admission_chronology(
        conn,
        *,
        referral: dict[str, Any],
        conversion: dict[str, Any],
        home_id: int,
        actor_user_id: int | None,
    ) -> dict[str, Any]:
        young_person = conversion.get("young_person") or {}
        young_person_id = ReferralDecisionService._safe_int(young_person.get("id"))
        if not young_person_id:
            return {"ok": False, "reason": "young_person_id_missing"}
        summary = referral.get("reason_for_referral") or referral.get("presenting_needs") or "Referral accepted and converted into child journey."
        workflow = YoungPeopleLinkingService.process_record_event(
            conn=conn,
            young_person_id=young_person_id,
            source_table="referral_cases",
            source_id=int(referral["id"]),
            event_type="admission_referral_converted",
            title="Referral accepted and child journey started",
            summary=summary,
            narrative="\n".join(
                str(value)
                for value in [
                    referral.get("reason_for_referral"),
                    referral.get("presenting_needs"),
                    referral.get("risk_summary"),
                    referral.get("child_voice"),
                ]
                if value
            ) or summary,
            category="admission",
            subcategory="referral_matching",
            significance="high",
            owner_id=actor_user_id,
            created_by=actor_user_id,
            workflow={
                "link_chronology": True,
                "create_task": True,
                "manager_review": True,
                "safeguarding": bool(referral.get("risk_summary")),
                "link_support_plans": True,
                "link_monthly_reviews": True,
                "link_quality_standards": True,
            },
            metadata={
                "home_id": home_id,
                "referral_id": referral.get("id"),
                "quality_standards": REGULATORY_MAPPING["quality_standards"],
                "judgement_areas": REGULATORY_MAPPING["sccif_judgement_areas"],
                "standards_rationale": "Admission started from referral matching and manager decision workflow",
                "evidence_strength": "high",
            },
        )
        conn.commit()
        return workflow

    @staticmethod
    def convert_with_evidence(
        conn,
        *,
        referral_id: int,
        home_id: int,
        current_user: dict[str, Any],
        actor_user_id: int | None = None,
    ) -> dict[str, Any]:
        ReferralMatchingService.ensure_schema(conn)
        referral = ReferralMatchingService.get_referral(conn, referral_id)
        conversion = ReferralMatchingService.convert_to_young_person(
            conn,
            referral_id=referral_id,
            home_id=home_id,
            actor_user_id=actor_user_id,
        )
        young_person_id = int((conversion.get("young_person") or {}).get("id"))
        copied_documents = ReferralDecisionService._copy_referral_documents_to_child(
            referral=referral,
            young_person_id=young_person_id,
            home_id=home_id,
            current_user=current_user,
        )
        chronology = ReferralDecisionService._create_admission_chronology(
            conn,
            referral=referral,
            conversion=conversion,
            home_id=home_id,
            actor_user_id=actor_user_id,
        )
        return {
            **conversion,
            "copied_referral_documents": copied_documents,
            "admission_chronology": chronology,
        }
