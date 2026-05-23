"""Operational OS ORB assistant — permissioned context, shared intelligence stack."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from schemas.ai_models import AiRoutingRequest
from schemas.orb_evaluation import OrbEvaluationRequest
from schemas.orb_operational import (
    OrbOperationalContextSummary,
    OrbOperationalOutputSaveContext,
    OrbOperationalPermissionSummary,
    OrbOperationalRequest,
    OrbOperationalResponse,
    OrbOperationalSafetyBoundary,
    OrbOperationalSource,
)
from services.ai_model_router_service import ai_model_router_service
from services.orb_evaluation_service import orb_evaluation_service
from services.orb_intelligence_output_service import orb_intelligence_output_service
from services.orb_operational_action_builder_service import orb_operational_action_builder_service
from services.orb_operational_context_service import (
    OPERATIONAL_BOUNDARY_NOTICES,
    orb_operational_context_bridge,
)

logger = logging.getLogger("indicare.orb_operational_assistant")

OPERATIONAL_SYSTEM_PROMPT = """
You are IndiCare OS ORB, the operational assistant inside IndiCare OS.

You may use permissioned operational context provided by the backend summary only.
Do not claim access to anything not included in the context summary.
Do not make final safeguarding, legal or inspection decisions.
Do not predict Ofsted grades.
Provide manager-review caveats where safeguarding, incidents or inspection evidence are discussed.
Use British English. Be clear, practical, child-centred and evidence-focused.
When context is degraded or unavailable, say so and offer cautious general operational guidance.
""".strip()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


class OrbOperationalAssistantService:
    """Answer operational OS ORB queries — never used by standalone /orb."""

    async def answer(
        self,
        request: OrbOperationalRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OrbOperationalResponse:
        context_bundle = orb_operational_context_bridge.build_context(request, current_user, conn=conn)
        summary_raw = context_bundle.get("summary")
        if isinstance(summary_raw, OrbOperationalContextSummary):
            context_summary = summary_raw
        elif isinstance(summary_raw, dict):
            context_summary = OrbOperationalContextSummary.model_validate(summary_raw)
        else:
            context_summary = OrbOperationalContextSummary()

        permissions = context_bundle.get("permissions") or orb_operational_context_bridge._permission_summary(
            current_user,
            scope=request.scope,
            home_id=request.home_id,
            child_id=request.child_id,
            staff_id=request.staff_id,
            care_access=bool(context_bundle.get("raw_available")),
        )
        permissions_model = (
            permissions
            if isinstance(permissions, OrbOperationalPermissionSummary)
            else OrbOperationalPermissionSummary.model_validate(permissions)
        )

        warnings = list(context_summary.permission_warnings or [])
        if context_summary.unavailable:
            warnings.append("Operational context is temporarily unavailable.")

        boundaries = self._safety_boundaries(request, context_summary)
        sources = self.build_sources(context_bundle)
        citations = self.build_citations(sources)

        try:
            prompt = self.build_operational_prompt(request, context_bundle)
            model_request = self.build_model_request(request, prompt, context_bundle)
            response, decision, trace = await ai_model_router_service.complete_with_routing(
                message=request.message,
                system_prompt=model_request["system_prompt"],
                mode=self._mode_label(request.mode),
                retrieval_context={
                    "operational_context": orb_operational_context_bridge.summarise_context(context_bundle),
                    "sources": [s.model_dump() for s in sources],
                },
                detail_level="balanced",
                surface="operational_os",
            )
            routing_meta = ai_model_router_service.routing_metadata_for_context(
                decision, trace, response=response
            )
            answer = _text(response.text)
            if not answer:
                answer = self.fallback_answer(request, response.error or "empty_response")
        except Exception as exc:
            logger.warning("Operational ORB model routing failed: %s", exc)
            routing_meta = {"error": str(exc)}
            answer = self.fallback_answer(request, str(exc))

        answer = self.apply_safety_boundaries(answer, request, context_bundle)
        evaluation = self.evaluate_answer(answer, request, context_bundle)

        intelligence_output = orb_intelligence_output_service.from_operational_answer(
            title=self._mode_label(request.mode),
            summary=context_summary.headline or answer.split("\n", 1)[0][:220],
            answer_text=answer,
            sources=[s.model_dump() for s in sources],
            citations=citations,
        )
        intelligence_output.boundaries = orb_intelligence_output_service.build_safety_boundaries(
            surface="operational_os_orb"
        )
        intelligence_output.boundaries.standalone_only = False
        intelligence_output.boundaries.os_linked = True
        intelligence_output.boundaries.care_record_access = bool(permissions_model.care_record_access)
        intelligence_output.boundaries.notice = OPERATIONAL_BOUNDARY_NOTICES[0]
        intelligence_output.standalone_only = False
        intelligence_output.os_linked = True
        intelligence_output.care_record_access = bool(permissions_model.care_record_access)
        intelligence_output.model_routing = routing_meta
        if evaluation:
            intelligence_output = orb_intelligence_output_service.attach_evaluation(
                intelligence_output, evaluation
            )

        audit_reference = f"orb-operational-{uuid.uuid4().hex[:12]}"

        enriched = orb_operational_action_builder_service.enrich_response_fields(
            context=context_bundle,
            answer=answer,
            request=request,
            audit_reference=audit_reference,
            evaluation=evaluation,
            current_user=current_user,
        )

        from schemas.orb_operational import (
            OrbOperationalAuditSummary,
            OrbOperationalBriefing,
            OrbOperationalContextCard,
            OrbOperationalContextStatus,
            OrbOperationalDraftAction,
            OrbOperationalEvidenceItem,
            OrbOperationalFollowUpAction,
            OrbOperationalRecommendation,
            OrbOperationalReviewPrompt,
        )

        draft_response = OrbOperationalResponse(
            answer=answer,
            intelligence_output=intelligence_output,
            context_summary=context_summary,
            sources=sources,
            citations=citations,
            evaluation=evaluation,
            model_routing=routing_meta,
            permissions=permissions_model,
            boundaries=boundaries,
            warnings=warnings,
            audit_reference=audit_reference,
            os_linked=True,
            care_record_access=bool(permissions_model.care_record_access),
            standalone_only=False,
            permissioned_context=True,
            context_cards=[OrbOperationalContextCard.model_validate(c) for c in enriched["context_cards"]],
            evidence_items=[OrbOperationalEvidenceItem.model_validate(e) for e in enriched["evidence_items"]],
            recommendations=[
                OrbOperationalRecommendation.model_validate(r) for r in enriched["recommendations"]
            ],
            draft_actions=[OrbOperationalDraftAction.model_validate(d) for d in enriched["draft_actions"]],
            review_prompts=[OrbOperationalReviewPrompt.model_validate(p) for p in enriched["review_prompts"]],
            audit_summary=OrbOperationalAuditSummary.model_validate(enriched["audit_summary"]),
            context_status=OrbOperationalContextStatus.model_validate(enriched["context_status"]),
            follow_up_actions=[
                OrbOperationalFollowUpAction.model_validate(f) for f in enriched["follow_up_actions"]
            ],
            briefing=OrbOperationalBriefing.model_validate(enriched["briefing"])
            if enriched.get("briefing")
            else None,
            save_available=bool(enriched.get("save_available")),
            action_creation_available=bool(enriched.get("action_creation_available", True)),
        )

        from services.orb_operational_output_service import orb_operational_output_service

        save_hints = orb_operational_output_service.build_save_hints(draft_response, request)
        draft_response.save_available = save_hints.save_available
        draft_response.suggested_output_type = save_hints.suggested_output_type
        draft_response.suggested_title = save_hints.suggested_title
        draft_response.suggested_tags = save_hints.suggested_tags

        if request.save_output:
            try:
                record = orb_operational_output_service.save_from_operational_response(
                    draft_response,
                    request,
                    current_user,
                    output_type=request.output_type,
                    visibility=request.visibility,
                    tags=request.tags or save_hints.suggested_tags,
                    title=request.output_title,
                    conn=conn,
                )
                draft_response.operational_output = OrbOperationalOutputSaveContext(
                    available=True,
                    saved=True,
                    output_id=record.id,
                    type=record.type,
                    review_status=record.review_status,
                    visibility=record.visibility,
                )
                if draft_response.briefing:
                    draft_response.briefing.saved_as_output_id = record.id
            except Exception as exc:
                logger.warning("Operational output save failed: %s", exc)
                draft_response.operational_output = OrbOperationalOutputSaveContext(
                    available=True,
                    saved=False,
                )
                draft_response.warnings = list(draft_response.warnings or []) + [
                    "Could not persist operational output; try Save briefing again."
                ]

        return draft_response

    def build_operational_prompt(self, request: OrbOperationalRequest, context: dict[str, Any]) -> str:
        summary = orb_operational_context_bridge.summarise_context(context)
        lines = [
            f"Mode: {request.mode}",
            f"Scope: {request.scope}",
            f"User question: {request.message}",
            "",
            "Permissioned context summary (do not go beyond this):",
        ]
        for key, value in summary.items():
            if isinstance(value, list) and value:
                lines.append(f"- {key}: " + "; ".join(_text(v) for v in value[:8]))
            elif value not in (None, "", [], {}):
                lines.append(f"- {key}: {value}")
        lines.append("")
        lines.append("Respond with practical next steps, source-labelled reasoning, and manager-review caveats where needed.")
        return "\n".join(lines)

    def build_sources(self, context: dict[str, Any]) -> list[OrbOperationalSource]:
        items: list[OrbOperationalSource] = []
        for raw in orb_operational_context_bridge.safe_context_sources(context):
            items.append(
                OrbOperationalSource(
                    label=_text(raw.get("label"), "Operational source"),
                    source_type=_text(raw.get("source_type"), "summary"),
                    basis=_text(raw.get("basis")) or None,
                    route=raw.get("route"),
                    excerpt=None,
                )
            )
        if not items:
            items.append(
                OrbOperationalSource(
                    label="Permissioned OS context",
                    source_type="operational_boundary",
                    basis="Summary-level operational context for your role",
                )
            )
        return items[:12]

    def build_citations(self, sources: list[OrbOperationalSource]) -> list[dict[str, Any]]:
        citations: list[dict[str, Any]] = []
        for index, source in enumerate(sources, start=1):
            citations.append(
                {
                    "citation_ref": f"[{index}]",
                    "label": source.label,
                    "source_type": source.source_type,
                    "basis": source.basis,
                    "route": source.route,
                }
            )
        return citations

    def build_model_request(
        self,
        request: OrbOperationalRequest,
        prompt: str,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        _ = context
        return {
            "system_prompt": OPERATIONAL_SYSTEM_PROMPT,
            "user_prompt": prompt,
            "surface": "operational_os",
            "mode": request.mode,
        }

    def fallback_answer(self, request: OrbOperationalRequest, error: str | None) -> str:
        mode_hint = self._mode_label(request.mode)
        return (
            f"I could not complete a full {mode_hint} answer just now ({_text(error, 'service unavailable')}). "
            "Operational context may be temporarily unavailable. "
            "Please review source records in Care Hub, Intelligence Spine or Intelligence Actions, "
            "and apply registered manager judgement before acting."
        )

    def apply_safety_boundaries(
        self,
        answer: str,
        request: OrbOperationalRequest,
        context: dict[str, Any],
    ) -> str:
        _ = request
        summary = context.get("summary")
        if hasattr(summary, "unavailable") and summary.unavailable:
            prefix = (
                "Operational context is temporarily unavailable. "
                "The following is cautious general guidance only:\n\n"
            )
            if not answer.startswith(prefix[:20]):
                answer = prefix + answer
        if "grade" not in answer.lower() and request.mode == "ofsted_evidence_review":
            answer += (
                "\n\nThis is evidence-focused preparation only — ORB does not predict Ofsted grades."
            )
        if request.mode == "safeguarding_themes" and "manager review" not in answer.lower():
            answer += "\n\nEscalate safeguarding concerns through your local policy and manager review."
        return answer

    def evaluate_answer(
        self,
        answer: str,
        request: OrbOperationalRequest,
        context: dict[str, Any],
    ) -> dict[str, Any] | None:
        sources = orb_operational_context_bridge.safe_context_sources(context)
        eval_request = OrbEvaluationRequest(
            answer_text=answer,
            mode=self._mode_label(request.mode),
            sources=sources,
            citations=self.build_citations(
                [OrbOperationalSource.model_validate(s) for s in sources if isinstance(s, dict)]
            )
            if sources
            else [],
            requires_citations=bool(sources),
            requires_action_plan=request.mode == "action_priority",
        )
        try:
            result = orb_evaluation_service.evaluate_answer(eval_request)
            payload = result.model_dump()
            payload["operational_os"] = True
            payload["permissioned_context"] = True
            return payload
        except Exception:
            return None

    def _safety_boundaries(
        self,
        request: OrbOperationalRequest,
        summary: OrbOperationalContextSummary,
    ) -> OrbOperationalSafetyBoundary:
        manager_review = request.require_manager_review or bool(
            summary.safeguarding_signals or summary.attention_items
        )
        return OrbOperationalSafetyBoundary(
            manager_review_required=manager_review,
            notices=list(OPERATIONAL_BOUNDARY_NOTICES),
        )

    def _mode_label(self, mode: str) -> str:
        return mode.replace("_", " ").strip().title()


orb_operational_assistant_service = OrbOperationalAssistantService()
