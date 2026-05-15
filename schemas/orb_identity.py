from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OrbProductMode(StrEnum):
    OS_EMBEDDED = "os_embedded"
    STANDALONE = "standalone"


class OrbSurface(StrEnum):
    DOCKED = "docked"
    EXPANDED = "expanded"
    IMMERSIVE = "immersive"
    STANDALONE = "standalone"


class OrbRole(StrEnum):
    OPERATIONAL_COMPANION = "operational_companion"
    STANDALONE_ASSISTANT = "standalone_assistant"


class OrbAccessScope(StrEnum):
    ACTIVE_CHILD_ONLY = "active_child_only"
    HOME_SCOPED = "home_scoped"
    PROVIDER_SCOPED_MANAGER = "provider_scoped_manager"
    STANDALONE_NO_OS_ACCESS = "standalone_no_os_access"


class OrbRetrievalPolicy(StrEnum):
    ACTIVE_CHILD_RBAC_ONLY = "active_child_rbac_only"
    HOME_RBAC_ONLY = "home_rbac_only"
    PROVIDER_MANAGER_RBAC_ONLY = "provider_manager_rbac_only"
    STATIC_AND_USER_SUPPLIED_ONLY = "static_and_user_supplied_only"
    BLOCKED = "blocked"


class OrbIdentityMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")

    product_mode: OrbProductMode
    orb_surface: OrbSurface
    orb_role: OrbRole
    voice_profile: str = "british_female_calm"
    tone_profile: str = "calm_concise_human"
    safety_posture: str = "evidence_led_review_required"
    access_scope: OrbAccessScope
    accessibility_profile: dict[str, Any] = Field(default_factory=dict)
    environment_mode: str = "general"
    operational_state: dict[str, Any] = Field(default_factory=dict)
    presence_state: dict[str, Any] = Field(default_factory=dict)
    emotional_safety_state: dict[str, Any] = Field(default_factory=dict)
    retrieval_policy: OrbRetrievalPolicy
    brand_line: str = "Care. Connect. Empower."
    product_language: str


class OrbIdentityContract(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = "ORB powered by IndiCare"
    os_product_language: str = "IndiCare OS with ORB"
    standalone_product_language: str = "ORB powered by IndiCare."
    brand_line: str = "Care. Connect. Empower."
    supporting_message: str = "ORB helps adults understand, record and evidence care with calm, child-centred intelligence."
    is_: tuple[str, ...]
    is_not: tuple[str, ...]
    request_metadata: OrbIdentityMetadata

