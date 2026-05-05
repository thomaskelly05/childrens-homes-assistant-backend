from __future__ import annotations

from typing import Any

from db.connection import get_db_connection, release_db_connection


class IndiCareKnowledgeService:
    """Document-grounded encyclopedia layer for homes and young people.

    This service searches existing document records and returns answer-ready
    evidence snippets with source citations. It does not invent answers: if no
    relevant source is found, the response says so clearly.
    """

    def ask(self, *, question: str, current_user: dict[str, Any], young_person_id: int | None = None, home_id: int | None = None, limit: int = 8) -> dict[str, Any]:
        question = (question or "").strip()
        if not question:
            return {"ok": False, "answer": "Please ask a question.", "citations": []}

        home_id = home_id or self._current_home_id(current_user)
        documents = self._search_documents(question=question, young_person_id=young_person_id, home_id=home_id, limit=limit)
        if not documents:
            return {
                "ok": True,
                "answer": "I could not find a document source that answers this. Check whether the relevant plan, policy or record has been uploaded and approved.",
                "citations": [],
                "confidence": "none",
            }

        answer = self._compose_answer(question, documents)
        return {
            "ok": True,
            "answer": answer,
            "citations": [self._citation(doc) for doc in documents],
            "confidence": "document-grounded",
        }

    def _search_documents(self, *, question: str, young_person_id: int | None, home_id: int | None, limit: int) -> list[dict[str, Any]]:
        terms = [term.strip() for term in question.lower().replace("?", " ").replace(",", " ").split() if len(term.strip()) > 2]
        where = ["1=1"]
        params: list[Any] = []

        if young_person_id:
            where.append("young_person_id = %s")
            params.append(young_person_id)
        elif home_id:
            where.append("home_id = %s")
            params.append(home_id)

        search_sql = ""
        if terms:
            like_parts = []
            for term in terms[:8]:
                like_parts.append("(LOWER(COALESCE(title, '')) LIKE %s OR LOWER(COALESCE(document_type, '')) LIKE %s OR LOWER(COALESCE(content::text, '')) LIKE %s)")
                pattern = f"%{term}%"
                params.extend([pattern, pattern, pattern])
            search_sql = " AND (" + " OR ".join(like_parts) + ")"

        params.append(limit)
        query = f"""
            SELECT id, title, document_type, young_person_id, home_id, approval_status,
                   review_date, expiry_date, created_at, updated_at,
                   LEFT(COALESCE(content::text, ''), 1200) AS excerpt
            FROM documents
            WHERE {' AND '.join(where)} {search_sql}
            ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
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

    def _compose_answer(self, question: str, documents: list[dict[str, Any]]) -> str:
        top = documents[0]
        title = top.get("title") or "a relevant document"
        doc_type = top.get("document_type") or "document"
        excerpt = (top.get("excerpt") or "").strip()
        if excerpt:
            excerpt = excerpt[:500]
            return (
                f"Based on {title} ({doc_type}), the most relevant document evidence found is: {excerpt}. "
                "Review the cited source before relying on this operationally."
            )
        return f"I found {len(documents)} relevant document source(s), led by {title} ({doc_type}), but the document text excerpt is limited. Open the cited source to confirm the answer."

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

    def _current_home_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id")
            return int(value) if value else None
        except Exception:
            return None
