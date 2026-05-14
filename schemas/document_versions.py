from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DocumentVersion(BaseModel):
    version_id: str
    document_id: str
    version_number: int
    reason: str
    snapshot: dict[str, Any]
    created_by: int | str | None = None
    created_at: datetime
    immutable: bool = True


class DocumentAutosaveEnvelope(BaseModel):
    document_id: str
    base_version: int | str | None = None
    sections: dict[str, str] = Field(default_factory=dict)
    client_token: str
    recovered: bool = False
    conflict: bool = False
    message: str
