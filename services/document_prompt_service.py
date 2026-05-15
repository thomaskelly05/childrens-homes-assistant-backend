from __future__ import annotations

from typing import Any

from services.document_template_service import CHILD_VOICE_PROMPTS, THERAPEUTIC_GUIDANCE, document_template_service


class DocumentPromptService:
    """Orb prompt packs for document drafting without hidden rewrites."""

    def prompts_for(self, *, template_id: str, section_id: str | None = None) -> dict[str, Any]:
        template = document_template_service.get_template(template_id)
        section_prompts = []
        for section in [*template.required_sections, *template.optional_sections]:
            if section_id is None or section.section_id == section_id:
                section_prompts.extend(section.prompts)
        return {
            "template_id": template_id,
            "orb_prompt_pack": template.orb_prompt_pack,
            "section_prompts": section_prompts,
            "child_voice_prompts": template.child_voice_prompts or CHILD_VOICE_PROMPTS[:3],
            "therapeutic_guidance": template.therapeutic_guidance or THERAPEUTIC_GUIDANCE,
            "guardrails": [
                "Suggestions only; do not silently rewrite records.",
                "Do not fabricate evidence.",
                "Do not make safeguarding conclusions.",
                "Accepted suggestions must be saved by the user.",
            ],
        }

    def suggestion(self, *, request: str, draft_text: str, template_id: str) -> dict[str, Any]:
        prompts = self.prompts_for(template_id=template_id)
        return {
            "mode": request,
            "suggestion_type": "review_prompt",
            "draft_text_unchanged": draft_text,
            "suggestions": [
                {"title": "Strengthen child voice", "prompt": "Consider adding the child's own words, wishes or observed communication."},
                {"title": "Evidence check", "prompt": "Consider linking the source daily note, incident, keywork session or chronology entry."},
                {"title": "Reflective practice", "prompt": "Consider naming what adults noticed, learned and will do next."},
            ],
            "guardrails": prompts["guardrails"],
        }


document_prompt_service = DocumentPromptService()
