"""Routes secure recording drafts to formal workflows with honest outcomes."""

from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.recording_drafts import RecordingDraftRecord, RecordingDraftUpdate
from schemas.recording_submission import (
    RecordingSubmissionRequest,
    RecordingSubmissionResponse,
    RecordingSubmissionTarget,
    RecordingSubmissionTargetStatus,
)
from services.recording_chronology_link_service import recording_chronology_link_service
from services.recording_draft_service import recording_draft_service
from services.recording_formal_payload_builder import recording_formal_payload_builder
from services.recording_submission_target_registry import recording_submission_target_registry
from schemas.missing_episode_contracts import MissingEpisodeCreateRequest
from services.missing_episode_service import MissingEpisodeService
from services.young_people_linking_service import YoungPeopleLinkingService
from services.young_person_appointments_service import YoungPersonAppointmentsService
from services.young_person_daily_notes_service import YoungPersonDailyNotesService
from services.young_person_education_service import YoungPersonEducationService
from services.young_person_family_service import YoungPersonFamilyService
from services.young_person_health_service import YoungPersonHealthService
from services.young_person_incidents_service import YoungPersonIncidentsService
from services.young_person_keywork_service import YoungPersonKeyworkService

logger = logging.getLogger("indicare.recording_submission")

FORMAL_NOT_WIRED = "Formal route not wired yet for this recording type."
REVIEW_BLOCK_MESSAGE = (
    "Manager or safeguarding review is required before this can be treated "
    "as a completed formal record."
)


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_int_id(current_user: dict[str, Any]) -> int | None:
    raw = current_user.get("id") or current_user.get("user_id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _is_manager_role(current_user: dict[str, Any]) -> bool:
    return _user_role(current_user) in {r.lower() for r in MANAGER_ROLES}


class RecordingSubmissionRouterService:
    def submit_draft(
        self,
        draft_id: str,
        request: RecordingSubmissionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingSubmissionResponse | None:
        draft = recording_draft_service.get_draft(draft_id, current_user, conn=conn)
        if not draft:
            return None

        target = recording_submission_target_registry.get_target(
            draft.recording_type,
            form_id=draft.form_id,
        )
        if request.target_record_type:
            override = recording_submission_target_registry.get_target(request.target_record_type)
            if override.target_record_type:
                target = override

        validation_warnings = self.validate_draft_for_submission(draft, target)
        review_ok, review_warnings = self.ensure_review_requirements(draft, request, target, current_user)

        response = RecordingSubmissionResponse(
            draft_id=draft.id,
            target_status=target.target_status,
            review_required=bool(draft.manager_review_required),
            safeguarding_review_required=bool(draft.safeguarding_review_required),
            privacy_guard=dict(draft.privacy_guard or {}),
            quality_summary={
                "quality_flags": list(draft.quality_flags or []),
                "language_flags": list(draft.language_flags or []),
                "word_count": len(_text(draft.body).split()),
            },
            warnings=list(validation_warnings),
            route_hint=recording_submission_target_registry.route_hint(draft.recording_type, draft),
            formal_record_type=target.target_record_type,
        )
        response.warnings.extend(review_warnings)

        formal_record: dict[str, Any] | None = None
        if target.target_status == "supported_now" and review_ok and conn is not None:
            payload = self.build_formal_payload(draft, target)
            formal_record, formal_warnings = self.submit_to_supported_workflow(
                draft, target, payload, current_user, conn=conn
            )
            response.warnings.extend(formal_warnings)
            if formal_record and formal_record.get("id") is not None:
                response.formal_record_created = True
                response.linked_record_id = str(formal_record["id"])
                response.formal_record_type = target.target_record_type
            else:
                response.warnings.append(FORMAL_NOT_WIRED)
        elif target.target_status == "supported_now" and conn is None:
            response.warnings.append(
                "Database connection unavailable; draft submitted without formal record."
            )
        elif target.target_status == "supported_now" and not review_ok:
            response.warnings.append(REVIEW_BLOCK_MESSAGE)
        elif target.target_status in {
            "submit_as_draft_only",
            "unsupported",
            "route_to_existing_workflow",
        }:
            response.warnings.append(FORMAL_NOT_WIRED)
        elif target.target_status == "review_required_before_submit":
            if not review_ok:
                pass  # REVIEW_BLOCK_MESSAGE already added
            else:
                response.warnings.append(FORMAL_NOT_WIRED)

        draft_only_warnings = self.submit_as_draft_only(draft, target, current_user, conn=conn)
        response.warnings.extend(draft_only_warnings)

        if request.create_chronology_link and response.formal_record_created:
            chronology_id, chrono_warnings = recording_chronology_link_service.create_or_prepare_link(
                draft,
                formal_record,
                current_user,
                conn=conn,
            )
            response.linked_chronology_id = chronology_id
            response.warnings.extend(chrono_warnings)
        elif request.create_chronology_link and not response.formal_record_created:
            response.warnings.append(
                "Review chronology linking when the formal record route is wired."
            )

        response.submitted = True
        response.success = True
        response.next_steps = self.build_next_steps(draft, target, response)
        response.audit_reference = self.record_submission_audit(draft, response, current_user)

        updated_draft = self.update_draft_after_submission(draft, response, current_user, conn=conn)
        if updated_draft:
            response.draft = updated_draft.model_dump()

        return response

    def validate_draft_for_submission(
        self,
        draft: RecordingDraftRecord,
        target: RecordingSubmissionTarget,
    ) -> list[str]:
        warnings: list[str] = []
        if not _text(draft.body) and not _text(draft.title):
            warnings.append("Draft has no title or body; consider adding content before submit.")
        if target.requires_child and draft.child_id is None:
            warnings.append("A young person must be linked before a formal record can be created.")
        if target.target_record_type == "missing_episode" and draft.home_id is None:
            meta_home = (draft.metadata or {}).get("home_id")
            if meta_home is None:
                warnings.append("home_id is required to create a missing episode formal record.")
        return warnings

    def ensure_review_requirements(
        self,
        draft: RecordingDraftRecord,
        request: RecordingSubmissionRequest,
        target: RecordingSubmissionTarget,
        current_user: dict[str, Any],
    ) -> tuple[bool, list[str]]:
        warnings: list[str] = []
        needs_review = (
            draft.manager_review_required
            or draft.safeguarding_review_required
            or target.requires_manager_review
            or target.safeguarding_sensitive
            or target.target_status == "review_required_before_submit"
            or draft.review_status in {"manager_review_required", "safeguarding_review_required"}
        )
        if not needs_review:
            return True, warnings

        if request.confirm_reviewed:
            return True, warnings

        if request.force_submit and _is_manager_role(current_user):
            warnings.append("Formal submission forced by manager; ensure review is documented.")
            return True, warnings

        warnings.append(REVIEW_BLOCK_MESSAGE)
        return False, warnings

    def build_formal_payload(
        self,
        draft: RecordingDraftRecord,
        target: RecordingSubmissionTarget,
    ) -> dict[str, Any]:
        return recording_formal_payload_builder.build_payload(draft, target)

    def submit_to_supported_workflow(
        self,
        draft: RecordingDraftRecord,
        target: RecordingSubmissionTarget,
        payload: dict[str, Any],
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> tuple[dict[str, Any] | None, list[str]]:
        warnings: list[str] = []
        if draft.child_id is None:
            warnings.append("Cannot create formal record without child_id.")
            return None, warnings

        young_person_id = int(draft.child_id)
        author_id = _user_int_id(current_user)

        try:
            record_type = target.target_record_type
            linking = YoungPeopleLinkingService

            if record_type == "daily_note":
                result = YoungPersonDailyNotesService.create_daily_note(
                    conn,
                    young_person_id=young_person_id,
                    payload=payload,
                    author_id=author_id,
                    linking_service=linking,
                )
                return {"id": result.get("id"), "workflow": result.get("workflow"), **result}, warnings

            if record_type == "incident":
                result = YoungPersonIncidentsService.create_incident(
                    conn,
                    young_person_id=young_person_id,
                    payload=payload,
                    actor_user_id=author_id,
                    linking_service=linking,
                )
                return {"id": result.get("id"), "workflow": result.get("workflow"), **result}, warnings

            if record_type == "keywork":
                result = YoungPersonKeyworkService.create_keywork(
                    conn,
                    young_person_id=young_person_id,
                    payload=payload,
                    actor_user_id=author_id,
                    linking_service=linking,
                )
                return {"id": result.get("id"), "workflow": result.get("workflow"), **result}, warnings

            if record_type == "family_contact":
                result = YoungPersonFamilyService.create_family_contact_record(
                    conn,
                    young_person_id=young_person_id,
                    payload=payload,
                    actor_user_id=author_id,
                    linking_service=linking,
                )
                return {"id": result.get("id"), "workflow": result.get("workflow"), **result}, warnings

            if record_type == "education":
                result = YoungPersonEducationService.create_education_record(
                    conn,
                    young_person_id=young_person_id,
                    payload=payload,
                    actor_user_id=author_id,
                    linking_service=linking,
                )
                return {"id": result.get("id"), "workflow": result.get("workflow"), **result}, warnings

            if record_type == "health_appointment":
                result = YoungPersonAppointmentsService.create_appointment(
                    conn,
                    young_person_id=young_person_id,
                    payload=payload,
                    actor_user_id=author_id,
                    linking_service=linking,
                )
                appointment = result.get("appointment") if isinstance(result, dict) else None
                record_id = None
                if isinstance(appointment, dict):
                    record_id = appointment.get("id")
                elif appointment is not None and hasattr(appointment, "get"):
                    record_id = appointment.get("id")
                if record_id is None:
                    warnings.append("Appointment created but no record ID returned.")
                    return None, warnings
                return {"id": record_id, "workflow": result.get("workflow"), **result}, warnings

            if record_type == "health":
                result = YoungPersonHealthService.create_health_record(
                    conn,
                    young_person_id=young_person_id,
                    payload=payload,
                    actor_user_id=author_id,
                    linking_service=linking,
                )
                return {"id": result.get("id"), "workflow": result.get("workflow"), **result}, warnings

            if record_type == "missing_episode":
                home_id = payload.get("home_id") or draft.home_id
                if home_id is None:
                    warnings.append("home_id is required to create a missing episode formal record.")
                    return None, warnings
                create_payload = MissingEpisodeCreateRequest(
                    home_id=int(home_id),
                    young_person_id=young_person_id,
                    missing_from=str(payload.get("missing_from") or "Home"),
                    last_seen_location=payload.get("last_seen_location"),
                    circumstances=str(payload.get("circumstances") or _text(draft.body) or "Reported"),
                    risk_level=payload.get("risk_level") or "high",
                    metadata=payload.get("metadata") or {},
                )
                record = MissingEpisodeService().create(
                    conn, payload=create_payload, current_user=current_user
                )
                return {"id": record.id, "workflow": {}, "record": record.model_dump()}, warnings

            warnings.append(FORMAL_NOT_WIRED)
            return None, warnings
        except Exception as exc:
            logger.exception("Formal record creation failed for draft %s", draft.id)
            warnings.append(f"Formal record creation failed: {exc}")
            return None, warnings

    def submit_as_draft_only(
        self,
        draft: RecordingDraftRecord,
        target: RecordingSubmissionTarget,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> list[str]:
        _ = target
        _ = current_user
        _ = conn
        return []

    def update_draft_after_submission(
        self,
        draft: RecordingDraftRecord,
        response: RecordingSubmissionResponse,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> RecordingDraftRecord | None:
        submitted_to = "formal_record" if response.formal_record_created else "draft_workspace"
        meta = {
            **(draft.metadata or {}),
            "submission": {
                "formal_record_created": response.formal_record_created,
                "formal_record_type": response.formal_record_type,
                "target_status": response.target_status,
                "warnings": response.warnings[:20],
            },
        }
        post_review_status = draft.review_status
        if response.formal_record_created and draft.review_status in {"approved", "reviewed"}:
            post_review_status = "submitted"
        elif draft.review_status == "not_required":
            post_review_status = "awaiting_review"

        updated = recording_draft_service.update_draft(
            draft.id,
            RecordingDraftUpdate(
                status="submitted",
                review_status=post_review_status,  # type: ignore[arg-type]
                metadata=meta,
            ),
            current_user,
            conn=conn,
        )
        if not updated:
            return None

        patch: dict[str, Any] = {
            "submitted_to": submitted_to,
            "submitted_at": recording_draft_service._now_iso() if hasattr(recording_draft_service, "_now_iso") else None,
            "linked_record_id": response.linked_record_id,
            "linked_chronology_id": response.linked_chronology_id,
        }
        from datetime import datetime, timezone

        patch["submitted_at"] = datetime.now(timezone.utc).isoformat()

        if recording_draft_service._detect_storage_mode() == "postgresql" and conn is not None:
            recording_draft_service._patch_db(conn, draft.id, patch)
            row = recording_draft_service._fetch_db(conn, draft.id)
            if row:
                return recording_draft_service._row_to_record(row)
        else:
            merged = {**recording_draft_service._memory.get(draft.id, updated.model_dump()), **patch}
            recording_draft_service._memory[draft.id] = merged
            return recording_draft_service._memory_to_record(merged)

        recording_draft_service.record_audit(
            "submitted",
            updated,
            current_user,
            metadata={
                "formal_record_created": response.formal_record_created,
                "linked_record_id": response.linked_record_id,
                "target_status": response.target_status,
            },
        )
        return updated

    def build_next_steps(
        self,
        draft: RecordingDraftRecord,
        target: RecordingSubmissionTarget,
        response: RecordingSubmissionResponse,
    ) -> list[str]:
        steps: list[str] = []
        if response.formal_record_created and response.linked_record_id:
            steps.append(f"Open formal {response.formal_record_type or 'record'} (ID {response.linked_record_id}).")
            if draft.child_id:
                steps.append(f"View child journey for young person {draft.child_id}.")
        elif target.target_status == "route_to_existing_workflow":
            route = recording_submission_target_registry.frontend_route_for(
                draft.recording_type, draft
            )
            if route:
                steps.append(f"Open formal route: {route}")
            else:
                steps.append("Complete the formal workflow in the child journey or module route.")
        elif target.target_status == "review_required_before_submit":
            steps.append("Complete manager or safeguarding review before treating as a formal record.")
        else:
            steps.append("Draft is submitted in the recording workspace only.")
            steps.append(FORMAL_NOT_WIRED)
        if response.linked_chronology_id:
            steps.append(f"Chronology event linked (ID {response.linked_chronology_id}).")
        return steps

    def record_submission_audit(
        self,
        draft: RecordingDraftRecord,
        response: RecordingSubmissionResponse,
        current_user: dict[str, Any],
    ) -> str:
        audit_id = str(uuid4())
        recording_draft_service.record_audit(
            "submission_routed",
            draft,
            current_user,
            metadata={
                "audit_reference": audit_id,
                "submitted": response.submitted,
                "formal_record_created": response.formal_record_created,
                "formal_record_type": response.formal_record_type,
                "linked_record_id": response.linked_record_id,
                "linked_chronology_id": response.linked_chronology_id,
                "target_status": response.target_status,
            },
        )
        return audit_id

    def fallback_response(
        self,
        draft: RecordingDraftRecord,
        target: RecordingSubmissionTarget,
        error: str,
    ) -> RecordingSubmissionResponse:
        return RecordingSubmissionResponse(
            success=False,
            draft_id=draft.id,
            submitted=False,
            formal_record_created=False,
            formal_record_type=target.target_record_type,
            target_status=target.target_status,
            warnings=[error, FORMAL_NOT_WIRED],
            next_steps=["Retry submit or open the formal workflow manually."],
            route_hint=recording_submission_target_registry.route_hint(draft.recording_type, draft),
            draft=draft.model_dump(),
        )


recording_submission_router_service = RecordingSubmissionRouterService()
