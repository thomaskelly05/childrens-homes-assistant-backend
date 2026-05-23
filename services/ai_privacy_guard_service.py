"""Single privacy gate before AI receives operational or export context."""

from __future__ import annotations

import copy
from typing import Any
from uuid import uuid4

from schemas.ai_privacy import (
    AiDataClass,
    AiExportDecision,
    AiPermissionCheckRequest,
    AiPermissionDecision,
    AiPrivacyAction,
    AiPrivacyGuardRequest,
    AiPrivacyGuardResult,
    AiPrivacySurface,
    AiRedactionMode,
    AiRedactionResult,
    OrbOperationalPrivacyGuardSummary,
)
from services.ai_context_minimisation_service import ai_context_minimisation_service
from services.ai_permission_guard_service import ai_permission_guard_service
from services.ai_privacy_audit_service import ai_privacy_audit_service
from services.ai_redaction_service import ai_redaction_service, REDACTION_WARNING
from services.ai_retention_policy_service import ai_retention_policy_service
DENIAL_MESSAGE = (
    "This request needs permissioned OS context that is not available for your role or current scope."
)

OPERATIONAL_DATA_INFERENCE: dict[str, list[AiDataClass]] = {
    "safeguarding_themes": ["safeguarding_summary", "child_record_summary"],
    "child_journey_summary": ["child_record_summary"],
    "record_quality_review": ["child_record_summary", "operational_metadata"],
    "staff_support": ["staff_record", "staff_wellbeing"],
    "manager_daily_brief": ["operational_metadata", "safeguarding_summary"],
}


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


class AiPrivacyGuardService:
    def guard(
        self,
        request: AiPrivacyGuardRequest,
        current_user: dict[str, Any] | None = None,
        *,
        conn: Any | None = None,
    ) -> AiPrivacyGuardResult:
        data_classes = list(request.data_classes) or self._infer_data_classes(request)
        permission_req = AiPermissionCheckRequest(
            surface=request.surface,
            action=request.action,
            data_classes=data_classes,
            sensitivity=request.sensitivity,
            home_id=request.home_id,
            child_id=request.child_id,
            staff_id=request.staff_id,
            output_id=request.output_id,
            metadata=request.metadata,
        )
        permission = ai_permission_guard_service.check_permission(permission_req, current_user)

        if not permission.allowed:
            result = AiPrivacyGuardResult(
                decision="deny",
                allowed=False,
                data_classes=data_classes,
                sensitivity=request.sensitivity,
                model_send_allowed=False,
                export_allowed=False,
                reasons=list(permission.reasons),
                warnings=list(permission.warnings) + [DENIAL_MESSAGE],
                safe_context={},
                metadata={"denied": True},
                privacy_notice=self.build_privacy_notice(request.surface, denied=True),
            )
            ai_privacy_audit_service.record_guard_result(
                result,
                surface=request.surface,
                action=request.action,
                current_user=current_user,
                home_id=request.home_id,
                child_id=request.child_id,
                staff_id=request.staff_id,
                output_id=request.output_id,
                conn=conn,
            )
            return result

        minimised = self.apply_minimisation(copy.deepcopy(request.context), request.action, data_classes)
        redacted = self.apply_redaction(minimised.context, request.redaction_mode, data_classes)
        payload = (
            ai_redaction_service.redact_payload(minimised.context, data_classes, mode=request.redaction_mode)
            if isinstance(minimised.context, dict)
            else {"summary": redacted.text}
        )
        safe_context = self.build_safe_context(payload, request.message)

        decision: AiPermissionDecision = permission.decision
        if permission.manager_review_required and decision == "allow_minimised":
            decision = "require_manager_review"

        result = AiPrivacyGuardResult(
            decision=decision,
            allowed=True,
            data_classes=data_classes,
            sensitivity=request.sensitivity,
            redaction_applied=redacted.redaction_applied,
            minimisation_applied=minimised.minimisation_applied,
            manager_review_required=permission.manager_review_required,
            safeguarding_review_required=permission.safeguarding_review_required,
            export_allowed=permission.export_allowed,
            model_send_allowed=permission.model_send_allowed,
            reasons=list(permission.reasons),
            warnings=list(permission.warnings) + list(redacted.warnings) + list(minimised.warnings),
            safe_context=safe_context,
            blocked_fields=sorted(set(minimised.blocked_fields)),
            retention_policy=ai_retention_policy_service.retention_for_surface(request.surface),
            metadata=request.metadata,
            privacy_notice=self.build_privacy_notice(request.surface),
        )

        result.audit_event_id = f"privacy-{uuid4().hex[:12]}"
        ai_privacy_audit_service.record_guard_result(
            result,
            surface=request.surface,
            action=request.action,
            current_user=current_user,
            home_id=request.home_id,
            child_id=request.child_id,
            staff_id=request.staff_id,
            output_id=request.output_id,
            conn=conn,
        )
        return result

    def guard_standalone_context(
        self,
        message: str,
        *,
        current_user: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> AiPrivacyGuardResult:
        return self.guard(
            AiPrivacyGuardRequest(
                surface="standalone_orb",
                action="send_to_model",
                message=message,
                context={"message": message},
                data_classes=["reference_guidance", "user_provided_document"],
            ),
            current_user,
            conn=conn,
        )

    def guard_operational_context(
        self,
        context: dict[str, Any],
        *,
        action: AiPrivacyAction = "send_to_model",
        mode: str | None = None,
        home_id: int | None = None,
        child_id: int | None = None,
        staff_id: int | None = None,
        message: str | None = None,
        current_user: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> AiPrivacyGuardResult:
        data_classes = self._infer_data_classes(
            AiPrivacyGuardRequest(surface="operational_orb", action=action, context=context, metadata={"mode": mode})
        )
        sensitivity = "safeguarding_sensitive" if "safeguarding" in _text(mode) else "confidential"
        if child_id is not None:
            sensitivity = "child_special_category"
        return self.guard(
            AiPrivacyGuardRequest(
                surface="operational_orb",
                action=action,
                context=context,
                message=message,
                data_classes=data_classes,
                sensitivity=sensitivity,  # type: ignore[arg-type]
                home_id=home_id,
                child_id=child_id,
                staff_id=staff_id,
                redaction_mode="strict" if "safeguarding" in _text(mode) else "standard",
            ),
            current_user,
            conn=conn,
        )

    def guard_model_request(
        self,
        *,
        surface: AiPrivacySurface,
        context: dict[str, Any],
        message: str,
        current_user: dict[str, Any] | None = None,
        conn: Any | None = None,
        **kwargs: Any,
    ) -> AiPrivacyGuardResult:
        return self.guard(
            AiPrivacyGuardRequest(
                surface=surface,
                action="send_to_model",
                context=context,
                message=message,
                **{k: v for k, v in kwargs.items() if k in AiPrivacyGuardRequest.model_fields},
            ),
            current_user,
            conn=conn,
        )

    def guard_export(
        self,
        *,
        surface: AiPrivacySurface,
        output: dict[str, Any] | None,
        current_user: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> AiExportDecision:
        standalone = surface == "standalone_orb" or bool((output or {}).get("standalone_only"))
        data_classes: list[AiDataClass] = (
            ["user_provided_document"] if standalone else ["operational_metadata"]
        )
        guard = self.guard(
            AiPrivacyGuardRequest(
                surface=surface,
                action="export_output",
                context=output or {},
                data_classes=data_classes,
            ),
            current_user,
            conn=conn,
        )
        notice = (
            "Standalone export: check all names, identifiers and sensitive details before sharing."
            if standalone
            else "Operational export audited. Summary-level content only — verify before external sharing."
        )
        return AiExportDecision(
            allowed=guard.allowed and guard.export_allowed,
            decision=guard.decision,
            export_allowed=guard.export_allowed,
            privacy_notice=notice,
            warnings=guard.warnings,
            audit_event_id=guard.audit_event_id,
        )

    def guard_action_creation(
        self,
        current_user: dict[str, Any] | None,
        context: dict[str, Any] | None = None,
        *,
        conn: Any | None = None,
    ) -> AiPrivacyGuardResult:
        if not ai_permission_guard_service.can_create_action_from_ai(current_user, context):
            return AiPrivacyGuardResult(
                decision="deny",
                allowed=False,
                reasons=["You do not have permission to create actions from AI outputs."],
                warnings=[DENIAL_MESSAGE],
            )
        return self.guard(
            AiPrivacyGuardRequest(
                surface="operational_orb",
                action="create_action",
                context=context or {},
                data_classes=["operational_metadata"],
            ),
            current_user,
            conn=conn,
        )

    def apply_minimisation(
        self,
        context: dict[str, Any],
        action: AiPrivacyAction,
        data_classes: list[AiDataClass],
    ):
        return ai_context_minimisation_service.minimise_context(context, action, data_classes)

    def apply_redaction(
        self,
        context: dict[str, Any] | str,
        mode: AiRedactionMode,
        data_classes: list[AiDataClass] | None = None,
    ) -> AiRedactionResult:
        if isinstance(context, dict):
            ai_redaction_service.redact_payload(context, data_classes, mode=mode)
            return AiRedactionResult(
                text="",
                mode=mode,
                redaction_applied=True,
                warnings=[REDACTION_WARNING],
            )
        return ai_redaction_service.redact_to_result(_text(context), mode=mode, data_classes=data_classes)

    def build_safe_context(self, payload: dict[str, Any], message: str | None) -> dict[str, Any]:
        safe = dict(payload or {})
        if message:
            redacted_msg = ai_redaction_service.redact_to_result(message, mode="standard")
            safe["user_message_redacted"] = redacted_msg.text
        safe["privacy_guard_applied"] = True
        safe["summary_level_only"] = True
        return safe

    def build_privacy_notice(self, surface: AiPrivacySurface | str, *, denied: bool = False) -> str:
        if denied:
            return DENIAL_MESSAGE
        if surface == "standalone_orb":
            return (
                "Standalone ORB uses reference guidance and your own text only. "
                "Check all names, identifiers and sensitive details before saving."
            )
        return (
            "Privacy guard applied. Summary-level permissioned context only. "
            "Redaction and minimisation may apply. Manager review where flagged."
        )

    def to_operational_summary(self, result: AiPrivacyGuardResult) -> OrbOperationalPrivacyGuardSummary:
        return OrbOperationalPrivacyGuardSummary(
            decision=result.decision,
            allowed=result.allowed,
            redaction_applied=result.redaction_applied,
            minimisation_applied=result.minimisation_applied,
            manager_review_required=result.manager_review_required,
            safeguarding_review_required=result.safeguarding_review_required,
            model_send_allowed=result.model_send_allowed,
            blocked_fields=list(result.blocked_fields),
            warnings=list(result.warnings),
            privacy_notice=result.privacy_notice,
            audit_event_id=result.audit_event_id,
        )

    def _infer_data_classes(self, request: AiPrivacyGuardRequest) -> list[AiDataClass]:
        if request.data_classes:
            return list(request.data_classes)
        mode = _text(request.metadata.get("mode"))
        if request.surface == "standalone_orb":
            return ["reference_guidance", "no_record_data"]
        inferred = list(OPERATIONAL_DATA_INFERENCE.get(mode, ["operational_metadata"]))
        if request.child_id is not None:
            inferred.append("child_record_summary")
        if request.staff_id is not None:
            inferred.append("staff_record")
        if "safeguarding" in mode:
            inferred.append("safeguarding_summary")
        return list(dict.fromkeys(inferred))  # preserve order, unique


ai_privacy_guard_service = AiPrivacyGuardService()
