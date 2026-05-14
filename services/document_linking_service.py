from __future__ import annotations

from typing import Any
from uuid import uuid4

from services.document_permission_service import document_permission_service


ALLOWED_LINK_TYPES = {
    "chronology",
    "daily_note",
    "incident",
    "safeguarding",
    "missing_episode",
    "action",
    "evidence",
    "plan",
    "review",
    "report",
}


class DocumentLinkingService:
    """Scoped document links to chronology, evidence, actions and plans."""

    def prepare_link(self, *, document: dict[str, Any], link: dict[str, Any], current_user: dict[str, Any]) -> dict[str, Any]:
        link_type = str(link.get("link_type") or link.get("type") or "").strip()
        if link_type not in ALLOWED_LINK_TYPES:
            raise ValueError(f"Unsupported document link type: {link_type}")
        document_permission_service.assert_can_write(current_user=current_user, document=document)
        document_permission_service.validate_link_scope(document=document, link=link)
        return {
            "link_id": str(uuid4()),
            "document_id": str(document.get("document_id") or document.get("id")),
            "link_type": link_type,
            "record_id": str(link.get("record_id") or link.get("id")),
            "title": str(link.get("title") or link_type.replace("_", " ").title()),
            "summary": str(link.get("summary") or ""),
            "child_id": link.get("child_id") or link.get("young_person_id") or document.get("child_id"),
            "home_id": link.get("home_id") or document.get("home_id"),
            "staff_id": link.get("staff_id") or document.get("staff_id"),
            "created_by": current_user.get("id") or current_user.get("user_id"),
        }

    def evidence_gaps(self, *, document: dict[str, Any]) -> list[dict[str, str]]:
        links = document.get("links") or []
        types = {item.get("link_type") for item in links}
        gaps = []
        for required in ["chronology", "evidence", "action"]:
            if required not in types:
                gaps.append({"key": f"missing_{required}", "message": f"Limited evidence found: consider linking a {required.replace('_', ' ')} record."})
        return gaps


document_linking_service = DocumentLinkingService()
