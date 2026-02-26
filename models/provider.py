from pydantic import BaseModel
from datetime import datetime

class ProviderBase(BaseModel):
    name: str
    region: str | None = None
    address: str | None = None
    postcode: str | None = None
    local_authority: str | None = None
    safeguarding_lead_name: str | None = None
    safeguarding_lead_email: str | None = None

class ProviderCreate(ProviderBase):
    pass

class ProviderUpdate(BaseModel):
    name: str | None = None
    region: str | None = None
    address: str | None = None
    postcode: str | None = None
    local_authority: str | None = None
    safeguarding_lead_name: str | None = None
    safeguarding_lead_email: str | None = None
    archived: bool | None = None

class ProviderOut(ProviderBase):
    id: int
    archived: bool
    created_at: datetime
    updated_at: datetime
