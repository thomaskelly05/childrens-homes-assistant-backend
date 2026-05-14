from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from services.document_version_service import document_version_service


class DocumentSignatureService:
    """Auditable sign-off that binds a signature to a content hash."""

    def sign(self, *, document: dict[str, Any], payload: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        signed_at = datetime.now(timezone.utc).isoformat()
        return {
            "signature_id": str(uuid4()),
            "document_id": str(document.get("document_id") or document.get("id")),
            "signer_user_id": current_user.get("id") or current_user.get("user_id"),
            "signed_name": payload.get("signed_name") or current_user.get("name") or current_user.get("email") or "Signed user",
            "role": payload.get("role") or current_user.get("role") or "manager",
            "meaning": payload.get("meaning") or "manager_review",
            "statement": payload.get("statement") or "I confirm this document has been reviewed and signed.",
            "content_hash": document_version_service.content_hash(document),
            "signed_at": signed_at,
            "immutable": True,
            "audit": {
                "signed_at": signed_at,
                "actor_role": current_user.get("role"),
                "scope": document.get("scope"),
                "child_id": document.get("child_id"),
                "home_id": document.get("home_id"),
                "staff_id": document.get("staff_id"),
            },
        }

    def verify(self, *, document: dict[str, Any], signature: dict[str, Any]) -> dict[str, Any]:
        current_hash = document_version_service.content_hash(document)
        original_hash = str(signature.get("content_hash") or "")
        return {
            "valid": current_hash == original_hash,
            "content_hash": current_hash,
            "signed_hash": original_hash,
            "message": "Signature matches the current document." if current_hash == original_hash else "Document content changed after this signature.",
        }


document_signature_service = DocumentSignatureService()
