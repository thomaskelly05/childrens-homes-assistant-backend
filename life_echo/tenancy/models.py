from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4


@dataclass
class LifeEchoOrganisation:
    id: str = field(default_factory=lambda: f"org_{uuid4().hex}")
    name: str = ""
    organisation_type: str = "care_provider"
    created_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    active: bool = True


@dataclass
class LifeEchoTenantContext:
    organisation_id: str
    provider_name: str
    environment: str = "production"
