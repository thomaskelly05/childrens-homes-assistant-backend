from __future__ import annotations

from typing import Any

from fastapi import Request
from pydantic import BaseModel, Field


class EvidencePayload(BaseModel):
    records: list[dict[str, Any]] = Field(default_factory=list)
    document: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    query: str | None = None
    template_id: str | None = None
    source_text: str | None = None
    target_status: str | None = None
    comments: str | None = None
    decision: str | None = None
    rationale: str | None = None
    output_type: str | None = None
    audit_type: str | None = None


def user_from_request(request: Request) -> dict[str, Any]:
    return {
        "id": request.headers.get("X-User-Id"),
        "role": request.headers.get("X-User-Role") or "registered_manager",
        "home_id": request.headers.get("X-Home-Id"),
        "provider_id": request.headers.get("X-Provider-Id"),
    }
