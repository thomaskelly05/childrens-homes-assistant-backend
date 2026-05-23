"""RBAC permission matrix for AI surfaces — fail closed when unsure."""

from __future__ import annotations

from typing import Any

from auth.rbac import StaffRole, normalise_role
from core.policy_engine import context_from_user, policy_engine
from schemas.ai_privacy import (
    AiDataClass,
    AiPermissionCheckRequest,
    AiPermissionCheckResponse,
    AiPermissionDecision,
    AiPrivacyAction,
    AiPrivacySurface,
    AiSensitivityLevel,
)

STANDALONE_SURFACE: AiPrivacySurface = "standalone_orb"

STANDALONE_ALLOWED_DATA: frozenset[AiDataClass] = frozenset(
    {
        "no_record_data",
        "reference_guidance",
        "user_provided_document",
    }
)

STANDALONE_DENIED_DATA: frozenset[AiDataClass] = frozenset(
    {
        "child_record_summary",
        "child_record_raw",
        "safeguarding_summary",
        "safeguarding_raw",
        "health_medication",
        "body_map",
        "incident_record",
        "missing_episode",
        "restraint_record",
        "staff_record",
        "staff_wellbeing",
        "operational_metadata",
    }
)

OPERATIONAL_SUMMARY_DATA: frozenset[AiDataClass] = frozenset(
    {
        "no_record_data",
        "reference_guidance",
        "user_provided_document",
        "child_record_summary",
        "safeguarding_summary",
        "operational_metadata",
        "incident_record",
        "missing_episode",
    }
)

HIGH_SENSITIVITY_DATA: frozenset[AiDataClass] = frozenset(
    {
        "safeguarding_raw",
        "body_map",
        "health_medication",
        "child_record_raw",
    }
)

EXPORT_MANAGER_ROLES = frozenset(
    {
        StaffRole.ADMIN.value,
        StaffRole.MANAGER.value,
        StaffRole.DEPUTY_MANAGER.value,
        "registered_manager",
        "responsible_individual",
        "ri",
        "senior",
    }
)

GOVERNANCE_VIEW_ROLES = EXPORT_MANAGER_ROLES | {StaffRole.SUPPORT_WORKER.value}


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


class AiPermissionGuardService:
    def check_permission(
        self,
        request: AiPermissionCheckRequest,
        current_user: dict[str, Any] | None = None,
    ) -> AiPermissionCheckResponse:
        if current_user is None:
            return self.deny("Authentication required for permissioned AI access.")

        surface = request.surface
        data_classes = list(request.data_classes or ["no_record_data"])
        action = request.action

        if surface == STANDALONE_SURFACE:
            return self._check_standalone(action, data_classes, current_user)

        if surface in {"operational_orb", "care_hub", "record_hub", "intelligence_spine", "operational_outputs"}:
            return self._check_operational(
                surface,
                action,
                data_classes,
                request,
                current_user,
            )

        if surface == "governance_dashboard":
            if self.can_view_ai_governance(current_user):
                return AiPermissionCheckResponse(
                    decision="allow",
                    allowed=True,
                    model_send_allowed=False,
                    export_allowed=False,
                    reasons=["Governance dashboard metadata access permitted."],
                )
            return self.deny("You do not have permission to view AI governance.")

        if surface in {"saved_outputs", "knowledge_library"}:
            if not self.can_use_surface(surface, current_user):
                return self.deny("Surface not available for your role.")
            return AiPermissionCheckResponse(
                decision="allow_minimised",
                allowed=True,
                model_send_allowed=action == "send_to_model",
                export_allowed=action == "export_output",
                reasons=["Summary-level access with minimisation expected."],
                warnings=["Apply redaction before export when user-provided text may contain identifiers."],
            )

        return self.deny("Unknown AI surface — access denied.")

    def can_use_surface(self, surface: str, current_user: dict[str, Any] | None) -> bool:
        if not current_user:
            return surface == STANDALONE_SURFACE
        if surface == STANDALONE_SURFACE:
            return True
        if surface == "governance_dashboard":
            return self.can_view_ai_governance(current_user)
        return policy_engine.has_permission(current_user, "assistant:access") or policy_engine.has_permission(
            current_user, "orb:access"
        )

    def can_use_data_class(self, data_class: AiDataClass, current_user: dict[str, Any] | None) -> bool:
        if data_class in STANDALONE_ALLOWED_DATA:
            return True
        if not current_user:
            return False
        if data_class in STANDALONE_DENIED_DATA:
            return False
        if data_class == "child_record_raw":
            return False
        if data_class in HIGH_SENSITIVITY_DATA:
            return self._is_manager_level(current_user)
        return policy_engine.has_permission(current_user, "records:read")

    def can_use_child_context(
        self,
        child_id: int | None,
        home_id: int | None,
        current_user: dict[str, Any] | None,
    ) -> bool:
        if not current_user or child_id is None:
            return False
        if not policy_engine.has_permission(current_user, "records:read"):
            return False
        if home_id is None:
            return True
        try:
            context = context_from_user(current_user, requested_home_id=int(home_id))
            return context.can_access_home(int(home_id))
        except Exception:
            return False

    def can_use_staff_context(
        self,
        staff_id: int | None,
        home_id: int | None,
        current_user: dict[str, Any] | None,
    ) -> bool:
        if not current_user or staff_id is None:
            return False
        if not policy_engine.has_permission(current_user, "staff:read"):
            return False
        if home_id is None:
            return True
        try:
            context = context_from_user(current_user, requested_home_id=int(home_id))
            return context.can_access_home(int(home_id))
        except Exception:
            return False

    def can_export_ai_output(self, output: dict[str, Any] | None, current_user: dict[str, Any] | None) -> bool:
        if not current_user:
            return False
        surface = _text((output or {}).get("surface"), "operational_outputs")
        if surface == STANDALONE_SURFACE or (output or {}).get("standalone_only"):
            return True
        role = normalise_role(current_user.get("role"))
        return role in EXPORT_MANAGER_ROLES or policy_engine.has_permission(
            current_user, "governance:review"
        )

    def can_create_action_from_ai(
        self,
        current_user: dict[str, Any] | None,
        context: dict[str, Any] | None = None,
    ) -> bool:
        _ = context
        if not current_user:
            return False
        return policy_engine.has_permission(current_user, "records:write") or policy_engine.has_permission(
            current_user, "assistant:access"
        )

    def can_view_ai_governance(self, current_user: dict[str, Any] | None) -> bool:
        if not current_user:
            return False
        role = normalise_role(current_user.get("role"))
        if role in GOVERNANCE_VIEW_ROLES:
            return True
        return policy_engine.has_permission(current_user, "governance:review") or policy_engine.has_permission(
            current_user, "audit:read"
        )

    def decision_for_action(
        self,
        action: AiPrivacyAction,
        data_classes: list[AiDataClass],
        current_user: dict[str, Any] | None,
    ) -> AiPermissionDecision:
        req = AiPermissionCheckRequest(
            surface="operational_orb",
            action=action,
            data_classes=data_classes,
        )
        return self.check_permission(req, current_user).decision

    def require_manager_review(
        self,
        action: AiPrivacyAction,
        data_classes: list[AiDataClass],
        sensitivity: AiSensitivityLevel,
    ) -> bool:
        _ = action
        if sensitivity in {"safeguarding_sensitive", "child_special_category", "highly_sensitive"}:
            return True
        if any(dc in HIGH_SENSITIVITY_DATA for dc in data_classes):
            return True
        if any(dc in {"safeguarding_summary", "safeguarding_raw", "body_map"} for dc in data_classes):
            return True
        return False

    def deny(self, reason: str) -> AiPermissionCheckResponse:
        return AiPermissionCheckResponse(
            decision="deny",
            allowed=False,
            model_send_allowed=False,
            export_allowed=False,
            reasons=[reason],
            warnings=["Access denied — no permissioned context will be sent to the model."],
        )

    def _check_standalone(
        self,
        action: AiPrivacyAction,
        data_classes: list[AiDataClass],
        current_user: dict[str, Any],
    ) -> AiPermissionCheckResponse:
        _ = current_user
        for dc in data_classes:
            if dc in STANDALONE_DENIED_DATA or dc not in STANDALONE_ALLOWED_DATA:
                if dc != "no_record_data":
                    return self.deny(
                        f"Standalone ORB cannot access {dc.replace('_', ' ')}. "
                        "Use operational ORB inside IndiCare OS for permissioned care context."
                    )
        if action in {"use_child_context", "use_staff_context", "create_operational_output"}:
            return self.deny("Standalone ORB cannot use OS-linked child or staff context.")
        return AiPermissionCheckResponse(
            decision="allow",
            allowed=True,
            model_send_allowed=action in {"ask_general", "use_reference_guidance", "send_to_model", "rewrite_record"},
            export_allowed=action == "export_output",
            reasons=["Standalone boundary: reference guidance and user-provided content only."],
            warnings=["Do not paste identifiable care records into standalone ORB without review."],
        )

    def _check_operational(
        self,
        surface: AiPrivacySurface,
        action: AiPrivacyAction,
        data_classes: list[AiDataClass],
        request: AiPermissionCheckRequest,
        current_user: dict[str, Any],
    ) -> AiPermissionCheckResponse:
        if not policy_engine.has_permission(current_user, "assistant:access"):
            return self.deny("You do not have permission to use the operational assistant.")

        for dc in data_classes:
            if dc == "child_record_raw":
                return self.deny("Raw child record bodies are not sent to the model by default.")
            if dc in STANDALONE_DENIED_DATA and dc not in OPERATIONAL_SUMMARY_DATA:
                if dc in HIGH_SENSITIVITY_DATA:
                    if not self._is_manager_level(current_user):
                        return self.deny(f"{dc} requires manager-level permission.")
                elif dc == "staff_record" and not policy_engine.has_permission(current_user, "staff:read"):
                    return self.deny("Staff record context requires staff:read permission.")

        if request.child_id is not None and not self.can_use_child_context(
            request.child_id, request.home_id, current_user
        ):
            return self.deny("You do not have access to this young person's context.")

        if request.staff_id is not None and not self.can_use_staff_context(
            request.staff_id, request.home_id, current_user
        ):
            return self.deny("You do not have access to this staff context.")

        manager_review = self.require_manager_review(action, data_classes, request.sensitivity)
        safeguarding_review = any(
            dc in {"safeguarding_raw", "safeguarding_summary", "body_map"} for dc in data_classes
        )

        decision: AiPermissionDecision = "allow_minimised"
        if any(dc in HIGH_SENSITIVITY_DATA for dc in data_classes):
            decision = "allow_redacted"
        elif manager_review:
            decision = "require_manager_review"

        export_ok = True
        if action == "export_output":
            export_ok = self.can_export_ai_output({"surface": surface}, current_user)

        return AiPermissionCheckResponse(
            decision=decision,
            allowed=True,
            model_send_allowed=action != "view_governance",
            export_allowed=export_ok,
            manager_review_required=manager_review,
            safeguarding_review_required=safeguarding_review,
            reasons=[
                "Operational summary-level context permitted for authenticated role.",
            ],
            warnings=[
                "Summary-level context only — raw narratives are minimised and redacted before model use.",
            ],
        )

    def _is_manager_level(self, current_user: dict[str, Any]) -> bool:
        role = normalise_role(current_user.get("role"))
        return role in EXPORT_MANAGER_ROLES


ai_permission_guard_service = AiPermissionGuardService()
