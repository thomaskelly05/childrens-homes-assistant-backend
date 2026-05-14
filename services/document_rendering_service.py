from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from schemas.document_templates import DocumentInstance, DocumentTemplate
from services.document_template_service import document_template_service


class DocumentRenderingService:
    """Build editable document instances from registered templates."""

    def new_instance(
        self,
        *,
        template: DocumentTemplate,
        current_user: dict[str, Any],
        title: str | None = None,
        child_id: int | str | None = None,
        home_id: int | str | None = None,
        staff_id: int | str | None = None,
        sections: dict[str, str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> DocumentInstance:
        return DocumentInstance(
            document_id=str(uuid4()),
            template_id=template.template_id,
            title=title or template.title,
            scope=template.scope,
            child_id=child_id,
            home_id=home_id or current_user.get("home_id") or current_user.get("selected_home_id"),
            staff_id=staff_id,
            sections={**document_template_service.blank_sections(template.template_id), **(sections or {})},
            metadata={
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": current_user.get("id") or current_user.get("user_id"),
                "owner_role": template.owner_role,
                "review_frequency": template.review_frequency,
                "inspection_relevance": template.inspection_relevance,
                **(metadata or {}),
            },
        )

    def render_editor_payload(self, *, instance: dict[str, Any], template: DocumentTemplate) -> dict[str, Any]:
        sections = instance.get("sections") or {}
        section_payload = []
        for section in [*template.required_sections, *template.optional_sections]:
            section_payload.append(
                {
                    "section_id": section.section_id,
                    "title": section.title,
                    "purpose": section.purpose,
                    "required": section.required,
                    "prompts": section.prompts,
                    "therapeutic_guidance": section.therapeutic_guidance,
                    "content": sections.get(section.section_id, ""),
                    "complete": bool(str(sections.get(section.section_id, "")).strip()) if section.required else True,
                }
            )
        return {
            **instance,
            "template": template.model_dump(),
            "editor_sections": section_payload,
            "completion": {
                "required": len(template.required_sections),
                "completed": sum(1 for section in template.required_sections if str(sections.get(section.section_id, "")).strip()),
            },
        }


document_rendering_service = DocumentRenderingService()
