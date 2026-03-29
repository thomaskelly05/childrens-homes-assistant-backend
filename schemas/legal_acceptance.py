from __future__ import annotations

from pydantic import BaseModel, Field


class LegalAcceptanceCreate(BaseModel):
    version: str = Field(..., min_length=1, max_length=100)
    accepted_at: str = Field(..., min_length=1, max_length=100)


class LegalAcceptanceResponse(BaseModel):
    ok: bool = True
    accepted: bool = True
    version: str
    accepted_at: str
