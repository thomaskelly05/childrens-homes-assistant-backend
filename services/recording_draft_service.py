"""Secure operational recording workspace drafts — PostgreSQL with in-memory fallback."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.ai_privacy import AiPrivacyGuardRequest
from schemas.recording_drafts import (
    RecordingDraftCreate,
    RecordingDraftHealth,
    RecordingDraftListRequest,
    RecordingDraftListResponse,
    RecordingDraftPrivacyMetadata,
    RecordingDraftQualityMetadata,
    RecordingDraftRecord,
    RecordingDraftReviewStatus,
    RecordingDraftSubmitRequest,
    RecordingDraftSubmitResponse,
    RecordingDraftUpdate,
)
from schemas.recording_form_metadata import default_metadata_for_form, merge_form_metadata
from schemas.recording_submission import RecordingSubmissionRequest, RecordingSubmissionResponse
from services.ai_context_minimisation_service import ai_context_minimisation_service
from services.ai_privacy_guard_service import ai_privacy_guard_service
from services.ai_redaction_service import ai_redaction_service
from services.audit_event_service import record_audit_event
from services.recording_structured_template_registry import recording_structured_template_registry

logger = logging.getLogger("indicare.recording_drafts")

STRUCTURED_PRIVACY_NOTICE = (
    "Review structured fields for unnecessary identifiers before submission."
)

FORMAL_SUBMIT_WARNING = (
    "Formal record submission integration is not fully wired yet. "
    "This draft is marked submitted in the recording workspace only."
)

SUBMIT_TARGETS = frozenset({"draft_workspace", "formal_record", "chronology", "manager_review"})


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iso_dt(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _parse_json(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    return default


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_display_name(current_user: dict[str, Any]) -> str:
    first = _text(current_user.get("first_name"))
    last = _text(current_user.get("last_name"))
    if first or last:
        return f"{first} {last}".strip()
    return _text(current_user.get("email"), "User")


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _is_manager_role(current_user: dict[str, Any]) -> bool:
    return _user_role(current_user) in {r.lower() for r in MANAGER_ROLES}


def _today_iso_date() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _build_initial_form_metadata(
    payload: RecordingDraftCreate,
    current_user: dict[str, Any],
    *,
    home_id: int | None,
) -> dict[str, Any]:
    today = _today_iso_date()
    record_date = payload.record_date or today
    event_date = payload.event_date or today
    base = default_metadata_for_form(
        form_id=payload.form_id or payload.recording_type,
        form_type=payload.recording_type,
        category=payload.category,
        child_id=payload.child_id,
        home_id=home_id,
        written_by_user_id=_user_id(current_user),
        written_by_name=_user_display_name(current_user),
        written_by_role=_user_role(current_user),
        manager_review_required=payload.manager_review_required,
        safeguarding_review_required=payload.safeguarding_review_required,
        privacy_sensitive=payload.privacy_sensitive,
    )
    base["form_record"]["record_date"] = record_date
    base["form_record"]["event_date"] = event_date
    if payload.event_time:
        base["form_record"]["event_time"] = payload.event_time
    return merge_form_metadata(payload.metadata, base["form_record"])


def _patch_form_metadata_on_update(
    existing_metadata: dict[str, Any],
    payload: RecordingDraftUpdate,
    current_user: dict[str, Any],
) -> dict[str, Any]:
    patch: dict[str, Any] = {
        "last_edited_by_user_id": _user_id(current_user),
        "last_edited_by_name": _user_display_name(current_user),
        "updated_at": _now_iso(),
    }
    if payload.event_date is not None:
        patch["event_date"] = payload.event_date
    if payload.record_date is not None:
        patch["record_date"] = payload.record_date
    if payload.event_time is not None:
        patch["event_time"] = payload.event_time

    if payload.metadata:
        result = merge_form_metadata(existing_metadata, patch)
        for key, value in payload.metadata.items():
            if key == "form_record":
                nested = dict(result.get("form_record") or {})
                if isinstance(value, dict):
                    nested.update(value)
                result["form_record"] = nested
            else:
                result[key] = value
        return result
    return merge_form_metadata(existing_metadata, patch)


def _resolve_review_status(
    *,
    manager_review_required: bool,
    safeguarding_review_required: bool,
    explicit: RecordingDraftReviewStatus | None = None,
) -> RecordingDraftReviewStatus:
    if explicit:
        return explicit
    if safeguarding_review_required:
        return "safeguarding_review_required"
    if manager_review_required:
        return "manager_review_required"
    return "not_required"


class RecordingDraftService:
    def __init__(self) -> None:
        self._memory: dict[str, dict[str, Any]] = {}
        self._storage_mode: str = "memory"

    def persistence_available(self) -> bool:
        return self._detect_storage_mode() == "postgresql"

    def _use_db(self) -> bool:
        try:
            conn = get_db_connection()
            release_db_connection(conn)
            return True
        except (DatabaseUnavailableError, Exception):
            return False

    def _detect_storage_mode(self) -> str:
        if not self._use_db():
            self._storage_mode = "memory"
            return self._storage_mode
        try:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'recording_drafts'
                        """
                    )
                    if cur.fetchone():
                        self._storage_mode = "postgresql"
                    else:
                        self._storage_mode = "memory"
            finally:
                release_db_connection(conn)
        except Exception:
            self._storage_mode = "memory"
        return self._storage_mode

    def health(self) -> RecordingDraftHealth:
        mode = self._detect_storage_mode()
        count = len(self._memory) if mode == "memory" else self._count_db()
        return RecordingDraftHealth(
            status="ready",
            storage_mode=mode,
            draft_count=count,
            persistence_available=mode == "postgresql",
        )

    def _count_db(self) -> int:
        try:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        "SELECT COUNT(*) FROM recording_drafts WHERE status != 'deleted'"
                    )
                    row = cur.fetchone()
                    return int(row[0]) if row else 0
            finally:
                release_db_connection(conn)
        except Exception:
            return len(self._memory)


    def _extract_structured_values(self, structured_data: Any) -> dict[str, Any]:
        if not structured_data:
            return {}
        if isinstance(structured_data, dict):
            values = structured_data.get("values")
            if isinstance(values, dict):
                return values
            if "template_id" not in structured_data and "values" not in structured_data:
                return structured_data
        return {}

    def apply_structured_payload(
        self,
        payload: dict[str, Any],
        *,
        form_id: str | None = None,
        recording_type: str | None = None,
    ) -> dict[str, Any]:
        structured_raw = payload.get("structured_data")
        if structured_raw is None:
            return {}
        values = self._extract_structured_values(structured_raw)
        template = recording_structured_template_registry.get_template(
            form_id=form_id or payload.get("form_id"),
            recording_type=recording_type or payload.get("recording_type"),
        )
        if not template:
            return {"structured_data": structured_raw if isinstance(structured_raw, dict) else {}}
        context = recording_structured_template_registry.build_template_context_for_draft(template, values)
        completion = recording_structured_template_registry.validate_template_data(template, values)
        summary_lines = completion.completion_summary
        structured_summary = {
            "lines": summary_lines,
            "text": "\n".join(summary_lines),
            "required_missing": completion.required_missing,
        }
        patch: dict[str, Any] = {
            "structured_template_id": template.form_id,
            "structured_template_version": template.version,
            "structured_data": context,
            "structured_summary": structured_summary,
            "structured_completion": completion.model_dump(),
            "structured_review_triggers": completion.review_triggers,
            "manager_review_required": True,
            "safeguarding_review_required": template.safeguarding_sensitive,
            "privacy_sensitive": template.privacy_sensitive or bool(completion.privacy_field_ids),
            "safeguarding_sensitive": template.safeguarding_sensitive,
        }
        privacy_flags = list(payload.get("privacy_flags") or [])
        for field_id in completion.privacy_field_ids:
            flag = f"structured:{field_id}"
            if flag not in privacy_flags:
                privacy_flags.append(flag)
        if completion.privacy_field_ids and STRUCTURED_PRIVACY_NOTICE not in privacy_flags:
            privacy_flags.append(STRUCTURED_PRIVACY_NOTICE)
        patch["privacy_flags"] = privacy_flags
        meta = dict(payload.get("metadata") or {})
        meta["structured_template"] = {
            "form_id": template.form_id,
            "version": template.version,
            "required_missing": completion.required_missing,
            "review_triggers": completion.review_triggers,
        }
        patch["metadata"] = meta
        return patch

    def build_quality_metadata(self, payload: RecordingDraftCreate | RecordingDraftUpdate | dict[str, Any]) -> RecordingDraftQualityMetadata:
        data = payload.model_dump() if hasattr(payload, "model_dump") else dict(payload)
        body = _text(data.get("body"))
        title = _text(data.get("title"))
        combined = f"{title}\n{body}".strip()
        word_count = len(combined.split()) if combined else 0
        quality_flags = _parse_json(data.get("quality_flags"), [])
        language_flags = _parse_json(data.get("language_flags"), [])
        overall = "review" if quality_flags or language_flags else "ok"
        return RecordingDraftQualityMetadata(
            overall=overall,
            flagged_phrases=[str(item) for item in language_flags[:20]],
            suggestions=[str(item) for item in quality_flags[:20]],
            word_count=word_count,
        )

    def build_privacy_metadata(
        self,
        payload: RecordingDraftCreate | RecordingDraftUpdate | dict[str, Any],
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
        data = payload.model_dump() if hasattr(payload, "model_dump") else dict(payload)
        body = _text(data.get("body"))
        title = _text(data.get("title"))
        combined = f"{title}\n{body}".strip()

        privacy_meta = RecordingDraftPrivacyMetadata()
        redaction_summary: dict[str, Any] = {}
        minimisation_summary: dict[str, Any] = {}

        if combined:
            try:
                redaction = ai_redaction_service.redact_to_result(combined, mode="standard")
                redaction_summary = {
                    "redacted": bool(redaction.redaction_applied or redaction.text != combined),
                    "redaction_count": len(redaction.findings or []),
                    "warnings": list(redaction.warnings or [])[:10],
                }
                privacy_meta.redaction_applied = bool(redaction_summary.get("redacted"))
            except Exception:
                logger.debug("Recording draft redaction skipped", exc_info=True)

            try:
                minimised = ai_context_minimisation_service.minimise_context(
                    {"draft_text": combined[:8000]},
                    action="summarise_record",
                )
                minimisation_summary = {
                    "original_length": len(combined),
                    "minimised_length": len(str(minimised.context)),
                    "fields_removed": list(minimised.blocked_fields or [])[:10],
                }
                privacy_meta.minimisation_applied = bool(minimisation_summary.get("fields_removed"))
            except Exception:
                logger.debug("Recording draft minimisation skipped", exc_info=True)

        try:
            guard = ai_privacy_guard_service.guard(
                AiPrivacyGuardRequest(
                    surface="record_hub",
                    action="summarise_record",
                    home_id=data.get("home_id"),
                    child_id=data.get("child_id"),
                    metadata={"recording_type": data.get("recording_type")},
                ),
                current_user,
                conn=conn,
            )
            privacy_meta.permission_allowed = guard.allowed
            privacy_meta.warnings = list(guard.warnings or [])[:10]
            privacy_meta.notice = guard.privacy_notice
        except Exception:
            logger.debug("Recording draft privacy guard skipped", exc_info=True)

        return privacy_meta.model_dump(), redaction_summary, minimisation_summary

    def enforce_access(self, draft: RecordingDraftRecord, current_user: dict[str, Any]) -> bool:
        uid = _user_id(current_user)
        creator = _text(draft.created_by_user_id)
        if creator and creator == uid:
            return True
        if not _is_manager_role(current_user):
            return False
        user_home = current_user.get("home_id")
        if draft.home_id is not None and user_home is not None:
            try:
                if int(draft.home_id) == int(user_home):
                    return True
            except (TypeError, ValueError):
                pass
        allowed = current_user.get("allowed_home_ids") or []
        if draft.home_id is not None:
            try:
                home_int = int(draft.home_id)
                if home_int in {int(h) for h in allowed if h is not None}:
                    return True
            except (TypeError, ValueError):
                pass
        return False

    def record_audit(
        self,
        event_type: str,
        draft: RecordingDraftRecord,
        current_user: dict[str, Any],
        *,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        record_audit_event(
            event_type="recording_draft",
            action=event_type,
            actor=current_user,
            resource_type="recording_draft",
            resource_id=draft.id,
            metadata={
                "status": draft.status,
                "review_status": draft.review_status,
                "recording_type": draft.recording_type,
                "home_id": draft.home_id,
                "child_id": draft.child_id,
                **(metadata or {}),
            },
        )

    def _row_to_record(self, row: dict[str, Any]) -> RecordingDraftRecord:
        return RecordingDraftRecord(
            id=_text(row.get("id")),
            title=_text(row.get("title")),
            body=_text(row.get("body")),
            recording_type=_text(row.get("recording_type")),
            form_id=row.get("form_id"),
            category=row.get("category"),
            status=row.get("status") or "draft",  # type: ignore[arg-type]
            review_status=row.get("review_status") or "not_required",  # type: ignore[arg-type]
            child_id=row.get("child_id"),
            child_name=row.get("child_name"),
            home_id=row.get("home_id"),
            staff_id=row.get("staff_id"),
            context_type=row.get("context_type"),
            created_by_user_id=row.get("created_by_user_id"),
            created_by_name=row.get("created_by_name"),
            created_by_role=row.get("created_by_role"),
            manager_review_required=bool(row.get("manager_review_required")),
            safeguarding_review_required=bool(row.get("safeguarding_review_required")),
            privacy_sensitive=bool(row.get("privacy_sensitive")),
            safeguarding_sensitive=bool(row.get("safeguarding_sensitive")),
            quality_flags=_parse_json(row.get("quality_flags"), []),
            language_flags=_parse_json(row.get("language_flags"), []),
            privacy_flags=_parse_json(row.get("privacy_flags"), []),
            checklist_status=_parse_json(row.get("checklist_status"), {}),
            privacy_guard=_parse_json(row.get("privacy_guard"), {}),
            redaction_summary=_parse_json(row.get("redaction_summary"), {}),
            minimisation_summary=_parse_json(row.get("minimisation_summary"), {}),
            linked_record_id=row.get("linked_record_id"),
            linked_chronology_id=row.get("linked_chronology_id"),
            submitted_to=row.get("submitted_to"),
            submitted_at=_iso_dt(row.get("submitted_at")),
            reviewed_at=_iso_dt(row.get("reviewed_at")),
            archived_at=_iso_dt(row.get("archived_at")),
            record_date=row.get("record_date") or _parse_json(row.get("metadata"), {}).get("form_record", {}).get("event_date"),
            event_date=row.get("event_date") or _parse_json(row.get("metadata"), {}).get("form_record", {}).get("event_date"),
            event_time=row.get("event_time"),
            signed_off_by_user_id=row.get("signed_off_by_user_id"),
            signed_off_by_name=row.get("signed_off_by_name"),
            signed_off_at=_iso_dt(row.get("signed_off_at")),
            created_at=_iso_dt(row.get("created_at")) or _now_iso(),
            updated_at=_iso_dt(row.get("updated_at")) or _now_iso(),
            metadata=_parse_json(row.get("metadata"), {}),
            structured_template_id=row.get("structured_template_id"),
            structured_template_version=row.get("structured_template_version"),
            structured_data=_parse_json(row.get("structured_data"), {}),
            structured_summary=_parse_json(row.get("structured_summary"), {}),
            structured_completion=_parse_json(row.get("structured_completion"), {}),
            structured_review_triggers=_parse_json(row.get("structured_review_triggers"), []),
        )

    def _memory_to_record(self, data: dict[str, Any]) -> RecordingDraftRecord:
        return self._row_to_record(data)

    def create_draft(
        self,
        payload: RecordingDraftCreate,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingDraftRecord:
        draft_id = str(uuid4())
        now = _now_iso()
        privacy_guard, redaction_summary, minimisation_summary = self.build_privacy_metadata(
            payload, current_user, conn=conn
        )
        review_status = _resolve_review_status(
            manager_review_required=payload.manager_review_required,
            safeguarding_review_required=payload.safeguarding_review_required,
        )
        home_id = payload.home_id
        if home_id is None and current_user.get("home_id") is not None:
            try:
                home_id = int(current_user.get("home_id"))
            except (TypeError, ValueError):
                home_id = None

        row = {
            "id": draft_id,
            "title": payload.title,
            "body": payload.body,
            "recording_type": payload.recording_type,
            "form_id": payload.form_id,
            "category": payload.category,
            "status": "draft",
            "review_status": review_status,
            "child_id": payload.child_id,
            "child_name": payload.child_name,
            "home_id": home_id,
            "staff_id": payload.staff_id,
            "context_type": payload.context_type,
            "created_by_user_id": _user_id(current_user),
            "created_by_name": _user_display_name(current_user),
            "created_by_role": _user_role(current_user),
            "manager_review_required": payload.manager_review_required,
            "safeguarding_review_required": payload.safeguarding_review_required,
            "privacy_sensitive": payload.privacy_sensitive,
            "safeguarding_sensitive": payload.safeguarding_sensitive,
            "quality_flags": payload.quality_flags,
            "language_flags": payload.language_flags,
            "privacy_flags": payload.privacy_flags,
            "checklist_status": payload.checklist_status,
            "privacy_guard": privacy_guard,
            "redaction_summary": redaction_summary,
            "minimisation_summary": minimisation_summary,
            "metadata": _build_initial_form_metadata(payload, current_user, home_id=home_id),
            "record_date": payload.record_date or _today_iso_date(),
            "event_date": payload.event_date or _today_iso_date(),
            "event_time": payload.event_time,
            "structured_data": payload.structured_data,
            "created_at": now,
            "updated_at": now,
        }
        structured_patch = self.apply_structured_payload(
            row,
            form_id=payload.form_id,
            recording_type=payload.recording_type,
        )
        row = {**row, **structured_patch}
        row["review_status"] = _resolve_review_status(
            manager_review_required=bool(row.get("manager_review_required")),
            safeguarding_review_required=bool(row.get("safeguarding_review_required")),
        )

        if self._detect_storage_mode() == "postgresql" and conn is not None:
            self._insert_db(conn, row)
        else:
            self._memory[draft_id] = row

        record = self._memory_to_record(row)
        self.record_audit("created", record, current_user)
        return record

    def _insert_db(self, conn: Any, row: dict[str, Any]) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO recording_drafts (
                    id, title, body, recording_type, form_id, category, status, review_status,
                    child_id, child_name, home_id, staff_id, context_type,
                    created_by_user_id, created_by_name, created_by_role,
                    manager_review_required, safeguarding_review_required,
                    privacy_sensitive, safeguarding_sensitive,
                    quality_flags, language_flags, privacy_flags, checklist_status,
                    privacy_guard, redaction_summary, minimisation_summary, metadata,
                    structured_template_id, structured_template_version,
                    structured_data, structured_summary, structured_completion, structured_review_triggers
                ) VALUES (
                    %(id)s, %(title)s, %(body)s, %(recording_type)s, %(form_id)s, %(category)s,
                    %(status)s, %(review_status)s, %(child_id)s, %(child_name)s, %(home_id)s,
                    %(staff_id)s, %(context_type)s, %(created_by_user_id)s, %(created_by_name)s,
                    %(created_by_role)s, %(manager_review_required)s, %(safeguarding_review_required)s,
                    %(privacy_sensitive)s, %(safeguarding_sensitive)s,
                    %(quality_flags)s, %(language_flags)s, %(privacy_flags)s, %(checklist_status)s,
                    %(privacy_guard)s, %(redaction_summary)s, %(minimisation_summary)s, %(metadata)s,
                    %(structured_template_id)s, %(structured_template_version)s,
                    %(structured_data)s, %(structured_summary)s, %(structured_completion)s,
                    %(structured_review_triggers)s
                )
                """,
                {
                    **row,
                    "quality_flags": Json(row["quality_flags"]),
                    "language_flags": Json(row["language_flags"]),
                    "privacy_flags": Json(row["privacy_flags"]),
                    "checklist_status": Json(row["checklist_status"]),
                    "privacy_guard": Json(row["privacy_guard"]),
                    "redaction_summary": Json(row["redaction_summary"]),
                    "minimisation_summary": Json(row["minimisation_summary"]),
                    "metadata": Json(row["metadata"]),
                    "structured_template_id": row.get("structured_template_id"),
                    "structured_template_version": row.get("structured_template_version"),
                    "structured_data": Json(row.get("structured_data") or {}),
                    "structured_summary": Json(row.get("structured_summary") or {}),
                    "structured_completion": Json(row.get("structured_completion") or {}),
                    "structured_review_triggers": Json(row.get("structured_review_triggers") or []),
                },
            )

    def update_draft(
        self,
        draft_id: str,
        payload: RecordingDraftUpdate,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingDraftRecord | None:
        existing = self.get_draft(draft_id, current_user, conn=conn)
        if not existing:
            return None

        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            return existing

        if "structured_data" in updates:
            structured_patch = self.apply_structured_payload(
                {**existing.model_dump(), **updates},
                form_id=updates.get("form_id") or existing.form_id,
                recording_type=updates.get("recording_type") or existing.recording_type,
            )
            updates.update(structured_patch)
            if structured_patch.get("manager_review_required") or structured_patch.get("safeguarding_review_required"):
                updates["review_status"] = _resolve_review_status(
                    manager_review_required=bool(updates.get("manager_review_required", existing.manager_review_required)),
                    safeguarding_review_required=bool(updates.get("safeguarding_review_required", existing.safeguarding_review_required)),
                )

        privacy_guard, redaction_summary, minimisation_summary = self.build_privacy_metadata(
            {**existing.model_dump(), **updates},
            current_user,
            conn=conn,
        )
        updates["privacy_guard"] = privacy_guard
        updates["redaction_summary"] = redaction_summary
        updates["minimisation_summary"] = minimisation_summary
        updates["updated_at"] = _now_iso()
        existing_meta = _parse_json(existing.metadata, {})
        updates["metadata"] = _patch_form_metadata_on_update(existing_meta, payload, current_user)
        if payload.event_date is not None:
            updates["event_date"] = payload.event_date
        if payload.record_date is not None:
            updates["record_date"] = payload.record_date
        if payload.event_time is not None:
            updates["event_time"] = payload.event_time

        manager_flag = updates.get("manager_review_required", existing.manager_review_required)
        safeguarding_flag = updates.get("safeguarding_review_required", existing.safeguarding_review_required)
        if "review_status" not in updates:
            updates["review_status"] = _resolve_review_status(
                manager_review_required=bool(manager_flag),
                safeguarding_review_required=bool(safeguarding_flag),
                explicit=updates.get("review_status"),
            )

        if self._detect_storage_mode() == "postgresql" and conn is not None:
            self._patch_db(conn, draft_id, updates)
            refreshed = self._fetch_db(conn, draft_id)
            if not refreshed:
                return None
            record = self._row_to_record(refreshed)
        else:
            merged = {**self._memory.get(draft_id, existing.model_dump()), **updates}
            self._memory[draft_id] = merged
            record = self._memory_to_record(merged)

        self.record_audit("updated", record, current_user)
        return record

    def autosave_draft(
        self,
        draft_id: str,
        payload: RecordingDraftUpdate,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingDraftRecord | None:
        return self.update_draft(draft_id, payload, current_user, conn=conn)

    def list_drafts(
        self,
        current_user: dict[str, Any],
        filters: RecordingDraftListRequest | None = None,
        conn: Any | None = None,
    ) -> RecordingDraftListResponse:
        filters = filters or RecordingDraftListRequest()
        mode = self._detect_storage_mode()
        rows: list[dict[str, Any]] = []

        if mode == "postgresql" and conn is not None:
            rows = self._list_db(conn, filters)
        else:
            rows = list(self._memory.values())

        records = [self._row_to_record(row) for row in rows]
        visible = [r for r in records if self.enforce_access(r, current_user)]

        if filters.status:
            visible = [r for r in visible if r.status == filters.status]
        if filters.review_status:
            visible = [r for r in visible if r.review_status == filters.review_status]
        if filters.recording_type:
            visible = [r for r in visible if r.recording_type == filters.recording_type]
        if filters.child_id is not None:
            visible = [r for r in visible if r.child_id == filters.child_id]
        if filters.home_id is not None:
            visible = [r for r in visible if r.home_id == filters.home_id]
        if not filters.include_archived:
            visible = [r for r in visible if r.status != "archived"]
        if not filters.include_deleted:
            visible = [r for r in visible if r.status != "deleted"]

        uid = _user_id(current_user)
        if not _is_manager_role(current_user):
            visible = [r for r in visible if _text(r.created_by_user_id) == uid]

        visible.sort(key=lambda item: item.updated_at, reverse=True)
        total = len(visible)
        page = visible[filters.offset : filters.offset + filters.limit]

        return RecordingDraftListResponse(
            items=page,
            total=total,
            storage_mode=mode,
            persistence_available=mode == "postgresql",
        )

    def get_draft(
        self,
        draft_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingDraftRecord | None:
        row: dict[str, Any] | None = None
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            row = self._fetch_db(conn, draft_id)
        elif draft_id in self._memory:
            row = self._memory[draft_id]

        if not row:
            return None

        record = self._row_to_record(row)
        if not self.enforce_access(record, current_user):
            return None
        return record

    def archive_draft(
        self,
        draft_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingDraftRecord | None:
        return self._set_status(draft_id, "archived", current_user, conn=conn, archived_at=_now_iso())

    def delete_draft(
        self,
        draft_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingDraftRecord | None:
        return self._set_status(draft_id, "deleted", current_user, conn=conn)

    def mark_ready_for_review(
        self,
        draft_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingDraftRecord | None:
        from services.recording_review_service import recording_review_service

        existing = self.get_draft(draft_id, current_user, conn=conn)
        if not existing:
            return None
        review_status: RecordingDraftReviewStatus = "awaiting_review"
        if existing.safeguarding_review_required:
            review_status = "safeguarding_review_required"
        elif existing.manager_review_required:
            review_status = "manager_review_required"
        priority = recording_review_service.build_review_priority(existing)
        meta = {
            **(existing.metadata or {}),
            "review_priority": priority,
            "sent_to_review_queue_at": _now_iso(),
        }
        updated = self.update_draft(
            draft_id,
            RecordingDraftUpdate(
                status="ready_for_review",
                review_status=review_status,
                metadata=meta,
            ),
            current_user,
            conn=conn,
        )
        if updated:
            recording_review_service._patch_review_fields(
                draft_id,
                {"review_priority": priority},
                conn=conn,
            )
            refreshed = self.get_draft(draft_id, current_user, conn=conn)
            if refreshed:
                updated = refreshed
            self.record_audit(
                "ready_for_review",
                updated,
                current_user,
                metadata={"review_priority": priority, "review_status": review_status},
            )
        return updated

    def submit_draft(
        self,
        draft_id: str,
        payload: RecordingDraftSubmitRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingDraftSubmitResponse | RecordingSubmissionResponse | None:
        from services.recording_submission_router_service import recording_submission_router_service

        submission_request = RecordingSubmissionRequest(
            draft_id=draft_id,
            submitted_to=payload.submitted_to,
            target_workflow=payload.target_workflow,
            metadata=payload.metadata,
            confirm_reviewed=bool(payload.metadata.get("confirm_reviewed")),
            force_submit=bool(payload.metadata.get("force_submit")),
            create_chronology_link=bool(payload.metadata.get("create_chronology_link", True)),
        )
        try:
            result = recording_submission_router_service.submit_draft(
                draft_id,
                submission_request,
                current_user,
                conn=conn,
            )
            if not result:
                return None
            if isinstance(result, RecordingSubmissionResponse):
                warning = (
                    result.warnings[0]
                    if result.warnings
                    else (
                        FORMAL_SUBMIT_WARNING
                        if not result.formal_record_created
                        else "Formal record created successfully."
                    )
                )
                draft_data = result.draft or {}
                draft_record = (
                    self._row_to_record(draft_data)
                    if draft_data.get("id")
                    else self.get_draft(draft_id, current_user, conn=conn)
                )
                if not draft_record:
                    return None
                return RecordingDraftSubmitResponse(
                    draft=draft_record,
                    warning=warning,
                    formal_record_created=result.formal_record_created,
                    linked_record_id=result.linked_record_id,
                    linked_chronology_id=result.linked_chronology_id,
                    submission=result.model_dump(),
                )
            return result
        except Exception:
            logger.exception("Recording submission router failed; falling back to draft-only submit")
            return self._submit_draft_only_fallback(draft_id, payload, current_user, conn=conn)

    def _submit_draft_only_fallback(
        self,
        draft_id: str,
        payload: RecordingDraftSubmitRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingDraftSubmitResponse | None:
        existing = self.get_draft(draft_id, current_user, conn=conn)
        if not existing:
            return None

        submitted_to = _text(payload.submitted_to, "draft_workspace")
        if submitted_to not in SUBMIT_TARGETS:
            submitted_to = "draft_workspace"

        updated = self.update_draft(
            draft_id,
            RecordingDraftUpdate(
                status="submitted",
                review_status=existing.review_status
                if existing.review_status != "not_required"
                else "awaiting_review",
                metadata={**existing.metadata, **payload.metadata, "target_workflow": payload.target_workflow},
            ),
            current_user,
            conn=conn,
        )
        if not updated:
            return None

        patch = {
            "submitted_to": submitted_to,
            "submitted_at": _now_iso(),
            "linked_record_id": None,
        }
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            self._patch_db(conn, draft_id, patch)
            row = self._fetch_db(conn, draft_id)
            if row:
                updated = self._row_to_record(row)
        else:
            merged = {**self._memory.get(draft_id, {}), **patch, "status": "submitted"}
            self._memory[draft_id] = merged
            updated = self._memory_to_record(merged)

        self.record_audit(
            "submitted",
            updated,
            current_user,
            metadata={"submitted_to": submitted_to, "formal_record_created": False},
        )

        return RecordingDraftSubmitResponse(
            draft=updated,
            warning=FORMAL_SUBMIT_WARNING,
            formal_record_created=False,
            linked_record_id=None,
        )

    def _set_status(
        self,
        draft_id: str,
        status: str,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
        archived_at: str | None = None,
    ) -> RecordingDraftRecord | None:
        existing = self.get_draft(draft_id, current_user, conn=conn)
        if not existing:
            return None
        patch: dict[str, Any] = {"status": status, "updated_at": _now_iso()}
        if archived_at:
            patch["archived_at"] = archived_at
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            self._patch_db(conn, draft_id, patch)
            row = self._fetch_db(conn, draft_id)
            if not row:
                return None
            record = self._row_to_record(row)
        else:
            merged = {**self._memory.get(draft_id, existing.model_dump()), **patch}
            self._memory[draft_id] = merged
            record = self._memory_to_record(merged)
        self.record_audit(status, record, current_user)
        return record

    def _patch_db(self, conn: Any, draft_id: str, updates: dict[str, Any]) -> None:
        json_fields = {
            "quality_flags",
            "language_flags",
            "privacy_flags",
            "checklist_status",
            "privacy_guard",
            "redaction_summary",
            "minimisation_summary",
            "metadata",
            "structured_data",
            "structured_summary",
            "structured_completion",
            "structured_review_triggers",
        }
        sets: list[str] = []
        params: dict[str, Any] = {"id": draft_id}
        for key, value in updates.items():
            if key in json_fields:
                params[key] = Json(value)
            else:
                params[key] = value
            sets.append(f"{key} = %({key})s")
        sets.append("updated_at = NOW()")
        sql = f"UPDATE recording_drafts SET {', '.join(sets)} WHERE id = %(id)s"
        with conn.cursor() as cur:
            cur.execute(sql, params)

    def _fetch_db(self, conn: Any, draft_id: str) -> dict[str, Any] | None:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM recording_drafts WHERE id = %s", (draft_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def _list_db(self, conn: Any, filters: RecordingDraftListRequest) -> list[dict[str, Any]]:
        clauses = ["1=1"]
        params: list[Any] = []
        if filters.status:
            clauses.append("status = %s")
            params.append(filters.status)
        if not filters.include_archived:
            clauses.append("status != 'archived'")
        if not filters.include_deleted:
            clauses.append("status != 'deleted'")
        if filters.recording_type:
            clauses.append("recording_type = %s")
            params.append(filters.recording_type)
        if filters.child_id is not None:
            clauses.append("child_id = %s")
            params.append(filters.child_id)
        if filters.home_id is not None:
            clauses.append("home_id = %s")
            params.append(filters.home_id)
        sql = f"""
            SELECT * FROM recording_drafts
            WHERE {' AND '.join(clauses)}
            ORDER BY updated_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([filters.limit, filters.offset])
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]


recording_draft_service = RecordingDraftService()
