"""Record and query IndiCare Intelligence AI governance events (metadata only)."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from schemas.indicare_ai_governance import (
    AiGovernanceEventCreate,
    AiGovernanceEventRecord,
    AiGovernanceFilter,
    AiGovernanceRiskLevel,
    AiGovernanceSurface,
)
from services.indicare_ai_governance import SENSITIVE_TERMS, governance_summary

logger = logging.getLogger("indicare.ai_governance_events")

SENSITIVE_FIELD_KEYS = frozenset(
    {
        "text",
        "transcript",
        "prompt",
        "answer",
        "answer_text",
        "content",
        "content_markdown",
        "message",
        "raw_message",
        "child_name",
        "young_person_name",
        "record_body",
        "daily_note",
    }
)

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS indicare_ai_governance_events (
    id TEXT PRIMARY KEY,
    surface TEXT NOT NULL,
    event_type TEXT NOT NULL,
    user_id TEXT,
    user_role TEXT,
    home_id INTEGER,
    child_id INTEGER,
    staff_id INTEGER,
    output_id TEXT,
    action_id TEXT,
    source_id TEXT,
    model_provider TEXT,
    model_name TEXT,
    task_type TEXT,
    quality_tier TEXT,
    cost_tier TEXT,
    latency_ms INTEGER,
    fallback_used BOOLEAN DEFAULT FALSE,
    evaluation_score NUMERIC,
    citation_count INTEGER DEFAULT 0,
    official_source_count INTEGER DEFAULT 0,
    summary_only_source_count INTEGER DEFAULT 0,
    safety_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    boundary_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_level TEXT DEFAULT 'info',
    message_summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now() -> datetime:
    return datetime.now(timezone.utc)


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


def _safe_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata:
        return {}
    safe: dict[str, Any] = {}
    for key, value in metadata.items():
        lower = str(key).lower()
        if lower in SENSITIVE_FIELD_KEYS:
            safe[key] = "[redacted]"
        elif isinstance(value, dict):
            safe[key] = _safe_metadata(value)
        elif isinstance(value, str) and len(value) > 500:
            safe[key] = _text(value)[:500] + "…"
        elif isinstance(value, list) and len(value) > 20:
            safe[key] = f"{len(value)} item(s)"
        else:
            safe[key] = value
    return safe


def _normalise_routing(model_routing: dict[str, Any] | None) -> dict[str, Any]:
    routing = dict(model_routing or {})
    return {
        "model_provider": _text(routing.get("provider") or routing.get("model_provider")) or None,
        "model_name": _text(routing.get("model")) or None,
        "task_type": _text(routing.get("task_type")) or None,
        "quality_tier": _text(routing.get("quality_tier")) or None,
        "cost_tier": _text(routing.get("cost_tier")) or None,
        "latency_ms": routing.get("latency_ms"),
        "fallback_used": bool(routing.get("fallback_used")),
    }


class IndicareAiGovernanceEventService:
    def __init__(self) -> None:
        self._memory: list[dict[str, Any]] = []
        self._table_ready = False

    def reset_for_tests(self) -> None:
        self._memory.clear()
        self._table_ready = False

    def _ensure_table(self, conn: Any) -> None:
        if self._table_ready:
            return
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
        conn.commit()
        self._table_ready = True

    def summarise_message(self, message: str | None, *, max_chars: int = 180) -> str:
        text = re.sub(r"\s+", " ", _text(message))
        if not text:
            return ""
        if len(text) <= max_chars:
            return text
        return text[: max_chars - 1].rstrip() + "…"

    def classify_risk(self, event: AiGovernanceEventCreate | dict[str, Any]) -> AiGovernanceRiskLevel:
        if isinstance(event, AiGovernanceEventCreate):
            data = event.model_dump()
        else:
            data = dict(event)
        explicit = _text(data.get("risk_level"))
        if explicit in {"info", "low", "medium", "high", "critical"}:
            if explicit != "info":
                return explicit  # type: ignore[return-value]
        safety_flags = data.get("safety_flags") or []
        boundary_warnings = data.get("boundary_warnings") or []
        summary = _text(data.get("message_summary")).lower()
        if any(flag in {"safeguarding", "child_protection", "abuse"} for flag in safety_flags):
            return "critical"
        if any(term in summary for term in ("safeguarding", "abuse", "exploitation", "child protection")):
            return "high"
        if boundary_warnings or any(term in summary for term in SENSITIVE_TERMS[:6]):
            return "medium"
        if safety_flags:
            return "low"
        event_type = _text(data.get("event_type")).lower()
        if event_type in {"source_needs_review", "operational_output_review_required"}:
            return "medium"
        return "info"

    def record_event(
        self,
        payload: AiGovernanceEventCreate | dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> AiGovernanceEventRecord | None:
        try:
            if isinstance(payload, AiGovernanceEventCreate):
                create = payload
            else:
                create = AiGovernanceEventCreate.model_validate(payload)
            create.risk_level = self.classify_risk(create)
            create.message_summary = self.summarise_message(create.message_summary)
            create.metadata = _safe_metadata(create.metadata)
            record = AiGovernanceEventRecord(
                id=f"ai-gov-{uuid4().hex[:16]}",
                created_at=_now(),
                **create.model_dump(),
            )
            row = {
                **record.model_dump(),
                "safety_flags": list(record.safety_flags),
                "boundary_warnings": list(record.boundary_warnings),
                "metadata": dict(record.metadata),
                "created_at": record.created_at.isoformat(),
            }
            if conn is not None:
                self._insert_db(record, conn=conn)
            elif self._try_insert_db(record):
                pass
            else:
                self._memory.append(row)
                if len(self._memory) > 2000:
                    self._memory = self._memory[-2000:]
            return record
        except Exception as exc:
            logger.warning("AI governance event write failed (non-blocking): %s", exc)
            return None

    def _insert_db(self, record: AiGovernanceEventRecord, *, conn: Any) -> None:
        self._ensure_table(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO indicare_ai_governance_events (
                    id, surface, event_type, user_id, user_role, home_id, child_id, staff_id,
                    output_id, action_id, source_id, model_provider, model_name, task_type,
                    quality_tier, cost_tier, latency_ms, fallback_used, evaluation_score,
                    citation_count, official_source_count, summary_only_source_count,
                    safety_flags, boundary_warnings, risk_level, message_summary, metadata, created_at
                ) VALUES (
                    %(id)s, %(surface)s, %(event_type)s, %(user_id)s, %(user_role)s,
                    %(home_id)s, %(child_id)s, %(staff_id)s, %(output_id)s, %(action_id)s,
                    %(source_id)s, %(model_provider)s, %(model_name)s, %(task_type)s,
                    %(quality_tier)s, %(cost_tier)s, %(latency_ms)s, %(fallback_used)s,
                    %(evaluation_score)s, %(citation_count)s, %(official_source_count)s,
                    %(summary_only_source_count)s, %(safety_flags)s, %(boundary_warnings)s,
                    %(risk_level)s, %(message_summary)s, %(metadata)s, %(created_at)s
                )
                """,
                {
                    "id": record.id,
                    "surface": record.surface,
                    "event_type": record.event_type,
                    "user_id": record.user_id,
                    "user_role": record.user_role,
                    "home_id": record.home_id,
                    "child_id": record.child_id,
                    "staff_id": record.staff_id,
                    "output_id": record.output_id,
                    "action_id": record.action_id,
                    "source_id": record.source_id,
                    "model_provider": record.model_provider,
                    "model_name": record.model_name,
                    "task_type": record.task_type,
                    "quality_tier": record.quality_tier,
                    "cost_tier": record.cost_tier,
                    "latency_ms": record.latency_ms,
                    "fallback_used": record.fallback_used,
                    "evaluation_score": record.evaluation_score,
                    "citation_count": record.citation_count,
                    "official_source_count": record.official_source_count,
                    "summary_only_source_count": record.summary_only_source_count,
                    "safety_flags": Json(list(record.safety_flags)),
                    "boundary_warnings": Json(list(record.boundary_warnings)),
                    "risk_level": record.risk_level,
                    "message_summary": record.message_summary,
                    "metadata": Json(record.metadata),
                    "created_at": record.created_at,
                },
            )
        conn.commit()

    def _try_insert_db(self, record: AiGovernanceEventRecord) -> bool:
        conn = None
        try:
            conn = get_db_connection()
            self._insert_db(record, conn=conn)
            return True
        except (DatabaseUnavailableError, Exception):
            if conn and not conn.closed:
                try:
                    conn.rollback()
                except Exception:
                    pass
            return False
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _user_fields(self, user: dict[str, Any] | None) -> dict[str, Any]:
        if not user:
            return {}
        return {
            "user_id": _text(user.get("id") or user.get("user_id")) or None,
            "user_role": _text(user.get("role")).lower() or None,
            "home_id": user.get("home_id"),
        }

    def _governance_from_text(self, text: str) -> tuple[list[str], list[str]]:
        gov = governance_summary(text)
        safety: list[str] = []
        boundaries: list[str] = []
        if gov.get("requires_professional_review"):
            safety.extend(gov.get("sensitive_themes") or [])
        for theme in gov.get("sensitive_themes") or []:
            if theme in {"safeguarding", "abuse", "exploitation", "child protection"}:
                safety.append("safeguarding")
        if gov.get("requires_professional_review"):
            boundaries.append("professional_review_recommended")
        return list(dict.fromkeys(safety)), boundaries

    def _citation_metrics(
        self,
        sources: list[dict[str, Any]] | None,
        citations: list[dict[str, Any]] | None,
        retrieval: dict[str, Any] | None = None,
    ) -> dict[str, int]:
        sources = sources or []
        citations = citations or []
        official = 0
        summary_only = 0
        for source in sources:
            st = _text(source.get("source_type") or source.get("type")).lower()
            if st in {"official", "official_source", "regulatory"}:
                official += 1
            if source.get("summary_only") or st == "summary_only":
                summary_only += 1
        meta = (retrieval or {}).get("retrieval") or retrieval or {}
        official += int(meta.get("official_source_count") or 0)
        return {
            "citation_count": len(citations) or len(sources),
            "official_source_count": official,
            "summary_only_source_count": summary_only,
        }

    def record_from_standalone_response(
        self,
        response: dict[str, Any],
        *,
        user: dict[str, Any] | None = None,
        event_type: str = "standalone_conversation",
        message: str | None = None,
        conn: Any | None = None,
    ) -> AiGovernanceEventRecord | None:
        context = response.get("context_used") or {}
        routing = _normalise_routing(context.get("model_routing") or response.get("model_routing"))
        citations = self._citation_metrics(
            response.get("sources"),
            response.get("citations"),
            context,
        )
        summary_text = message or response.get("answer") or ""
        safety_flags, boundary_warnings = self._governance_from_text(_text(summary_text))
        evaluation = response.get("evaluation") or {}
        score = evaluation.get("overall_score") if isinstance(evaluation, dict) else None
        surface: AiGovernanceSurface = "standalone_orb"
        if event_type == "document_analysis":
            surface = "document_understanding"
        elif event_type in {"agent_run", "deep_research"}:
            surface = "agents" if event_type == "agent_run" else "deep_research"
        return self.record_event(
            AiGovernanceEventCreate(
                surface=surface,
                event_type=event_type,
                message_summary=self.summarise_message(summary_text),
                safety_flags=safety_flags,
                boundary_warnings=boundary_warnings,
                evaluation_score=float(score) if score is not None else None,
                metadata={
                    "tools_used": response.get("tools_used") or [],
                    "internal_data_access": bool(response.get("internal_data_access")),
                    "os_linked": bool(context.get("os_linked")),
                },
                **self._user_fields(user),
                **routing,
                **citations,
            ),
            conn=conn,
        )

    def record_from_operational_response(
        self,
        response: Any,
        *,
        current_user: dict[str, Any] | None = None,
        event_type: str = "operational_conversation",
        conn: Any | None = None,
    ) -> AiGovernanceEventRecord | None:
        if hasattr(response, "model_dump"):
            data = response.model_dump()
        elif isinstance(response, dict):
            data = response
        else:
            return None
        routing = _normalise_routing(data.get("model_routing"))
        citations = self._citation_metrics(data.get("sources"), data.get("citations"))
        answer = _text(data.get("answer"))
        safety_flags, boundary_warnings = self._governance_from_text(answer)
        for warning in data.get("warnings") or []:
            boundary_warnings.append(_text(warning)[:120])
        evaluation = data.get("evaluation") or {}
        score = None
        if hasattr(evaluation, "overall_score"):
            score = evaluation.overall_score
        elif isinstance(evaluation, dict):
            score = evaluation.get("overall_score")
        boundaries = data.get("boundaries") or {}
        if isinstance(boundaries, dict) and boundaries.get("manager_review_required"):
            boundary_warnings.append("manager_review_required")
        request = data.get("request") or {}
        return self.record_event(
            AiGovernanceEventCreate(
                surface="operational_orb",
                event_type=event_type,
                home_id=data.get("home_id") or request.get("home_id") if isinstance(request, dict) else None,
                child_id=data.get("child_id") or (request.get("child_id") if isinstance(request, dict) else None),
                staff_id=data.get("staff_id") or (request.get("staff_id") if isinstance(request, dict) else None),
                message_summary=self.summarise_message(answer),
                safety_flags=list(dict.fromkeys(safety_flags)),
                boundary_warnings=list(dict.fromkeys(boundary_warnings))[:8],
                evaluation_score=float(score) if score is not None else None,
                metadata={
                    "mode": data.get("mode") or (request.get("mode") if isinstance(request, dict) else None),
                    "audit_reference": data.get("audit_reference"),
                    "os_linked": True,
                    "care_record_access": data.get("care_record_access"),
                },
                **self._user_fields(current_user),
                **routing,
                **citations,
            ),
            conn=conn,
        )

    def record_from_saved_output(
        self,
        output: Any,
        *,
        current_user: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> AiGovernanceEventRecord | None:
        if hasattr(output, "model_dump"):
            data = output.model_dump()
        elif isinstance(output, dict):
            data = output
        else:
            return None
        routing = _normalise_routing(data.get("model_routing"))
        citations = self._citation_metrics(data.get("sources"), data.get("citations"))
        summary = _text(data.get("summary") or data.get("title"))
        return self.record_event(
            AiGovernanceEventCreate(
                surface="saved_outputs",
                event_type="saved_output_created",
                output_id=_text(data.get("id")) or None,
                message_summary=self.summarise_message(summary),
                metadata={"output_type": data.get("type"), "created_from": data.get("created_from")},
                **self._user_fields(current_user),
                **routing,
                **citations,
            ),
            conn=conn,
        )

    def record_from_operational_output(
        self,
        output: Any,
        *,
        current_user: dict[str, Any] | None = None,
        event_type: str = "operational_output_saved",
        conn: Any | None = None,
    ) -> AiGovernanceEventRecord | None:
        if hasattr(output, "model_dump"):
            data = output.model_dump()
        elif isinstance(output, dict):
            data = output
        else:
            return None
        routing = _normalise_routing(data.get("model_routing"))
        citations = self._citation_metrics(data.get("sources"), data.get("citations"))
        review_status = _text(data.get("review_status"))
        boundary_warnings: list[str] = []
        if review_status in {"review_required", "awaiting_review"}:
            boundary_warnings.append("awaiting_manager_review")
        return self.record_event(
            AiGovernanceEventCreate(
                surface="operational_outputs",
                event_type=event_type,
                output_id=_text(data.get("id")) or None,
                home_id=data.get("home_id"),
                child_id=data.get("child_id"),
                staff_id=data.get("staff_id"),
                message_summary=self.summarise_message(data.get("summary") or data.get("title")),
                boundary_warnings=boundary_warnings,
                metadata={"output_type": data.get("type"), "review_status": review_status},
                **self._user_fields(current_user),
                **routing,
                **citations,
            ),
            conn=conn,
        )

    def record_from_source_event(
        self,
        source: dict[str, Any],
        event_type: str,
        *,
        current_user: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> AiGovernanceEventRecord | None:
        title = _text(source.get("title"))
        return self.record_event(
            AiGovernanceEventCreate(
                surface="knowledge_library",
                event_type=event_type,
                source_id=_text(source.get("id")) or None,
                message_summary=self.summarise_message(title or event_type),
                metadata={
                    "governance_status": source.get("governance_status"),
                    "source_type": source.get("source_type"),
                    "official": source.get("official"),
                },
                **self._user_fields(current_user),
            ),
            conn=conn,
        )

    def _period_start(self, period: str) -> datetime | None:
        now = _now()
        if period == "all":
            return None
        days = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}.get(period, 7)
        return now - timedelta(days=days)

    def get_recent_events(
        self,
        filters: AiGovernanceFilter | None = None,
        *,
        conn: Any | None = None,
    ) -> list[AiGovernanceEventRecord]:
        filters = filters or AiGovernanceFilter()
        rows = self._fetch_rows(filters, conn=conn)
        return [self._row_to_record(row) for row in rows[: filters.limit]]

    def get_events_summary(
        self,
        filters: AiGovernanceFilter | None = None,
        *,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        filters = filters or AiGovernanceFilter()
        rows = self._fetch_rows(filters, conn=conn, max_rows=5000)
        total = len(rows)
        fallback = sum(1 for r in rows if r.get("fallback_used"))
        latencies = [int(r["latency_ms"]) for r in rows if r.get("latency_ms") is not None]
        scores = [float(r["evaluation_score"]) for r in rows if r.get("evaluation_score") is not None]
        with_citations = sum(1 for r in rows if int(r.get("citation_count") or 0) > 0)
        by_surface: dict[str, int] = {}
        by_task: dict[str, int] = {}
        by_provider: dict[str, int] = {}
        by_model: dict[str, int] = {}
        by_cost: dict[str, int] = {}
        high_risk = 0
        safeguarding = 0
        boundaries = 0
        for row in rows:
            surface = _text(row.get("surface"), "unknown")
            by_surface[surface] = by_surface.get(surface, 0) + 1
            task = _text(row.get("task_type"), "unknown")
            by_task[task] = by_task.get(task, 0) + 1
            provider = _text(row.get("model_provider"), "unknown")
            by_provider[provider] = by_provider.get(provider, 0) + 1
            model = _text(row.get("model_name"), "unknown")
            by_model[model] = by_model.get(model, 0) + 1
            tier = _text(row.get("cost_tier"), "unknown")
            by_cost[tier] = by_cost.get(tier, 0) + 1
            risk = _text(row.get("risk_level"))
            if risk in {"high", "critical"}:
                high_risk += 1
            flags = _parse_json(row.get("safety_flags"), [])
            if any("safeguarding" in _text(f).lower() for f in flags):
                safeguarding += 1
            if _parse_json(row.get("boundary_warnings"), []):
                boundaries += 1
        return {
            "total": total,
            "fallback_rate": round(fallback / total, 4) if total else 0.0,
            "average_latency_ms": round(sum(latencies) / len(latencies), 2) if latencies else None,
            "average_quality_score": round(sum(scores) / len(scores), 3) if scores else None,
            "citation_coverage": round(with_citations / total, 4) if total else 0.0,
            "events_by_surface": by_surface,
            "events_by_task_type": by_task,
            "model_provider_distribution": by_provider,
            "model_name_distribution": by_model,
            "estimated_cost_tier_summary": by_cost,
            "high_risk_prompt_count": high_risk,
            "safeguarding_flag_count": safeguarding,
            "boundary_warning_count": boundaries,
        }

    def _fetch_rows(
        self,
        filters: AiGovernanceFilter,
        *,
        conn: Any | None = None,
        max_rows: int = 500,
    ) -> list[dict[str, Any]]:
        since = self._period_start(filters.period)
        if conn is not None:
            return self._query_db(filters, since=since, conn=conn, limit=max_rows)
        db_rows = self._try_query_db(filters, since=since, limit=max_rows)
        if db_rows is not None:
            return db_rows
        rows = list(self._memory)
        rows = self._filter_memory(rows, filters, since=since)
        rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
        return rows[:max_rows]

    def _filter_memory(
        self,
        rows: list[dict[str, Any]],
        filters: AiGovernanceFilter,
        *,
        since: datetime | None,
    ) -> list[dict[str, Any]]:
        filtered: list[dict[str, Any]] = []
        for row in rows:
            if since:
                created = row.get("created_at")
                if isinstance(created, str):
                    try:
                        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                        if created_dt < since:
                            continue
                    except ValueError:
                        pass
            if filters.surface and row.get("surface") != filters.surface:
                continue
            if filters.home_id is not None and row.get("home_id") != filters.home_id:
                continue
            if filters.risk_level and row.get("risk_level") != filters.risk_level:
                continue
            if filters.event_type and row.get("event_type") != filters.event_type:
                continue
            filtered.append(row)
        return filtered

    def _try_query_db(
        self,
        filters: AiGovernanceFilter,
        *,
        since: datetime | None,
        limit: int,
    ) -> list[dict[str, Any]] | None:
        conn = None
        try:
            conn = get_db_connection()
            return self._query_db(filters, since=since, conn=conn, limit=limit)
        except Exception:
            return None
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _query_db(
        self,
        filters: AiGovernanceFilter,
        *,
        since: datetime | None,
        conn: Any,
        limit: int,
    ) -> list[dict[str, Any]]:
        clauses = ["1=1"]
        params: dict[str, Any] = {"limit": limit}
        if since:
            clauses.append("created_at >= %(since)s")
            params["since"] = since
        if filters.surface:
            clauses.append("surface = %(surface)s")
            params["surface"] = filters.surface
        if filters.home_id is not None:
            clauses.append("home_id = %(home_id)s")
            params["home_id"] = filters.home_id
        if filters.risk_level:
            clauses.append("risk_level = %(risk_level)s")
            params["risk_level"] = filters.risk_level
        if filters.event_type:
            clauses.append("event_type = %(event_type)s")
            params["event_type"] = filters.event_type
        where = " AND ".join(clauses)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT * FROM indicare_ai_governance_events
                WHERE {where}
                ORDER BY created_at DESC
                LIMIT %(limit)s
                """,
                params,
            )
            return [dict(row) for row in cur.fetchall()]

    def _row_to_record(self, row: dict[str, Any]) -> AiGovernanceEventRecord:
        created = row.get("created_at")
        if isinstance(created, str):
            created_at = datetime.fromisoformat(created.replace("Z", "+00:00"))
        elif isinstance(created, datetime):
            created_at = created
        else:
            created_at = _now()
        return AiGovernanceEventRecord(
            id=_text(row.get("id")),
            surface=row.get("surface"),  # type: ignore[arg-type]
            event_type=_text(row.get("event_type")),
            user_id=row.get("user_id"),
            user_role=row.get("user_role"),
            home_id=row.get("home_id"),
            child_id=row.get("child_id"),
            staff_id=row.get("staff_id"),
            output_id=row.get("output_id"),
            action_id=row.get("action_id"),
            source_id=row.get("source_id"),
            model_provider=row.get("model_provider"),
            model_name=row.get("model_name"),
            task_type=row.get("task_type"),
            quality_tier=row.get("quality_tier"),
            cost_tier=row.get("cost_tier"),
            latency_ms=row.get("latency_ms"),
            fallback_used=bool(row.get("fallback_used")),
            evaluation_score=float(row["evaluation_score"]) if row.get("evaluation_score") is not None else None,
            citation_count=int(row.get("citation_count") or 0),
            official_source_count=int(row.get("official_source_count") or 0),
            summary_only_source_count=int(row.get("summary_only_source_count") or 0),
            safety_flags=_parse_json(row.get("safety_flags"), []),
            boundary_warnings=_parse_json(row.get("boundary_warnings"), []),
            risk_level=row.get("risk_level") or "info",  # type: ignore[arg-type]
            message_summary=row.get("message_summary"),
            metadata=_parse_json(row.get("metadata"), {}),
            created_at=created_at,
        )


indicare_ai_governance_event_service = IndicareAiGovernanceEventService()
