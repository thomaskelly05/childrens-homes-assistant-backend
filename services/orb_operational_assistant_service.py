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
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime
from services.orb_universal_evidence_service import orb_universal_evidence_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence

logger = logging.getLogger("indicare.orb_operational_assistant")

OPERATIONAL_SYSTEM_PROMPT = """
You are ORB inside IndiCare OS.

You use the same residential children's homes specialist brain as standalone ORB, but with permissioned IndiCare OS records, plans, chronology, actions, governance and evidence where authorised.

Your job is to answer questions about young people, homes and provider oversight using the permissioned IndiCare OS context supplied by the backend.

Rules:
- Use only the source-labelled OS context, evidence snippets, counts and summaries provided in the request.
- Apply the ORB standalone residential-care brain: Ofsted/SCCIF lens, Quality Standards, Reg 44/Reg 45 thinking, safeguarding-aware reflection, therapeutic recording, manager oversight and child-centred practice.
- Do not claim you checked records, documents, appointments, plans or chronology unless those sources are present in the context.
- If the evidence is missing, unclear or unavailable, say exactly what is missing and what source area the adult should check.
- Prefer a direct answer first, then explain the evidence and any limitations.
- For questions such as dates, reviews, dentist appointments, medication, contact, missing episodes, school, incidents or sign-off, answer from the latest relevant source label and date when present.
- You may help draft Reg 44 visit preparation, Reg 45 quality-of-care review sections, evidence summaries, improvement actions and manager reflections from the available OS evidence.
- Do not make final safeguarding, legal or inspection decisions.
- Do not predict Ofsted grades.
- Provide manager-review caveats where safeguarding, incidents, risk, restraint, medication, missing episodes or inspection evidence are discussed.
- Use British English. Be clear, practical, child-centred and evidence-focused.
- Write for adults in Ofsted-regulated children’s homes: supportive, calm, accountable and not punitive.
""".strip()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _compact_source_line(source: Any, index: int) -> str:
    if hasattr(source, "model_dump"):
        raw = source.model_dump()
    elif isinstance(source, dict):
        raw = source
    else:
        return _text(source)[:420]
    label = _text(raw.get("label") or raw.get("title"), "Operational source")
    source_type = _text(raw.get("source_type") or raw.get("type"), "summary")
    date = _text(raw.get("date") or raw.get("created_at") or raw.get("updated_at") or raw.get("occurred_at"))
    basis = _text(raw.get("basis") or raw.get("summary") or raw.get("excerpt") or raw.get("safe_excerpt"), "Source available")
    route = _text(raw.get("route") or raw.get("route_hint"))
    parts = [f"[{index}] {label}", f"type={source_type}"]
    if date:
        parts.append(f"date={date}")
    if route:
        parts.append(f"route={route}")
    parts.append(f"evidence={basis[:520]}")
    return " | ".join(parts)


class OrbOperationalAssistantService:
    """Answer operational OS ORB queries — OS evidence plus the same ORB brain as standalone."""

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

        if conn is not None:
            try:
                universal = orb_universal_evidence_service.collect(
                    conn,
                    current_user=current_user,
                    scope=request.scope,
                    message=request.message,
                    young_person_id=request.child_id,
                    home_id=request.home_id,
                    provider_id=permissions_model.provider_id,
                )
                universal_items = list(universal.get("items") or [])
                if universal_items:
                    existing = list(context_bundle.get("sources") or [])
                    context_bundle["sources"] = [*universal_items, *existing]
                    context_bundle["universal_evidence"] = universal
                    context_bundle["raw_available"] = True
                    if isinstance(context_summary.summary_lines, list):
                        context_summary.summary_lines.append(
                            f"ORB universal evidence collector returned {len(universal_items)} source-labelled item(s) across {universal.get('surface_count', 0)} source type(s)."
                        )
                if universal.get("errors"):
                    warnings.append("Some ORB evidence surfaces were unavailable; answer uses the evidence returned.")
            except Exception as exc:
                logger.warning("Universal ORB evidence collection failed: %s", exc)
                warnings.append("Universal ORB evidence collection was partially unavailable.")

        boundaries = self._safety_boundaries(request, context_summary)
        sources = self.build_sources(context_bundle)
        citations = self.build_citations(sources)
        standalone_mode = self._standalone_mode_for_request(request)
        retrieval_bundle = orb_knowledge_retrieval_service.prepare_request_bundle(
            request.message,
            mode=standalone_mode,
        )
        indicare_intelligence = retrieval_bundle.get("indicare_intelligence") or {}

        from services.ai_privacy_guard_service import ai_privacy_guard_service

        privacy_guard = ai_privacy_guard_service.guard_operational_context(
            context_bundle,
            action="send_to_model",
            mode=request.mode,
            home_id=request.home_id,
            child_id=request.child_id,
            staff_id=request.staff_id,
            message=request.message,
            current_user=current_user,
            conn=conn,
        )
        privacy_summary = ai_privacy_guard_service.to_operational_summary(privacy_guard)

        if not privacy_guard.allowed or not privacy_guard.model_send_allowed:
            denial = "This request needs permissioned OS context that is not available for your role or current scope."
            answer = denial
            routing_meta = {"privacy_guard": "denied", "audit_event_id": privacy_guard.audit_event_id}
            warnings = list(warnings) + list(privacy_guard.warnings) + ["Privacy guard applied — model call skipped."]
        else:
            try:
                safe_bundle = dict(context_bundle)
                safe_bundle["privacy_safe_context"] = privacy_guard.safe_context
                safe_bundle["orb_sources"] = [s.model_dump() for s in sources]
                safe_bundle["indicare_intelligence"] = indicare_intelligence
                safe_bundle["retrieval_bundle"] = retrieval_bundle
                prompt = self.build_operational_prompt(request, safe_bundle)
                model_request = self.build_model_request(request, prompt, safe_bundle)
                response, decision, trace = await ai_model_router_service.complete_with_routing(
                    message=f"{request.message}\n\nUse the source-labelled IndiCare OS evidence in the system prompt. If the answer is not evidenced, say what is missing.",
                    system_prompt=model_request["system_prompt"],
                    mode=self._mode_label(request.mode),
                    retrieval_context={
                        "operational_context": privacy_guard.safe_context,
                        "sources": [s.model_dump() for s in sources],
                        "summary_level_only": True,
                        "answer_must_be_source_grounded": True,
                    },
                    detail_level="balanced",
                    surface="operational_os",
                )
                routing_meta = ai_model_router_service.routing_metadata_for_context(
                    decision, trace, response=response
                )
                routing_meta["privacy_guard"] = privacy_summary.model_dump()
                routing_meta["standalone_brain"] = orb_standalone_brain_service.context_payload(request.message, mode=self._standalone_mode_for_request(request))
                answer = _text(response.text)
                if not answer:
                    answer = self.fallback_answer(request, response.error or "empty_response")
            except Exception as exc:
                logger.warning("Operational ORB model routing failed: %s", exc)
                routing_meta = {"error": str(exc), "privacy_guard": privacy_summary.model_dump()}
                answer = self.fallback_answer(request, str(exc))

            guard_notes: list[str] = []
            if privacy_guard.redaction_applied:
                guard_notes.append("Redaction applied")
            if privacy_guard.minimisation_applied:
                guard_notes.append("Summary-level context")
            guard_notes.append("Privacy guard applied")
            warnings = list(warnings) + guard_notes + list(privacy_guard.warnings)
            if privacy_guard.manager_review_required:
                boundaries.manager_review_required = True
                warnings.append("Manager review required before acting on safeguarding-related content.")

        answer = self.apply_safety_boundaries(answer, request, context_bundle)
        intelligence_meta: dict[str, Any] = {}
        if indicare_intelligence:
            answer, intelligence_meta = finalize_standalone_intelligence(
                indicare_intelligence=indicare_intelligence,
                answer=answer,
                prompt_text=request.message,
                message=request.message,
                mode=standalone_mode,
                record_learning=True,
                apply_gate_fixes=False,
            )
            routing_meta = dict(routing_meta or {})
            routing_meta["indicare_intelligence"] = intelligence_meta.get("indicare_intelligence")
            routing_meta["indicare_intelligence_core"] = intelligence_meta.get("indicare_intelligence_core")
            routing_meta["answer_quality_gate"] = intelligence_meta.get("answer_quality_gate")
            routing_meta["learning_ledger"] = intelligence_meta.get("learning_ledger")
        evaluation = self.evaluate_answer(answer, request, context_bundle)

        intelligence_output = orb_intelligence_output_service.from_operational_answer(
            title=self._mode_label(request.mode),
            summary=context_summary.headline or answer.split("\n", 1)[0][:220],
            answer_text=answer,
            sources=[s.model_dump() for s in sources],
            citations=citations,
        )
        intelligence_output.boundaries = orb_intelligence_output_service.build_safety_boundaries(surface="operational_os_orb")
        intelligence_output.boundaries.standalone_only = False
        intelligence_output.boundaries.os_linked = True
        intelligence_output.boundaries.care_record_access = bool(permissions_model.care_record_access)
        intelligence_output.boundaries.notice = OPERATIONAL_BOUNDARY_NOTICES[0]
        intelligence_output.standalone_only = False
        intelligence_output.os_linked = True
        intelligence_output.care_record_access = bool(permissions_model.care_record_access)
        intelligence_output.model_routing = routing_meta
        if evaluation:
            intelligence_output = orb_intelligence_output_service.attach_evaluation(intelligence_output, evaluation)

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
            recommendations=[OrbOperationalRecommendation.model_validate(r) for r in enriched["recommendations"]],
            draft_actions=[OrbOperationalDraftAction.model_validate(d) for d in enriched["draft_actions"]],
            review_prompts=[OrbOperationalReviewPrompt.model_validate(p) for p in enriched["review_prompts"]],
            audit_summary=OrbOperationalAuditSummary.model_validate(enriched["audit_summary"]),
            context_status=OrbOperationalContextStatus.model_validate(enriched["context_status"]),
            follow_up_actions=[OrbOperationalFollowUpAction.model_validate(f) for f in enriched["follow_up_actions"]],
            briefing=OrbOperationalBriefing.model_validate(enriched["briefing"]) if enriched.get("briefing") else None,
            save_available=bool(enriched.get("save_available")),
            action_creation_available=bool(enriched.get("action_creation_available", True)),
            privacy_guard=privacy_summary,
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
                draft_response.operational_output = OrbOperationalOutputSaveContext(available=True, saved=False)
                draft_response.warnings = list(draft_response.warnings or []) + ["Could not persist operational output; try Save briefing again."]

        try:
            from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service
            indicare_ai_governance_event_service.record_from_operational_response(draft_response, current_user=current_user, conn=conn)
        except Exception:
            pass

        return draft_response

    def _standalone_mode_for_request(self, request: OrbOperationalRequest) -> str:
        message = request.message.lower()
        if request.mode in {"ofsted_evidence_review", "governance_briefing"} or any(term in message for term in ("reg 44", "reg 45", "reg44", "reg45", "ofsted", "sccif", "quality standard")):
            return "Reg 44 / Reg 45 Prep"
        if request.mode == "record_quality_review" or any(term in message for term in ("record", "write", "wording")):
            return "Record This Properly"
        if request.mode == "safeguarding_themes" or any(term in message for term in ("safeguarding", "risk", "missing", "incident")):
            return "Safeguarding Thinking"
        if request.mode == "staff_support":
            return "Staff Coach"
        if request.mode in {"manager_daily_brief", "action_priority", "governance_briefing"}:
            return "Manager Copilot"
        return "Ask ORB"

    def build_operational_prompt(self, request: OrbOperationalRequest, context: dict[str, Any]) -> str:
        if context.get("privacy_safe_context"):
            summary = dict(context.get("privacy_safe_context") or {})
        else:
            summary = orb_operational_context_bridge.summarise_context(context)
        standalone_mode = self._standalone_mode_for_request(request)
        indicare_intelligence = context.get("indicare_intelligence") or {}
        intelligence_block = str(indicare_intelligence.get("prompt_block") or "").strip()
        standalone_brain_block = orb_standalone_brain_service.build_prompt_block(request.message, mode=standalone_mode)
        shared_runtime_block = shared_institutional_cognition_runtime.prompt_addendum(
            surface="operational_orb",
            message=request.message,
            mode=standalone_mode,
            history=None,
        )
        lines = [
            f"Mode: {request.mode}",
            f"Standalone ORB brain mode: {standalone_mode}",
            f"Scope: {request.scope}",
            f"User question: {request.message}",
            "",
            "Same-brain instruction:",
            "- Use the exact same residential-specialist thinking frame as standalone ORB, shown below.",
            "- Then ground the answer only in the OS evidence supplied below.",
            "- If the standalone brain suggests an inspection/governance lens, translate that into practical OS evidence, actions, records and review prompts.",
            "",
            standalone_brain_block,
            "",
            shared_runtime_block,
        ]
        if intelligence_block:
            lines.extend(
                [
                    "",
                    "IndiCare Intelligence Core (permission-scoped OS path):",
                    intelligence_block,
                ]
            )
        lines.extend(
            [
            "",
            "OS answer contract:",
            "- Answer the question directly from the evidence below where possible.",
            "- Refer to sources by their bracket numbers, for example [1] or [2].",
            "- If the evidence does not answer the question, say: I cannot evidence that from the available records.",
            "- Then say which area to check next: records, documents, chronology, appointments, plans, actions, home oversight or provider oversight.",
            "- For Reg 44/Reg 45 requests, structure the answer as: evidence seen, evidence gaps, impact on children, leadership action, questions for visitor/RM, and draft improvement actions.",
            ]
        )
        if request.form_id or request.recording_type:
            lines.append("")
            lines.append("Recording workspace context (summary only — no full draft body):")
            if request.form_id:
                lines.append(f"- form_id: {request.form_id}")
            if request.form_title:
                lines.append(f"- form_title: {request.form_title}")
            if request.recording_type:
                lines.append(f"- recording_type: {request.recording_type}")
            if request.high_level_flags:
                lines.append(f"- high_level_flags: {', '.join(request.high_level_flags[:8])}")
            if request.selected_excerpt:
                lines.append(f"- selected_excerpt (adult-provided): {request.selected_excerpt[:500]}")
        lines.extend(["", "Permissioned context summary:"])
        for key, value in summary.items():
            if key in {"sources", "citations"}:
                continue
            if isinstance(value, list) and value:
                lines.append(f"- {key}: " + "; ".join(_text(v) for v in value[:8]))
            elif value not in (None, "", [], {}):
                lines.append(f"- {key}: {value}")

        source_payload = context.get("orb_sources") or summary.get("sources") or context.get("sources") or []
        if source_payload:
            lines.append("")
            lines.append("Source-labelled evidence available to ORB:")
            for index, source in enumerate(source_payload[:12], start=1):
                line = _compact_source_line(source, index)
                if line:
                    lines.append(f"- {line}")
        else:
            lines.append("")
            lines.append("Source-labelled evidence available to ORB: none returned for this scope/question.")

        lines.append("")
        lines.append("Respond with: direct answer, evidence used, limitations/missing information, and safe next step where appropriate.")
        return "\n".join(lines)

    def build_sources(self, context: dict[str, Any]) -> list[OrbOperationalSource]:
        items: list[OrbOperationalSource] = []
        for raw in orb_operational_context_bridge.safe_context_sources(context):
            items.append(
                OrbOperationalSource(
                    label=_text(raw.get("label") or raw.get("title"), "Operational source"),
                    source_type=_text(raw.get("source_type"), "summary"),
                    basis=_text(raw.get("basis") or raw.get("summary")) or None,
                    route=raw.get("route"),
                    excerpt=_text(raw.get("excerpt") or raw.get("safe_excerpt")) or None,
                )
            )
        if not items:
            items.append(OrbOperationalSource(label="Permissioned OS context", source_type="operational_boundary", basis="Summary-level operational context for your role"))
        return items[:12]

    def build_citations(self, sources: list[OrbOperationalSource]) -> list[dict[str, Any]]:
        citations: list[dict[str, Any]] = []
        for index, source in enumerate(sources, start=1):
            citations.append({"citation_ref": f"[{index}]", "label": source.label, "source_type": source.source_type, "basis": source.basis, "route": source.route})
        return citations

    def build_model_request(self, request: OrbOperationalRequest, prompt: str, context: dict[str, Any]) -> dict[str, Any]:
        _ = context
        return {"system_prompt": f"{OPERATIONAL_SYSTEM_PROMPT}\n\n{prompt}", "user_prompt": prompt, "surface": "operational_os", "mode": request.mode}

    def fallback_answer(self, request: OrbOperationalRequest, error: str | None) -> str:
        mode_hint = self._mode_label(request.mode)
        return (
            f"I could not complete a full {mode_hint} answer just now ({_text(error, 'service unavailable')}). "
            "Operational context may be temporarily unavailable. Please review the relevant source records and apply registered manager judgement before acting."
        )

    def apply_safety_boundaries(self, answer: str, request: OrbOperationalRequest, context: dict[str, Any]) -> str:
        summary = context.get("summary")
        if hasattr(summary, "unavailable") and summary.unavailable:
            prefix = "Operational context is temporarily unavailable. The following is cautious general guidance only:\n\n"
            if not answer.startswith(prefix[:20]):
                answer = prefix + answer
        if "grade" not in answer.lower() and request.mode == "ofsted_evidence_review":
            answer += "\n\nThis is evidence-focused preparation only — ORB does not predict Ofsted grades."
        if request.mode == "safeguarding_themes" and "manager review" not in answer.lower():
            answer += "\n\nEscalate safeguarding concerns through your local policy and manager review."
        if request.mode == "recording_live_coach":
            answer += "\n\nORB supports recording quality only. Adults remain responsible for the final record. Do not auto-submit or alter records without explicit adult action."
        return answer

    def evaluate_answer(self, answer: str, request: OrbOperationalRequest, context: dict[str, Any]) -> dict[str, Any] | None:
        sources = orb_operational_context_bridge.safe_context_sources(context)
        eval_request = OrbEvaluationRequest(
            answer_text=answer,
            mode=self._mode_label(request.mode),
            sources=sources,
            citations=self.build_citations([OrbOperationalSource.model_validate(s) for s in sources if isinstance(s, dict)]) if sources else [],
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

    def _safety_boundaries(self, request: OrbOperationalRequest, summary: OrbOperationalContextSummary) -> OrbOperationalSafetyBoundary:
        manager_review = request.require_manager_review or bool(summary.safeguarding_signals or summary.attention_items)
        return OrbOperationalSafetyBoundary(manager_review_required=manager_review, notices=list(OPERATIONAL_BOUNDARY_NOTICES))

    def _mode_label(self, mode: str) -> str:
        return mode.replace("_", " ").strip().title()


orb_operational_assistant_service = OrbOperationalAssistantService()
