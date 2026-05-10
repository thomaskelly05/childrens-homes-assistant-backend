from __future__ import annotations

import json
from typing import Any

from db.connection import get_db_connection, release_db_connection

SAFEGUARDING_TERMS = {
    "abuse",
    "neglect",
    "self-harm",
    "self harm",
    "suicide",
    "suicidal",
    "missing",
    "exploitation",
    "cse",
    "criminal exploitation",
    "county lines",
    "allegation",
    "lado",
    "harm",
    "assault",
    "sexual",
    "weapon",
    "overdose",
}


class IndiCareKnowledgeService:
    """Document-grounded encyclopedia layer for homes and young people.

    The assistant searches approved documents first, returns citations, logs usage
    where a query log table exists, and flags safeguarding-sensitive questions so
    the UI can prompt staff to follow safeguarding procedures.
    """

    def ask(
        self,
        *,
        question: str,
        current_user: dict[str, Any],
        young_person_id: int | None = None,
        home_id: int | None = None,
        limit: int = 8,
        approved_only: bool = True,
    ) -> dict[str, Any]:
        question = (question or "").strip()
        if not question:
            return {"ok": False, "answer": "Please ask a question.", "citations": [], "confidence": "none"}

        home_id = home_id or self._current_home_id(current_user)
        safeguarding = self._safeguarding_signal(question)
        documents = self._search_documents(
            question=question,
            young_person_id=young_person_id,
            home_id=home_id,
            limit=limit,
            approved_only=approved_only,
        )

        if not documents and approved_only:
            # Fall back to showing that unapproved sources may exist without using
            # them as relied-upon citations.
            unapproved_hits = self._search_documents(
                question=question,
                young_person_id=young_person_id,
                home_id=home_id,
                limit=3,
                approved_only=False,
            )
            result = {
                "ok": True,
                "answer": "I could not find an approved document source that answers this. Check whether the relevant plan, policy or record has been uploaded and approved before relying on an answer.",
                "citations": [],
                "confidence": "none",
                "safeguarding_signal": safeguarding,
                "unapproved_source_count": len(unapproved_hits),
            }
            self._log_query(question=question, current_user=current_user, young_person_id=young_person_id, home_id=home_id, result=result)
            return result

        if not documents:
            result = {
                "ok": True,
                "answer": "I could not find a document source that answers this. Check whether the relevant plan, policy or record has been uploaded and approved.",
                "citations": [],
                "confidence": "none",
                "safeguarding_signal": safeguarding,
            }
            self._log_query(question=question, current_user=current_user, young_person_id=young_person_id, home_id=home_id, result=result)
            return result

        confidence = self._confidence(documents)
        answer = self._compose_answer(question, documents, safeguarding)
        result = {
            "ok": True,
            "answer": answer,
            "citations": [self._citation(doc) for doc in documents],
            "confidence": confidence,
            "safeguarding_signal": safeguarding,
        }
        self._log_query(question=question, current_user=current_user, young_person_id=young_person_id, home_id=home_id, result=result)
        return result

    def _search_documents(self, *, question: str, young_person_id: int | None, home_id: int | None, limit: int, approved_only: bool) -> list[dict[str, Any]]:
        terms = [term.strip() for term in question.lower().replace("?", " ").replace(",", " ").split() if len(term.strip()) > 2]
        where = ["1=1"]
        params: list[Any] = []

        if young_person_id:
            where.append("young_person_id = %s")
            params.append(young_person_id)
        elif home_id:
            where.append("home_id = %s")
            params.append(home_id)

        if approved_only:
            where.append("LOWER(COALESCE(approval_status, '')) IN ('approved', 'current', 'active')")

        search_sql = ""
        if terms:
            like_parts = []
            for term in terms[:8]:
                like_parts.append("(LOWER(COALESCE(title, '')) LIKE %s OR LOWER(COALESCE(document_type, '')) LIKE %s OR LOWER(COALESCE(content::text, '')) LIKE %s)")
                pattern = f"%{term}%"
                params.extend([pattern, pattern, pattern])
            search_sql = " AND (" + " OR ".join(like_parts) + ")"

        params.append(max(1, min(int(limit or 8), 20)))
        query = f"""
            SELECT id, title, document_type, young_person_id, home_id, approval_status,
                   review_date, expiry_date, created_at, updated_at,
                   LEFT(COALESCE(content::text, ''), 1600) AS excerpt
            FROM documents
            WHERE {' AND '.join(where)} {search_sql}
            ORDER BY
              CASE WHEN LOWER(COALESCE(approval_status, '')) IN ('approved', 'current', 'active') THEN 0 ELSE 1 END,
              updated_at DESC NULLS LAST,
              created_at DESC NULLS LAST,
              id DESC
            LIMIT %s
        """

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(query, tuple(params))
                return [dict(row) for row in cur.fetchall()]
        except Exception:
            return []
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _compose_answer(self, question: str, documents: list[dict[str, Any]], safeguarding: dict[str, Any]) -> str:
        top = documents[0]
        title = top.get("title") or "a relevant approved document"
        doc_type = top.get("document_type") or "document"
        excerpt = (top.get("excerpt") or "").strip()
        safety_prefix = ""
        if safeguarding.get("flagged"):
            safety_prefix = "This question may relate to safeguarding. Follow the home safeguarding procedure, inform the appropriate manager/designated lead, and record actions taken. "
        if excerpt:
            excerpt = excerpt[:700]
            return (
                f"{safety_prefix}Based on {title} ({doc_type}), the most relevant approved document evidence found is: {excerpt}. "
                "Review the cited source before relying on this operationally."
            )
        return f"{safety_prefix}I found {len(documents)} relevant approved document source(s), led by {title} ({doc_type}), but the document text excerpt is limited. Open the cited source to confirm the answer."

    def _citation(self, document: dict[str, Any]) -> dict[str, Any]:
        return {
            "source_type": "document",
            "document_id": document.get("id"),
            "title": document.get("title"),
            "document_type": document.get("document_type"),
            "young_person_id": document.get("young_person_id"),
            "home_id": document.get("home_id"),
            "approval_status": document.get("approval_status"),
            "updated_at": document.get("updated_at"),
            "excerpt": document.get("excerpt"),
        }

    def _confidence(self, documents: list[dict[str, Any]]) -> str:
        approved = [doc for doc in documents if str(doc.get("approval_status") or "").lower() in {"approved", "current", "active"}]
        if len(approved) >= 2:
            return "high"
        if len(approved) == 1:
            return "medium"
        if documents:
            return "low"
        return "none"

    def _safeguarding_signal(self, question: str) -> dict[str, Any]:
        text = question.lower()
        matches = sorted(term for term in SAFEGUARDING_TERMS if term in text)
        return {
            "flagged": bool(matches),
            "terms": matches,
            "message": "Safeguarding-sensitive question. Follow safeguarding procedure and do not rely on AI alone." if matches else None,
        }

    def _log_query(self, *, question: str, current_user: dict[str, Any], young_person_id: int | None, home_id: int | None, result: dict[str, Any]) -> None:
        # Optional logging: only writes if a suitable table exists.
        conn = None
        try:
            conn = get_db_connection()
            table = self._first_existing_table(conn, ["assistant_query_log", "ai_interactions", "assistant_audit_log"])
            if not table:
                return
            columns = self._columns(conn, table)
            payload = {
                "user_id": self._current_user_id(current_user),
                "home_id": home_id or self._current_home_id(current_user),
                "young_person_id": young_person_id,
                "question": question,
                "prompt": question,
                "response": result.get("answer"),
                "answer": result.get("answer"),
                "citations": result.get("citations"),
                "metadata": {"confidence": result.get("confidence"), "safeguarding_signal": result.get("safeguarding_signal")},
                "created_at": "NOW()",
                "timestamp": "NOW()",
            }
            values = {key: value for key, value in payload.items() if key in columns and value is not None}
            if not values:
                return
            cols = ", ".join(f'"{key}"' for key in values)
            placeholders = []
            params = []
            for value in values.values():
                if value == "NOW()":
                    placeholders.append("NOW()")
                elif isinstance(value, (dict, list)):
                    placeholders.append("%s::jsonb")
                    params.append(json.dumps(value))
                else:
                    placeholders.append("%s")
                    params.append(value)
            with conn.cursor() as cur:
                cur.execute(f'INSERT INTO public."{table}" ({cols}) VALUES ({", ".join(placeholders)})', tuple(params))
            conn.commit()
        except Exception:
            if conn is not None:
                conn.rollback()
        finally:
            if conn is not None:
                release_db_connection(conn)

    def _first_existing_table(self, conn, names: list[str]) -> str | None:
        with conn.cursor() as cur:
            for name in names:
                cur.execute("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists", (name,))
                row = cur.fetchone()
                exists = row.get("exists") if isinstance(row, dict) else row and row[0]
                if exists:
                    return name
        return None

    def _columns(self, conn, table_name: str) -> set[str]:
        with conn.cursor() as cur:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s", (table_name,))
            return {str(row["column_name"] if isinstance(row, dict) else row[0]) for row in cur.fetchall()}

    def _current_home_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id")
            return int(value) if value else None
        except Exception:
            return None

    def _current_user_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("id") or current_user.get("user_id") or current_user.get("sub")
            return int(value) if value else None
        except Exception:
            return None
