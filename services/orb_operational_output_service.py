"""OS-linked operational ORB outputs — PostgreSQL with in-memory fallback."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.orb_operational import OrbOperationalRequest, OrbOperationalResponse
from schemas.orb_operational_outputs import (
    OrbOperationalOutputActionLinkRequest,
    OrbOperationalOutputCreate,
    OrbOperationalOutputExportFormat,
    OrbOperationalOutputHealth,
    OrbOperationalOutputListRequest,
    OrbOperationalOutputListResponse,
    OrbOperationalOutputRecord,
    OrbOperationalOutputReviewRequest,
    OrbOperationalOutputSaveHints,
    OrbOperationalOutputSummary,
    OrbOperationalOutputType,
    OrbOperationalOutputUpdate,
)
from services.audit_event_service import record_audit_event

logger = logging.getLogger("indicare.orb_operational_outputs")

OPERATIONAL_ARTEFACT_NOTICE = (
    "Saved operational outputs are OS-linked artefacts. "
    "They are not standalone ORB saved outputs."
)

MODE_OUTPUT_TYPE_MAP: dict[str, OrbOperationalOutputType] = {
    "manager_daily_brief": "manager_briefing",
    "record_quality_review": "record_quality_review",
    "safeguarding_themes": "safeguarding_theme_review",
    "ofsted_evidence_review": "ofsted_evidence_briefing",
    "action_priority": "action_priority_plan",
    "staff_support": "staff_support_briefing",
    "child_journey_summary": "child_journey_summary",
    "governance_briefing": "governance_briefing",
    "operational_summary": "operational_note",
    "general_operational_question": "operational_note",
}

REVIEW_REQUIRED_TYPES: set[OrbOperationalOutputType] = {
    "safeguarding_theme_review",
    "manager_briefing",
}


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


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


class OrbOperationalOutputService:
    def __init__(self) -> None:
        self._memory: dict[str, dict[str, Any]] = {}
        self._storage_mode: str = "memory"

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
                        WHERE table_schema = 'public' AND table_name = 'orb_operational_outputs'
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

    def health(self) -> OrbOperationalOutputHealth:
        mode = self._detect_storage_mode()
        count = len(self._memory) if mode == "memory" else self._count_db()
        return OrbOperationalOutputHealth(
            status="ready",
            storage_mode=mode,
            output_count=count,
        )

    def _count_db(self) -> int:
        try:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM orb_operational_outputs")
                    row = cur.fetchone()
                    return int(row[0]) if row else 0
            finally:
                release_db_connection(conn)
        except Exception:
            return len(self._memory)

    def get_summary(self, current_user: dict[str, Any], conn: Any | None = None) -> dict[str, Any]:
        _ = conn
        health = self.health()
        listed = self.list_outputs(
            current_user,
            OrbOperationalOutputListRequest(limit=500),
        )
        by_type: dict[str, int] = {}
        by_status: dict[str, int] = {}
        awaiting_review = 0
        for item in listed.items:
            by_type[item.type] = by_type.get(item.type, 0) + 1
            by_status[item.status] = by_status.get(item.status, 0) + 1
            if item.review_status in {"review_required", "awaiting_review"}:
                awaiting_review += 1
        return {
            "total": listed.total,
            "by_type": by_type,
            "by_status": by_status,
            "awaiting_review": awaiting_review,
            "storage_mode": health.storage_mode,
            "standalone_only": False,
            "os_linked": True,
            "permissioned_context": True,
        }

    def build_save_hints(
        self,
        response: OrbOperationalResponse | dict[str, Any],
        request: OrbOperationalRequest | Any | None = None,
    ) -> OrbOperationalOutputSaveHints:
        if isinstance(response, OrbOperationalResponse):
            data = response.model_dump()
        else:
            data = response
        mode = _text(getattr(request, "mode", None) or data.get("mode"))
        output_type = self._suggested_type(mode, data)
        title = self._suggested_title(data, output_type)
        tags = self._suggested_tags(output_type, data, request)
        save_available = bool(
            data.get("briefing")
            or data.get("draft_actions")
            or data.get("recommendations")
            or data.get("answer")
        )
        return OrbOperationalOutputSaveHints(
            save_available=save_available,
            suggested_output_type=output_type,
            suggested_title=title,
            suggested_tags=tags,
        )

    def save_from_operational_response(
        self,
        response: OrbOperationalResponse,
        request: OrbOperationalRequest | Any,
        current_user: dict[str, Any],
        *,
        output_type: OrbOperationalOutputType | None = None,
        visibility: str | None = None,
        tags: list[str] | None = None,
        title: str | None = None,
        conn: Any | None = None,
    ) -> OrbOperationalOutputRecord:
        data = response.model_dump()
        resolved_type = output_type or self._suggested_type(
            _text(getattr(request, "mode", None)), data
        )
        review_status = "review_required" if resolved_type in REVIEW_REQUIRED_TYPES else "not_required"
        if getattr(request, "require_manager_review", False):
            review_status = "review_required"

        briefing = data.get("briefing") or {}
        markdown = self.build_markdown_from_parts(
            title=title or briefing.get("title") or self._suggested_title(data, resolved_type),
            summary=_text(briefing.get("summary")) or _text(data.get("answer"))[:4000],
            briefing=briefing,
            answer=_text(data.get("answer")),
            recommendations=data.get("recommendations") or [],
            draft_actions=data.get("draft_actions") or [],
        )

        permissions = data.get("permissions") or {}
        home_id = getattr(request, "home_id", None) or permissions.get("home_id")
        child_id = getattr(request, "child_id", None)
        staff_id = getattr(request, "staff_id", None)
        provider_id = permissions.get("provider_id")

        payload = OrbOperationalOutputCreate(
            title=title or briefing.get("title") or self._suggested_title(data, resolved_type),
            type=resolved_type,
            review_status=review_status,  # type: ignore[arg-type]
            visibility=visibility or "operational_private",  # type: ignore[arg-type]
            home_id=home_id,
            child_id=child_id,
            staff_id=staff_id,
            provider_id=provider_id,
            scope_label=_text(getattr(request, "scope", None)),
            summary=_text(briefing.get("summary")) or _text(data.get("answer"))[:8000] or None,
            content_markdown=markdown,
            content_json={"operational_response": data},
            intelligence_output=(
                data.get("intelligence_output") if isinstance(data.get("intelligence_output"), dict) else {}
            ),
            context_cards=[c if isinstance(c, dict) else c for c in (data.get("context_cards") or [])],
            evidence_items=[e if isinstance(e, dict) else e for e in (data.get("evidence_items") or [])],
            recommendations=data.get("recommendations") or [],
            draft_actions=data.get("draft_actions") or [],
            review_prompts=data.get("review_prompts") or [],
            sources=[s if isinstance(s, dict) else s for s in (data.get("sources") or [])],
            citations=data.get("citations") or [],
            evaluation=data.get("evaluation") or {},
            model_routing=data.get("model_routing") or {},
            retrieval_context={},
            audit_reference=data.get("audit_reference"),
            tags=tags or self._suggested_tags(resolved_type, data, request),
            created_from=self._created_from_mode(_text(getattr(request, "mode", None))),
            care_record_access=bool(data.get("care_record_access")),
            metadata={"artefact_notice": OPERATIONAL_ARTEFACT_NOTICE},
        )
        return self.create_output(payload, current_user, conn=conn)

    def create_output(
        self,
        payload: OrbOperationalOutputCreate,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OrbOperationalOutputRecord:
        review_status = payload.review_status
        if review_status == "not_required" and payload.type in REVIEW_REQUIRED_TYPES:
            review_status = "review_required"

        record = OrbOperationalOutputRecord(
            id=str(uuid4()),
            title=payload.title,
            type=payload.type,
            status=payload.status,
            review_status=review_status,
            visibility=payload.visibility,
            home_id=payload.home_id,
            child_id=payload.child_id,
            staff_id=payload.staff_id,
            provider_id=payload.provider_id,
            created_by_user_id=_user_id(current_user),
            created_by_name=_user_display_name(current_user),
            created_by_role=_user_role(current_user),
            scope_label=payload.scope_label,
            summary=payload.summary,
            content_markdown=payload.content_markdown,
            content_json=dict(payload.content_json),
            intelligence_output=dict(payload.intelligence_output),
            context_cards=list(payload.context_cards),
            evidence_items=list(payload.evidence_items),
            recommendations=list(payload.recommendations),
            draft_actions=list(payload.draft_actions),
            review_prompts=list(payload.review_prompts),
            sources=list(payload.sources),
            citations=list(payload.citations),
            evaluation=dict(payload.evaluation),
            model_routing=dict(payload.model_routing),
            retrieval_context=dict(payload.retrieval_context),
            audit_reference=payload.audit_reference,
            linked_action_ids=list(payload.linked_action_ids),
            linked_review_ids=list(payload.linked_review_ids),
            tags=list(payload.tags),
            priority=payload.priority,
            created_from=payload.created_from,
            care_record_access=payload.care_record_access,
            metadata=dict(payload.metadata),
        )
        row = self._record_to_row(record)
        if self._detect_storage_mode() == "postgresql":
            self._insert_db(row, conn=conn)
        else:
            self._memory[record.id] = row
        self._audit(
            current_user,
            "create",
            record.id,
            {"type": record.type, "review_status": record.review_status},
            home_id=record.home_id,
        )
        try:
            from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

            indicare_ai_governance_event_service.record_from_operational_output(
                record,
                current_user=current_user,
                conn=conn,
            )
        except Exception:
            pass
        return record

    def list_outputs(
        self,
        current_user: dict[str, Any],
        filters: OrbOperationalOutputListRequest,
        conn: Any | None = None,
    ) -> OrbOperationalOutputListResponse:
        if self._detect_storage_mode() == "postgresql":
            rows, total = self._list_db(filters)
        else:
            rows, total = self._list_memory(filters)
        accessible = [r for r in rows if self.enforce_access(self._row_to_record(r), current_user)]
        items = [self._row_to_summary(r) for r in accessible]
        return OrbOperationalOutputListResponse(
            items=items,
            total=len(accessible) if self._detect_storage_mode() == "memory" else total,
            limit=filters.limit,
            offset=filters.offset,
        )

    def get_output(
        self,
        output_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OrbOperationalOutputRecord | None:
        row = self._fetch_row(output_id, conn=conn)
        if not row:
            return None
        record = self._row_to_record(row)
        if not self.enforce_access(record, current_user):
            return None
        return record

    def update_output(
        self,
        output_id: str,
        payload: OrbOperationalOutputUpdate,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OrbOperationalOutputRecord | None:
        existing = self.get_output(output_id, current_user, conn=conn)
        if not existing:
            return None
        patch = payload.model_dump(exclude_unset=True)
        for key, value in patch.items():
            if value is not None:
                setattr(existing, key, value)
        if patch.get("status") == "archived" and not existing.archived_at:
            existing.archived_at = _now_iso()
        existing.updated_at = _now_iso()
        row = self._record_to_row(existing)
        if self._detect_storage_mode() == "postgresql":
            self._update_db(row, conn=conn)
        else:
            self._memory[output_id] = row
        self._audit(current_user, "update", output_id, patch)
        return existing

    def archive_output(
        self,
        output_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OrbOperationalOutputRecord | None:
        return self.update_output(
            output_id,
            OrbOperationalOutputUpdate(status="archived"),
            current_user,
            conn=conn,
        )

    def delete_output(
        self,
        output_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> bool:
        existing = self.get_output(output_id, current_user, conn=conn)
        if not existing:
            return False
        if self._detect_storage_mode() == "postgresql":
            deleted = self._delete_db(output_id, conn=conn)
        else:
            deleted = self._memory.pop(output_id, None) is not None
        if deleted:
            self._audit(current_user, "delete", output_id, {})
        return deleted

    def export_output(
        self,
        output_id: str,
        fmt: OrbOperationalOutputExportFormat,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> dict[str, Any] | None:
        record = self.get_output(output_id, current_user, conn=conn)
        if not record:
            return None
        content = self._format_export(record, fmt)
        safe_title = re.sub(r"[^\w\s-]", "", record.title).strip().replace(" ", "-")[:80]
        ext = {"markdown": "md", "plain_text": "txt", "json": "json", "html": "html"}.get(fmt, "md")
        return {
            "output_id": output_id,
            "format": fmt,
            "content": content,
            "filename": f"os-orb-{safe_title or 'output'}.{ext}",
            "os_linked_notice": OPERATIONAL_ARTEFACT_NOTICE,
        }

    def mark_for_review(
        self,
        output_id: str,
        payload: OrbOperationalOutputReviewRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> tuple[OrbOperationalOutputRecord | None, str | None]:
        existing = self.get_output(output_id, current_user, conn=conn)
        if not existing:
            return None, None
        review_status = "escalated" if payload.escalate else "awaiting_review"
        metadata = dict(existing.metadata)
        if payload.review_note:
            metadata["review_note"] = payload.review_note
        updated = self.update_output(
            output_id,
            OrbOperationalOutputUpdate(
                review_status=review_status,
                visibility=payload.visibility,
                metadata=metadata,
            ),
            current_user,
            conn=conn,
        )
        warning = None
        try:
            from services.intelligence_action_service import intelligence_action_service

            if not intelligence_action_service.persistence_available():
                warning = "Oversight review queue unavailable; review metadata stored on output only."
        except Exception:
            warning = "Oversight review queue unavailable; review metadata stored on output only."
        self._audit(
            current_user,
            "mark_for_review",
            output_id,
            {"review_status": review_status, "visibility": payload.visibility},
            home_id=existing.home_id,
        )
        return updated, warning

    def mark_reviewed(
        self,
        output_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OrbOperationalOutputRecord | None:
        existing = self.get_output(output_id, current_user, conn=conn)
        if not existing:
            return None
        if not _is_manager_role(current_user) and _user_id(current_user) != _text(
            existing.created_by_user_id
        ):
            return None
        updated = self.update_output(
            output_id,
            OrbOperationalOutputUpdate(review_status="reviewed"),
            current_user,
            conn=conn,
        )
        if updated:
            updated.reviewed_at = _now_iso()
            row = self._record_to_row(updated)
            if self._detect_storage_mode() == "postgresql":
                self._update_db(row, conn=conn)
            else:
                self._memory[output_id] = row
            self._audit(current_user, "mark_reviewed", output_id, {})
        return updated

    def link_actions(
        self,
        output_id: str,
        action_ids: list[str],
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OrbOperationalOutputRecord | None:
        existing = self.get_output(output_id, current_user, conn=conn)
        if not existing:
            return None
        merged = list(dict.fromkeys([*existing.linked_action_ids, *action_ids]))
        return self.update_output(
            output_id,
            OrbOperationalOutputUpdate(linked_action_ids=merged),
            current_user,
            conn=conn,
        )

    def build_markdown(self, output: OrbOperationalOutputRecord) -> str:
        briefing = (output.content_json or {}).get("operational_response", {}).get("briefing") or {}
        return self.build_markdown_from_parts(
            title=output.title,
            summary=_text(output.summary),
            briefing=briefing,
            answer=_text((output.content_json or {}).get("operational_response", {}).get("answer")),
            recommendations=output.recommendations,
            draft_actions=output.draft_actions,
        )

    def build_markdown_from_parts(
        self,
        *,
        title: str,
        summary: str,
        briefing: dict[str, Any],
        answer: str,
        recommendations: list[Any],
        draft_actions: list[Any],
    ) -> str:
        lines = [f"# {title}", ""]
        if summary:
            lines.extend([summary, ""])
        if briefing.get("key_points"):
            lines.append("## Key points")
            for point in briefing["key_points"]:
                lines.append(f"- {_text(point)}")
            lines.append("")
        if briefing.get("risks"):
            lines.append("## Risks")
            for risk in briefing["risks"]:
                lines.append(f"- {_text(risk)}")
            lines.append("")
        if briefing.get("actions"):
            lines.append("## Suggested actions")
            for action in briefing["actions"]:
                lines.append(f"- {_text(action)}")
            lines.append("")
        if answer and answer not in summary:
            lines.extend(["## Operational answer", answer, ""])
        if recommendations:
            lines.append("## Recommendations")
            for rec in recommendations:
                if isinstance(rec, dict):
                    lines.append(f"- **{_text(rec.get('title'))}**: {_text(rec.get('summary'))}")
            lines.append("")
        if draft_actions:
            lines.append("## Draft actions")
            for draft in draft_actions:
                if isinstance(draft, dict):
                    lines.append(f"- **{_text(draft.get('title'))}**: {_text(draft.get('description'))}")
            lines.append("")
        lines.extend(["---", OPERATIONAL_ARTEFACT_NOTICE])
        return "\n".join(lines).strip()

    def enforce_access(self, output: OrbOperationalOutputRecord, current_user: dict[str, Any]) -> bool:
        uid = _user_id(current_user)
        creator = _text(output.created_by_user_id)
        if creator and creator == uid:
            return True
        if not _is_manager_role(current_user):
            return False
        user_home = current_user.get("home_id")
        if output.home_id is not None and user_home is not None:
            try:
                if int(output.home_id) == int(user_home):
                    return True
            except (TypeError, ValueError):
                pass
        allowed = current_user.get("allowed_home_ids") or []
        if output.home_id is not None:
            try:
                home_int = int(output.home_id)
                if home_int in {int(h) for h in allowed if h is not None}:
                    return True
            except (TypeError, ValueError):
                pass
        if output.home_id is None and output.child_id is None and output.staff_id is None:
            return True
        return False

    def _suggested_type(self, mode: str, data: dict[str, Any]) -> OrbOperationalOutputType:
        if mode in MODE_OUTPUT_TYPE_MAP:
            return MODE_OUTPUT_TYPE_MAP[mode]
        if data.get("briefing"):
            return "manager_briefing"
        if data.get("draft_actions"):
            return "action_priority_plan"
        return "operational_note"

    def _suggested_title(self, data: dict[str, Any], output_type: OrbOperationalOutputType) -> str:
        briefing = data.get("briefing") or {}
        if isinstance(briefing, dict) and briefing.get("title"):
            return _text(briefing["title"])
        headline = (data.get("context_summary") or {}).get("headline")
        if headline:
            return _text(headline)[:500]
        return output_type.replace("_", " ").title()

    def _suggested_tags(
        self,
        output_type: OrbOperationalOutputType,
        data: dict[str, Any],
        request: Any | None,
    ) -> list[str]:
        tags = [output_type.replace("_", "-"), "os-linked", "operational-orb"]
        mode = _text(getattr(request, "mode", None))
        if mode:
            tags.append(mode)
        scope = _text(getattr(request, "scope", None))
        if scope:
            tags.append(scope)
        return list(dict.fromkeys(t for t in tags if t))

    def _created_from_mode(self, mode: str) -> str:
        mapping = {
            "manager_daily_brief": "manager_daily_brief",
            "record_quality_review": "record_quality",
            "safeguarding_themes": "safeguarding_themes",
            "ofsted_evidence_review": "ofsted_evidence",
            "action_priority": "actions",
        }
        return mapping.get(mode, "operational_orb")

    def _audit(
        self,
        current_user: dict[str, Any],
        action: str,
        resource_id: str,
        metadata: dict[str, Any],
        *,
        home_id: int | None = None,
    ) -> None:
        try:
            record_audit_event(
                event_type="orb",
                action=f"operational_output_{action}",
                outcome="success",
                actor=current_user,
                resource_type="orb_operational_output",
                resource_id=resource_id,
                metadata={**metadata, "os_linked": True, "standalone_only": False},
            )
        except Exception as exc:
            logger.debug("Operational output audit skipped: %s", exc)

    def _format_export(
        self, record: OrbOperationalOutputRecord, fmt: OrbOperationalOutputExportFormat
    ) -> str:
        if fmt == "json":
            return json.dumps(record.model_dump(), indent=2, default=str)
        if fmt == "html":
            md = record.content_markdown or self.build_markdown(record)
            body = "<br/>".join(md.replace("&", "&amp;").splitlines())
            return (
                f"<html><head><title>{record.title}</title></head><body>"
                f"<h1>{record.title}</h1><p><em>{OPERATIONAL_ARTEFACT_NOTICE}</em></p>"
                f"<p>{body}</p></body></html>"
            )
        if fmt == "plain_text":
            return self._markdown_to_plain(record.content_markdown or record.summary or "")
        return self.build_markdown(record)

    def _markdown_to_plain(self, text: str) -> str:
        plain = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
        plain = re.sub(r"\*\*([^*]+)\*\*", r"\1", plain)
        return plain.strip()

    def _record_to_row(self, record: OrbOperationalOutputRecord) -> dict[str, Any]:
        archived = record.archived_at
        if record.status == "archived" and not archived:
            archived = _now_iso()
        return {
            "id": record.id,
            "title": record.title,
            "type": record.type,
            "status": record.status,
            "review_status": record.review_status,
            "visibility": record.visibility,
            "home_id": record.home_id,
            "child_id": record.child_id,
            "staff_id": record.staff_id,
            "provider_id": record.provider_id,
            "created_by_user_id": record.created_by_user_id,
            "created_by_name": record.created_by_name,
            "created_by_role": record.created_by_role,
            "scope_label": record.scope_label,
            "summary": record.summary,
            "content_markdown": record.content_markdown,
            "content_json": record.content_json,
            "intelligence_output": record.intelligence_output,
            "context_cards": record.context_cards,
            "evidence_items": record.evidence_items,
            "recommendations": record.recommendations,
            "draft_actions": record.draft_actions,
            "review_prompts": record.review_prompts,
            "sources": record.sources,
            "citations": record.citations,
            "evaluation": record.evaluation,
            "model_routing": record.model_routing,
            "retrieval_context": record.retrieval_context,
            "audit_reference": record.audit_reference,
            "linked_action_ids": record.linked_action_ids,
            "linked_review_ids": record.linked_review_ids,
            "tags": record.tags,
            "priority": record.priority,
            "created_from": record.created_from,
            "standalone_only": False,
            "os_linked": True,
            "permissioned_context": True,
            "care_record_access": record.care_record_access,
            "metadata": record.metadata,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
            "archived_at": archived,
            "reviewed_at": record.reviewed_at,
        }

    def _row_to_record(self, row: dict[str, Any]) -> OrbOperationalOutputRecord:
        return OrbOperationalOutputRecord(
            id=row["id"],
            title=row["title"],
            type=row["type"],
            status=row.get("status") or "saved",
            review_status=row.get("review_status") or "not_required",
            visibility=row.get("visibility") or "operational_private",
            home_id=row.get("home_id"),
            child_id=row.get("child_id"),
            staff_id=row.get("staff_id"),
            provider_id=row.get("provider_id"),
            created_by_user_id=row.get("created_by_user_id"),
            created_by_name=row.get("created_by_name"),
            created_by_role=row.get("created_by_role"),
            scope_label=row.get("scope_label"),
            summary=row.get("summary"),
            content_markdown=row.get("content_markdown"),
            content_json=_parse_json(row.get("content_json"), {}),
            intelligence_output=_parse_json(row.get("intelligence_output"), {}),
            context_cards=_parse_json(row.get("context_cards"), []),
            evidence_items=_parse_json(row.get("evidence_items"), []),
            recommendations=_parse_json(row.get("recommendations"), []),
            draft_actions=_parse_json(row.get("draft_actions"), []),
            review_prompts=_parse_json(row.get("review_prompts"), []),
            sources=_parse_json(row.get("sources"), []),
            citations=_parse_json(row.get("citations"), []),
            evaluation=_parse_json(row.get("evaluation"), {}),
            model_routing=_parse_json(row.get("model_routing"), {}),
            retrieval_context=_parse_json(row.get("retrieval_context"), {}),
            audit_reference=row.get("audit_reference"),
            linked_action_ids=_parse_json(row.get("linked_action_ids"), []),
            linked_review_ids=_parse_json(row.get("linked_review_ids"), []),
            tags=_parse_json(row.get("tags"), []),
            priority=row.get("priority"),
            created_from=row.get("created_from") or "operational_orb",
            standalone_only=bool(row.get("standalone_only", False)),
            os_linked=bool(row.get("os_linked", True)),
            permissioned_context=bool(row.get("permissioned_context", True)),
            care_record_access=bool(row.get("care_record_access", False)),
            created_at=str(row.get("created_at") or _now_iso()),
            updated_at=str(row.get("updated_at") or _now_iso()),
            archived_at=str(row["archived_at"]) if row.get("archived_at") else None,
            reviewed_at=str(row["reviewed_at"]) if row.get("reviewed_at") else None,
            metadata=_parse_json(row.get("metadata"), {}),
        )

    def _row_to_summary(self, row: dict[str, Any]) -> OrbOperationalOutputSummary:
        linked = _parse_json(row.get("linked_action_ids"), [])
        return OrbOperationalOutputSummary(
            id=row["id"],
            title=row["title"],
            type=row["type"],
            status=row.get("status") or "saved",
            review_status=row.get("review_status") or "not_required",
            visibility=row.get("visibility") or "operational_private",
            home_id=row.get("home_id"),
            child_id=row.get("child_id"),
            scope_label=row.get("scope_label"),
            summary=row.get("summary"),
            tags=_parse_json(row.get("tags"), []),
            linked_action_count=len(linked),
            created_by_name=row.get("created_by_name"),
            created_at=str(row.get("created_at") or _now_iso()),
            updated_at=str(row.get("updated_at") or _now_iso()),
        )

    def _fetch_row(self, output_id: str, conn: Any | None = None) -> dict[str, Any] | None:
        if self._detect_storage_mode() == "postgresql":
            return self._fetch_db(output_id, conn=conn)
        return self._memory.get(output_id)

    def _list_memory(
        self, request: OrbOperationalOutputListRequest
    ) -> tuple[list[dict[str, Any]], int]:
        rows = list(self._memory.values())
        filtered = [r for r in rows if self._matches_filters(r, request)]
        filtered.sort(key=lambda r: str(r.get("created_at") or ""), reverse=True)
        total = len(filtered)
        page = filtered[request.offset : request.offset + request.limit]
        return page, total

    def _matches_filters(self, row: dict[str, Any], request: OrbOperationalOutputListRequest) -> bool:
        if request.output_type and row.get("type") != request.output_type:
            return False
        if request.status and row.get("status") != request.status:
            return False
        if request.review_status and row.get("review_status") != request.review_status:
            return False
        if request.visibility and row.get("visibility") != request.visibility:
            return False
        if request.home_id is not None and row.get("home_id") != request.home_id:
            return False
        if request.child_id is not None and row.get("child_id") != request.child_id:
            return False
        if request.staff_id is not None and row.get("staff_id") != request.staff_id:
            return False
        if request.awaiting_review_only and row.get("review_status") not in {
            "review_required",
            "awaiting_review",
        }:
            return False
        if not request.include_archived and row.get("status") == "archived":
            return False
        if request.tag:
            tags = _parse_json(row.get("tags"), [])
            if request.tag not in tags:
                return False
        if request.search:
            needle = request.search.lower()
            hay = " ".join(
                [
                    _text(row.get("title")),
                    _text(row.get("summary")),
                    _text(row.get("content_markdown")),
                ]
            ).lower()
            if needle not in hay:
                return False
        return True

    def _json_row_params(self, row: dict[str, Any]) -> dict[str, Any]:
        json_fields = (
            "content_json",
            "intelligence_output",
            "context_cards",
            "evidence_items",
            "recommendations",
            "draft_actions",
            "review_prompts",
            "sources",
            "citations",
            "evaluation",
            "model_routing",
            "retrieval_context",
            "linked_action_ids",
            "linked_review_ids",
            "tags",
            "metadata",
        )
        params = dict(row)
        for field in json_fields:
            params[field] = Json(row[field])
        return params

    def _insert_db(self, row: dict[str, Any], conn: Any | None = None) -> None:
        own_conn = conn is None
        if own_conn:
            conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO orb_operational_outputs (
                        id, title, type, status, review_status, visibility,
                        home_id, child_id, staff_id, provider_id,
                        created_by_user_id, created_by_name, created_by_role,
                        scope_label, summary, content_markdown, content_json,
                        intelligence_output, context_cards, evidence_items,
                        recommendations, draft_actions, review_prompts,
                        sources, citations, evaluation, model_routing,
                        retrieval_context, audit_reference, linked_action_ids,
                        linked_review_ids, tags, priority, created_from,
                        standalone_only, os_linked, permissioned_context,
                        care_record_access, metadata,
                        created_at, updated_at, archived_at, reviewed_at
                    ) VALUES (
                        %(id)s, %(title)s, %(type)s, %(status)s, %(review_status)s, %(visibility)s,
                        %(home_id)s, %(child_id)s, %(staff_id)s, %(provider_id)s,
                        %(created_by_user_id)s, %(created_by_name)s, %(created_by_role)s,
                        %(scope_label)s, %(summary)s, %(content_markdown)s, %(content_json)s,
                        %(intelligence_output)s, %(context_cards)s, %(evidence_items)s,
                        %(recommendations)s, %(draft_actions)s, %(review_prompts)s,
                        %(sources)s, %(citations)s, %(evaluation)s, %(model_routing)s,
                        %(retrieval_context)s, %(audit_reference)s, %(linked_action_ids)s,
                        %(linked_review_ids)s, %(tags)s, %(priority)s, %(created_from)s,
                        %(standalone_only)s, %(os_linked)s, %(permissioned_context)s,
                        %(care_record_access)s, %(metadata)s,
                        %(created_at)s::timestamptz, %(updated_at)s::timestamptz,
                        %(archived_at)s::timestamptz, %(reviewed_at)s::timestamptz
                    )
                    """,
                    self._json_row_params(row),
                )
            if own_conn:
                conn.commit()
        finally:
            if own_conn:
                release_db_connection(conn)

    def _update_db(self, row: dict[str, Any], conn: Any | None = None) -> None:
        own_conn = conn is None
        if own_conn:
            conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE orb_operational_outputs SET
                        title=%(title)s, type=%(type)s, status=%(status)s,
                        review_status=%(review_status)s, visibility=%(visibility)s,
                        tags=%(tags)s, summary=%(summary)s,
                        content_markdown=%(content_markdown)s,
                        content_json=%(content_json)s,
                        linked_action_ids=%(linked_action_ids)s,
                        metadata=%(metadata)s,
                        updated_at=%(updated_at)s::timestamptz,
                        archived_at=%(archived_at)s::timestamptz,
                        reviewed_at=%(reviewed_at)s::timestamptz
                    WHERE id=%(id)s
                    """,
                    {
                        "id": row["id"],
                        "title": row["title"],
                        "type": row["type"],
                        "status": row["status"],
                        "review_status": row["review_status"],
                        "visibility": row["visibility"],
                        "tags": Json(row["tags"]),
                        "summary": row["summary"],
                        "content_markdown": row["content_markdown"],
                        "content_json": Json(row["content_json"]),
                        "linked_action_ids": Json(row["linked_action_ids"]),
                        "metadata": Json(row["metadata"]),
                        "updated_at": row["updated_at"],
                        "archived_at": row.get("archived_at"),
                        "reviewed_at": row.get("reviewed_at"),
                    },
                )
            if own_conn:
                conn.commit()
        finally:
            if own_conn:
                release_db_connection(conn)

    def _delete_db(self, output_id: str, conn: Any | None = None) -> bool:
        own_conn = conn is None
        if own_conn:
            conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM orb_operational_outputs WHERE id=%s", (output_id,))
                deleted = cur.rowcount > 0
            if own_conn:
                conn.commit()
            return deleted
        finally:
            if own_conn:
                release_db_connection(conn)

    def _fetch_db(self, output_id: str, conn: Any | None = None) -> dict[str, Any] | None:
        own_conn = conn is None
        if own_conn:
            conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM orb_operational_outputs WHERE id=%s", (output_id,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            if own_conn:
                release_db_connection(conn)

    def _list_db(
        self, request: OrbOperationalOutputListRequest
    ) -> tuple[list[dict[str, Any]], int]:
        clauses = ["1=1"]
        params: list[Any] = []
        if request.output_type:
            clauses.append("type = %s")
            params.append(request.output_type)
        if request.status:
            clauses.append("status = %s")
            params.append(request.status)
        if request.review_status:
            clauses.append("review_status = %s")
            params.append(request.review_status)
        if request.visibility:
            clauses.append("visibility = %s")
            params.append(request.visibility)
        if request.home_id is not None:
            clauses.append("home_id = %s")
            params.append(request.home_id)
        if request.child_id is not None:
            clauses.append("child_id = %s")
            params.append(request.child_id)
        if request.staff_id is not None:
            clauses.append("staff_id = %s")
            params.append(request.staff_id)
        if request.awaiting_review_only:
            clauses.append("review_status IN ('review_required', 'awaiting_review')")
        elif not request.include_archived:
            clauses.append("status != 'archived'")
        if request.tag:
            clauses.append("tags @> %s::jsonb")
            params.append(json.dumps([request.tag]))
        if request.search:
            clauses.append(
                "(title ILIKE %s OR summary ILIKE %s OR content_markdown ILIKE %s)"
            )
            pattern = f"%{request.search}%"
            params.extend([pattern, pattern, pattern])
        where = " AND ".join(clauses)
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(f"SELECT COUNT(*) AS c FROM orb_operational_outputs WHERE {where}", params)
                total = int(cur.fetchone()["c"])
                cur.execute(
                    f"""
                    SELECT * FROM orb_operational_outputs
                    WHERE {where}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    [*params, request.limit, request.offset],
                )
                rows = [dict(r) for r in cur.fetchall()]
                return rows, total
        finally:
            release_db_connection(conn)


orb_operational_output_service = OrbOperationalOutputService()
