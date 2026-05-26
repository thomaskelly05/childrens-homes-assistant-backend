"""Manager review approval → formal sign-off → signed-off lifecycle orchestration."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from schemas.recording_drafts import RecordingDraftRecord, RecordingDraftUpdate
from schemas.recording_review import RecordingReviewActionRequest, RecordingReviewActionResponse
from schemas.recording_submission import RecordingSubmissionRequest, RecordingSubmissionResponse
from services.audit_event_service import record_audit_event
from services.recording_draft_service import recording_draft_service
from services.recording_review_service import MANAGER_JUDGEMENT_NOTICE, recording_review_service
from services.recording_submission_router_service import recording_submission_router_service
from services.recording_submission_target_registry import recording_submission_target_registry
from services.signed_off_lifecycle_service import signed_off_lifecycle_service

logger = logging.getLogger("indicare.recording_review_signoff")

UNSUPPORTED_FORMAL_ROUTE = (
    "This review was approved, but no formal record route is wired for this recording type yet. "
    "It has not been added to the formal archive."
)
SAFEGUARDING_BLOCK = (
    "Formal sign-off is blocked until safeguarding/manager review is complete."
)
ALREADY_SIGNED_OFF = "This draft was already signed off — existing archive links were returned."


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


class RecordingReviewSignoffService:
    def _existing_signoff_metadata(self, draft: RecordingDraftRecord) -> dict[str, Any]:
        meta = draft.metadata or {}
        submission = meta.get("submission") or {}
        signoff = meta.get("review_signoff") or {}
        return {**submission, **signoff}

    def _already_signed_off(self, draft: RecordingDraftRecord) -> bool:
        prior = self._existing_signoff_metadata(draft)
        if prior.get("linked_archive_record_id"):
            return True
        if draft.review_status == "submitted" and prior.get("formal_record_created"):
            return True
        return False

    def manager_review_required_response(
        self,
        draft: RecordingDraftRecord,
        *,
        comments: str | None = None,
    ) -> RecordingReviewActionResponse:
        return RecordingReviewActionResponse(
            success=False,
            draft_id=draft.id,
            decision="approve",
            review_status=draft.review_status,
            comments=comments,
            sign_off_completed=False,
            sign_off_status="blocked_manager_review",
            can_create_formal_record=False,
            formal_route_status="blocked",
            warnings=[MANAGER_JUDGEMENT_NOTICE, SAFEGUARDING_BLOCK],
            lifecycle_warnings=[SAFEGUARDING_BLOCK],
            next_steps=["Complete manager review before formal sign-off."],
            lifecycle_next_steps=["Complete manager review before formal sign-off."],
        )

    def safeguarding_review_required_response(
        self,
        draft: RecordingDraftRecord,
        *,
        comments: str | None = None,
        audit_reference: str | None = None,
    ) -> RecordingReviewActionResponse:
        return RecordingReviewActionResponse(
            success=True,
            draft_id=draft.id,
            decision="approve",
            review_status="approved",
            comments=comments,
            sign_off_completed=False,
            sign_off_status="blocked_safeguarding_review",
            can_create_formal_record=False,
            formal_route_status="blocked",
            warnings=[
                MANAGER_JUDGEMENT_NOTICE,
                SAFEGUARDING_BLOCK,
                "Safeguarding review must be completed before archive lifecycle runs.",
            ],
            lifecycle_warnings=[SAFEGUARDING_BLOCK],
            next_steps=["Escalate or complete safeguarding review before formal sign-off."],
            lifecycle_next_steps=["Escalate or complete safeguarding review before formal sign-off."],
            audit_reference=audit_reference,
        )

    def unsupported_formal_route_response(
        self,
        draft: RecordingDraftRecord,
        target_status: str,
        *,
        comments: str | None = None,
        audit_reference: str | None = None,
    ) -> RecordingReviewActionResponse:
        return RecordingReviewActionResponse(
            success=True,
            draft_id=draft.id,
            decision="approve",
            review_status="approved",
            comments=comments,
            formal_record_created=False,
            sign_off_completed=True,
            sign_off_status="approved_no_formal_route",
            can_create_formal_record=False,
            formal_route_status=target_status,
            warnings=[MANAGER_JUDGEMENT_NOTICE, UNSUPPORTED_FORMAL_ROUTE],
            lifecycle_warnings=[UNSUPPORTED_FORMAL_ROUTE],
            next_steps=[
                "Review approved — no formal archive was created because the route is not wired.",
            ],
            lifecycle_next_steps=[
                "Review approved — no formal archive was created because the route is not wired.",
            ],
            audit_reference=audit_reference,
        )

    def _signoff_blocked(self, draft: RecordingDraftRecord) -> RecordingReviewActionResponse | None:
        if draft.review_status == "safeguarding_escalation_required":
            return self.safeguarding_review_required_response(draft)
        if draft.safeguarding_review_required and draft.review_status not in {
            "approved",
            "reviewed",
            "submitted",
        }:
            return self.safeguarding_review_required_response(draft)
        if draft.manager_review_required and draft.review_status in {
            "manager_review_required",
            "awaiting_review",
            "changes_requested",
        }:
            return None  # approve flow will set approved first
        return None

    def create_formal_from_review(
        self,
        draft: RecordingDraftRecord,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> RecordingSubmissionResponse | None:
        if conn is None:
            return None
        target = recording_submission_target_registry.get_target(
            draft.recording_type, form_id=draft.form_id
        )
        if target.target_status != "supported_now":
            return RecordingSubmissionResponse(
                success=True,
                draft_id=draft.id,
                submitted=False,
                formal_record_created=False,
                formal_record_type=target.target_record_type,
                target_status=target.target_status,
                warnings=[UNSUPPORTED_FORMAL_ROUTE],
            )

        validation_warnings = recording_submission_router_service.validate_draft_for_submission(
            draft, target
        )
        payload = recording_submission_router_service.build_formal_payload(draft, target)
        formal_record, formal_warnings = recording_submission_router_service.submit_to_supported_workflow(
            draft, target, payload, current_user, conn=conn
        )
        response = RecordingSubmissionResponse(
            success=True,
            draft_id=draft.id,
            submitted=True,
            formal_record_created=bool(formal_record and formal_record.get("id") is not None),
            formal_record_type=target.target_record_type,
            linked_record_id=str(formal_record["id"]) if formal_record and formal_record.get("id") else None,
            target_status=target.target_status,
            warnings=list(validation_warnings) + list(formal_warnings),
            route_hint=recording_submission_target_registry.route_hint(draft.recording_type, draft),
        )
        if not response.formal_record_created:
            response.warnings.append(UNSUPPORTED_FORMAL_ROUTE)
        return response

    def run_lifecycle_after_review_approval(
        self,
        draft: RecordingDraftRecord,
        formal_response: RecordingSubmissionResponse | None,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        if not formal_response or not formal_response.formal_record_created:
            return signed_off_lifecycle_service.build_lifecycle_result(
                skipped=True,
                warnings=[UNSUPPORTED_FORMAL_ROUTE],
            )
        formal_record = {"id": formal_response.linked_record_id}
        try:
            record_id = formal_response.linked_record_id
            if record_id is not None:
                formal_record["id"] = int(record_id) if str(record_id).isdigit() else record_id
        except (TypeError, ValueError):
            pass
        return signed_off_lifecycle_service.run_lifecycle_for_review(
            draft,
            formal_record,
            current_user,
            conn=conn,
        )

    def build_review_signoff_response(
        self,
        draft: RecordingDraftRecord,
        review_event_id: str | None,
        formal_response: RecordingSubmissionResponse | None,
        lifecycle_result: dict[str, Any],
        *,
        comments: str | None = None,
        duplicate_reused: bool = False,
    ) -> RecordingReviewActionResponse:
        formal_created = bool(formal_response and formal_response.formal_record_created)
        target_status = (
            formal_response.target_status if formal_response else "unsupported"
        )
        lifecycle_warnings = list(lifecycle_result.get("warnings") or [])
        lifecycle_next = list(lifecycle_result.get("next_steps") or [])
        if duplicate_reused:
            lifecycle_warnings.insert(0, ALREADY_SIGNED_OFF)

        next_steps = list(lifecycle_next)
        if formal_created:
            next_steps.insert(0, "Manager review approved and formal record signed off.")
        else:
            next_steps.insert(0, "Manager review approved.")

        return RecordingReviewActionResponse(
            success=True,
            draft_id=draft.id,
            decision="approve",
            review_status="submitted" if formal_created else "approved",
            comments=comments,
            submitted=formal_created,
            formal_record_created=formal_created,
            formal_record_type=formal_response.formal_record_type if formal_response else None,
            linked_record_id=formal_response.linked_record_id if formal_response else None,
            linked_archive_record_id=lifecycle_result.get("archive_record_id"),
            linked_chronology_id=(
                str(lifecycle_result["chronology_event_id"])
                if lifecycle_result.get("chronology_event_id")
                else None
            ),
            linked_plan_impact_ids=list(lifecycle_result.get("plan_impact_ids") or []),
            lifeecho_suggestion_ids=list(lifecycle_result.get("lifeecho_suggestion_ids") or []),
            sign_off_completed=True,
            sign_off_status="signed_off" if formal_created else "approved_no_formal_route",
            can_create_formal_record=target_status == "supported_now",
            formal_route_status=target_status,
            warnings=[MANAGER_JUDGEMENT_NOTICE, *lifecycle_warnings[:10]],
            lifecycle_warnings=lifecycle_warnings[:15],
            next_steps=next_steps[:15],
            lifecycle_next_steps=lifecycle_next[:15],
            audit_reference=review_event_id,
            metadata={
                "lifecycle": {
                    k: lifecycle_result.get(k)
                    for k in (
                        "archive_record_id",
                        "chronology_event_id",
                        "plan_impact_ids",
                        "lifeecho_suggestion_ids",
                        "skipped",
                        "duplicate_reused",
                    )
                }
            },
        )

    def record_signoff_audit(
        self,
        draft: RecordingDraftRecord,
        response: RecordingReviewActionResponse,
        current_user: dict[str, Any],
    ) -> None:
        record_audit_event(
            event_type="recording_review_signoff",
            action="approve_and_sign_off",
            actor=current_user,
            resource_type="recording_draft",
            resource_id=draft.id,
            metadata={
                "draft_id": draft.id,
                "child_id": draft.child_id,
                "recording_type": draft.recording_type,
                "formal_record_created": response.formal_record_created,
                "sign_off_status": response.sign_off_status,
                "linked_archive_record_id": response.linked_archive_record_id,
                "linked_chronology_id": response.linked_chronology_id,
                "plan_impact_count": len(response.linked_plan_impact_ids or []),
                "lifeecho_count": len(response.lifeecho_suggestion_ids or []),
            },
        )

    def _merge_signoff_metadata(
        self,
        draft: RecordingDraftRecord,
        response: RecordingReviewActionResponse,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> RecordingDraftRecord | None:
        meta = {
            **(draft.metadata or {}),
            "review_signoff": {
                "sign_off_status": response.sign_off_status,
                "formal_record_created": response.formal_record_created,
                "linked_record_id": response.linked_record_id,
                "linked_archive_record_id": response.linked_archive_record_id,
                "linked_chronology_id": response.linked_chronology_id,
                "linked_plan_impact_ids": response.linked_plan_impact_ids,
                "lifeecho_suggestion_ids": response.lifeecho_suggestion_ids,
                "signed_off_at": _now_iso(),
            },
            "last_review_decision": "approve_sign_off",
        }
        review_status = "submitted" if response.formal_record_created else "approved"
        status = "submitted" if response.formal_record_created else draft.status
        updated = recording_draft_service.update_draft(
            draft.id,
            RecordingDraftUpdate(
                status=status,  # type: ignore[arg-type]
                review_status=review_status,  # type: ignore[arg-type]
                metadata=meta,
            ),
            current_user,
            conn=conn,
        )
        if response.formal_record_created:
            patch = {
                "linked_record_id": response.linked_record_id,
                "linked_chronology_id": response.linked_chronology_id,
                "submitted_to": "formal_record",
                "submitted_at": _now_iso(),
            }
            if recording_draft_service._detect_storage_mode() == "postgresql" and conn is not None:
                recording_draft_service._patch_db(conn, draft.id, patch)
            elif draft.id in recording_draft_service._memory:
                recording_draft_service._memory[draft.id].update(patch)
        return updated

    def _try_resolve_review_alerts(
        self,
        draft: RecordingDraftRecord,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> None:
        if draft.safeguarding_review_required or draft.safeguarding_sensitive:
            return
        try:
            from schemas.recording_alerts import RecordingAlertActionRequest, RecordingAlertListFilters
            from services.recording_alert_service import recording_alert_service

            alerts = recording_alert_service.list_alerts(
                current_user,
                RecordingAlertListFilters(draft_id=draft.id, limit=20),
                conn=conn,
            )
            for alert in alerts.items:
                if alert.alert_type not in ("manager_review_required", "high_risk_review_due", "draft_stale"):
                    continue
                if alert.status in {"resolved", "archived"}:
                    continue
                recording_alert_service.apply_alert_action(
                    alert.id,
                    RecordingAlertActionRequest(action="resolve", note="Manager review sign-off completed."),
                    current_user,
                    conn=conn,
                )
        except Exception:
            logger.debug("Review alert resolution skipped", exc_info=True)

    def approve_and_sign_off_review(
        self,
        draft_id: str,
        current_user: dict[str, Any],
        *,
        note: str | None = None,
        action: RecordingReviewActionRequest | None = None,
        conn: Any | None = None,
        skip_approve_step: bool = False,
    ) -> RecordingReviewActionResponse | None:
        draft = recording_draft_service.get_draft(draft_id, current_user, conn=conn)
        if not draft:
            return None

        action = action or RecordingReviewActionRequest(decision="approve", comments=note)
        comments = action.comments or note

        if draft.status in {"deleted", "archived"}:
            return RecordingReviewActionResponse(
                success=False,
                draft_id=draft_id,
                decision="approve",
                review_status=draft.review_status,
                warnings=["Draft is archived or deleted."],
            )

        prior = self._existing_signoff_metadata(draft)
        if self._already_signed_off(draft):
            return RecordingReviewActionResponse(
                success=True,
                draft_id=draft.id,
                decision="approve",
                review_status=draft.review_status,
                comments=comments,
                formal_record_created=bool(prior.get("formal_record_created")),
                linked_record_id=prior.get("linked_record_id"),
                linked_archive_record_id=prior.get("linked_archive_record_id"),
                linked_chronology_id=prior.get("linked_chronology_id"),
                linked_plan_impact_ids=list(prior.get("linked_plan_impact_ids") or []),
                lifeecho_suggestion_ids=list(prior.get("lifeecho_suggestion_ids") or []),
                sign_off_completed=True,
                sign_off_status="already_signed_off",
                warnings=[ALREADY_SIGNED_OFF],
                lifecycle_warnings=[ALREADY_SIGNED_OFF],
                next_steps=["Use existing archive and chronology links — no duplicate was created."],
            )

        if draft.review_status == "safeguarding_escalation_required":
            return self.safeguarding_review_required_response(draft, comments=comments)

        lifecycle_blocked_safeguarding = (
            draft.safeguarding_review_required
            and not action.confirm_reviewed
            and draft.review_status not in {"reviewed", "submitted"}
        )

        if not skip_approve_step and draft.review_status not in {"approved", "reviewed", "submitted"}:
            approve_result = recording_review_service.approve_draft(
                draft, action, current_user, conn=conn
            )
            refreshed = recording_draft_service.get_draft(draft_id, current_user, conn=conn)
            if not refreshed:
                return approve_result
            draft = refreshed
            if approve_result.review_status == "approved" and not approve_result.formal_record_created:
                pass  # continue to formal sign-off below
        elif draft.review_status not in {"approved", "reviewed", "submitted"}:
            return RecordingReviewActionResponse(
                success=False,
                draft_id=draft_id,
                decision="approve",
                review_status=draft.review_status,
                warnings=["Draft is not in a state ready for sign-off."],
            )

        if lifecycle_blocked_safeguarding:
            audit_ref = recording_review_service.record_review_event(
                draft, "approve", action, current_user, conn=conn
            )
            return self.safeguarding_review_required_response(
                draft, comments=comments, audit_reference=audit_ref
            )

        target = recording_submission_target_registry.get_target(
            draft.recording_type, form_id=draft.form_id
        )
        if target.target_status != "supported_now":
            audit_ref = recording_review_service.record_review_event(
                draft, "approve", action, current_user, conn=conn
            )
            self._try_resolve_review_alerts(draft, current_user, conn=conn)
            return self.unsupported_formal_route_response(
                draft, target.target_status, comments=comments, audit_reference=audit_ref
            )

        formal_response = self.create_formal_from_review(draft, current_user, conn=conn)
        if formal_response is None:
            return RecordingReviewActionResponse(
                success=True,
                draft_id=draft.id,
                decision="approve",
                review_status="approved",
                comments=comments,
                formal_record_created=False,
                warnings=[
                    MANAGER_JUDGEMENT_NOTICE,
                    "Database connection unavailable; formal record was not created.",
                ],
                sign_off_completed=False,
                sign_off_status="approved_pending_formal",
                can_create_formal_record=True,
                formal_route_status=target.target_status,
            )

        if not formal_response.formal_record_created:
            audit_ref = recording_review_service.record_review_event(
                draft, "approve", action, current_user, conn=conn
            )
            resp = self.unsupported_formal_route_response(
                draft, target.target_status, comments=comments, audit_reference=audit_ref
            )
            resp.warnings.extend(formal_response.warnings[:5])
            return resp

        lifecycle_result = self.run_lifecycle_after_review_approval(
            draft, formal_response, current_user, conn=conn
        )
        if lifecycle_result.get("warnings") and formal_response.formal_record_created:
            formal_response.warnings.extend(list(lifecycle_result["warnings"])[:5])

        audit_ref = recording_review_service.record_review_event(
            draft,
            "approve",
            action,
            current_user,
            conn=conn,
            submission_response=formal_response,
        )

        response = self.build_review_signoff_response(
            draft,
            audit_ref,
            formal_response,
            lifecycle_result,
            comments=comments,
        )
        self._merge_signoff_metadata(draft, response, current_user, conn=conn)
        self.record_signoff_audit(draft, response, current_user)
        self._try_resolve_review_alerts(draft, current_user, conn=conn)
        recording_draft_service.record_audit(
            "review_sign_off",
            draft,
            current_user,
            metadata={
                "formal_record_created": response.formal_record_created,
                "linked_archive_record_id": response.linked_archive_record_id,
                "sign_off_status": response.sign_off_status,
            },
        )
        return response


recording_review_signoff_service = RecordingReviewSignoffService()
