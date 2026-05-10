from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LegalAcceptanceCreate(BaseModel):
    version: str = Field(..., min_length=1, max_length=100)
    accepted_at: datetime


class LegalAcceptanceResponse(BaseModel):
    ok: bool = True
    accepted: bool = True
    version: str
    accepted_at: datetime

    model_config = ConfigDict(from_attributes=True)