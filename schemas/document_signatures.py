from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DocumentSignatureRequest(BaseModel):
    meaning: str
    signed_name: str
    role: str
    statement: str = "I confirm this document has been reviewed and signed."
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentSignature(BaseModel):
    signature_id: str
    document_id: str
    signer_user_id: int | str | None = None
    signed_name: str
    role: str
    meaning: str
    statement: str
    content_hash: str
    signed_at: datetime
    audit: dict[str, Any] = Field(default_factory=dict)
