from __future__ import annotations

import json
from typing import Any

from db.connection import get_db_connection, release_db_connection
from services.indicare_knowledge_service import IndiCareKnowledgeService
from services.proactive_intelligence_service import ProactiveIntelligenceService
from services.standalone_assistant_library import list_standalone_library_items
from services.standalone_timeline_intelligence import timeline_summary


class IndiCareAIOrchestratorService:
    """Standalone IndiCare AI brain/context orchestrator.

    This is deliberately for IndiCare AI as a standalone AI tools platform,
    not an OS shell. It gathers the existing knowledge, timeline, proactive,
    document and Connect context already built in the repo and returns a compact
    prompt-ready context package for the assistant runtime.
    """

    def __init__(self) -> None:
        self.knowledge_service = IndiCareKnowledgeService()
        self.proactive_service = ProactiveIntelligenceService()

    def build_context(
        self,
        *,
        question: str,
        current_user: dict[str, Any],
        project_id: str | None = None,
        young_person_id: int | None = None,
        home_id: int | None = None,
        limit: int = 8,
    ) -> dict[str, Any]:
        question = (question or "").strip()
        project_id = (project_id or "standalone").strip() or "standalone"
        home_id = home_id or self._current_home_id(current_user)

        sources: list[dict[str, Any]] = []
        sections: dict[str, Any] = {}

        sections["knowledge"] = self._safe(
            "knowledge",
            lambda: self.knowledge_service.ask(
                question=question,
                current_user=current_user,
                young_person_id=young_person_id,
                home_id=home_id,
                limit=limit,
            ),
            sources,
        )
        sections["assistant_library"] = self._safe(
            "assistant_library",
            lambda: {"items": list_standalone_library_items()[:20]},
            sources,
        )
        sections["timeline"] = self._safe(
            "timeline",
            lambda: timeline_summary(project_id),
            sources,
        )
        sections["proactive"] = self._safe(
            "proactive",
            lambda: self.proactive_service.build_alerts(current_user=current_user, days=30, home_id=home_id),
            sources,
        )
        sections["documents"] = self._safe(
            "documents",
            lambda: self._search_document_library(question=question, current_user=current_user, home_id=home_id, limit=limit),
            sources,
        )
        sections["connect"] = self._safe(
            "connect",
            lambda: self._connect_context(home_id=home_id, young_person_id=young_person_id, limit=20),
            sources,
        )

        prompt_context = self._compose_prompt_context(
            question=question,
            project_id=project_id,
            young_person_id=young_person_id,
            home_id=home_id,
            sections=sections,
        )

        return {
            "ok": True,
            "surface": "indicare_ai_standalone_tools",
            "project_id": project_id,
            "young_person_id": young_person_id,
            "home_id": home_id,
            "sections": sections,
            "sources": sources,
            "prompt_context": prompt_context,
        }

    def build_ambient_feed(
        self,
        *,
        current_user: dict[str, Any],
        project_id: str | None = None,
        young_person_id: int | None = None,
        home_id: int | None = None,
        days: int = 30,
        limit: int = 8,
    ) -> dict[str, Any]:
        """Build a calm standalone assistant awareness feed.

        This reuses existing proactive intelligence, timeline, Connect and memory-like
        data so IndiCare AI can surface useful prompts without becoming an OS dashboard.
        """
        project_id = (project_id or "standalone").strip() or "standalone"
        home_id = home_id or self._current_home_id(current_user)
        sources: list[dict[str, Any]] = []

        proactive = self._safe(
            "proactive",
            lambda: self.proactive_service.build_alerts(current_user=current_user, days=days, home_id=home_id),
            sources,
        )
        timeline = self._safe("timeline", lambda: timeline_summary(project_id), sources)
        connect = self._safe("connect", lambda: self._connect_context(home_id=home_id, young_person_id=young_person_id, limit=20), sources)
        documents = self._safe(
            "documents",
            lambda: self._search_document_library(question="review overdue safeguarding risk incident supervision policy", current_user=current_user, home_id=home_id, limit=limit),
            sources,
        )

        cards = self._ambient_cards(
            proactive=proactive.get("data") if proactive.get("ok") else {},
            timeline=timeline.get("data") if timeline.get("ok") else {},
            connect=connect.get("data") if connect.get("ok") else {},
            documents=documents.get("data") if documents.get("ok") else {},
        )

        return {
            "ok": True,
            "surface": "indicare_ai_standalone_tools",
            "mode": "ambient_intelligence",
            "project_id": project_id,
            "young_person_id": young_person_id,
            "home_id": home_id,
            "days": days,
            "summary": {
                "total": len(cards),
                "critical": len([item for item in cards if item.get("level") == "critical"]),
                "high": len([item for item in cards if item.get("level") == "high"]),
                "medium": len([item for item in cards if item.get("level") == "medium"]),
                "low": len([item for item in cards if item.get("level") == "low"]),
            },
            "cards": cards[:limit],
            "sources": sources,
        }

    def _ambient_cards(self, *, proactive: dict[str, Any], timeline: dict[str, Any], connect: dict[str, Any], documents: dict[str, Any]) -> list[dict[str, Any]]:
        cards: list[dict[str, Any]] = []

        for alert in proactive.get("alerts") or []:
            cards.append({
                "level": self._normalise_level(alert.get("level")),
                "category": alert.get("category") or "proactive",
                "title": alert.get("title") or "IndiCare has noticed something to review",
                "message": alert.get("message") or alert.get("why") or "There is an item that may need professional review.",
                "why": alert.get("why") or "This was generated from existing proactive intelligence.",
                "suggested_prompt": f"Help me review this: {alert.get('title') or alert.get('message') or 'proactive intelligence alert'}",
                "source": "proactive_intelligence",
            })

        event_count = int(timeline.get("eventCount") or timeline.get("event_count") or 0) if isinstance(timeline, dict) else 0
        if event_count:
            cards.append({
                "level": "medium",
                "category": "timeline",
                "title": f"{event_count} chronology item(s) visible in this workspace",
                "message": timeline.get("summary") or "There is chronology context available for review.",
                "why": "Chronology context can help identify patterns, gaps and follow-up actions.",
                "suggested_prompt": "Summarise the current chronology and tell me what patterns, gaps or follow-ups matter most.",
                "source": "timeline_intelligence",
            })

        channels = connect.get("channels") or [] if isinstance(connect, dict) else []
        if channels:
            cards.append({
                "level": "low",
                "category": "connect",
                "title": f"{len(channels)} Connect channel(s) available for continuity",
                "message": "Connect context is available and may help with handover, communication themes or unresolved discussions.",
                "why": "Team conversations often hold useful operational context that needs linking back to records or actions.",
                "suggested_prompt": "Review recent Connect context and identify any unresolved actions or themes.",
                "source": "indicare_connect",
            })

        docs = documents.get("documents") or [] if isinstance(documents, dict) else []
        review_docs = [doc for doc in docs if doc.get("review_date") or doc.get("expiry_date")]
        if review_docs:
            cards.append({
                "level": "medium",
                "category": "documents",
                "title": "Policy/document review context available",
                "message": f"{len(review_docs)} document(s) include review or expiry dates that may need checking.",
                "why": "Approved, current documents support safe and consistent residential practice.",
                "suggested_prompt": "Review document and policy context for gaps, expiry risks or practice implications.",
                "source": "document_library",
            })

        if not cards:
            cards.append({
                "level": "low",
                "category": "calm_check_in",
                "title": "No urgent ambient intelligence found",
                "message": "I could not see an urgent alert from the currently available IndiCare context.",
                "why": "This does not mean there is nothing to review; it only means no high-priority signal was visible to the assistant feed.",
                "suggested_prompt": "Help me prepare for handover and identify anything I may have missed.",
                "source": "ambient_intelligence",
            })

        return sorted(cards, key=lambda item: self._level_score(item.get("level")), reverse=True)

    def _safe(self, label: str, fn, sources: list[dict[str, Any]]) -> dict[str, Any]:
        try:
            data = fn()
            sources.append({"label": label, "ok": True})
            return {"ok": True, "data": data}
        except Exception as exc:
            sources.append({"label": label, "ok": False, "error": str(exc)})
            return {"ok": False, "error": str(exc)}

    def _compose_prompt_context(
        self,
        *,
        question: str,
        project_id: str,
        young_person_id: int | None,
        home_id: int | None,
        sections: dict[str, Any],
    ) -> str:
        lines = [
            "INDICARE AI ORCHESTRATED BRAIN CONTEXT:",
            "This context is for IndiCare AI, a standalone AI tools platform for UK residential children's homes. It is not an OS replacement.",
            "Use the context naturally as the assistant's brain. Do not expose raw JSON. Do not overclaim if context is missing or partial.",
            "Speak like a calm British colleague or experienced manager: warm, reflective, clear, practical and professionally grounded.",
            "Use knowledge/documents for grounded answers. Use timeline/proactive/Connect for patterns, continuity and follow-ups.",
            "For safeguarding-sensitive topics, support careful thinking and manager/DSL/professional review; do not make final threshold decisions.",
            "Keep the conversation open with one helpful next step or gentle question.",
            "",
            f"Project/workspace: {project_id}",
            f"Young person id: {young_person_id or 'not supplied'}",
            f"Home id: {home_id or 'not supplied'}",
            f"User question: {question}",
        ]

        for label, result in sections.items():
            lines.append("")
            lines.append(f"Context source: {label}")
            if not result.get("ok"):
                lines.append("Unavailable or not configured.")
                continue
            lines.append(self._compact(result.get("data"), 6500 if label != "assistant_library" else 3000))

        lines.append("")
        lines.append(
            "Now answer using the context above where relevant. Summarise naturally, identify knowledge, patterns, actions or gaps, and continue the conversation."
        )
        return "\n".join(lines)

    def _compact(self, value: Any, limit: int) -> str:
        try:
            return json.dumps(value, default=str, ensure_ascii=False, indent=2)[:limit]
        except Exception:
            return str(value)[:limit]

    def _search_document_library(self, *, question: str, current_user: dict[str, Any], home_id: int | None, limit: int) -> dict[str, Any]:
        role = str(current_user.get("role") or "").strip().lower()
        user_home_id = home_id or self._current_home_id(current_user)
        terms = [term.strip() for term in question.lower().replace("?", " ").replace(",", " ").split() if len(term.strip()) > 2]
        where = ["1=1"]
        params: list[Any] = []
        if role not in {"admin", "provider_admin"} and user_home_id is not None:
            where.append("d.home_id = %s")
            params.append(user_home_id)
        if terms:
            parts = []
            for term in terms[:8]:
                parts.append("(LOWER(COALESCE(d.title, '')) LIKE %s OR LOWER(COALESCE(d.document_type, '')) LIKE %s OR LOWER(COALESCE(d.input_text, '')) LIKE %s OR LOWER(COALESCE(d.generated_text, '')) LIKE %s)")
                pattern = f"%{term}%"
                params.extend([pattern, pattern, pattern, pattern])
            where.append("(" + " OR ".join(parts) + ")")
        params.append(max(1, min(int(limit or 8), 20)))
        query = f"""
            SELECT d.id, d.home_id, d.document_type, d.title, d.approval_status,
                   d.confidentiality_level, d.review_date, d.expiry_date, d.updated_at,
                   LEFT(COALESCE(d.input_text, d.generated_text, ''), 1200) AS excerpt
            FROM documents d
            WHERE {' AND '.join(where)}
            ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC NULLS LAST
            LIMIT %s
        """
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                return {"ok": True, "documents": [dict(row) for row in cur.fetchall()]}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _connect_context(self, *, home_id: int | None, young_person_id: int | None, limit: int) -> dict[str, Any]:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                if not self._relation_exists(cur, "connect_channels"):
                    return {"ok": True, "status": "missing_schema", "channels": []}
                where = ["archived = false"]
                params: list[Any] = []
                if home_id is not None:
                    where.append("home_id = %s")
                    params.append(home_id)
                if young_person_id is not None:
                    where.append("young_person_id = %s")
                    params.append(young_person_id)
                params.append(max(1, min(int(limit or 20), 50)))
                source = "public.vw_connect_channel_list" if self._relation_exists(cur, "vw_connect_channel_list") else "public.connect_channels"
                cur.execute(
                    f"SELECT * FROM {source} WHERE " + " AND ".join(where) + " ORDER BY COALESCE(latest_message_at, updated_at, created_at) DESC LIMIT %s",
                    tuple(params),
                )
                return {"ok": True, "channels": [dict(row) for row in cur.fetchall()]}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _relation_exists(self, cursor: Any, relation_name: str) -> bool:
        cursor.execute(
            """
            SELECT EXISTS (
              SELECT 1 FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE n.nspname = 'public'
                AND c.relname = %s
                AND c.relkind IN ('r','v','m')
            ) AS exists
            """,
            (relation_name,),
        )
        row = cursor.fetchone()
        return bool(row.get("exists") if isinstance(row, dict) else row[0])

    def _normalise_level(self, level: Any) -> str:
        value = str(level or "low").lower()
        if value in {"critical", "high", "medium", "low"}:
            return value
        if value == "warning":
            return "medium"
        return "low"

    def _level_score(self, level: Any) -> int:
        return {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(str(level or "low").lower(), 0)

    def _current_home_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id")
            return int(value) if value else None
        except Exception:
            return None
