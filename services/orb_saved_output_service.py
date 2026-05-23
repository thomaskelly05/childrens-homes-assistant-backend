"""Standalone ORB saved intelligence outputs — PostgreSQL with in-memory fallback."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from schemas.orb_intelligence_output import OrbIntelligenceOutput
from schemas.orb_saved_outputs import (
    OrbIntelligenceSaveContext,
    OrbIntelligenceSaveHints,
    OrbSavedOutputCreate,
    OrbSavedOutputExportFormat,
    OrbSavedOutputHealth,
    OrbSavedOutputListRequest,
    OrbSavedOutputListResponse,
    OrbSavedOutputRecord,
    OrbSavedOutputReuseResponse,
    OrbSavedOutputSaveOptions,
    OrbSavedOutputSummary,
    OrbSavedOutputType,
    OrbSavedOutputUpdate,
)
from services.orb_intelligence_output_service import (
    STANDALONE_BOUNDARY_NOTICE,
    orb_intelligence_output_service,
)

logger = logging.getLogger("indicare.orb_saved_outputs")

STANDALONE_ARTEFACT_NOTICE = (
    "Saved outputs are standalone ORB artefacts for adult review. "
    "They are not added to IndiCare OS records, Care Hub, chronology or child documents."
)

INTELLIGENCE_TYPE_MAP: dict[str, OrbSavedOutputType] = {
    "action_plan": "action_plan",
    "document_analysis": "document_review",
    "manager_briefing": "manager_briefing",
    "staff_briefing": "staff_briefing",
    "deep_research": "deep_research",
    "comparison": "policy_comparison",
    "evidence_map": "ofsted_evidence_map",
    "recording_rewrite": "recording_rewrite",
    "safeguarding_reflection": "safeguarding_reflection",
    "therapeutic_reflection": "therapeutic_practice",
    "checklist": "checklist",
    "answer": "general_research",
}

DOCUMENT_MODE_TYPE_MAP: dict[str, OrbSavedOutputType] = {
    "action_plan": "action_plan",
    "manager_briefing": "manager_briefing",
    "staff_briefing": "staff_briefing",
    "policy_comparison": "policy_comparison",
    "ofsted_lens": "ofsted_evidence_map",
    "safeguarding_lens": "safeguarding_reflection",
    "recording_lens": "recording_rewrite",
    "therapeutic_lens": "therapeutic_practice",
    "full_review": "document_review",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


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


class OrbSavedOutputService:
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
                        WHERE table_schema = 'public' AND table_name = 'orb_saved_outputs'
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

    def health(self) -> OrbSavedOutputHealth:
        mode = self._detect_storage_mode()
        count = len(self._memory) if mode == "memory" else self._count_db()
        return OrbSavedOutputHealth(
            status="ready",
            storage_mode=mode,
            output_count=count,
        )

    def _count_db(self) -> int:
        try:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM orb_saved_outputs")
                    row = cur.fetchone()
                    return int(row[0]) if row else 0
            finally:
                release_db_connection(conn)
        except Exception:
            return len(self._memory)

    def get_summary(self) -> dict[str, Any]:
        health = self.health()
        items = self.list_outputs(OrbSavedOutputListRequest(limit=200))
        by_type: dict[str, int] = {}
        by_status: dict[str, int] = {}
        for item in items.items:
            by_type[item.type] = by_type.get(item.type, 0) + 1
            by_status[item.status] = by_status.get(item.status, 0) + 1
        return {
            "total": items.total,
            "by_type": by_type,
            "by_status": by_status,
            "storage_mode": health.storage_mode,
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
        }

    def build_save_hints(
        self,
        output: OrbIntelligenceOutput | dict[str, Any],
        *,
        analysis_mode: str | None = None,
    ) -> OrbIntelligenceSaveHints:
        if isinstance(output, OrbIntelligenceOutput):
            data = output.model_dump()
        else:
            data = output
        output_type = self._suggested_type_from_intelligence(data, analysis_mode=analysis_mode)
        title = _text(data.get("title")) or "ORB output"
        tags = self._suggested_tags(output_type, data)
        return OrbIntelligenceSaveHints(
            save_available=True,
            suggested_output_type=output_type,
            suggested_title=title,
            suggested_tags=tags,
        )

    def maybe_save_intelligence(
        self,
        output: OrbIntelligenceOutput | dict[str, Any],
        options: OrbSavedOutputSaveOptions | None,
        *,
        created_from: str = "manual",
        created_from_id: str | None = None,
        analysis_mode: str | None = None,
    ) -> tuple[OrbIntelligenceSaveHints, OrbIntelligenceSaveContext]:
        hints = self.build_save_hints(output, analysis_mode=analysis_mode)
        ctx = OrbIntelligenceSaveContext(available=True, saved=False, type=hints.suggested_output_type)
        if not options or not options.save_output:
            return hints, ctx
        record = self.save_from_intelligence_output(
            output,
            project_id=options.project_id,
            project_name=options.project_name,
            profile_ids=options.profile_ids,
            tags=options.tags or hints.suggested_tags,
            title=options.title or hints.suggested_title,
            output_type=options.output_type or hints.suggested_output_type,
            status=options.status,
            created_from=created_from,
            created_from_id=created_from_id,
            analysis_mode=analysis_mode,
        )
        ctx.saved = True
        ctx.output_id = record.id
        ctx.project_id = record.project_id
        ctx.type = record.type
        return hints, ctx

    def save_from_intelligence_output(
        self,
        output: OrbIntelligenceOutput | dict[str, Any],
        *,
        project_id: str | None = None,
        project_name: str | None = None,
        profile_ids: list[str] | None = None,
        tags: list[str] | None = None,
        title: str | None = None,
        output_type: OrbSavedOutputType | None = None,
        status: str = "saved",
        created_from: str = "manual",
        created_from_id: str | None = None,
        analysis_mode: str | None = None,
    ) -> OrbSavedOutputRecord:
        if isinstance(output, OrbIntelligenceOutput):
            intel = output
            data = output.model_dump()
        else:
            data = output
            intel = OrbIntelligenceOutput.model_validate(data)

        resolved_type = output_type or self._suggested_type_from_intelligence(
            data, analysis_mode=analysis_mode
        )
        markdown = orb_intelligence_output_service.build_copy_markdown(intel)
        summary = _text(data.get("summary"))[:8000] or None
        quality = {}
        if intel.quality:
            quality = intel.quality.model_dump()

        payload = OrbSavedOutputCreate(
            title=title or _text(data.get("title")) or "ORB output",
            type=resolved_type,
            status=status,  # type: ignore[arg-type]
            project_id=project_id,
            project_name=project_name,
            profile_ids=profile_ids or [],
            tags=tags or self._suggested_tags(resolved_type, data),
            summary=summary,
            content_markdown=markdown,
            content_json={"intelligence_output": data},
            intelligence_output=data,
            sources=list(data.get("sources") or []),
            citations=list(data.get("citations") or []),
            quality=quality,
            model_routing=dict(data.get("model_routing") or {}),
            retrieval_context=dict(data.get("retrieval_context") or {}),
            created_from=created_from,  # type: ignore[arg-type]
            created_from_id=created_from_id,
            metadata={"artefact_notice": STANDALONE_ARTEFACT_NOTICE},
        )
        return self.create_output(payload)

    def create_output(self, payload: OrbSavedOutputCreate) -> OrbSavedOutputRecord:
        record = OrbSavedOutputRecord(
            id=str(uuid4()),
            title=payload.title,
            type=payload.type,
            status=payload.status,
            visibility=payload.visibility,
            project_id=payload.project_id,
            project_name=payload.project_name,
            profile_ids=list(payload.profile_ids),
            tags=list(payload.tags),
            summary=payload.summary,
            content_markdown=payload.content_markdown,
            content_json=dict(payload.content_json),
            intelligence_output=dict(payload.intelligence_output),
            sources=list(payload.sources),
            citations=list(payload.citations),
            quality=dict(payload.quality),
            model_routing=dict(payload.model_routing),
            retrieval_context=dict(payload.retrieval_context),
            created_from=payload.created_from,
            created_from_id=payload.created_from_id,
            metadata=dict(payload.metadata),
        )
        row = self._record_to_row(record)
        if self._detect_storage_mode() == "postgresql":
            self._insert_db(row)
        else:
            self._memory[record.id] = row
        try:
            from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

            indicare_ai_governance_event_service.record_from_saved_output(record)
        except Exception:
            pass
        return record

    def list_outputs(self, request: OrbSavedOutputListRequest) -> OrbSavedOutputListResponse:
        if self._detect_storage_mode() == "postgresql":
            rows, total = self._list_db(request)
        else:
            rows, total = self._list_memory(request)
        items = [self._row_to_summary(row) for row in rows]
        return OrbSavedOutputListResponse(
            items=items,
            total=total,
            limit=request.limit,
            offset=request.offset,
        )

    def get_output(self, output_id: str) -> OrbSavedOutputRecord | None:
        row = self._fetch_row(output_id)
        if not row:
            return None
        return self._row_to_record(row)

    def update_output(
        self, output_id: str, payload: OrbSavedOutputUpdate
    ) -> OrbSavedOutputRecord | None:
        existing = self.get_output(output_id)
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
            self._update_db(row)
        else:
            self._memory[output_id] = row
        return existing

    def archive_output(self, output_id: str) -> OrbSavedOutputRecord | None:
        return self.update_output(
            output_id,
            OrbSavedOutputUpdate(status="archived"),
        )

    def delete_output(self, output_id: str) -> bool:
        if self._detect_storage_mode() == "postgresql":
            return self._delete_db(output_id)
        return self._memory.pop(output_id, None) is not None

    def export_output(
        self, output_id: str, fmt: OrbSavedOutputExportFormat = "markdown"
    ) -> dict[str, Any] | None:
        record = self.get_output(output_id)
        if not record:
            return None
        content = self._format_export(record, fmt)
        safe_title = re.sub(r"[^\w\s-]", "", record.title).strip().replace(" ", "-")[:80]
        ext = {"markdown": "md", "plain_text": "txt", "json": "json", "html": "html"}.get(
            fmt, "md"
        )
        return {
            "output_id": output_id,
            "format": fmt,
            "content": content,
            "filename": f"orb-{safe_title or 'output'}.{ext}",
            "standalone_notice": STANDALONE_ARTEFACT_NOTICE,
        }

    def build_reuse_prompt(
        self, output_id: str, instruction: str | None = None
    ) -> OrbSavedOutputReuseResponse | None:
        record = self.get_output(output_id)
        if not record:
            return None
        summary = _text(record.summary) or _text(record.content_markdown)[:1200]
        user_instruction = _text(instruction) or "continue from this saved output"
        suggested = (
            f"Use this saved ORB output as context.\n\n"
            f"**Title:** {record.title}\n"
            f"**Type:** {record.type}\n"
            f"**Summary:** {summary[:2000]}\n\n"
            f"I want to: {user_instruction}\n\n"
            f"Note: {STANDALONE_ARTEFACT_NOTICE}"
        )
        return OrbSavedOutputReuseResponse(
            output_id=output_id,
            suggested_prompt=suggested,
            output_summary=summary[:500],
            source_count=len(record.sources),
            safety_notice=STANDALONE_BOUNDARY_NOTICE,
        )

    def _suggested_type_from_intelligence(
        self, data: dict[str, Any], *, analysis_mode: str | None = None
    ) -> OrbSavedOutputType:
        if analysis_mode and analysis_mode in DOCUMENT_MODE_TYPE_MAP:
            return DOCUMENT_MODE_TYPE_MAP[analysis_mode]
        intel_type = _text(data.get("type"))
        return INTELLIGENCE_TYPE_MAP.get(intel_type, "general_research")

    def _suggested_tags(
        self, output_type: OrbSavedOutputType, data: dict[str, Any]
    ) -> list[str]:
        tags = [output_type.replace("_", "-")]
        if data.get("type"):
            tags.append(_text(data["type"]))
        return list(dict.fromkeys(t for t in tags if t))

    def _format_export(
        self, record: OrbSavedOutputRecord, fmt: OrbSavedOutputExportFormat
    ) -> str:
        if fmt == "json":
            return json.dumps(record.model_dump(), indent=2, default=str)
        if fmt == "html":
            md = record.content_markdown or ""
            body = "<br/>".join(md.replace("&", "&amp;").splitlines())
            return (
                f"<html><head><title>{record.title}</title></head><body>"
                f"<h1>{record.title}</h1><p><em>{STANDALONE_ARTEFACT_NOTICE}</em></p>"
                f"<p>{body}</p></body></html>"
            )
        if fmt == "plain_text":
            return self._markdown_to_plain(record.content_markdown or record.summary or "")
        lines = [
            f"# {record.title}",
            "",
            f"**Type:** {record.type}",
            f"**Status:** {record.status}",
        ]
        if record.project_name:
            lines.append(f"**Project:** {record.project_name}")
        lines.append("")
        if record.summary:
            lines.append(record.summary)
            lines.append("")
        if record.content_markdown:
            lines.append(record.content_markdown)
        lines.extend(
            [
                "",
                "---",
                STANDALONE_ARTEFACT_NOTICE,
                STANDALONE_BOUNDARY_NOTICE,
            ]
        )
        return "\n".join(lines).strip()

    def _markdown_to_plain(self, text: str) -> str:
        plain = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
        plain = re.sub(r"\*\*([^*]+)\*\*", r"\1", plain)
        return plain.strip()

    def _record_to_row(self, record: OrbSavedOutputRecord) -> dict[str, Any]:
        archived = record.archived_at
        if record.status == "archived" and not archived:
            archived = _now_iso()
        return {
            "id": record.id,
            "title": record.title,
            "type": record.type,
            "status": record.status,
            "project_id": record.project_id,
            "project_name": record.project_name,
            "profile_ids": record.profile_ids,
            "tags": record.tags,
            "summary": record.summary,
            "content_markdown": record.content_markdown,
            "content_json": record.content_json,
            "intelligence_output": record.intelligence_output,
            "sources": record.sources,
            "citations": record.citations,
            "quality": record.quality,
            "model_routing": record.model_routing,
            "retrieval_context": record.retrieval_context,
            "created_from": record.created_from,
            "created_from_id": record.created_from_id,
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
            "metadata": record.metadata,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
            "archived_at": archived,
        }

    def _row_to_record(self, row: dict[str, Any]) -> OrbSavedOutputRecord:
        return OrbSavedOutputRecord(
            id=row["id"],
            title=row["title"],
            type=row["type"],
            status=row.get("status") or "saved",
            visibility="standalone_project",
            project_id=row.get("project_id"),
            project_name=row.get("project_name"),
            profile_ids=_parse_json(row.get("profile_ids"), []),
            tags=_parse_json(row.get("tags"), []),
            summary=row.get("summary"),
            content_markdown=row.get("content_markdown"),
            content_json=_parse_json(row.get("content_json"), {}),
            intelligence_output=_parse_json(row.get("intelligence_output"), {}),
            sources=_parse_json(row.get("sources"), []),
            citations=_parse_json(row.get("citations"), []),
            quality=_parse_json(row.get("quality"), {}),
            model_routing=_parse_json(row.get("model_routing"), {}),
            retrieval_context=_parse_json(row.get("retrieval_context"), {}),
            created_from=row.get("created_from") or "manual",
            created_from_id=row.get("created_from_id"),
            standalone_only=bool(row.get("standalone_only", True)),
            os_linked=bool(row.get("os_linked", False)),
            care_record_access=bool(row.get("care_record_access", False)),
            created_at=str(row.get("created_at") or _now_iso()),
            updated_at=str(row.get("updated_at") or _now_iso()),
            archived_at=str(row["archived_at"]) if row.get("archived_at") else None,
            metadata=_parse_json(row.get("metadata"), {}),
        )

    def _row_to_summary(self, row: dict[str, Any]) -> OrbSavedOutputSummary:
        quality = _parse_json(row.get("quality"), {})
        score = quality.get("overall_score")
        sources = _parse_json(row.get("sources"), [])
        return OrbSavedOutputSummary(
            id=row["id"],
            title=row["title"],
            type=row["type"],
            status=row.get("status") or "saved",
            project_id=row.get("project_id"),
            project_name=row.get("project_name"),
            tags=_parse_json(row.get("tags"), []),
            summary=row.get("summary"),
            source_count=len(sources),
            quality_score=float(score) if score is not None else None,
            created_at=str(row.get("created_at") or _now_iso()),
            updated_at=str(row.get("updated_at") or _now_iso()),
        )

    def _fetch_row(self, output_id: str) -> dict[str, Any] | None:
        if self._detect_storage_mode() == "postgresql":
            return self._fetch_db(output_id)
        return self._memory.get(output_id)

    def _list_memory(
        self, request: OrbSavedOutputListRequest
    ) -> tuple[list[dict[str, Any]], int]:
        rows = list(self._memory.values())
        filtered = [r for r in rows if self._matches_filters(r, request)]
        filtered.sort(key=lambda r: str(r.get("created_at") or ""), reverse=True)
        total = len(filtered)
        page = filtered[request.offset : request.offset + request.limit]
        return page, total

    def _matches_filters(self, row: dict[str, Any], request: OrbSavedOutputListRequest) -> bool:
        if request.project_id and row.get("project_id") != request.project_id:
            return False
        if request.output_type and row.get("type") != request.output_type:
            return False
        if request.status and row.get("status") != request.status:
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

    def _insert_db(self, row: dict[str, Any]) -> None:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO orb_saved_outputs (
                        id, title, type, status, project_id, project_name,
                        profile_ids, tags, summary, content_markdown, content_json,
                        intelligence_output, sources, citations, quality, model_routing,
                        retrieval_context, created_from, created_from_id,
                        standalone_only, os_linked, care_record_access, metadata,
                        created_at, updated_at, archived_at
                    ) VALUES (
                        %(id)s, %(title)s, %(type)s, %(status)s, %(project_id)s, %(project_name)s,
                        %(profile_ids)s, %(tags)s, %(summary)s, %(content_markdown)s, %(content_json)s,
                        %(intelligence_output)s, %(sources)s, %(citations)s, %(quality)s, %(model_routing)s,
                        %(retrieval_context)s, %(created_from)s, %(created_from_id)s,
                        %(standalone_only)s, %(os_linked)s, %(care_record_access)s, %(metadata)s,
                        %(created_at)s::timestamptz, %(updated_at)s::timestamptz,
                        %(archived_at)s::timestamptz
                    )
                    """,
                    {
                        **row,
                        "profile_ids": Json(row["profile_ids"]),
                        "tags": Json(row["tags"]),
                        "content_json": Json(row["content_json"]),
                        "intelligence_output": Json(row["intelligence_output"]),
                        "sources": Json(row["sources"]),
                        "citations": Json(row["citations"]),
                        "quality": Json(row["quality"]),
                        "model_routing": Json(row["model_routing"]),
                        "retrieval_context": Json(row["retrieval_context"]),
                        "metadata": Json(row["metadata"]),
                    },
                )
            conn.commit()
        finally:
            release_db_connection(conn)

    def _update_db(self, row: dict[str, Any]) -> None:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE orb_saved_outputs SET
                        title=%(title)s, type=%(type)s, status=%(status)s,
                        project_id=%(project_id)s, project_name=%(project_name)s,
                        profile_ids=%(profile_ids)s, tags=%(tags)s,
                        summary=%(summary)s, content_markdown=%(content_markdown)s,
                        content_json=%(content_json)s, metadata=%(metadata)s,
                        updated_at=%(updated_at)s::timestamptz,
                        archived_at=%(archived_at)s::timestamptz
                    WHERE id=%(id)s
                    """,
                    {
                        "id": row["id"],
                        "title": row["title"],
                        "type": row["type"],
                        "status": row["status"],
                        "project_id": row["project_id"],
                        "project_name": row["project_name"],
                        "profile_ids": Json(row["profile_ids"]),
                        "tags": Json(row["tags"]),
                        "summary": row["summary"],
                        "content_markdown": row["content_markdown"],
                        "content_json": Json(row["content_json"]),
                        "metadata": Json(row["metadata"]),
                        "updated_at": row["updated_at"],
                        "archived_at": row.get("archived_at"),
                    },
                )
            conn.commit()
        finally:
            release_db_connection(conn)

    def _delete_db(self, output_id: str) -> bool:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM orb_saved_outputs WHERE id=%s", (output_id,))
                deleted = cur.rowcount > 0
            conn.commit()
            return deleted
        finally:
            release_db_connection(conn)

    def _fetch_db(self, output_id: str) -> dict[str, Any] | None:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT * FROM orb_saved_outputs WHERE id=%s", (output_id,))
                row = cur.fetchone()
                return dict(row) if row else None
        finally:
            release_db_connection(conn)

    def _list_db(
        self, request: OrbSavedOutputListRequest
    ) -> tuple[list[dict[str, Any]], int]:
        clauses = ["1=1"]
        params: list[Any] = []
        if request.project_id:
            clauses.append("project_id = %s")
            params.append(request.project_id)
        if request.output_type:
            clauses.append("type = %s")
            params.append(request.output_type)
        if request.status:
            clauses.append("status = %s")
            params.append(request.status)
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
                cur.execute(f"SELECT COUNT(*) AS c FROM orb_saved_outputs WHERE {where}", params)
                total = int(cur.fetchone()["c"])
                cur.execute(
                    f"""
                    SELECT * FROM orb_saved_outputs
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


orb_saved_output_service = OrbSavedOutputService()
