"""Recording alerts and manager follow-up — metadata-only, no raw draft bodies."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.intelligence_actions import IntelligenceActionCreate
from schemas.recording_alerts import (
    RecordingAlertActionRequest,
    RecordingAlertActionResponse,
    RecordingAlertBadgeSummary,
    RecordingAlertCheckRequest,
    RecordingAlertCheckRun,
    RecordingAlertCreate,
    RecordingAlertDigest,
    RecordingAlertDigestHealth,
    RecordingAlertDigestRoutes,
    RecordingAlertDigestScope,
    RecordingAlertDigestTopItem,
    RecordingAlertGenerationRequest,
    RecordingAlertGenerationResponse,
    RecordingAlertHealth,
    RecordingAlertListFilters,
    RecordingAlertListResponse,
    RecordingAlertRecord,
    RecordingAlertSeverity,
    RecordingAlertStatus,
    RecordingAlertSummary,
    RecordingAlertType,
)
from schemas.recording_drafts import RecordingDraftListRequest, RecordingDraftRecord
from schemas.recording_review import RecordingReviewEventRecord
from services.audit_event_service import record_audit_event
from services.intelligence_action_service import intelligence_action_service
from services.recording_draft_service import recording_draft_service
from services.recording_governance_service import recording_governance_service
from services.recording_review_service import HIGH_RISK_TYPES, recording_review_service

logger = logging.getLogger("indicare.recording_alerts")

ALERT_VIEW_ROLES = MANAGER_ROLES | {
    "senior",
    "senior_practitioner",
    "senior_worker",
    "deputy",
    "registered_manager_deputy",
}

STALE_DRAFT_DAYS = 7
CHANGES_REQUESTED_DAYS = 3
REVIEW_BACKLOG_THRESHOLD = 10

SAFEGUARDING_ALERT_TYPES = frozenset(
    {
        "safeguarding_review_due",
        "safeguarding_escalation_required",
        "high_risk_review_due",
    }
)

NO_AUTO_RESOLVE_TYPES = frozenset(
    {
        "safeguarding_review_due",
        "safeguarding_escalation_required",
        "medication_error_review_due",
        "high_risk_review_due",
    }
)

MANAGER_JUDGEMENT_NOTICE = (
    "Alerts support manager oversight; they do not replace professional judgement "
    "or make safeguarding threshold decisions."
)


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


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


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


def _draft_route(draft_id: str) -> str:
    return f"/record?draft_id={draft_id}"


def _review_route(draft_id: str) -> str:
    return f"/record/reviews?draft_id={draft_id}"


def _child_journey_route(child_id: int) -> str:
    return f"/young-people/{child_id}/journey"


def _governance_route() -> str:
    return "/record/governance"


def _safe_draft_summary(draft: RecordingDraftRecord) -> str:
    parts = [
        f"Recording type: {draft.recording_type}",
        f"Status: {draft.status}",
        f"Review: {draft.review_status}",
    ]
    if draft.child_name:
        parts.append(f"Young person: {draft.child_name}")
    elif draft.child_id:
        parts.append(f"Young person ID: {draft.child_id}")
    if draft.form_id:
        parts.append(f"Form: {draft.form_id}")
    if draft.privacy_flags:
        parts.append(f"Privacy flags: {len(draft.privacy_flags)}")
    completion = draft.structured_completion or {}
    missing = completion.get("required_missing") or []
    if isinstance(missing, list) and missing:
        parts.append(f"Structured fields missing: {len(missing)}")
    return ". ".join(parts) + "."


class RecordingAlertService:
    def __init__(self) -> None:
        self._memory: dict[str, dict[str, Any]] = {}
        self._storage_mode: str = "memory"
        self._last_check_run: RecordingAlertCheckRun | None = None
        self._check_runs: list[RecordingAlertCheckRun] = []

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
                        WHERE table_schema = 'public' AND table_name = 'recording_alerts'
                        """
                    )
                    self._storage_mode = "postgresql" if cur.fetchone() else "memory"
            finally:
                release_db_connection(conn)
        except Exception:
            self._storage_mode = "memory"
        return self._storage_mode

    def get_health(self, conn: Any | None = None) -> RecordingAlertHealth:
        mode = self._detect_storage_mode()
        count = len(self._memory) if mode == "memory" else self._count_db(conn)
        warnings: list[str] = []
        if mode == "memory":
            warnings.append("Recording alerts using in-memory fallback until migration is applied.")
        return RecordingAlertHealth(
            status="ready",
            storage_mode=mode,
            alert_count=count,
            persistence_available=mode == "postgresql",
            degraded=mode == "memory",
            warnings=warnings,
        )

    def _count_db(self, conn: Any | None) -> int:
        if conn is None:
            try:
                conn = get_db_connection()
                own = True
            except Exception:
                return len(self._memory)
        else:
            own = False
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM recording_alerts WHERE status != 'archived'")
                row = cur.fetchone()
                return int(row[0]) if row else 0
        except Exception:
            return len(self._memory)
        finally:
            if own:
                release_db_connection(conn)

    def enforce_alert_access(self, alert: RecordingAlertRecord, current_user: dict[str, Any]) -> bool:
        role = _user_role(current_user)
        if role in {r.lower() for r in ALERT_VIEW_ROLES}:
            return True
        if any(token in role for token in ("manager", "deputy", "responsible", "registered")):
            return True
        uid = _user_id(current_user)
        if alert.owner_user_id and alert.owner_user_id == uid:
            return True
        return False

    def dedupe_key(self, alert: RecordingAlertCreate | RecordingAlertRecord) -> str:
        draft = _text(getattr(alert, "draft_id", None))
        atype = _text(getattr(alert, "alert_type", None))
        return f"{atype}:{draft}" if draft else f"{atype}:{uuid4()}"

    def _row_to_record(self, row: dict[str, Any]) -> RecordingAlertRecord:
        return RecordingAlertRecord(
            id=_text(row.get("id")),
            alert_type=row.get("alert_type"),  # type: ignore[arg-type]
            severity=row.get("severity") or "medium",  # type: ignore[arg-type]
            status=row.get("status") or "open",  # type: ignore[arg-type]
            title=_text(row.get("title")),
            description=_text(row.get("description")),
            safe_summary=_text(row.get("safe_summary")),
            draft_id=row.get("draft_id"),
            review_event_id=row.get("review_event_id"),
            child_id=row.get("child_id"),
            child_name=row.get("child_name"),
            home_id=row.get("home_id"),
            recording_type=row.get("recording_type"),
            form_id=row.get("form_id"),
            source=_text(row.get("source"), "recording_alert_service"),
            route=row.get("route"),
            action_label=row.get("action_label"),
            owner_user_id=row.get("owner_user_id"),
            owner_name=row.get("owner_name"),
            acknowledged_by=row.get("acknowledged_by"),
            acknowledged_at=_iso_dt(row.get("acknowledged_at")),
            resolved_by=row.get("resolved_by"),
            resolved_at=_iso_dt(row.get("resolved_at")),
            resolution_note=row.get("resolution_note"),
            linked_action_id=row.get("linked_action_id"),
            due_at=_iso_dt(row.get("due_at")),
            metadata=_parse_json(row.get("metadata"), {}),
            created_at=_iso_dt(row.get("created_at")) or _now_iso(),
            updated_at=_iso_dt(row.get("updated_at")) or _now_iso(),
        )

    def _find_open_by_key(self, key: str, conn: Any | None = None) -> RecordingAlertRecord | None:
        for row in self._memory.values():
            rec = self._row_to_record(row)
            if self.dedupe_key(rec) == key and rec.status in ("open", "acknowledged", "assigned"):
                return rec
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            parts = key.split(":", 1)
            if len(parts) == 2 and parts[1]:
                try:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute(
                            """
                            SELECT * FROM recording_alerts
                            WHERE alert_type = %s AND draft_id = %s
                              AND status IN ('open', 'acknowledged', 'assigned')
                            ORDER BY created_at DESC LIMIT 1
                            """,
                            (parts[0], parts[1]),
                        )
                        row = cur.fetchone()
                        if row:
                            return self._row_to_record(dict(row))
                except Exception:
                    logger.debug("Alert dedupe lookup failed", exc_info=True)
        return None

    def _persist(self, data: dict[str, Any], conn: Any | None = None) -> RecordingAlertRecord:
        mode = self._detect_storage_mode()
        now = _now_iso()
        data.setdefault("created_at", now)
        data["updated_at"] = now
        if mode == "postgresql" and conn is not None:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        INSERT INTO recording_alerts (
                            id, alert_type, severity, status, title, description, safe_summary,
                            draft_id, review_event_id, child_id, child_name, home_id,
                            recording_type, form_id, source, route, action_label,
                            owner_user_id, owner_name, acknowledged_by, acknowledged_at,
                            resolved_by, resolved_at, resolution_note, linked_action_id,
                            due_at, metadata, created_at, updated_at
                        ) VALUES (
                            %(id)s, %(alert_type)s, %(severity)s, %(status)s, %(title)s,
                            %(description)s, %(safe_summary)s, %(draft_id)s, %(review_event_id)s,
                            %(child_id)s, %(child_name)s, %(home_id)s, %(recording_type)s,
                            %(form_id)s, %(source)s, %(route)s, %(action_label)s,
                            %(owner_user_id)s, %(owner_name)s, %(acknowledged_by)s, %(acknowledged_at)s,
                            %(resolved_by)s, %(resolved_at)s, %(resolution_note)s, %(linked_action_id)s,
                            %(due_at)s,
                            %(metadata)s, %(created_at)s, %(updated_at)s
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            severity = EXCLUDED.severity,
                            status = EXCLUDED.status,
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            safe_summary = EXCLUDED.safe_summary,
                            owner_user_id = EXCLUDED.owner_user_id,
                            owner_name = EXCLUDED.owner_name,
                            acknowledged_by = EXCLUDED.acknowledged_by,
                            acknowledged_at = EXCLUDED.acknowledged_at,
                            resolved_by = EXCLUDED.resolved_by,
                            resolved_at = EXCLUDED.resolved_at,
                            resolution_note = EXCLUDED.resolution_note,
                            linked_action_id = EXCLUDED.linked_action_id,
                            due_at = EXCLUDED.due_at,
                            metadata = EXCLUDED.metadata,
                            updated_at = EXCLUDED.updated_at
                        RETURNING *
                        """,
                        {
                            **data,
                            "metadata": Json(data.get("metadata") or {}),
                            "acknowledged_by": data.get("acknowledged_by"),
                            "acknowledged_at": data.get("acknowledged_at"),
                            "resolved_by": data.get("resolved_by"),
                            "resolved_at": data.get("resolved_at"),
                        },
                    )
                    row = cur.fetchone()
                    conn.commit()
                    if row:
                        return self._row_to_record(dict(row))
            except Exception:
                logger.debug("PostgreSQL alert persist failed; using memory", exc_info=True)
        self._memory[data["id"]] = data
        return self._row_to_record(data)

    def _upsert_candidate(
        self,
        create: RecordingAlertCreate,
        *,
        current_user: dict[str, Any],
        conn: Any | None = None,
        dry_run: bool = False,
        force: bool = False,
    ) -> tuple[str, RecordingAlertRecord | None]:
        key = self.dedupe_key(create)
        existing = None if force else self._find_open_by_key(key, conn=conn)
        if existing and not force:
            return "skipped", existing
        if dry_run:
            record = RecordingAlertRecord(
                id=f"dry-{uuid4().hex[:12]}",
                alert_type=create.alert_type,
                severity=create.severity,
                status="open",
                title=create.title,
                description=create.description,
                safe_summary=create.safe_summary,
                draft_id=create.draft_id,
                review_event_id=create.review_event_id,
                child_id=create.child_id,
                child_name=create.child_name,
                home_id=create.home_id,
                recording_type=create.recording_type,
                form_id=create.form_id,
                source=create.source,
                route=create.route,
                action_label=create.action_label,
                due_at=create.due_at,
                metadata=create.metadata,
                created_at=_now_iso(),
                updated_at=_now_iso(),
            )
            return "created", record
        alert_id = existing.id if existing else f"ral-{uuid4().hex[:12]}"
        payload = {
            "id": alert_id,
            "alert_type": create.alert_type,
            "severity": create.severity,
            "status": existing.status if existing else "open",
            "title": create.title,
            "description": create.description,
            "safe_summary": create.safe_summary,
            "draft_id": create.draft_id,
            "review_event_id": create.review_event_id,
            "child_id": create.child_id,
            "child_name": create.child_name,
            "home_id": create.home_id,
            "recording_type": create.recording_type,
            "form_id": create.form_id,
            "source": create.source,
            "route": create.route,
            "action_label": create.action_label,
            "due_at": create.due_at,
            "metadata": create.metadata,
        }
        if existing:
            payload["acknowledged_by"] = existing.acknowledged_by
            payload["acknowledged_at"] = existing.acknowledged_at
            payload["owner_user_id"] = existing.owner_user_id
            payload["owner_name"] = existing.owner_name
        record = self._persist(payload, conn=conn)
        self.record_alert_audit(record, "generated", current_user)
        return ("updated" if existing else "created"), record

    def build_alerts_for_draft(self, draft: RecordingDraftRecord) -> list[RecordingAlertCreate]:
        alerts: list[RecordingAlertCreate] = []
        summary = _safe_draft_summary(draft)
        base_meta = {
            "draft_status": draft.status,
            "review_status": draft.review_status,
            "no_raw_body": True,
        }
        review_open = draft.review_status in {
            "draft",
            "awaiting_review",
            "changes_requested",
            "manager_review_required",
            "safeguarding_review_required",
        }

        if (
            draft.manager_review_required or draft.safeguarding_review_required
        ) and review_open:
            severity: RecordingAlertSeverity = "urgent" if draft.safeguarding_review_required else "high"
            alerts.append(
                RecordingAlertCreate(
                    alert_type="high_risk_review_due",
                    severity=severity,
                    title="High-risk recording awaiting manager review",
                    description="Draft is flagged for manager or safeguarding review and is not yet approved.",
                    safe_summary=summary,
                    draft_id=draft.id,
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    home_id=draft.home_id,
                    recording_type=draft.recording_type,
                    form_id=draft.form_id,
                    route=_review_route(draft.id),
                    action_label="Open review",
                    metadata=base_meta,
                )
            )

        if draft.safeguarding_review_required or draft.safeguarding_sensitive:
            alerts.append(
                RecordingAlertCreate(
                    alert_type="safeguarding_review_due",
                    severity="urgent",
                    title="Safeguarding-sensitive recording needs review",
                    description="Safeguarding review is required before formal completion.",
                    safe_summary=summary,
                    draft_id=draft.id,
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    home_id=draft.home_id,
                    recording_type=draft.recording_type,
                    form_id=draft.form_id,
                    route=_review_route(draft.id),
                    action_label="Open safeguarding review",
                    metadata={**base_meta, "safeguarding_sensitive": True},
                )
            )

        if draft.review_status == "safeguarding_escalation_required":
            alerts.append(
                RecordingAlertCreate(
                    alert_type="safeguarding_escalation_required",
                    severity="urgent",
                    title="Safeguarding escalation recorded — manager follow-up",
                    description="A safeguarding escalation was recorded on this draft. Manager oversight required.",
                    safe_summary=summary,
                    draft_id=draft.id,
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    home_id=draft.home_id,
                    recording_type=draft.recording_type,
                    route=_review_route(draft.id),
                    action_label="Open escalation review",
                    metadata=base_meta,
                )
            )

        rec_type = _text(draft.recording_type).lower()
        form_id = _text(draft.form_id).lower()
        if "medication-error" in rec_type or "medication-error" in form_id:
            alerts.append(
                RecordingAlertCreate(
                    alert_type="medication_error_review_due",
                    severity="high",
                    title="Medication error recording needs manager review",
                    description="Medication error drafts require manager review before completion.",
                    safe_summary=summary,
                    draft_id=draft.id,
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    home_id=draft.home_id,
                    recording_type=draft.recording_type,
                    form_id=draft.form_id,
                    route=_review_route(draft.id),
                    action_label="Open medication review",
                    metadata=base_meta,
                )
            )

        if any(token in rec_type for token in ("missing", "missing-episode", "return-conversation", "rhi")):
            if draft.status in ("draft", "ready_for_review") or review_open:
                alert_type: RecordingAlertType = (
                    "rhi_follow_up_due" if "rhi" in rec_type else "missing_episode_follow_up_due"
                )
                alerts.append(
                    RecordingAlertCreate(
                        alert_type=alert_type,
                        severity="high",
                        title="Missing episode or RHI follow-up due",
                        description="This recording type typically needs timely follow-up and manager awareness.",
                        safe_summary=summary,
                        draft_id=draft.id,
                        child_id=draft.child_id,
                        child_name=draft.child_name,
                        home_id=draft.home_id,
                        recording_type=draft.recording_type,
                        route=_draft_route(draft.id),
                        action_label="Open draft",
                        metadata=base_meta,
                    )
                )

        completion = draft.structured_completion or {}
        missing = completion.get("required_missing") or []
        if isinstance(missing, list) and missing:
            sev: RecordingAlertSeverity = "high" if draft.safeguarding_sensitive else "medium"
            alerts.append(
                RecordingAlertCreate(
                    alert_type="structured_fields_missing",
                    severity=sev,
                    title="Structured recording fields incomplete",
                    description=f"{len(missing)} required structured field(s) still missing.",
                    safe_summary=summary,
                    draft_id=draft.id,
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    home_id=draft.home_id,
                    recording_type=draft.recording_type,
                    form_id=draft.form_id,
                    route=_draft_route(draft.id),
                    action_label="Complete structured fields",
                    metadata={**base_meta, "required_missing_count": len(missing)},
                )
            )

        if draft.privacy_flags:
            sev_priv: RecordingAlertSeverity = "high" if draft.safeguarding_sensitive else "medium"
            alerts.append(
                RecordingAlertCreate(
                    alert_type="privacy_flags_unresolved",
                    severity=sev_priv,
                    title="Privacy identifiers flagged on recording",
                    description=f"{len(draft.privacy_flags)} privacy flag(s) need review before sharing.",
                    safe_summary=summary,
                    draft_id=draft.id,
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    home_id=draft.home_id,
                    recording_type=draft.recording_type,
                    route=_draft_route(draft.id),
                    action_label="Review privacy flags",
                    metadata={**base_meta, "privacy_flag_count": len(draft.privacy_flags)},
                )
            )

        if draft.review_status == "changes_requested":
            updated = _parse_dt(draft.updated_at)
            overdue = False
            if updated:
                overdue = datetime.now(timezone.utc) - updated > timedelta(days=CHANGES_REQUESTED_DAYS)
            alerts.append(
                RecordingAlertCreate(
                    alert_type="changes_requested_pending",
                    severity="high" if overdue else "medium",
                    title="Manager requested changes — draft not yet updated",
                    description="Review requested changes; draft has not been resubmitted for review.",
                    safe_summary=summary,
                    draft_id=draft.id,
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    home_id=draft.home_id,
                    recording_type=draft.recording_type,
                    route=_draft_route(draft.id),
                    action_label="Open draft to update",
                    due_at=(
                        (updated + timedelta(days=CHANGES_REQUESTED_DAYS)).isoformat()
                        if updated
                        else None
                    ),
                    metadata={**base_meta, "overdue": overdue},
                )
            )

        if draft.status == "draft":
            updated = _parse_dt(draft.updated_at)
            if updated and datetime.now(timezone.utc) - updated > timedelta(days=STALE_DRAFT_DAYS):
                alerts.append(
                    RecordingAlertCreate(
                        alert_type="draft_stale",
                        severity="medium",
                        title="Recording draft inactive for extended period",
                        description=f"Draft unchanged for more than {STALE_DRAFT_DAYS} days.",
                        safe_summary=summary,
                        draft_id=draft.id,
                        child_id=draft.child_id,
                        child_name=draft.child_name,
                        home_id=draft.home_id,
                        recording_type=draft.recording_type,
                        route=_draft_route(draft.id),
                        action_label="Open draft",
                        metadata=base_meta,
                    )
                )

        meta = draft.metadata or {}
        submitted_to = _text(draft.submitted_to)
        if draft.status == "submitted" or meta.get("submitted"):
            formal = meta.get("formal_record_created")
            if submitted_to == "draft_workspace" or formal is False:
                alerts.append(
                    RecordingAlertCreate(
                        alert_type="formal_submission_not_wired",
                        severity="medium",
                        title="Formal record submission not yet completed",
                        description="Draft is marked submitted in workspace but formal record path may not be wired.",
                        safe_summary=summary,
                        draft_id=draft.id,
                        child_id=draft.child_id,
                        child_name=draft.child_name,
                        home_id=draft.home_id,
                        recording_type=draft.recording_type,
                        route=_draft_route(draft.id),
                        action_label="Check submission status",
                        metadata=base_meta,
                    )
                )
            if meta.get("formal_submission_failed"):
                alerts.append(
                    RecordingAlertCreate(
                        alert_type="formal_submission_failed",
                        severity="high",
                        title="Formal record submission failed",
                        description="A formal submission attempt failed; manager should verify next steps.",
                        safe_summary=summary,
                        draft_id=draft.id,
                        child_id=draft.child_id,
                        child_name=draft.child_name,
                        home_id=draft.home_id,
                        recording_type=draft.recording_type,
                        route=_draft_route(draft.id),
                        action_label="Review submission",
                        metadata=base_meta,
                    )
                )

        if draft.manager_review_required and draft.review_status in (
            "manager_review_required",
            "awaiting_review",
        ):
            alerts.append(
                RecordingAlertCreate(
                    alert_type="manager_review_required",
                    severity="high",
                    title="Manager approval needed before formal completion",
                    description="This draft requires explicit manager review before completion.",
                    safe_summary=summary,
                    draft_id=draft.id,
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    home_id=draft.home_id,
                    recording_type=draft.recording_type,
                    route=_review_route(draft.id),
                    action_label="Open manager review",
                    metadata=base_meta,
                )
            )

        quality_flags = draft.quality_flags or []
        language_flags = draft.language_flags or []
        if quality_flags or language_flags:
            if draft.recording_type in HIGH_RISK_TYPES or draft.safeguarding_sensitive:
                alerts.append(
                    RecordingAlertCreate(
                        alert_type="recording_quality_concern",
                        severity="medium",
                        title="Recording quality flags need attention",
                        description="Quality or language flags were raised on this high-risk recording.",
                        safe_summary=summary,
                        draft_id=draft.id,
                        child_id=draft.child_id,
                        child_name=draft.child_name,
                        home_id=draft.home_id,
                        recording_type=draft.recording_type,
                        route=_draft_route(draft.id),
                        action_label="Review quality flags",
                        metadata={
                            **base_meta,
                            "quality_flag_count": len(quality_flags),
                            "language_flag_count": len(language_flags),
                        },
                    )
                )

        if draft.child_id:
            for alert in alerts:
                if not alert.route and draft.child_id:
                    pass
        return alerts

    def build_alerts_for_review_event(self, event: RecordingReviewEventRecord) -> list[RecordingAlertCreate]:
        alerts: list[RecordingAlertCreate] = []
        decision = _text(event.decision)
        if decision in ("request_changes", "changes_requested"):
            alerts.append(
                RecordingAlertCreate(
                    alert_type="changes_requested_pending",
                    severity="medium",
                    title="Review changes requested",
                    description="Manager requested changes on this recording draft.",
                    safe_summary=f"Draft {event.draft_id}: review decision {decision}.",
                    draft_id=event.draft_id,
                    review_event_id=event.id,
                    route=_review_route(event.draft_id),
                    action_label="Open review",
                    metadata={"review_decision": decision, "no_raw_body": True},
                )
            )
        if decision in ("safeguarding_escalation", "safeguarding_escalation_required"):
            alerts.append(
                RecordingAlertCreate(
                    alert_type="safeguarding_escalation_required",
                    severity="urgent",
                    title="Safeguarding escalation from review",
                    description="Review recorded a safeguarding escalation — follow-up required.",
                    safe_summary=f"Draft {event.draft_id}: safeguarding escalation recorded.",
                    draft_id=event.draft_id,
                    review_event_id=event.id,
                    route=_review_route(event.draft_id),
                    action_label="Open escalation",
                    metadata={"review_decision": decision, "no_raw_body": True},
                )
            )
        return alerts

    def generate_alerts_for_drafts(
        self,
        drafts: list[RecordingDraftRecord],
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
        dry_run: bool = False,
        force: bool = False,
    ) -> RecordingAlertGenerationResponse:
        created = updated = skipped = 0
        results: list[RecordingAlertRecord] = []
        for draft in drafts:
            for candidate in self.build_alerts_for_draft(draft):
                outcome, record = self._upsert_candidate(
                    candidate, current_user=current_user, conn=conn, dry_run=dry_run, force=force
                )
                if record:
                    results.append(record)
                if outcome == "created":
                    created += 1
                elif outcome == "updated":
                    updated += 1
                else:
                    skipped += 1
        return RecordingAlertGenerationResponse(
            generated=len(results),
            created=created,
            updated=updated,
            skipped=skipped,
            dry_run=dry_run,
            alerts=results,
        )

    def generate_alerts(
        self,
        current_user: dict[str, Any],
        request: RecordingAlertGenerationRequest | None = None,
        conn: Any | None = None,
    ) -> RecordingAlertGenerationResponse:
        request = request or RecordingAlertGenerationRequest()
        if not _is_manager_role(current_user) and not self.enforce_alert_access(
            RecordingAlertRecord(
                id="access-check",
                alert_type="manager_review_required",
                title="",
                created_at=_now_iso(),
                updated_at=_now_iso(),
            ),
            current_user,
        ):
            return RecordingAlertGenerationResponse(
                warnings=["Alert generation requires manager or senior oversight role."],
                dry_run=request.dry_run,
            )

        filters = RecordingDraftListRequest(
            child_id=request.child_id,
            home_id=request.home_id,
            limit=200,
            offset=0,
        )
        draft_response = recording_draft_service.list_drafts(current_user, filters, conn=conn)
        response = self.generate_alerts_for_drafts(
            draft_response.items,
            current_user,
            conn=conn,
            dry_run=request.dry_run,
            force=request.force,
        )

        if recording_governance_service.enforce_governance_access(current_user):
            try:
                from schemas.recording_governance import RecordingGovernanceFilters

                dashboard = recording_governance_service.build_dashboard(
                    current_user, RecordingGovernanceFilters(child_id=request.child_id), conn=conn
                )
                if dashboard.backlog.awaiting_review >= REVIEW_BACKLOG_THRESHOLD:
                    backlog_alert = RecordingAlertCreate(
                        alert_type="review_backlog_high",
                        severity="high",
                        title="Recording review backlog is high",
                        description=(
                            f"{dashboard.backlog.awaiting_review} item(s) awaiting review "
                            f"in current scope."
                        ),
                        safe_summary=(
                            f"Backlog: {dashboard.backlog.awaiting_review} awaiting, "
                            f"{dashboard.backlog.urgent} urgent, "
                            f"{dashboard.backlog.safeguarding_review} safeguarding."
                        ),
                        route="/record/reviews",
                        action_label="Open review queue",
                        metadata={"backlog_count": dashboard.backlog.awaiting_review},
                    )
                    outcome, record = self._upsert_candidate(
                        backlog_alert,
                        current_user=current_user,
                        conn=conn,
                        dry_run=request.dry_run,
                        force=request.force,
                    )
                    if record:
                        response.alerts.append(record)
                        response.generated += 1
                        if outcome == "created":
                            response.created += 1
                        elif outcome == "updated":
                            response.updated += 1
                        else:
                            response.skipped += 1
            except Exception:
                logger.debug("Backlog alert generation skipped", exc_info=True)

        all_events: list[RecordingReviewEventRecord] = []
        for draft in draft_response.items[:100]:
            all_events.extend(
                recording_review_service._list_events_for_draft(draft.id, conn=conn)
            )
        for event in all_events[:100]:
            for candidate in self.build_alerts_for_review_event(event):
                outcome, record = self._upsert_candidate(
                    candidate, current_user=current_user, conn=conn, dry_run=request.dry_run, force=request.force
                )
                if record and record not in response.alerts:
                    response.alerts.append(record)
                    response.generated += 1
                    if outcome == "created":
                        response.created += 1
                    elif outcome == "updated":
                        response.updated += 1
                    else:
                        response.skipped += 1

        return response

    def list_alerts(
        self,
        current_user: dict[str, Any],
        filters: RecordingAlertListFilters | None = None,
        conn: Any | None = None,
    ) -> RecordingAlertListResponse:
        filters = filters or RecordingAlertListFilters()
        records: list[RecordingAlertRecord] = []

        if self._detect_storage_mode() == "postgresql" and conn is not None:
            try:
                clauses = ["1=1"]
                params: list[Any] = []
                if filters.status:
                    clauses.append("status = %s")
                    params.append(filters.status)
                if filters.severity:
                    clauses.append("severity = %s")
                    params.append(filters.severity)
                if filters.alert_type:
                    clauses.append("alert_type = %s")
                    params.append(filters.alert_type)
                if filters.child_id is not None:
                    clauses.append("child_id = %s")
                    params.append(filters.child_id)
                if filters.home_id is not None:
                    clauses.append("home_id = %s")
                    params.append(filters.home_id)
                if filters.draft_id:
                    clauses.append("draft_id = %s")
                    params.append(filters.draft_id)
                if filters.safeguarding_only:
                    clauses.append("alert_type = ANY(%s)")
                    params.append(list(SAFEGUARDING_ALERT_TYPES))
                sql = f"""
                    SELECT * FROM recording_alerts
                    WHERE {' AND '.join(clauses)}
                    ORDER BY
                      CASE severity
                        WHEN 'urgent' THEN 0 WHEN 'high' THEN 1
                        WHEN 'medium' THEN 2 ELSE 3 END,
                      updated_at DESC
                    LIMIT %s OFFSET %s
                """
                params.extend([filters.limit, filters.offset])
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(sql, params)
                    records = [self._row_to_record(dict(r)) for r in cur.fetchall()]
            except Exception:
                logger.debug("List alerts from DB failed", exc_info=True)

        if not records:
            for row in self._memory.values():
                rec = self._row_to_record(row)
                records.append(rec)

        visible = [r for r in records if self.enforce_alert_access(r, current_user)]
        if filters.status:
            visible = [r for r in visible if r.status == filters.status]
        if filters.severity:
            visible = [r for r in visible if r.severity == filters.severity]
        if filters.alert_type:
            visible = [r for r in visible if r.alert_type == filters.alert_type]
        if filters.child_id is not None:
            visible = [r for r in visible if r.child_id == filters.child_id]
        if filters.home_id is not None:
            visible = [r for r in visible if r.home_id == filters.home_id]
        if filters.draft_id:
            visible = [r for r in visible if r.draft_id == filters.draft_id]
        if filters.safeguarding_only:
            visible = [r for r in visible if r.alert_type in SAFEGUARDING_ALERT_TYPES]

        visible.sort(
            key=lambda a: (
                {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(a.severity, 4),
                a.updated_at,
            ),
        )
        page = visible[filters.offset : filters.offset + filters.limit]
        mode = self._detect_storage_mode()
        return RecordingAlertListResponse(
            items=page,
            total=len(visible),
            storage_mode=mode,
            persistence_available=mode == "postgresql",
        )

    def get_alert(
        self, alert_id: str, current_user: dict[str, Any], conn: Any | None = None
    ) -> RecordingAlertRecord | None:
        row = self._memory.get(alert_id)
        if row:
            record = self._row_to_record(row)
            if self.enforce_alert_access(record, current_user):
                return record
            return None
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT * FROM recording_alerts WHERE id = %s", (alert_id,))
                    fetched = cur.fetchone()
                    if fetched:
                        record = self._row_to_record(dict(fetched))
                        if self.enforce_alert_access(record, current_user):
                            return record
            except Exception:
                logger.debug("Get alert failed", exc_info=True)
        return None

    def build_alert_summary(self, alerts: list[RecordingAlertRecord]) -> RecordingAlertSummary:
        open_statuses = {"open", "acknowledged", "assigned"}
        open_alerts = [a for a in alerts if a.status in open_statuses]
        summary = RecordingAlertSummary(
            open_count=len(open_alerts),
            urgent_count=sum(1 for a in open_alerts if a.severity == "urgent"),
            safeguarding_count=sum(1 for a in open_alerts if a.alert_type in SAFEGUARDING_ALERT_TYPES),
            privacy_count=sum(1 for a in open_alerts if a.alert_type == "privacy_flags_unresolved"),
            changes_requested_count=sum(
                1 for a in open_alerts if a.alert_type == "changes_requested_pending"
            ),
            overdue_count=sum(
                1
                for a in open_alerts
                if a.due_at and (_parse_dt(a.due_at) or datetime.max.replace(tzinfo=timezone.utc))
                < datetime.now(timezone.utc)
            ),
            stale_count=sum(1 for a in open_alerts if a.alert_type == "draft_stale"),
        )
        for alert in open_alerts:
            summary.by_severity[alert.severity] = summary.by_severity.get(alert.severity, 0) + 1
            summary.by_type[alert.alert_type] = summary.by_type.get(alert.alert_type, 0) + 1
            summary.by_status[alert.status] = summary.by_status.get(alert.status, 0) + 1
        return summary

    def record_alert_audit(
        self,
        alert: RecordingAlertRecord,
        action: str,
        current_user: dict[str, Any],
        *,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        record_audit_event(
            event_type="recording_alert",
            action=action,
            actor=current_user,
            resource_type="recording_alert",
            resource_id=alert.id,
            metadata={
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "status": alert.status,
                "draft_id": alert.draft_id,
                "child_id": alert.child_id,
                "no_raw_body": True,
                **(metadata or {}),
            },
        )

    def acknowledge_alert(
        self,
        alert: RecordingAlertRecord,
        action: RecordingAlertActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingAlertRecord:
        alert.status = "acknowledged"
        alert.acknowledged_by = _user_id(current_user)
        alert.acknowledged_at = _now_iso()
        if action.note:
            alert.metadata = {**(alert.metadata or {}), "acknowledge_note": action.note}
        return self._save_alert_state(alert, current_user, "acknowledged", conn=conn)

    def assign_alert(
        self,
        alert: RecordingAlertRecord,
        action: RecordingAlertActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingAlertRecord:
        alert.status = "assigned"
        alert.owner_user_id = action.owner_user_id or _user_id(current_user)
        alert.owner_name = action.owner_name or _user_display_name(current_user)
        if action.note:
            alert.metadata = {**(alert.metadata or {}), "assign_note": action.note}
        return self._save_alert_state(alert, current_user, "assigned", conn=conn)

    def resolve_alert(
        self,
        alert: RecordingAlertRecord,
        action: RecordingAlertActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingAlertRecord:
        alert.status = "resolved"
        alert.resolved_by = _user_id(current_user)
        alert.resolved_at = _now_iso()
        alert.resolution_note = action.note
        return self._save_alert_state(alert, current_user, "resolved", conn=conn)

    def archive_alert(
        self,
        alert: RecordingAlertRecord,
        action: RecordingAlertActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingAlertRecord:
        alert.status = "archived"
        if action.note:
            alert.metadata = {**(alert.metadata or {}), "archive_note": action.note}
        return self._save_alert_state(alert, current_user, "archived", conn=conn)

    def reopen_alert(
        self,
        alert: RecordingAlertRecord,
        action: RecordingAlertActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingAlertRecord:
        alert.status = "open"
        alert.resolved_by = None
        alert.resolved_at = None
        alert.resolution_note = None
        if action.note:
            alert.metadata = {**(alert.metadata or {}), "reopen_note": action.note}
        return self._save_alert_state(alert, current_user, "reopened", conn=conn)

    def _save_alert_state(
        self,
        alert: RecordingAlertRecord,
        current_user: dict[str, Any],
        audit_action: str,
        conn: Any | None = None,
    ) -> RecordingAlertRecord:
        alert.updated_at = _now_iso()
        data = alert.model_dump()
        saved = self._persist(data, conn=conn)
        self.record_alert_audit(saved, audit_action, current_user)
        return saved

    def create_intelligence_action_from_alert(
        self,
        alert: RecordingAlertRecord,
        action: RecordingAlertActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> tuple[str | None, str | None]:
        action_type = "record_quality_review"
        if alert.alert_type in SAFEGUARDING_ALERT_TYPES:
            action_type = "safeguarding_review"
        elif alert.alert_type in ("missing_episode_follow_up_due", "rhi_follow_up_due"):
            action_type = "missing_follow_up"
        elif alert.alert_type == "medication_error_review_due":
            action_type = "safeguarding_review"

        try:
            payload = IntelligenceActionCreate(
                action_type=action_type,  # type: ignore[arg-type]
                title=alert.title,
                summary=alert.safe_summary or alert.description,
                priority=alert.severity if alert.severity in ("low", "medium", "high", "urgent") else "medium",  # type: ignore[arg-type]
                reason=alert.description,
                suggested_next_step=alert.action_label,
                source_finding_id=alert.id,
                source_finding_type=alert.alert_type,
                source_service="recording_alert_service",
                child_id=str(alert.child_id) if alert.child_id else None,
                home_id=str(alert.home_id) if alert.home_id else None,
                linked_record_ids=[alert.draft_id] if alert.draft_id else [],
            )
            created = intelligence_action_service.create_action(payload, current_user=current_user, conn=conn)
            return created.id, None
        except Exception as exc:
            logger.debug("Intelligence action from alert failed: %s", exc)
            return None, "Action creation is not fully wired yet. Open /intelligence-actions to manage actions."

    def apply_alert_action(
        self,
        alert_id: str,
        action: RecordingAlertActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingAlertActionResponse:
        alert = self.get_alert(alert_id, current_user, conn=conn)
        if not alert:
            return RecordingAlertActionResponse(
                success=False, message="Alert not found or access denied."
            )

        if action.action == "resolve" and alert.alert_type in NO_AUTO_RESOLVE_TYPES:
            pass

        updated = alert
        warning: str | None = None
        linked_id: str | None = alert.linked_action_id

        if action.action == "acknowledge":
            updated = self.acknowledge_alert(alert, action, current_user, conn=conn)
        elif action.action == "assign":
            updated = self.assign_alert(alert, action, current_user, conn=conn)
        elif action.action == "resolve":
            updated = self.resolve_alert(alert, action, current_user, conn=conn)
        elif action.action == "archive":
            updated = self.archive_alert(alert, action, current_user, conn=conn)
        elif action.action == "reopen":
            updated = self.reopen_alert(alert, action, current_user, conn=conn)
        elif action.action == "create_intelligence_action":
            new_id, warn = self.create_intelligence_action_from_alert(
                alert, action, current_user, conn=conn
            )
            warning = warn
            if new_id:
                alert.linked_action_id = new_id
                linked_id = new_id
                updated = self._save_alert_state(alert, current_user, "linked_intelligence_action", conn=conn)
            elif action.create_action:
                warning = warning or "Action creation is not fully wired yet."
        else:
            return RecordingAlertActionResponse(success=False, message=f"Unknown action: {action.action}")

        return RecordingAlertActionResponse(
            success=True,
            alert=updated,
            linked_action_id=linked_id,
            warning=warning,
            message=MANAGER_JUDGEMENT_NOTICE,
        )

    def _resolve_digest_scope(
        self,
        current_user: dict[str, Any],
        filters: RecordingAlertListFilters | None = None,
        explicit_scope: RecordingAlertDigestScope | None = None,
    ) -> RecordingAlertDigestScope:
        if explicit_scope:
            return explicit_scope
        filters = filters or RecordingAlertListFilters()
        if filters.child_id is not None:
            return "user"
        if filters.home_id is not None:
            return "home"
        if _is_manager_role(current_user):
            return "provider"
        return "user"

    def _open_alerts(
        self,
        current_user: dict[str, Any],
        filters: RecordingAlertListFilters | None = None,
        conn: Any | None = None,
    ) -> list[RecordingAlertRecord]:
        filters = filters or RecordingAlertListFilters(limit=500)
        listed = self.list_alerts(current_user, filters, conn=conn)
        open_statuses = {"open", "acknowledged", "assigned"}
        return [a for a in listed.items if a.status in open_statuses]

    def _is_due_today(self, alert: RecordingAlertRecord) -> bool:
        due = _parse_dt(alert.due_at)
        if not due:
            return False
        now = datetime.now(timezone.utc)
        return due.date() == now.date()

    def _is_overdue(self, alert: RecordingAlertRecord) -> bool:
        due = _parse_dt(alert.due_at)
        if not due:
            return False
        return due < datetime.now(timezone.utc)

    def top_alerts_for_digest(
        self, alerts: list[RecordingAlertRecord], limit: int = 5
    ) -> list[RecordingAlertDigestTopItem]:
        open_statuses = {"open", "acknowledged", "assigned"}
        open_alerts = [a for a in alerts if a.status in open_statuses]
        open_alerts.sort(
            key=lambda a: (
                {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(a.severity, 4),
                a.updated_at,
            )
        )
        items: list[RecordingAlertDigestTopItem] = []
        for alert in open_alerts[:limit]:
            items.append(
                RecordingAlertDigestTopItem(
                    id=alert.id,
                    alert_type=alert.alert_type,
                    severity=alert.severity,
                    status=alert.status,
                    title=alert.title,
                    safe_summary=alert.safe_summary or alert.description,
                    action_label=alert.action_label,
                    route=alert.route,
                    due_at=alert.due_at,
                    child_name=alert.child_name,
                )
            )
        return items

    def build_digest_recommendations(
        self, alerts: list[RecordingAlertRecord], summary: RecordingAlertSummary
    ) -> list[str]:
        recs: list[str] = []
        if summary.urgent_count > 0 or summary.safeguarding_count > 0:
            recs.append("Review urgent safeguarding alerts first.")
        if summary.open_count > 0 and any(
            a.alert_type in ("high_risk_review_due", "manager_review_required") for a in alerts
        ):
            recs.append("Open recording reviews for high-risk drafts.")
        if any(a.alert_type == "structured_fields_missing" for a in alerts):
            recs.append("Check structured fields missing before approval.")
        if summary.privacy_count > 0:
            recs.append("Resolve privacy flags before formal submission.")
        if summary.changes_requested_count > 0:
            recs.append("Follow up drafts where manager requested changes.")
        if summary.stale_count > 0:
            recs.append("Review stale drafts that have not been updated recently.")
        if summary.overdue_count > 0:
            recs.append("Prioritise overdue follow-up items before shift end.")
        recs.append(
            "Use ORB for recording quality themes, but manager judgement remains required."
        )
        return recs

    def build_digest(
        self,
        current_user: dict[str, Any],
        filters: RecordingAlertListFilters | None = None,
        conn: Any | None = None,
        *,
        scope: RecordingAlertDigestScope | None = None,
    ) -> RecordingAlertDigest:
        filters = filters or RecordingAlertListFilters(limit=500)
        open_alerts = self._open_alerts(current_user, filters, conn=conn)
        summary = self.build_alert_summary(open_alerts)
        resolved_scope = self._resolve_digest_scope(current_user, filters, scope)
        last_check = self.get_last_check(current_user, conn=conn)

        routes = RecordingAlertDigestRoutes()
        if filters.child_id is not None:
            cid = filters.child_id
            routes = RecordingAlertDigestRoutes(
                alerts=f"/record/alerts?child_id={cid}",
                governance=f"/record/governance?child_id={cid}",
                reviews=f"/record/reviews?child_id={cid}",
            )
        elif filters.home_id is not None:
            hid = filters.home_id
            routes = RecordingAlertDigestRoutes(
                alerts=f"/record/alerts?home_id={hid}",
                governance=f"/record/governance?home_id={hid}",
            )

        limitations: list[str] = []
        mode = self._detect_storage_mode()
        if mode == "memory":
            limitations.append("Alerts using in-memory fallback until migration is applied.")
        if not self._check_run_table_available(conn):
            limitations.append("Check-run history is in-memory only until migration 084 is applied.")
        limitations.append("No background scheduler — run checks manually or on page load.")

        return RecordingAlertDigest(
            generated_at=_now_iso(),
            scope=resolved_scope,
            total_open=summary.open_count,
            urgent=summary.urgent_count,
            high=summary.by_severity.get("high", 0),
            safeguarding=summary.safeguarding_count,
            privacy=summary.privacy_count,
            changes_requested=summary.changes_requested_count,
            stale_drafts=summary.stale_count,
            structured_missing=sum(
                1 for a in open_alerts if a.alert_type == "structured_fields_missing"
            ),
            formal_submission_gaps=sum(
                1
                for a in open_alerts
                if a.alert_type in ("formal_submission_not_wired", "formal_submission_failed")
            ),
            due_today=sum(1 for a in open_alerts if self._is_due_today(a)),
            overdue=summary.overdue_count,
            last_check_at=last_check.completed_at if last_check else None,
            recommendations=self.build_digest_recommendations(open_alerts, summary),
            top_alerts=self.top_alerts_for_digest(open_alerts),
            routes=routes,
            limitations=limitations,
            metadata={
                "storage_mode": mode,
                "no_raw_body": True,
                "triggered_by_role": _user_role(current_user),
            },
        )

    def build_badge_summary(
        self,
        current_user: dict[str, Any],
        filters: RecordingAlertListFilters | None = None,
        conn: Any | None = None,
    ) -> RecordingAlertBadgeSummary:
        filters = filters or RecordingAlertListFilters(limit=500)
        open_alerts = self._open_alerts(current_user, filters, conn=conn)
        summary = self.build_alert_summary(open_alerts)
        last_check = self.get_last_check(current_user, conn=conn)

        review_due = sum(
            1
            for a in open_alerts
            if a.alert_type
            in (
                "high_risk_review_due",
                "manager_review_required",
                "safeguarding_review_due",
            )
        )

        tone: Literal["neutral", "attention", "urgent"] = "neutral"
        if summary.urgent_count > 0 or summary.safeguarding_count > 0:
            tone = "urgent"
        elif summary.open_count > 0:
            tone = "attention"

        route = "/record/alerts"
        if filters.child_id is not None:
            route = f"/record/alerts?child_id={filters.child_id}"

        label = "Recording alerts"
        if summary.urgent_count > 0:
            label = f"{summary.urgent_count} urgent recording alert(s)"
        elif summary.open_count > 0:
            label = f"{summary.open_count} open recording alert(s)"

        return RecordingAlertBadgeSummary(
            total_open=summary.open_count,
            urgent=summary.urgent_count,
            safeguarding=summary.safeguarding_count,
            review_due=review_due,
            changes_requested=summary.changes_requested_count,
            privacy_flags=summary.privacy_count,
            route=route,
            label=label,
            tone=tone,
            last_check_at=last_check.completed_at if last_check else None,
        )

    def _check_run_table_available(self, conn: Any | None) -> bool:
        if self._detect_storage_mode() != "postgresql":
            return False
        if conn is None:
            try:
                conn = get_db_connection()
                own = True
            except Exception:
                return False
        else:
            own = False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = 'recording_alert_check_runs'
                    """
                )
                return cur.fetchone() is not None
        except Exception:
            return False
        finally:
            if own:
                release_db_connection(conn)

    def record_check_run(
        self,
        result: RecordingAlertCheckRun,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingAlertCheckRun:
        result.triggered_by = _user_id(current_user) or result.triggered_by
        self._last_check_run = result
        self._check_runs.append(result)
        if len(self._check_runs) > 50:
            self._check_runs = self._check_runs[-50:]

        if self._check_run_table_available(conn) and conn is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO recording_alert_check_runs (
                            id, triggered_by_user_id, triggered_by_name, home_id, scope,
                            dry_run, generated, created, updated, skipped,
                            warnings, metadata, started_at, completed_at
                        ) VALUES (
                            %(id)s, %(triggered_by_user_id)s, %(triggered_by_name)s,
                            %(home_id)s, %(scope)s, %(dry_run)s, %(generated)s,
                            %(created)s, %(updated)s, %(skipped)s,
                            %(warnings)s, %(metadata)s, %(started_at)s, %(completed_at)s
                        )
                        """,
                        {
                            "id": result.run_id,
                            "triggered_by_user_id": _user_id(current_user),
                            "triggered_by_name": _user_display_name(current_user),
                            "home_id": result.metadata.get("home_id"),
                            "scope": result.metadata.get("scope", "provider"),
                            "dry_run": result.dry_run,
                            "generated": result.generated,
                            "created": result.created,
                            "updated": result.updated,
                            "skipped": result.skipped,
                            "warnings": Json(result.warnings),
                            "metadata": Json(result.metadata),
                            "started_at": result.started_at,
                            "completed_at": result.completed_at,
                        },
                    )
                    conn.commit()
            except Exception:
                logger.debug("Check run persist failed; using memory", exc_info=True)

        return result

    def get_last_check(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> RecordingAlertCheckRun | None:
        _ = current_user
        if self._check_run_table_available(conn) and conn is not None:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT * FROM recording_alert_check_runs
                        ORDER BY completed_at DESC NULLS LAST, started_at DESC
                        LIMIT 1
                        """
                    )
                    row = cur.fetchone()
                    if row:
                        data = dict(row)
                        return RecordingAlertCheckRun(
                            run_id=_text(data.get("id")),
                            started_at=_iso_dt(data.get("started_at")) or _now_iso(),
                            completed_at=_iso_dt(data.get("completed_at")),
                            generated=int(data.get("generated") or 0),
                            created=int(data.get("created") or 0),
                            updated=int(data.get("updated") or 0),
                            skipped=int(data.get("skipped") or 0),
                            warnings=_parse_json(data.get("warnings"), []),
                            triggered_by=_text(data.get("triggered_by_user_id")),
                            dry_run=bool(data.get("dry_run")),
                            metadata=_parse_json(data.get("metadata"), {}),
                        )
            except Exception:
                logger.debug("Last check lookup failed", exc_info=True)
        return self._last_check_run

    def run_alert_checks(
        self,
        current_user: dict[str, Any],
        request: RecordingAlertCheckRequest | None = None,
        conn: Any | None = None,
    ) -> RecordingAlertCheckRun:
        request = request or RecordingAlertCheckRequest()
        started_at = _now_iso()
        run_id = f"racr-{uuid4().hex[:12]}"

        gen_request = RecordingAlertGenerationRequest(
            child_id=request.child_id,
            home_id=request.home_id,
            force=request.force,
            dry_run=request.dry_run,
        )
        generation = self.generate_alerts(current_user, gen_request, conn=conn)

        completed_at = _now_iso()
        scope = request.scope or self._resolve_digest_scope(
            current_user,
            RecordingAlertListFilters(child_id=request.child_id, home_id=request.home_id),
        )
        run = RecordingAlertCheckRun(
            run_id=run_id,
            started_at=started_at,
            completed_at=completed_at,
            generated=generation.generated,
            created=generation.created,
            updated=generation.updated,
            skipped=generation.skipped,
            warnings=list(generation.warnings),
            dry_run=request.dry_run,
            metadata={
                "scope": scope,
                "child_id": request.child_id,
                "home_id": request.home_id,
                "force": request.force,
                "no_raw_body": True,
            },
        )
        return self.record_check_run(run, current_user, conn=conn)

    def get_digest_health(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> RecordingAlertDigestHealth:
        base = self.get_health(conn=conn)
        last = self.get_last_check(current_user, conn=conn)
        return RecordingAlertDigestHealth(
            status=base.status,
            service=base.service,
            storage_mode=base.storage_mode,
            alert_count=base.alert_count,
            persistence_available=base.persistence_available,
            operational_only=base.operational_only,
            standalone_access=base.standalone_access,
            degraded=base.degraded,
            last_check_at=last.completed_at if last else None,
            last_check_run_id=last.run_id if last else None,
            check_run_persistence=self._check_run_table_available(conn),
            warnings=list(base.warnings),
        )


recording_alert_service = RecordingAlertService()
