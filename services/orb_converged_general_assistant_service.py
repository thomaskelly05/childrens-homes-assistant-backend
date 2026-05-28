from __future__ import annotations

"""Converged standalone ORB assistant wrapper.

This service is the safe migration layer from the existing standalone ORB
assistant runtime to the shared ORB Residential intelligence spine.

It deliberately does not replace the existing OrbGeneralAssistantService yet.
Instead it:

1. Builds a shared ORB Residential context packet.
2. Enriches the prompt with assistant/* knowledge, mode and response contracts.
3. Calls the existing standalone ORB assistant runtime.
4. Runs the final answer through shared answer-quality checks.
5. Adds convergence metadata while preserving standalone guard rails.

This gives us a safe runtime convergence path without breaking /orb.
"""

from typing import Any

from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_residential_intelligence_service import orb_residential_intelligence_service


def _safe_text(value: Any) -> str:
    return str(value or "").strip()


class OrbConvergedGeneralAssistantService:
    """Standalone ORB assistant powered by the shared intelligence spine."""

    async def answer(
        self,
        message: str,
        *,
        history: list[dict[str, Any]] | None = None,
        detail: str = "concise",
        image_data_urls: list[str] | None = None,
        mode: str | None = None,
        profile_context: bool = False,
        document_text: str | None = None,
        document_source_id: str | None = None,
        document_title: str | None = None,
        raw_user_message: str | None = None,
    ) -> dict[str, Any]:
        user_message = _safe_text(raw_user_message) or _safe_text(message)
        supplied_context_types: list[str] = []
        if document_text or document_source_id:
            supplied_context_types.append("uploaded_document")
        if image_data_urls:
            supplied_context_types.append("image_attachment")
        if profile_context:
            supplied_context_types.append("standalone_profile_context")
        if history:
            supplied_context_types.append("conversation_history")

        context_packet = orb_residential_intelligence_service.build_context_packet(
            user_message,
            mode=mode,
            surface="standalone",
            supplied_context_types=supplied_context_types,
        )
        prompt_block = orb_residential_intelligence_service.build_prompt_block(
            user_message,
            mode=mode,
            surface="standalone",
            supplied_context_types=supplied_context_types,
        )

        enriched_message = (
            f"{prompt_block}\n\n"
            "============================================================\n"
            "USER REQUEST\n"
            f"{user_message}"
        )

        result = await orb_general_assistant_service.answer(
            enriched_message,
            history=history,
            detail=detail,
            image_data_urls=image_data_urls,
            mode=mode,
            profile_context=profile_context,
            document_text=document_text,
            document_source_id=document_source_id,
            document_title=document_title,
            raw_user_message=user_message,
        )

        answer_text = _safe_text(result.get("answer"))
        processed = orb_residential_intelligence_service.process_answer(
            answer_text=answer_text,
            message=user_message,
            mode=mode,
            surface="standalone",
            sources=result.get("sources") or [],
            evidence_index=[],
            runtime={
                "detail": detail,
                "supplied_context_types": supplied_context_types,
                "converged_runtime": True,
            },
        )

        context_used = dict(result.get("context_used") or {})
        context_used.update(
            {
                "orb_residential_convergence": {
                    "enabled": True,
                    "surface": "standalone",
                    "contract_mode": context_packet.contract_mode,
                    "detected_mode": context_packet.detected_mode,
                    "selected_knowledge_modules": context_packet.selected_knowledge_modules,
                    "required_sections": context_packet.required_sections,
                    "live_record_access": False,
                    "os_linked": False,
                    "quality": processed.get("quality"),
                    "safe_to_show": processed.get("safe_to_show"),
                }
            }
        )
        context_used["care_record_access"] = False
        context_used["os_linked"] = False

        result["context_used"] = context_used
        result["internal_data_access"] = False
        result["os_records_accessed"] = False
        result["quality"] = processed.get("quality")
        result["safe_to_show"] = processed.get("safe_to_show")
        result["contract_ui_schema"] = context_packet.contract_ui_schema
        return result

    def build_shift_builder_draft(self, notes: str) -> dict[str, str]:
        """Expose the paid Shift Builder scaffold through the converged runtime."""
        return orb_residential_intelligence_service.build_shift_builder_draft(notes).to_dict()

    def build_context_packet(
        self,
        message: str,
        *,
        mode: str | None = None,
        supplied_context_types: list[str] | None = None,
    ) -> dict[str, Any]:
        return orb_residential_intelligence_service.build_context_packet(
            message,
            mode=mode,
            surface="standalone",
            supplied_context_types=supplied_context_types,
        ).to_dict()


orb_converged_general_assistant_service = OrbConvergedGeneralAssistantService()
