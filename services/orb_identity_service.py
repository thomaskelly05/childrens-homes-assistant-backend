from __future__ import annotations

from typing import Any

from schemas.orb_identity import (
    OrbAccessScope,
    OrbIdentityContract,
    OrbIdentityMetadata,
    OrbProductMode,
    OrbRetrievalPolicy,
    OrbRole,
    OrbSurface,
)


ORB_IS = (
    "ORB powered by IndiCare",
    "the emotional interaction layer for IndiCare",
    "a calm British female operational companion",
    "voice-first",
    "accessibility-first",
    "trauma-informed",
    "neurodiversity-aware",
    "safeguarding-cautious",
    "evidence-led",
    "concise",
    "warm",
    "practical",
    "emotionally intelligent",
    "child-centred inside IndiCare OS",
    "sector-aware in standalone mode",
    "respectful of professional judgement",
    "supportive to adults under pressure",
)

ORB_IS_NOT = (
    "a generic chatbot",
    "a wellness-only product",
    "a mindfulness app",
    "a diagnostic tool",
    "a safeguarding decision maker",
    "a replacement for staff, RM, RI, social worker, police or clinicians",
    "a system that makes final decisions",
    "allowed to access OS records in standalone mode",
    "allowed to leak one child's data into another child's context",
    "allowed to silently write records",
    "allowed to fabricate evidence",
)


class OrbIdentityService:
    """Central product identity and request metadata for ORB surfaces."""

    def build_metadata(
        self,
        *,
        product_mode: OrbProductMode | str = OrbProductMode.OS_EMBEDDED,
        orb_surface: OrbSurface | str = OrbSurface.DOCKED,
        accessibility_profile: dict[str, Any] | None = None,
        environment_mode: str = "general",
        operational_state: dict[str, Any] | None = None,
        presence_state: dict[str, Any] | None = None,
        emotional_safety_state: dict[str, Any] | None = None,
        current_user: dict[str, Any] | None = None,
        active_child_id: Any = None,
    ) -> OrbIdentityMetadata:
        mode = OrbProductMode(str(product_mode))
        surface = OrbSurface(str(orb_surface))
        role = OrbRole.STANDALONE_ASSISTANT if mode == OrbProductMode.STANDALONE else OrbRole.OPERATIONAL_COMPANION
        access_scope = self.access_scope_for(mode=mode, current_user=current_user or {}, active_child_id=active_child_id)
        return OrbIdentityMetadata(
            product_mode=mode,
            orb_surface=surface,
            orb_role=role,
            access_scope=access_scope,
            accessibility_profile=accessibility_profile or {},
            environment_mode=environment_mode,
            operational_state=operational_state or {},
            presence_state=presence_state or {},
            emotional_safety_state=emotional_safety_state or {},
            retrieval_policy=self.retrieval_policy_for(mode=mode, access_scope=access_scope),
            product_language="ORB powered by IndiCare." if mode == OrbProductMode.STANDALONE else "IndiCare OS with ORB",
        )

    def contract(self, metadata: OrbIdentityMetadata | None = None) -> OrbIdentityContract:
        return OrbIdentityContract(
            is_=ORB_IS,
            is_not=ORB_IS_NOT,
            request_metadata=metadata or self.build_metadata(),
        )

    def access_scope_for(self, *, mode: OrbProductMode, current_user: dict[str, Any], active_child_id: Any = None) -> OrbAccessScope:
        if mode == OrbProductMode.STANDALONE:
            return OrbAccessScope.STANDALONE_NO_OS_ACCESS
        role = str(current_user.get("role") or "").lower().replace("-", "_")
        if role in {"admin", "administrator", "provider_admin", "super_admin", "superadmin", "ri", "responsible_individual"}:
            return OrbAccessScope.PROVIDER_SCOPED_MANAGER
        if active_child_id not in (None, "", [], {}):
            return OrbAccessScope.ACTIVE_CHILD_ONLY
        return OrbAccessScope.HOME_SCOPED

    def retrieval_policy_for(self, *, mode: OrbProductMode, access_scope: OrbAccessScope) -> OrbRetrievalPolicy:
        if mode == OrbProductMode.STANDALONE:
            return OrbRetrievalPolicy.STATIC_AND_USER_SUPPLIED_ONLY
        if access_scope == OrbAccessScope.ACTIVE_CHILD_ONLY:
            return OrbRetrievalPolicy.ACTIVE_CHILD_RBAC_ONLY
        if access_scope == OrbAccessScope.PROVIDER_SCOPED_MANAGER:
            return OrbRetrievalPolicy.PROVIDER_MANAGER_RBAC_ONLY
        if access_scope == OrbAccessScope.HOME_SCOPED:
            return OrbRetrievalPolicy.HOME_RBAC_ONLY
        return OrbRetrievalPolicy.BLOCKED


orb_identity_service = OrbIdentityService()

