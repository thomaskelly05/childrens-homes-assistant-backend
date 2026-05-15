from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from schemas.document_templates import DocumentScope, DocumentTemplate


MANAGER_ROLES = {"manager", "registered_manager", "admin", "super_admin", "superadmin", "founder", "owner", "responsible_individual", "ri", "provider_admin"}
STAFF_CONFIDENTIAL_ROLES = {"manager", "registered_manager", "admin", "super_admin", "superadmin", "founder", "owner", "responsible_individual", "ri", "hr", "provider_admin"}
SIGNOFF_ROLES = {"manager", "registered_manager", "admin", "super_admin", "superadmin", "responsible_individual", "ri", "provider_admin"}


class DocumentPermissionService:
    """RBAC and scope guardrails for document records."""

    def assert_can_read(self, *, current_user: dict[str, Any], document: dict[str, Any]) -> None:
        if not self.can_read(current_user=current_user, document=document):
            raise HTTPException(status_code=403, detail="You do not have access to this document.")

    def assert_can_write(self, *, current_user: dict[str, Any], document: dict[str, Any]) -> None:
        if not self.can_write(current_user=current_user, document=document):
            raise HTTPException(status_code=403, detail="You do not have permission to edit this document.")

    def assert_can_create(self, *, current_user: dict[str, Any], template: DocumentTemplate, payload: dict[str, Any]) -> None:
        scope = template.scope
        if scope == DocumentScope.CHILD and not self._safe_str(payload.get("child_id")):
            raise HTTPException(status_code=400, detail="Child documents require an active child context.")
        if scope == DocumentScope.STAFF and self.role(current_user) not in STAFF_CONFIDENTIAL_ROLES:
            raise HTTPException(status_code=403, detail="Staff documents require confidential staff-record access.")
        if scope == DocumentScope.HOME and not (payload.get("home_id") or current_user.get("home_id") or self.role(current_user) in MANAGER_ROLES):
            raise HTTPException(status_code=400, detail="Home documents require a home scope.")

    def assert_can_export(self, *, current_user: dict[str, Any], document: dict[str, Any]) -> None:
        self.assert_can_read(current_user=current_user, document=document)
        if self.role(current_user) not in MANAGER_ROLES and document.get("scope") in {"home", "staff"}:
            raise HTTPException(status_code=403, detail="Export requires manager or responsible-person permission.")

    def assert_can_sign(self, *, current_user: dict[str, Any], document: dict[str, Any]) -> None:
        self.assert_can_read(current_user=current_user, document=document)
        if self.role(current_user) not in SIGNOFF_ROLES:
            raise HTTPException(status_code=403, detail="Sign-off requires manager or responsible-person permission.")

    def can_read(self, *, current_user: dict[str, Any], document: dict[str, Any]) -> bool:
        role = self.role(current_user)
        scope = self._scope_value(document)
        if scope == DocumentScope.STAFF.value and role not in STAFF_CONFIDENTIAL_ROLES:
            return self._same_user(current_user, document.get("staff_id"))
        return self._scope_matches(current_user, document)

    def can_write(self, *, current_user: dict[str, Any], document: dict[str, Any]) -> bool:
        if str(document.get("status") or "") in {"approved", "archived"}:
            return False
        if self._scope_value(document) == DocumentScope.STAFF.value and self.role(current_user) not in STAFF_CONFIDENTIAL_ROLES:
            return False
        return self._scope_matches(current_user, document)

    def validate_link_scope(self, *, document: dict[str, Any], link: dict[str, Any]) -> None:
        scope = self._scope_value(document)
        if scope == DocumentScope.CHILD.value and self._safe_str(link.get("child_id") or link.get("young_person_id")) != self._safe_str(document.get("child_id")):
            raise HTTPException(status_code=400, detail="Child documents can only link records for the active child.")
        if scope == DocumentScope.HOME.value and self._safe_str(link.get("home_id")) not in {"", self._safe_str(document.get("home_id"))}:
            raise HTTPException(status_code=400, detail="Home documents can only link records for the current home.")
        if scope == DocumentScope.STAFF.value and self._safe_str(link.get("staff_id")) != self._safe_str(document.get("staff_id")):
            raise HTTPException(status_code=400, detail="Staff documents can only link permitted staff records.")

    def role(self, current_user: dict[str, Any]) -> str:
        return str(current_user.get("role") or "").strip().lower()

    def _scope_matches(self, current_user: dict[str, Any], document: dict[str, Any]) -> bool:
        role = self.role(current_user)
        if role in {"admin", "super_admin", "superadmin", "founder", "owner"}:
            return True
        user_provider = self._safe_str(current_user.get("provider_id") or current_user.get("providerId"))
        doc_provider = self._safe_str(document.get("provider_id"))
        if user_provider and doc_provider and user_provider != doc_provider:
            return False
        doc_home = self._safe_str(document.get("home_id"))
        if not doc_home:
            return True
        allowed = {self._safe_str(current_user.get("home_id") or current_user.get("homeId") or current_user.get("selected_home_id"))}
        allowed.update(self._safe_str(item) for item in current_user.get("allowed_home_ids", []) if item is not None)
        return doc_home in allowed

    def _scope_value(self, document: dict[str, Any]) -> str:
        scope = document.get("scope")
        return str(getattr(scope, "value", scope) or "")

    def _same_user(self, current_user: dict[str, Any], staff_id: Any) -> bool:
        return self._safe_str(staff_id) in {self._safe_str(current_user.get("staff_id")), self._safe_str(current_user.get("id")), self._safe_str(current_user.get("user_id"))}

    def _safe_str(self, value: Any) -> str:
        return "" if value in (None, "") else str(value)


document_permission_service = DocumentPermissionService()
