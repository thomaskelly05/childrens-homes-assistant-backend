from __future__ import annotations

import json
import uuid
from collections import Counter
from typing import Any

from schemas.indicare_intelligence import IntelligenceSpineResponse, ManagerDailyBrief
from schemas.intelligence_actions import (
    IntelligenceActionBulkCreateResult,
    IntelligenceActionCreate,
    IntelligenceActionDecision,
    IntelligenceActionRecord,
    IntelligenceActionSummary,
    IntelligenceActionUpdate,
    IntelligenceAttentionFeed,
    IntelligenceAttentionFeedItem,
    IntelligenceOversightReviewCreate,
    IntelligenceOversightReviewRecord,
)
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, field, now_iso, safe_payload

try:
    from db.connection import get_db_connection, release_db_connection
except Exception:  # pragma: no cover
    get_db_connection = None  # type: ignore[assignment,misc]
    release_db_connection = None  # type: ignore[assignment,misc]

ACTION_NOTICE = (
    "Actions are proposed for manager review and are not automatically accepted. "
    "Human decision required — not a safeguarding decision and not an inspection judgement."
)

CREATE_INTELLIGENCE_ACTIONS_SQL = """
CREATE TABLE IF NOT EXISTS public.intelligence_actions (
  id BIGSERIAL PRIMARY KEY,
  home_id TEXT NULL,
  child_id TEXT NULL,
  staff_id TEXT NULL,
  source_finding_id TEXT NULL,
  source_finding_type TEXT NULL,
  source_service TEXT NULL,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'proposed',
  owner_role TEXT NULL,
  owner_user_id TEXT NULL,
  due_date TIMESTAMPTZ NULL,
  linked_record_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_evidence_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_action_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  regulatory_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  sccif_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_standard_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  reason TEXT NULL,
  suggested_next_step TEXT NULL,
  manager_decision TEXT NULL,
  manager_decision_reason TEXT NULL,
  audit_trail JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_home_id ON public.intelligence_actions(home_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_child_id ON public.intelligence_actions(child_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_staff_id ON public.intelligence_actions(staff_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_status ON public.intelligence_actions(status);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_priority ON public.intelligence_actions(priority);
CREATE INDEX IF NOT EXISTS idx_intelligence_actions_created_at ON public.intelligence_actions(created_at DESC);

CREATE TABLE IF NOT EXISTS public.intelligence_oversight_reviews (
  id BIGSERIAL PRIMARY KEY,
  home_id TEXT NULL,
  child_id TEXT NULL,
  staff_id TEXT NULL,
  review_type TEXT NOT NULL,
  source TEXT NULL,
  finding_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision TEXT NOT NULL,
  decision_reason TEXT NULL,
  manager_notes TEXT NULL,
  follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_intelligence_oversight_reviews_home_id ON public.intelligence_oversight_reviews(home_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_oversight_reviews_child_id ON public.intelligence_oversight_reviews(child_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_oversight_reviews_created_at ON public.intelligence_oversight_reviews(created_at DESC);
"""

_URGENT_PATTERNS = {
    "manager_review_missing",
    "missing_episode_increase",
    "safeguarding_concern_repeated",
    "restraint_increase",
}
_HIGH_PATTERNS = {
    "overdue_actions",
    "risk_assessment_stale",
    "incident_increase",
}
_MEDIUM_PATTERNS = {
    "child_voice_missing",
    "weak_recording_quality",
}


def _str_id(value: int | str | None) -> str | None:
    if value is None or value == "":
        return None
    return str(value)


def _json_list(value: Any) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


class IntelligenceActionService:
    """Human-in-the-loop intelligence actions — IndiCare suggests, manager decides."""

    def __init__(self) -> None:
        self._memory_actions: dict[str, IntelligenceActionRecord] = {}
        self._memory_reviews: dict[str, IntelligenceOversightReviewRecord] = {}
        self._db_ready = False
        self._db_init_attempted = False

    def persistence_available(self) -> bool:
        return self._ensure_tables()

    def propose_actions_from_spine(
        self,
        spine_response: IntelligenceSpineResponse | dict[str, Any],
        *,
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
    ) -> list[IntelligenceActionRecord]:
        if isinstance(spine_response, IntelligenceSpineResponse):
            payload = spine_response.model_dump(mode="json")
        else:
            payload = spine_response
        actions: list[IntelligenceActionRecord] = []
        hid = _str_id(home_id) or _str_id(payload.get("metadata", {}).get("home_id"))
        cid = _str_id(child_id)
        sid = _str_id(staff_id)

        for pattern in payload.get("patterns") or []:
            actions.extend(
                self._actions_from_pattern(
                    pattern,
                    home_id=hid,
                    child_id=cid,
                    staff_id=sid,
                    source_service="pattern_detection",
                )
            )

        for finding in (
            (payload.get("safeguarding_intelligence") or [])
            + (payload.get("child_intelligence") or [])
            + (payload.get("leadership_intelligence") or [])
            + (payload.get("inspection_risks") or [])
        ):
            actions.extend(
                self._actions_from_finding(
                    finding,
                    home_id=hid,
                    child_id=cid,
                    staff_id=sid,
                    source_service="intelligence_spine",
                )
            )

        for review in payload.get("record_quality") or []:
            if review.get("manager_review_required") or review.get("overall_quality") in {"weak", "developing"}:
                actions.append(
                    self._build_proposed(
                        action_type="record_quality_review",
                        title="Record quality review recommended",
                        summary=review.get("improvements", ["review recommended"])[0]
                        if review.get("improvements")
                        else "evidence suggests recording may benefit from manager review.",
                        priority="medium" if review.get("overall_quality") == "developing" else "high",
                        reason=f"Record {review.get('record_id')}: quality appears {review.get('overall_quality')}; source review required.",
                        suggested_next_step="Review source record and confirm child voice and therapeutic language.",
                        source_finding_id=str(review.get("record_id")),
                        source_finding_type="record_quality",
                        source_service="record_quality_intelligence",
                        home_id=hid,
                        child_id=cid,
                        staff_id=sid,
                        linked_record_ids=[str(review.get("record_id"))] if review.get("record_id") else [],
                    )
                )

        graph = payload.get("evidence_graph") or {}
        for gap in graph.get("evidence_gaps") or []:
            actions.append(
                self._build_proposed(
                    action_type="evidence_gap_review",
                    title="Evidence gap review recommended",
                    summary=str(gap),
                    priority="medium",
                    reason=str(gap),
                    suggested_next_step="Source review required — confirm linked records in chronology.",
                    source_finding_type="evidence_gap",
                    source_service="evidence_graph_intelligence",
                    home_id=hid,
                    child_id=cid,
                    staff_id=sid,
                )
            )

        for sim in payload.get("ofsted_simulation") or []:
            strength = sim.get("evidence_strength", "limited")
            if strength in {"limited", "emerging"}:
                area = sim.get("judgement_area", "area")
                actions.append(
                    self._build_proposed(
                        action_type="ofsted_evidence_strengthening",
                        title=f"Ofsted evidence strengthening: {str(area).replace('_', ' ')}",
                        summary=f"Current evidence appears {strength}; manager review recommended before inspection sampling.",
                        priority="medium" if strength == "emerging" else "high",
                        reason="evidence suggests strengthening may help inspection sampling — not an inspection judgement.",
                        suggested_next_step=(sim.get("manager_actions") or ["Review source records"])[0],
                        source_finding_id=f"ofsted-sim-{area}",
                        source_finding_type="ofsted_simulation",
                        source_service="ofsted_judgement_simulation",
                        home_id=hid,
                        child_id=cid,
                        staff_id=sid,
                        quality_standard_links=[str(area)],
                    )
                )

        brief = payload.get("manager_daily_brief")
        if brief:
            actions.extend(self.propose_actions_from_daily_brief(brief, home_id=hid, child_id=cid))

        return self._dedupe_actions(actions)

    def propose_actions_from_daily_brief(
        self,
        daily_brief: ManagerDailyBrief | dict[str, Any],
        *,
        home_id: int | str | None = None,
        child_id: int | str | None = None,
    ) -> list[IntelligenceActionRecord]:
        if isinstance(daily_brief, ManagerDailyBrief):
            data = daily_brief.model_dump(mode="json")
        else:
            data = daily_brief
        actions: list[IntelligenceActionRecord] = []
        hid = _str_id(home_id)
        cid = _str_id(child_id)

        for line in data.get("urgent_review") or []:
            lower = str(line).lower()
            action_type = "safeguarding_review"
            priority = "urgent"
            if "missing" in lower or "return home" in lower:
                action_type = "missing_follow_up"
            elif "manager review" in lower or "oversight" in lower:
                action_type = "manager_signoff"
            elif "restraint" in lower:
                action_type = "risk_assessment_review"
                priority = "urgent"
            actions.append(
                self._build_proposed(
                    action_type=action_type,
                    title="Manager oversight suggested",
                    summary=str(line),
                    priority=priority,
                    reason=str(line),
                    suggested_next_step="Source review required — human decision required.",
                    source_finding_type="daily_brief_urgent",
                    source_service="registered_manager_daily_brief",
                    home_id=hid,
                    child_id=cid,
                )
            )

        for line in data.get("safeguarding_signals") or []:
            actions.append(
                self._build_proposed(
                    action_type="safeguarding_review",
                    title="Safeguarding review recommended",
                    summary=str(line),
                    priority="urgent",
                    reason=str(line),
                    suggested_next_step="Manager oversight suggested — not a safeguarding decision.",
                    source_finding_type="daily_brief_safeguarding",
                    source_service="registered_manager_daily_brief",
                    home_id=hid,
                    child_id=cid,
                )
            )

        for line in data.get("overdue_actions") or []:
            actions.append(
                self._build_proposed(
                    action_type="reg44_action_review"
                    if "reg44" in str(line).lower()
                    else "reg45_action_review"
                    if "reg45" in str(line).lower()
                    else "manager_signoff",
                    title="Overdue action review recommended",
                    summary=str(line),
                    priority="high",
                    reason=str(line),
                    suggested_next_step="Review recommended: confirm owner and closure evidence.",
                    source_finding_type="daily_brief_overdue",
                    source_service="registered_manager_daily_brief",
                    home_id=hid,
                    child_id=cid,
                )
            )

        for line in data.get("quality_of_recording") or []:
            actions.append(
                self._build_proposed(
                    action_type="record_quality_review",
                    title="Recording quality review recommended",
                    summary=str(line),
                    priority="medium",
                    reason=str(line),
                    suggested_next_step="Review source record narrative and child voice.",
                    source_finding_type="daily_brief_recording",
                    source_service="registered_manager_daily_brief",
                    home_id=hid,
                    child_id=cid,
                )
            )

        for line in data.get("ofsted_evidence_risks") or []:
            actions.append(
                self._build_proposed(
                    action_type="ofsted_evidence_strengthening",
                    title="Ofsted evidence strengthening review",
                    summary=str(line),
                    priority="medium",
                    reason=str(line),
                    suggested_next_step="Review source records — not an inspection judgement.",
                    source_finding_type="daily_brief_ofsted",
                    source_service="registered_manager_daily_brief",
                    home_id=hid,
                    child_id=cid,
                )
            )

        for line in data.get("positive_progress") or []:
            actions.append(
                self._build_proposed(
                    action_type="policy_practice_review",
                    title="Positive progress to recognise",
                    summary=str(line),
                    priority="low",
                    reason=str(line),
                    suggested_next_step="Manager may wish to acknowledge progress in supervision.",
                    source_finding_type="daily_brief_positive",
                    source_service="registered_manager_daily_brief",
                    home_id=hid,
                    child_id=cid,
                )
            )

        return self._dedupe_actions(actions)

    def create_action(
        self,
        payload: IntelligenceActionCreate,
        *,
        current_user: dict[str, Any] | None = None,
        conn: Any = None,
    ) -> IntelligenceActionRecord:
        record = self._build_proposed(
            action_type=payload.action_type,
            title=payload.title,
            summary=payload.summary,
            priority=payload.priority,
            reason=payload.reason,
            suggested_next_step=payload.suggested_next_step,
            source_finding_id=payload.source_finding_id,
            source_finding_type=payload.source_finding_type,
            source_service=payload.source_service,
            home_id=_str_id(payload.home_id),
            child_id=_str_id(payload.child_id),
            staff_id=_str_id(payload.staff_id),
            owner_role=payload.owner_role,
            owner_user_id=payload.owner_user_id,
            linked_record_ids=payload.linked_record_ids,
            linked_evidence_ids=payload.linked_evidence_ids,
            linked_action_ids=payload.linked_action_ids,
            regulatory_links=payload.regulatory_links,
            sccif_links=payload.sccif_links,
            quality_standard_links=payload.quality_standard_links,
            due_date=payload.due_date,
        )
        record.audit_trail.append(
            self._audit_entry("created", current_user, reason="action proposed for manager review")
        )
        stored = self._persist_action(record, current_user=current_user, conn=conn)
        return stored

    def list_actions(
        self,
        *,
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        status: str | None = None,
        limit: int = 100,
        conn: Any = None,
    ) -> list[IntelligenceActionRecord]:
        if self._ensure_tables(conn=conn):
            rows = self._list_from_db(
                home_id=_str_id(home_id),
                child_id=_str_id(child_id),
                staff_id=_str_id(staff_id),
                status=status,
                limit=limit,
                conn=conn,
            )
            if rows is not None:
                return rows
        items = list(self._memory_actions.values())
        if _str_id(home_id):
            items = [a for a in items if a.home_id == _str_id(home_id)]
        if _str_id(child_id):
            items = [a for a in items if a.child_id == _str_id(child_id)]
        if _str_id(staff_id):
            items = [a for a in items if a.staff_id == _str_id(staff_id)]
        if status:
            items = [a for a in items if a.status == status]
        return items[:limit]

    def update_action(
        self,
        action_id: str,
        payload: IntelligenceActionUpdate,
        *,
        current_user: dict[str, Any] | None = None,
        conn: Any = None,
    ) -> IntelligenceActionRecord | None:
        existing = self._get_action(action_id, conn=conn)
        if not existing:
            return None
        updates = payload.model_dump(exclude_unset=True)
        data = existing.model_dump()
        data.update(updates)
        data["updated_at"] = now_iso()
        updated = IntelligenceActionRecord.model_validate(safe_payload(data))
        updated.audit_trail = list(existing.audit_trail)
        updated.audit_trail.append(self._audit_entry("updated", current_user))
        return self._persist_action(updated, current_user=current_user, conn=conn, replace=True)

    def decide_action(
        self,
        action_id: str,
        decision: IntelligenceActionDecision,
        *,
        current_user: dict[str, Any] | None = None,
        conn: Any = None,
    ) -> IntelligenceActionRecord | None:
        existing = self._get_action(action_id, conn=conn)
        if not existing:
            return None
        status_map = {
            "accept": "accepted",
            "dismiss": "dismissed",
            "in_progress": "in_progress",
            "complete": "completed",
            "supersede": "superseded",
        }
        new_status = status_map.get(decision.decision, existing.status)
        data = existing.model_dump()
        data["status"] = new_status
        data["manager_decision"] = decision.decision
        data["manager_decision_reason"] = decision.reason
        data["updated_at"] = now_iso()
        if new_status == "completed":
            data["completed_at"] = now_iso()
        updated = IntelligenceActionRecord.model_validate(safe_payload(data))
        updated.audit_trail = list(existing.audit_trail)
        updated.audit_trail.append(
            self._audit_entry(
                f"decision_{decision.decision}",
                current_user,
                reason=decision.reason,
                notes=decision.manager_notes,
            )
        )
        return self._persist_action(updated, current_user=current_user, conn=conn, replace=True)

    def complete_action(
        self,
        action_id: str,
        *,
        completion_notes: str | None = None,
        current_user: dict[str, Any] | None = None,
        conn: Any = None,
    ) -> IntelligenceActionRecord | None:
        return self.decide_action(
            action_id,
            IntelligenceActionDecision(decision="complete", reason=completion_notes),
            current_user=current_user,
            conn=conn,
        )

    def build_action_summary(
        self,
        actions: list[IntelligenceActionRecord] | None = None,
        *,
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        conn: Any = None,
    ) -> IntelligenceActionSummary:
        items = actions if actions is not None else self.list_actions(
            home_id=home_id, child_id=child_id, staff_id=staff_id, conn=conn
        )
        by_status = Counter(a.status for a in items)
        by_priority = Counter(a.priority for a in items)
        by_type = Counter(a.action_type for a in items)
        return IntelligenceActionSummary(
            total=len(items),
            by_status=dict(by_status),
            by_priority=dict(by_priority),
            by_type=dict(by_type),
            urgent_count=sum(1 for a in items if a.priority == "urgent"),
            proposed_count=sum(1 for a in items if a.status == "proposed"),
        )

    def create_oversight_review(
        self,
        payload: IntelligenceOversightReviewCreate,
        *,
        current_user: dict[str, Any] | None = None,
        conn: Any = None,
    ) -> IntelligenceOversightReviewRecord:
        review_id = f"ior-{uuid.uuid4().hex[:12]}"
        record = IntelligenceOversightReviewRecord(
            id=review_id,
            home_id=_str_id(payload.home_id),
            child_id=_str_id(payload.child_id),
            staff_id=_str_id(payload.staff_id),
            review_type=payload.review_type,
            source=payload.source,
            finding_ids=list(payload.finding_ids),
            action_ids=list(payload.action_ids),
            decision=payload.decision,
            decision_reason=payload.decision_reason,
            manager_notes=payload.manager_notes,
            follow_up_required=payload.follow_up_required,
            follow_up_date=payload.follow_up_date,
            created_by=str((current_user or {}).get("id") or ""),
            created_at=now_iso(),
        )
        if self._ensure_tables(conn=conn):
            saved = self._persist_review(record, conn=conn)
            if saved:
                return saved
        self._memory_reviews[review_id] = record
        return record

    def persist_proposed_actions(
        self,
        actions: list[IntelligenceActionRecord],
        *,
        current_user: dict[str, Any] | None = None,
        conn: Any = None,
    ) -> list[IntelligenceActionRecord]:
        stored: list[IntelligenceActionRecord] = []
        for action in actions:
            copy = action.model_copy()
            copy.audit_trail.append(
                self._audit_entry("persisted_from_spine", current_user, reason="create_actions=true")
            )
            stored.append(self._persist_action(copy, current_user=current_user, conn=conn))
        return stored

    def _find_open_duplicate(
        self,
        *,
        action_type: str,
        source_finding_id: str | None,
        home_id: str | None,
        child_id: str | None,
        conn: Any = None,
    ) -> IntelligenceActionRecord | None:
        if not source_finding_id:
            return None
        for existing in self.list_actions(home_id=home_id, child_id=child_id, limit=200, conn=conn):
            if existing.action_type != action_type:
                continue
            if existing.source_finding_id != source_finding_id:
                continue
            if existing.status in {"completed", "dismissed", "superseded"}:
                continue
            return existing
        return None

    def bulk_create_actions(
        self,
        payloads: list[IntelligenceActionCreate],
        *,
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        current_user: dict[str, Any] | None = None,
        conn: Any = None,
    ) -> IntelligenceActionBulkCreateResult:
        created: list[IntelligenceActionRecord] = []
        failed: list[dict[str, Any]] = []
        hid = _str_id(home_id)
        cid = _str_id(child_id)
        sid = _str_id(staff_id)
        for payload in payloads:
            data = payload.model_dump()
            if hid and not data.get("home_id"):
                data["home_id"] = hid
            if cid and not data.get("child_id"):
                data["child_id"] = cid
            if sid and not data.get("staff_id"):
                data["staff_id"] = sid
            item = IntelligenceActionCreate.model_validate(data)
            duplicate = self._find_open_duplicate(
                action_type=item.action_type,
                source_finding_id=item.source_finding_id,
                home_id=_str_id(item.home_id) or hid,
                child_id=_str_id(item.child_id) or cid,
                conn=conn,
            )
            if duplicate:
                failed.append(
                    {
                        "title": item.title,
                        "action_type": item.action_type,
                        "source_finding_id": item.source_finding_id,
                        "reason": "duplicate open action exists",
                        "existing_id": duplicate.id,
                    }
                )
                continue
            try:
                record = self.create_action(item, current_user=current_user, conn=conn)
                record.audit_trail.append(
                    self._audit_entry(
                        "bulk_created",
                        current_user,
                        reason="intelligence_spine_bulk_create",
                    )
                )
                created.append(self._persist_action(record, current_user=current_user, conn=conn, replace=True))
            except Exception as exc:
                failed.append(
                    {
                        "title": item.title,
                        "action_type": item.action_type,
                        "reason": str(exc),
                    }
                )
        summary = self.build_action_summary(created)
        return IntelligenceActionBulkCreateResult(created=created, failed=failed, summary=summary)

    def list_oversight_reviews(
        self,
        *,
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        limit: int = 50,
        conn: Any = None,
    ) -> list[IntelligenceOversightReviewRecord]:
        hid = _str_id(home_id)
        cid = _str_id(child_id)
        sid = _str_id(staff_id)
        if self._ensure_tables(conn=conn):
            rows = self._list_oversight_from_db(
                home_id=hid, child_id=cid, staff_id=sid, limit=limit, conn=conn
            )
            if rows is not None:
                return rows
        items = list(self._memory_reviews.values())
        if hid:
            items = [r for r in items if r.home_id == hid]
        if cid:
            items = [r for r in items if r.child_id == cid]
        if sid:
            items = [r for r in items if r.staff_id == sid]
        return items[:limit]

    def build_attention_feed(
        self,
        *,
        home_id: int | str | None = None,
        child_id: int | str | None = None,
        staff_id: int | str | None = None,
        conn: Any = None,
    ) -> IntelligenceAttentionFeed:
        actions = self.list_actions(
            home_id=home_id, child_id=child_id, staff_id=staff_id, limit=200, conn=conn
        )
        reviews = self.list_oversight_reviews(
            home_id=home_id, child_id=child_id, staff_id=staff_id, limit=50, conn=conn
        )
        now = now_iso()[:10]

        def feed_item(action: IntelligenceActionRecord, label: str) -> IntelligenceAttentionFeedItem:
            return IntelligenceAttentionFeedItem(
                id=action.id,
                label=label,
                title=action.title,
                priority=action.priority,
                status=action.status,
                action_type=action.action_type,
                href=f"/intelligence-actions?action_id={action.id}",
                summary=action.summary,
            )

        urgent = [
            feed_item(a, "Needs review")
            for a in actions
            if a.priority == "urgent" and a.status in {"proposed", "accepted", "in_progress"}
        ][:10]
        high_priority = [
            feed_item(a, "Source review recommended")
            for a in actions
            if a.priority == "high" and a.status in {"proposed", "accepted", "in_progress"}
        ][:10]
        awaiting_decision = [
            feed_item(a, "Awaiting manager decision")
            for a in actions
            if a.status == "proposed"
        ][:15]
        in_progress_due = [
            feed_item(a, "Manager follow-up recommended")
            for a in actions
            if a.status == "in_progress"
        ][:10]
        follow_ups_due: list[IntelligenceAttentionFeedItem] = []
        for review in reviews:
            if not review.follow_up_required:
                continue
            due = (review.follow_up_date or "")[:10]
            if due and due > now:
                continue
            follow_ups_due.append(
                IntelligenceAttentionFeedItem(
                    id=review.id,
                    label="Follow-up due",
                    title=f"{review.review_type.replace('_', ' ')} — manager oversight suggested",
                    priority=None,
                    status=review.decision,
                    action_type=review.review_type,
                    href="/intelligence-oversight",
                    summary=review.manager_notes or review.decision_reason,
                )
            )
        follow_ups_due = follow_ups_due[:10]
        return IntelligenceAttentionFeed(
            urgent=urgent,
            high_priority=high_priority,
            awaiting_decision=awaiting_decision,
            follow_ups_due=follow_ups_due,
            in_progress_due=in_progress_due,
            summary={
                "urgent": len(urgent),
                "high_priority": len(high_priority),
                "awaiting_decision": len(awaiting_decision),
                "follow_ups_due": len(follow_ups_due),
                "in_progress": len(in_progress_due),
            },
            action_notice=ACTION_NOTICE,
        )

    def _actions_from_pattern(
        self,
        pattern: dict[str, Any],
        *,
        home_id: str | None,
        child_id: str | None,
        staff_id: str | None,
        source_service: str,
    ) -> list[IntelligenceActionRecord]:
        ptype = str(pattern.get("pattern_type") or "")
        severity = str(pattern.get("severity") or "medium")
        summary = str(pattern.get("summary") or "review recommended")
        priority = self._priority_for_pattern(ptype, severity)
        action_type = self._action_type_for_pattern(ptype)
        if not pattern.get("manager_review_required") and severity not in {"high", "critical"} and priority == "low":
            return []
        return [
            self._build_proposed(
                action_type=action_type,
                title=f"Review {ptype.replace('_', ' ')}",
                summary=summary,
                priority=priority,
                reason=summary,
                suggested_next_step=(
                    (pattern.get("recommended_reviews") or ["manager oversight suggested — source review required"])[0]
                ),
                source_finding_id=f"finding-{ptype}",
                source_finding_type=ptype,
                source_service=source_service,
                home_id=home_id,
                child_id=child_id,
                staff_id=staff_id,
                linked_record_ids=[str(r) for r in pattern.get("linked_records") or []],
                regulatory_links=[str(r) for r in pattern.get("regulatory_links") or []],
                sccif_links=[str(r) for r in pattern.get("sccif_links") or []],
            )
        ]

    def _actions_from_finding(
        self,
        finding: dict[str, Any],
        *,
        home_id: str | None,
        child_id: str | None,
        staff_id: str | None,
        source_service: str,
    ) -> list[IntelligenceActionRecord]:
        if not finding.get("manager_review_required") and finding.get("severity") not in {"high", "critical"}:
            return []
        area = str(finding.get("area") or "finding")
        action_type = "safeguarding_review" if "safeguard" in area else "manager_signoff"
        if "ofsted" in area or "document" in area:
            action_type = "ofsted_evidence_strengthening"
        if "governance" in area or "gap" in str(finding.get("title", "")).lower():
            action_type = "evidence_gap_review"
        priority = "urgent" if finding.get("severity") in {"high", "critical"} else "high"
        return [
            self._build_proposed(
                action_type=action_type,
                title=str(finding.get("title") or "Review recommended"),
                summary=str(finding.get("summary") or "review recommended"),
                priority=priority,
                reason=str(finding.get("summary") or ""),
                suggested_next_step=str(finding.get("recommended_review") or "source review required"),
                source_finding_id=str(finding.get("id")),
                source_finding_type=area,
                source_service=source_service,
                home_id=home_id,
                child_id=child_id,
                staff_id=staff_id,
                linked_record_ids=[str(r) for r in finding.get("linked_records") or []],
                regulatory_links=[str(r) for r in finding.get("regulatory_links") or []],
                sccif_links=[str(r) for r in finding.get("sccif_links") or []],
                quality_standard_links=[str(r) for r in finding.get("quality_standard_links") or []],
            )
        ]

    def _priority_for_pattern(self, pattern_type: str, severity: str) -> str:
        if pattern_type in _URGENT_PATTERNS or severity in {"high", "critical"}:
            return "urgent"
        if pattern_type in _HIGH_PATTERNS:
            return "high"
        if pattern_type in _MEDIUM_PATTERNS:
            return "medium"
        return "low"

    def _action_type_for_pattern(self, pattern_type: str) -> str:
        mapping = {
            "missing_episode_increase": "missing_follow_up",
            "safeguarding_concern_repeated": "safeguarding_review",
            "manager_review_missing": "manager_signoff",
            "risk_assessment_stale": "risk_assessment_review",
            "restraint_increase": "risk_assessment_review",
            "child_voice_missing": "child_voice_follow_up",
            "weak_recording_quality": "record_quality_review",
            "overdue_actions": "manager_signoff",
            "staff_debrief_missing": "staff_support_review",
            "incident_increase": "risk_assessment_review",
        }
        return mapping.get(pattern_type, "policy_practice_review")

    def _build_proposed(
        self,
        *,
        action_type: str,
        title: str,
        summary: str | None = None,
        priority: str = "medium",
        reason: str | None = None,
        suggested_next_step: str | None = None,
        source_finding_id: str | None = None,
        source_finding_type: str | None = None,
        source_service: str | None = None,
        home_id: str | None = None,
        child_id: str | None = None,
        staff_id: str | None = None,
        owner_role: str = "registered_manager",
        owner_user_id: str | None = None,
        linked_record_ids: list[str] | None = None,
        linked_evidence_ids: list[str] | None = None,
        linked_action_ids: list[str] | None = None,
        regulatory_links: list[str] | None = None,
        sccif_links: list[str] | None = None,
        quality_standard_links: list[str] | None = None,
        due_date: str | None = None,
    ) -> IntelligenceActionRecord:
        ts = now_iso()
        action_id = f"ia-proposed-{uuid.uuid4().hex[:12]}"
        return IntelligenceActionRecord(
            id=action_id,
            home_id=home_id,
            child_id=child_id,
            staff_id=staff_id,
            source_finding_id=source_finding_id,
            source_finding_type=source_finding_type,
            source_service=source_service,
            action_type=action_type,  # type: ignore[arg-type]
            title=title,
            summary=summary,
            priority=priority,  # type: ignore[arg-type]
            status="proposed",
            owner_role=owner_role,
            owner_user_id=owner_user_id,
            due_date=due_date,
            linked_record_ids=linked_record_ids or [],
            linked_evidence_ids=linked_evidence_ids or [],
            linked_action_ids=linked_action_ids or [],
            regulatory_links=regulatory_links or [],
            sccif_links=sccif_links or [],
            quality_standard_links=quality_standard_links or [],
            reason=reason,
            suggested_next_step=suggested_next_step or "manager oversight suggested — human decision required",
            created_at=ts,
            updated_at=ts,
            audit_trail=[self._audit_entry("proposed", None, reason="action proposed for manager review")],
        )

    def _dedupe_actions(self, actions: list[IntelligenceActionRecord]) -> list[IntelligenceActionRecord]:
        seen: set[tuple[str, str, str]] = set()
        unique: list[IntelligenceActionRecord] = []
        for action in actions:
            key = (action.action_type, action.source_finding_id or "", (action.summary or "")[:80])
            if key in seen:
                continue
            seen.add(key)
            unique.append(action)
        return unique[:30]

    def _audit_entry(
        self,
        event: str,
        current_user: dict[str, Any] | None,
        *,
        reason: str | None = None,
        notes: str | None = None,
    ) -> dict[str, Any]:
        return {
            "at": now_iso(),
            "event": event,
            "actor_id": str((current_user or {}).get("id") or "") or None,
            "reason": reason,
            "notes": notes,
        }

    def _ensure_tables(self, *, conn: Any = None) -> bool:
        if self._db_ready:
            return True
        if self._db_init_attempted and not self._db_ready:
            return False
        if get_db_connection is None:
            self._db_init_attempted = True
            return False
        own_conn = conn is None
        db = conn
        try:
            if own_conn:
                db = get_db_connection()
            with db.cursor() as cur:
                cur.execute(CREATE_INTELLIGENCE_ACTIONS_SQL)
            if own_conn:
                db.commit()
            self._db_ready = True
            return True
        except Exception:
            if own_conn and db is not None and not db.closed:
                db.rollback()
            self._db_init_attempted = True
            return False
        finally:
            if own_conn and db is not None and release_db_connection:
                release_db_connection(db)

    def _get_action(self, action_id: str, *, conn: Any = None) -> IntelligenceActionRecord | None:
        if self._ensure_tables(conn=conn):
            row = self._fetch_action_from_db(action_id, conn=conn)
            if row:
                return row
        return self._memory_actions.get(action_id)

    def _persist_action(
        self,
        record: IntelligenceActionRecord,
        *,
        current_user: dict[str, Any] | None = None,
        conn: Any = None,
        replace: bool = False,
    ) -> IntelligenceActionRecord:
        actor = str((current_user or {}).get("id") or "")
        if self._ensure_tables(conn=conn):
            saved = self._save_action_to_db(record, created_by=actor, conn=conn, replace=replace)
            if saved:
                return saved
        self._memory_actions[record.id] = record
        return record

    def _row_to_action(self, row: dict[str, Any]) -> IntelligenceActionRecord:
        data = {
            "id": str(row["id"]),
            "home_id": row.get("home_id"),
            "child_id": row.get("child_id"),
            "staff_id": row.get("staff_id"),
            "source_finding_id": row.get("source_finding_id"),
            "source_finding_type": row.get("source_finding_type"),
            "source_service": row.get("source_service"),
            "action_type": row.get("action_type"),
            "title": row.get("title"),
            "summary": row.get("summary"),
            "priority": row.get("priority") or "medium",
            "status": row.get("status") or "proposed",
            "owner_role": row.get("owner_role") or "registered_manager",
            "owner_user_id": row.get("owner_user_id"),
            "due_date": row.get("due_date").isoformat() if row.get("due_date") else None,
            "linked_record_ids": _json_list(row.get("linked_record_ids")),
            "linked_evidence_ids": _json_list(row.get("linked_evidence_ids")),
            "linked_action_ids": _json_list(row.get("linked_action_ids")),
            "regulatory_links": _json_list(row.get("regulatory_links")),
            "sccif_links": _json_list(row.get("sccif_links")),
            "quality_standard_links": _json_list(row.get("quality_standard_links")),
            "reason": row.get("reason"),
            "suggested_next_step": row.get("suggested_next_step"),
            "manager_decision": row.get("manager_decision"),
            "manager_decision_reason": row.get("manager_decision_reason"),
            "created_at": row.get("created_at").isoformat() if row.get("created_at") else now_iso(),
            "updated_at": row.get("updated_at").isoformat() if row.get("updated_at") else now_iso(),
            "completed_at": row.get("completed_at").isoformat() if row.get("completed_at") else None,
            "audit_trail": _json_list(row.get("audit_trail")),
        }
        return IntelligenceActionRecord.model_validate(safe_payload(data))

    def _save_action_to_db(
        self,
        record: IntelligenceActionRecord,
        *,
        created_by: str,
        conn: Any,
        replace: bool,
    ) -> IntelligenceActionRecord | None:
        own_conn = conn is None
        db = conn
        try:
            if own_conn:
                db = get_db_connection()
            numeric_id = record.id if record.id.isdigit() else None
            with db.cursor() as cur:
                if numeric_id and replace:
                    cur.execute(
                        """
                        UPDATE intelligence_actions SET
                          title=%s, summary=%s, priority=%s, status=%s, owner_role=%s,
                          owner_user_id=%s, linked_record_ids=%s, linked_evidence_ids=%s,
                          linked_action_ids=%s, regulatory_links=%s, sccif_links=%s,
                          quality_standard_links=%s, reason=%s, suggested_next_step=%s,
                          manager_decision=%s, manager_decision_reason=%s, audit_trail=%s,
                          updated_at=NOW(), completed_at=%s
                        WHERE id=%s
                        RETURNING *
                        """,
                        (
                            record.title,
                            record.summary,
                            record.priority,
                            record.status,
                            record.owner_role,
                            record.owner_user_id,
                            json.dumps(record.linked_record_ids),
                            json.dumps(record.linked_evidence_ids),
                            json.dumps(record.linked_action_ids),
                            json.dumps(record.regulatory_links),
                            json.dumps(record.sccif_links),
                            json.dumps(record.quality_standard_links),
                            record.reason,
                            record.suggested_next_step,
                            record.manager_decision,
                            record.manager_decision_reason,
                            json.dumps([e if isinstance(e, dict) else e for e in record.audit_trail]),
                            record.completed_at,
                            numeric_id,
                        ),
                    )
                else:
                    cur.execute(
                        """
                        INSERT INTO intelligence_actions (
                          home_id, child_id, staff_id, source_finding_id, source_finding_type,
                          source_service, action_type, title, summary, priority, status,
                          owner_role, owner_user_id, due_date, linked_record_ids, linked_evidence_ids,
                          linked_action_ids, regulatory_links, sccif_links, quality_standard_links,
                          reason, suggested_next_step, manager_decision, manager_decision_reason,
                          audit_trail, created_by
                        ) VALUES (
                          %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
                        ) RETURNING *
                        """,
                        (
                            record.home_id,
                            record.child_id,
                            record.staff_id,
                            record.source_finding_id,
                            record.source_finding_type,
                            record.source_service,
                            record.action_type,
                            record.title,
                            record.summary,
                            record.priority,
                            record.status,
                            record.owner_role,
                            record.owner_user_id,
                            record.due_date,
                            json.dumps(record.linked_record_ids),
                            json.dumps(record.linked_evidence_ids),
                            json.dumps(record.linked_action_ids),
                            json.dumps(record.regulatory_links),
                            json.dumps(record.sccif_links),
                            json.dumps(record.quality_standard_links),
                            record.reason,
                            record.suggested_next_step,
                            record.manager_decision,
                            record.manager_decision_reason,
                            json.dumps([e if isinstance(e, dict) else e for e in record.audit_trail]),
                            created_by or None,
                        ),
                    )
                row = cur.fetchone()
                if not row:
                    return None
                cols = [d[0] for d in cur.description]
                result = dict(zip(cols, row))
            if own_conn:
                db.commit()
            return self._row_to_action(result)
        except Exception:
            if own_conn and db is not None and not db.closed:
                db.rollback()
            return None
        finally:
            if own_conn and db is not None and release_db_connection:
                release_db_connection(db)

    def _fetch_action_from_db(self, action_id: str, *, conn: Any = None) -> IntelligenceActionRecord | None:
        if not action_id.isdigit():
            return None
        own_conn = conn is None
        db = conn
        try:
            if own_conn:
                db = get_db_connection()
            with db.cursor() as cur:
                cur.execute("SELECT * FROM intelligence_actions WHERE id=%s", (action_id,))
                row = cur.fetchone()
                if not row:
                    return None
                cols = [d[0] for d in cur.description]
                return self._row_to_action(dict(zip(cols, row)))
        except Exception:
            return None
        finally:
            if own_conn and db is not None and release_db_connection:
                release_db_connection(db)

    def _list_from_db(
        self,
        *,
        home_id: str | None,
        child_id: str | None,
        staff_id: str | None,
        status: str | None,
        limit: int,
        conn: Any = None,
    ) -> list[IntelligenceActionRecord] | None:
        own_conn = conn is None
        db = conn
        try:
            if own_conn:
                db = get_db_connection()
            clauses = []
            params: list[Any] = []
            if home_id:
                clauses.append("home_id=%s")
                params.append(home_id)
            if child_id:
                clauses.append("child_id=%s")
                params.append(child_id)
            if staff_id:
                clauses.append("staff_id=%s")
                params.append(staff_id)
            if status:
                clauses.append("status=%s")
                params.append(status)
            where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            params.append(limit)
            with db.cursor() as cur:
                cur.execute(
                    f"SELECT * FROM intelligence_actions {where} ORDER BY created_at DESC LIMIT %s",
                    tuple(params),
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
            return [self._row_to_action(dict(zip(cols, row))) for row in rows]
        except Exception:
            return None
        finally:
            if own_conn and db is not None and release_db_connection:
                release_db_connection(db)

    def _list_oversight_from_db(
        self,
        *,
        home_id: str | None,
        child_id: str | None,
        staff_id: str | None,
        limit: int,
        conn: Any = None,
    ) -> list[IntelligenceOversightReviewRecord] | None:
        own_conn = conn is None
        db = conn
        try:
            if own_conn:
                db = get_db_connection()
            clauses = []
            params: list[Any] = []
            if home_id:
                clauses.append("home_id=%s")
                params.append(home_id)
            if child_id:
                clauses.append("child_id=%s")
                params.append(child_id)
            if staff_id:
                clauses.append("staff_id=%s")
                params.append(staff_id)
            where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
            params.append(limit)
            with db.cursor() as cur:
                cur.execute(
                    f"SELECT * FROM intelligence_oversight_reviews {where} ORDER BY created_at DESC LIMIT %s",
                    tuple(params),
                )
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]
            results: list[IntelligenceOversightReviewRecord] = []
            for row in rows:
                data = dict(zip(cols, row))
                results.append(
                    IntelligenceOversightReviewRecord(
                        id=str(data["id"]),
                        home_id=data.get("home_id"),
                        child_id=data.get("child_id"),
                        staff_id=data.get("staff_id"),
                        review_type=data.get("review_type"),
                        source=data.get("source"),
                        finding_ids=_json_list(data.get("finding_ids")),
                        action_ids=_json_list(data.get("action_ids")),
                        decision=data.get("decision"),
                        decision_reason=data.get("decision_reason"),
                        manager_notes=data.get("manager_notes"),
                        follow_up_required=bool(data.get("follow_up_required")),
                        follow_up_date=data.get("follow_up_date").isoformat()
                        if data.get("follow_up_date")
                        else None,
                        created_by=data.get("created_by"),
                        created_at=data.get("created_at").isoformat() if data.get("created_at") else now_iso(),
                    )
                )
            return results
        except Exception:
            return None
        finally:
            if own_conn and db is not None and release_db_connection:
                release_db_connection(db)

    def _persist_review(
        self,
        record: IntelligenceOversightReviewRecord,
        *,
        conn: Any = None,
    ) -> IntelligenceOversightReviewRecord | None:
        own_conn = conn is None
        db = conn
        try:
            if own_conn:
                db = get_db_connection()
            with db.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO intelligence_oversight_reviews (
                      home_id, child_id, staff_id, review_type, source, finding_ids,
                      action_ids, decision, decision_reason, manager_notes,
                      follow_up_required, follow_up_date, created_by
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    RETURNING *
                    """,
                    (
                        record.home_id,
                        record.child_id,
                        record.staff_id,
                        record.review_type,
                        record.source,
                        json.dumps(record.finding_ids),
                        json.dumps(record.action_ids),
                        record.decision,
                        record.decision_reason,
                        record.manager_notes,
                        record.follow_up_required,
                        record.follow_up_date,
                        record.created_by,
                    ),
                )
                row = cur.fetchone()
                cols = [d[0] for d in cur.description]
                data = dict(zip(cols, row))
            if own_conn:
                db.commit()
            return IntelligenceOversightReviewRecord(
                id=str(data["id"]),
                home_id=data.get("home_id"),
                child_id=data.get("child_id"),
                staff_id=data.get("staff_id"),
                review_type=data.get("review_type"),
                source=data.get("source"),
                finding_ids=_json_list(data.get("finding_ids")),
                action_ids=_json_list(data.get("action_ids")),
                decision=data.get("decision"),
                decision_reason=data.get("decision_reason"),
                manager_notes=data.get("manager_notes"),
                follow_up_required=bool(data.get("follow_up_required")),
                follow_up_date=data.get("follow_up_date").isoformat() if data.get("follow_up_date") else None,
                created_by=data.get("created_by"),
                created_at=data.get("created_at").isoformat() if data.get("created_at") else now_iso(),
            )
        except Exception:
            if own_conn and db is not None and not db.closed:
                db.rollback()
            return None
        finally:
            if own_conn and db is not None and release_db_connection:
                release_db_connection(db)


# Safeguarding records without manager review — used by tests and spine helpers
def propose_safeguarding_without_manager_review(
    records: list[dict[str, Any]],
    *,
    home_id: str | None = None,
    child_id: str | None = None,
) -> IntelligenceActionRecord | None:
    for record in records:
        rtype = str(field(record, "record_type", "type") or "").lower()
        if rtype not in {"safeguarding_concern", "safeguarding"}:
            continue
        if field(record, "manager_review_completed", "manager_reviewed", "manager_review"):
            continue
        return intelligence_action_service._build_proposed(
            action_type="safeguarding_review",
            title="Safeguarding review recommended",
            summary=(
                f"Safeguarding record {field(record, 'id')}: manager oversight suggested; "
                "source review required — not a safeguarding decision."
            ),
            priority="urgent",
            reason="records indicate safeguarding concern without visible manager review",
            suggested_next_step="Source review required — human decision required.",
            source_finding_id=str(field(record, "id")),
            source_finding_type="safeguarding_concern",
            source_service="intelligence_record",
            home_id=home_id,
            child_id=child_id,
            linked_record_ids=[str(field(record, "id"))] if field(record, "id") else [],
        )
    return None


def propose_missing_episode_without_rhi(
    records: list[dict[str, Any]],
    *,
    home_id: str | None = None,
    child_id: str | None = None,
) -> IntelligenceActionRecord | None:
    missing = [r for r in records if str(field(r, "record_type", "type") or "").lower() in {"missing_episode", "missing"}]
    rhi = [r for r in records if str(field(r, "record_type", "type") or "").lower() == "return_home_interview"]
    if missing and not rhi:
        return intelligence_action_service._build_proposed(
            action_type="missing_follow_up",
            title="Missing episode follow-up review recommended",
            summary=(
                "records indicate missing episode evidence without a visible return home interview link; "
                "review recommended."
            ),
            priority="urgent",
            reason="missing episode without return home interview in supplied records",
            suggested_next_step="Review recommended: confirm return home interview and risk review in source records.",
            source_finding_type="missing_episode",
            source_service="evidence_graph_intelligence",
            home_id=home_id,
            child_id=child_id,
            linked_record_ids=[str(field(r, "id")) for r in missing if field(r, "id")],
        )
    return None


intelligence_action_service = IntelligenceActionService()
