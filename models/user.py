from pydantic import BaseModel
from datetime import datetime

class UserOut(BaseModel):
    id: int
    email: str
    role: str
    home_id: int | None = None
    archived: bool
    created_at: datetime
    updated_at: datetime

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
