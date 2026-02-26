from pydantic import BaseModel
from datetime import datetime

class HomeBase(BaseModel):
    provider_id: int
    name: str
    address: str | None = None
    postcode: str | None = None
    region: str | None = None
    local_authority: str | None = None
    ofsted_urn: str | None = None
    registered_manager_id: int | None = None

class HomeCreate(HomeBase):
    pass

class HomeUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    postcode: str | None = None
    region: str | None = None
    local_authority: str | None = None
    ofsted_urn: str | None = None
    registered_manager_id: int | None = None
    archived: bool | None = None

class HomeOut(HomeBase):
    id: int
    archived: bool
    created_at: datetime
    updated_at: datetime
