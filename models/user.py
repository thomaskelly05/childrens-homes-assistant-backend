from datetime import datetime
from pydantic import BaseModel

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    home_id: int | None = None
    created_at: datetime
    updated_at: datetime
    archived: bool

class StaffCreate(BaseModel):
    email: str
    password: str
    role: str
    home_id: int | None = None

class StaffUpdate(BaseModel):
    email: str | None = None
    role: str | None = None
    home_id: int | None = None
    archived: bool | None = None
