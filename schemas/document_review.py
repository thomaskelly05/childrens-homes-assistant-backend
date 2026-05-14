from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from schemas.document_templates import DocumentStatus


class DocumentReviewAction(BaseModel):
    action: str
    comment: str | None = None
    requested_changes: list[str] = Field(default_factory=list)
    due_at: datetime | None = None
    responsible_user_id: int | str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentReviewState(BaseModel):
    status: DocumentStatus
    responsible_user_id: int | str | None = None
    due_at: datetime | None = None
    comments: list[dict[str, Any]] = Field(default_factory=list)
    timeline: list[dict[str, Any]] = Field(default_factory=list)
    overdue: bool = False
