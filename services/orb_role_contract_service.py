from __future__ import annotations

from dataclasses import dataclass

from schemas.orb_identity import OrbProductMode, OrbRole


@dataclass(frozen=True)
class OrbRoleContract:
    role: OrbRole
    can_access_os_records: bool
    can_retrieve_active_child: bool
    can_create_without_confirmation: bool
    memory_boundary: str
    required_prompt_rules: tuple[str, ...]


class OrbRoleContractService:
    def contract_for(self, product_mode: OrbProductMode | str) -> OrbRoleContract:
        mode = OrbProductMode(str(product_mode))
        if mode == OrbProductMode.STANDALONE:
            return OrbRoleContract(
                role=OrbRole.STANDALONE_ASSISTANT,
                can_access_os_records=False,
                can_retrieve_active_child=False,
                can_create_without_confirmation=False,
                memory_boundary="standalone_user_only_no_os_context",
                required_prompt_rules=(
                    "Use static sector knowledge, general knowledge and user-supplied content only.",
                    "Never claim to have checked IndiCare OS records.",
                    "Decline live child, home, chronology, staff or document retrieval.",
                ),
            )
        return OrbRoleContract(
            role=OrbRole.OPERATIONAL_COMPANION,
            can_access_os_records=True,
            can_retrieve_active_child=True,
            can_create_without_confirmation=False,
            memory_boundary="rbac_user_home_active_child_scoped",
            required_prompt_rules=(
                "Use active-child and RBAC-scoped retrieval only.",
                "Draft or suggest before writeback; require explicit confirmation.",
                "Retain citations internally and never fabricate evidence.",
            ),
        )


orb_role_contract_service = OrbRoleContractService()

