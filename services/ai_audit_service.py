from __future__ import annotations

from typing import Any


def log_ai_interaction(
    conn,
    *,
    user_id: int | None,
    home_id: int | None,
    young_person_id: int | None,
    assistant_type: str,
    assistant_surface: str,
    scope_type: str | None,
    prompt: str,
    response: str,
    sources: list[dict[str, Any]] | None = None,
    evidence_index: list[dict[str, Any]] | None = None,
    regulation_basis: list[dict[str, Any]] | None = None,
    runtime: dict[str, Any] | None = None,
    requires_citations: bool = False,
    defensible_output_contract: bool = False,
    pseudonymised: bool = False,
    safety_flags: list[str] | None = None,
):
    preview = (response or "")[:500]

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ai_audit_logs (
                user_id, home_id, young_person_id,
                assistant_type, assistant_surface, scope_type,
                prompt, response_preview, response_full,
                sources, evidence_index, regulation_basis,
                runtime, requires_citations, defensible_output_contract,
                pseudonymised, safety_flags
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                home_id,
                young_person_id,
                assistant_type,
                assistant_surface,
                scope_type,
                prompt,
                preview,
                response,
                sources or [],
                evidence_index or [],
                regulation_basis or [],
                runtime or {},
                requires_citations,
                defensible_output_contract,
                pseudonymised,
                safety_flags or [],
            ),
        )
