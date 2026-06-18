"""ORB Dictate — voice-to-recording companion service for ORB Residential."""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import uuid4

from core.policy_engine import policy_engine
from db.ai_note_versions_db import ensure_ai_note_versions_table, insert_ai_note_version
from db.ai_notes_db import ensure_ai_meetings_table, insert_ai_meeting_note, update_ai_meeting_note
from db.connection import get_db_connection, release_db_connection
from schemas.orb_dictate import (
    OrbDictateAnalyzeRequest,
    OrbDictateAnalyzeResponse,
    OrbDictateBrainSuggestion,
    OrbDictateFinaliseRequest,
    OrbDictateFinaliseResponse,
    OrbDictateGenerateRequest,
    OrbDictateGenerateResponse,
    OrbDictateNotePatch,
    OrbDictateNoteSummary,
    OrbDictatePrepareWriteRequest,
    OrbDictatePrepareWriteResponse,
    OrbDictateSaveRequest,
    OrbDictateSaveResponse,
)
from services.orb_dictate_action_points import normalize_structured_actions
from services.orb_dictate_quality import MULTI_PERSON_NOTE_TYPES, compute_quality_checks
from services.orb_dictate_speaker import (
    SPEAKER_BOUNDARY_COPY,
    build_speaker_summary,
    build_speakers_from_segments,
    segments_to_plain_text,
    suggest_participants_from_text,
    text_to_segments,
)
from schemas.orb_saved_outputs import OrbSavedOutputCreate
from services.ai_note_export_service import create_docx_export, create_pdf_export, safe_filename
from services.ai_notes_service import transcribe_audio
from services.orb_dictate_template_registry import get_dictate_template, list_dictate_templates
from services.orb_recording_framework_service import (
    build_structured_write_body,
    document_title_for_record_type,
    framework_missing_checks,
    orb_checks_summary,
    recording_quality_guidance,
    resolve_record_type,
    structure_document_body,
    suggested_output_labels,
)
from services.orb_saved_output_service import orb_saved_output_service
from services.orb_brain_metadata_service import build_brain_metadata
from services.orb_document_brain_adapter_service import orb_document_brain_adapter_service
from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.indicare_intelligence_route_finalize_service import intelligence_context_summary
from services.orb_residential_quality_service import orb_residential_quality_service
from services.orb_recording_contract_service import build_safe_incident_report_scaffold
from services.orb_prompt_registry import orb_prompt_registry
from services.orb_unified_brain_gateway import orb_unified_brain_gateway

logger = logging.getLogger("indicare.orb_dictate")

STANDALONE_BOUNDARY = (
    "ORB Dictate creates draft wording for adult review. "
    "It does not submit to IndiCare OS or any care record unless you use an approved connected workflow."
)

GOVERNANCE_NOTICE = (
    "ORB Dictate helps create draft wording. Adults must review, edit and approve before using it as a formal record."
)

MODE_TO_NOTE_TYPE: dict[str, str] = {
    "rough_note": "daily_record",
    "team_meeting": "team_meeting",
    "staff_debrief": "staff_debrief",
    "investigation_meeting": "investigation_meeting",
    "reflective_supervision": "supervision_reflection",
    "strategy_multi_agency_prep": "strategy_multi_agency_prep",
    "handover": "handover_note",
}

MULTI_PERSON_MODES = frozenset(
    {
        "team_meeting",
        "staff_debrief",
        "investigation_meeting",
        "reflective_supervision",
        "strategy_multi_agency_prep",
        "handover",
    }
)


def _dictate_brain_metadata(
    *,
    note_type: str,
    mode: str | None = None,
    transcript_text: str = "",
    feature: str = "dictate",
    intelligence_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ctx = orb_document_brain_adapter_service.build_document_brain_context(
        transcript_text or "dictate recording",
        mode=mode or note_type,
        feature=feature,  # type: ignore[arg-type]
        note_type=note_type,
    )
    meta = dict(ctx["brain_metadata"])
    meta["feature"] = feature if feature.startswith("dictate") else meta.get("feature", feature)
    meta["output_type"] = note_type
    meta["indicare_intelligence_core"] = ctx["intelligence_summary"]
    meta["brain_adapter"] = ctx["adapter"]
    if intelligence_meta:
        meta.update({k: v for k, v in intelligence_meta.items() if k not in meta})
    return meta


def _finalize_dictate_text(
    *,
    text: str,
    note_type: str,
    mode: str | None = None,
    intel_packet: dict[str, Any] | None = None,
    source_text: str | None = None,
) -> tuple[str, dict[str, Any]]:
    user_input = (source_text or text).strip()
    packet = intel_packet or indicare_intelligence_core_service.build_intelligence_packet(
        user_input,
        mode=mode or note_type,
    )
    return orb_document_brain_adapter_service.finalize_document_intelligence(
        indicare_intelligence=packet,
        document_text=text,
        source_text=user_input,
        mode=mode or note_type,
        note_type=note_type,
        record_learning=False,
    )


def _resolve_note_type(request: OrbDictateGenerateRequest) -> str:
    if request.mode and request.mode in MODE_TO_NOTE_TYPE:
        return MODE_TO_NOTE_TYPE[request.mode]
    return request.note_type


def _requires_consent(request: OrbDictateGenerateRequest, note_type: str) -> bool:
    mode = request.mode or ""
    if mode in MULTI_PERSON_MODES:
        return True
    return note_type in MULTI_PERSON_NOTE_TYPES


def _truncate(text: str, max_len: int = 120_000) -> str:
    return (text or "").strip()[:max_len]


def _enrich_meeting_metadata(
    response: OrbDictateGenerateResponse,
    *,
    parsed_actions: list[dict] | None = None,
) -> OrbDictateGenerateResponse:
    speakers = build_speakers_from_segments(response.segments, response.participants)
    structured = normalize_structured_actions(
        parsed_actions,
        fallback_strings=response.actions,
        segments=response.segments,
    )
    return response.model_copy(
        update={
            "speakers": speakers,
            "structured_actions": structured,
            "speaker_summary": build_speaker_summary(response.participants, response.segments),
            "speaker_boundary_notice": SPEAKER_BOUNDARY_COPY,
        }
    )


def _fallback_generate(request: OrbDictateGenerateRequest) -> OrbDictateGenerateResponse:
    note_type = _resolve_note_type(request)
    template = get_dictate_template(note_type)  # type: ignore[arg-type]
    transcript = _truncate(request.input_text)
    if note_type == "incident_record":
        professional = build_safe_incident_report_scaffold(transcript)
    else:
        section_lines = []
        for section in template.sections:
            section_lines.append(f"## {section.title}\n\n[Add detail from your dictation]\n")
        professional = (
            f"# {template.export_label}\n\n"
            f"*Draft generated from your input — please review and edit before use.*\n\n"
            f"## Source material\n\n{transcript}\n\n"
            + "\n".join(section_lines)
        )
    summary = f"Draft {template.title.lower()} prepared for review. Check child voice, safeguarding and manager oversight before use."
    actions: list[str] = []
    if request.include_actions:
        actions = ["Review draft wording", "Add times and names", "Confirm manager oversight if required"]
    participants = list(request.participants)
    segments = list(request.segments)
    if not segments:
        segments = text_to_segments(transcript, source=request.source, participants=participants)
    if not participants:
        participants = suggest_participants_from_text(transcript)
    quality = compute_quality_checks(professional, note_type)
    ofsted = None
    if request.include_ofsted_lens:
        ofsted = (
            "Inspection lens: link observable practice to child impact and Quality Standards evidence. "
            "This is preparation support only — not a regulatory judgement."
        )
    return _enrich_meeting_metadata(
        OrbDictateGenerateResponse(
        title=template.export_label,
        note_type=note_type,  # type: ignore[arg-type]
        professional_note=professional,
        summary=summary,
        actions=actions,
        transcript=transcript,
        ofsted_lens=ofsted,
        quality_checks=quality,
        standalone_boundary=STANDALONE_BOUNDARY,
        governance_notice=GOVERNANCE_NOTICE,
        participants=participants,
        segments=segments,
        speaker_summary=build_speaker_summary(participants, segments),
        speaker_boundary_notice=SPEAKER_BOUNDARY_COPY,
        brain_metadata=_dictate_brain_metadata(
            note_type=note_type,
            mode=request.mode,
            transcript_text=transcript,
        ),
    )
    )


def _build_generate_prompt(request: OrbDictateGenerateRequest, note_type: str) -> tuple[str, str]:
    bundle = orb_prompt_registry.build_dictate_generate_prompt(request, note_type)
    return bundle.system, bundle.user


def generate_dictate_note(
    request: OrbDictateGenerateRequest,
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
) -> OrbDictateGenerateResponse:
    note_type = _resolve_note_type(request)
    if request.source in {"dictation", "orb_voice", "upload"} and request.conversation_consent_confirmed is False:
        raise ValueError("Conversation or debrief recording requires consent confirmation.")
    if _requires_consent(request, note_type) and request.consent_confirmed is not True:
        raise ValueError(
            "Multi-person meeting, debrief or investigation modes require consent confirmation."
        )
    if note_type == "investigation_meeting" and request.investigation_boundary_confirmed is not True:
        raise ValueError(
            "Investigation meeting mode requires confirmation that ORB Dictate must not make findings "
            "unless explicitly agreed and recorded."
        )

    participants = list(request.participants)
    segments = list(request.segments)
    if not segments:
        segments = text_to_segments(
            request.input_text,
            source=request.source,
            participants=participants,
        )
    if not participants:
        participants = suggest_participants_from_text(request.input_text)

    transcript_text = segments_to_plain_text(segments) if segments else _truncate(request.input_text)
    unified = orb_unified_brain_gateway.generate_dictate_draft(
        request,
        note_type=note_type,
        transcript_text=transcript_text,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
    )
    if unified.blocked or not unified.text:
        req = request.model_copy(update={"participants": participants, "segments": segments})
        fallback = _fallback_generate(req)
        if unified.blocked and unified.brain_metadata:
            merged_meta = dict(unified.brain_metadata)
            merged_meta.update(fallback.brain_metadata or {})
            return fallback.model_copy(update={"brain_metadata": merged_meta})
        return fallback

    try:
        raw = unified.text or "{}"
        parsed = json.loads(raw)
    except Exception:
        logger.exception("ORB Dictate generation failed — using structured fallback")
        return _fallback_generate(request)

    template = get_dictate_template(note_type)  # type: ignore[arg-type]
    professional = _truncate(str(parsed.get("professional_note") or parsed.get("note") or ""), 80_000)
    if not professional:
        req = request.model_copy(update={"participants": participants, "segments": segments})
        return _fallback_generate(req)

    title = _truncate(str(parsed.get("title") or template.export_label), 200)
    summary = _truncate(str(parsed.get("summary") or ""), 4000)
    actions_raw = parsed.get("actions") or []
    actions = [str(a).strip() for a in actions_raw if str(a).strip()][:20]
    structured_raw = parsed.get("structured_actions")
    parsed_structured = structured_raw if isinstance(structured_raw, list) else None
    ofsted = parsed.get("ofsted_lens")
    ofsted_text = _truncate(str(ofsted), 4000) if ofsted else None
    if request.include_ofsted_lens and not ofsted_text:
        ofsted_text = (
            "Consider how this practice demonstrates child impact and evidence for inspection preparation. "
            "Review against your home's Quality Standards mapping."
        )

    intel_packet = indicare_intelligence_core_service.build_intelligence_packet(
        transcript_text or professional,
        mode=request.mode or note_type,
    )
    professional, intel_meta = _finalize_dictate_text(
        text=professional,
        note_type=note_type,
        mode=request.mode,
        intel_packet=intel_packet,
        source_text=transcript_text or request.input_text,
    )
    brain_metadata = dict(unified.brain_metadata or {})
    if intel_meta:
        brain_metadata.update({k: v for k, v in intel_meta.items() if k not in brain_metadata})
    quality = compute_quality_checks(professional, note_type)
    return _enrich_meeting_metadata(
        OrbDictateGenerateResponse(
        title=title,
        note_type=note_type,  # type: ignore[arg-type]
        professional_note=professional,
        summary=summary or f"Draft {template.title.lower()} for review.",
        actions=actions,
        transcript=transcript_text,
        ofsted_lens=ofsted_text if request.include_ofsted_lens else None,
        quality_checks=quality,
        standalone_boundary=STANDALONE_BOUNDARY,
        governance_notice=GOVERNANCE_NOTICE,
        participants=participants,
        segments=segments,
        speaker_summary=build_speaker_summary(participants, segments),
        speaker_boundary_notice=SPEAKER_BOUNDARY_COPY,
        brain_metadata=brain_metadata,
    ),
        parsed_actions=parsed_structured,
    )


async def transcribe_dictate_audio(file_path: str) -> dict[str, Any]:
    from services.orb_dictate_diarisation import (
        diarisation_confidence_warnings,
        map_diarisation_to_orb_transcript_segments,
    )

    result = await transcribe_audio(file_path)
    transcript = str(result.get("transcript") or result.get("text") or "").strip()
    raw_segments = result.get("segments") or []
    diarisation_warnings: list[str] = []
    has_provider_diarisation = False

    if raw_segments and any(
        isinstance(s, dict) and (s.get("speaker") or s.get("speaker_id")) for s in raw_segments
    ):
        segments, diarisation_warnings, has_provider_diarisation = map_diarisation_to_orb_transcript_segments(
            raw_segments,
            source="upload",
        )
        participants = suggest_participants_from_text(transcript)
    else:
        participants = suggest_participants_from_text(transcript)
        segments = text_to_segments(transcript, source="upload", participants=participants)

    diarisation_warnings.extend(diarisation_confidence_warnings(segments))
    payload: dict[str, Any] = {
        "transcript": transcript,
        "segments": [s.model_dump() for s in segments],
        "participants": [p.model_dump() for p in participants],
        "speaker_summary": build_speaker_summary(participants, segments).model_dump(),
        "speaker_boundary_notice": SPEAKER_BOUNDARY_COPY,
    }
    if diarisation_warnings:
        payload["diarisation_warnings"] = diarisation_warnings
    if has_provider_diarisation:
        payload["has_provider_diarisation"] = True
    return payload


def _user_can_access_os_ai_notes(user: dict[str, Any]) -> bool:
    return policy_engine.has_permission(user, "records:read")


def save_dictate_note(user: dict[str, Any], request: OrbDictateSaveRequest) -> OrbDictateSaveResponse:
    note_id = request.note_id or f"dictate_{uuid4().hex[:12]}"
    tags = list(request.tags or [])
    tags.extend(["orb-dictate", request.note_type])

    saved_output_id: str | None = None
    ai_note_id: int | None = None
    version_id: int | None = None

    content_md = (
        f"# {request.title}\n\n"
        f"{request.professional_note}\n\n"
        f"---\n\n"
        f"*ORB Dictate draft — review before formal use. Not submitted to IndiCare OS.*"
    )
    if request.summary:
        content_md = f"**Summary:** {request.summary}\n\n{content_md}"

    user_id = user.get("user_id") or user.get("id")
    try:
        if not user_id:
            raise ValueError("user_id required to save dictate output")
        uid = int(user_id)
        output = orb_saved_output_service.create_output(
            uid,
            OrbSavedOutputCreate(
                title=request.title,
                type="recording_rewrite",
                summary=request.summary or f"ORB Dictate · {request.note_type.replace('_', ' ')}",
                content_markdown=content_md,
                tags=tags,
                project_id=request.project_id,
                metadata={
                    "orb_dictate": True,
                    "note_type": request.note_type,
                    "note_id": note_id,
                    "transcript_stored": bool(request.transcript),
                },
                created_from="manual",
            )
        )
        saved_output_id = output.id
    except Exception:
        logger.exception("ORB Dictate saved output failed")

    if user_id and _user_can_access_os_ai_notes(user):
        try:
            conn = get_db_connection()
            try:
                ensure_ai_meetings_table(conn)
                ensure_ai_note_versions_table(conn)
                template_name = f"orb_dictate:{request.note_type}"
                if request.note_id and str(request.note_id).isdigit():
                    ai_note_id = int(request.note_id)
                    update_ai_meeting_note(
                        conn,
                        note_id=ai_note_id,
                        user_id=int(user_id),
                        transcript=request.transcript or "",
                        ai_draft=request.professional_note,
                        final_note=request.professional_note,
                        title=request.title,
                        template_name=template_name,
                    )
                else:
                    row = insert_ai_meeting_note(
                        conn,
                        user_id=int(user_id),
                        transcript=request.transcript or "",
                        ai_draft=request.professional_note,
                        final_note=request.professional_note,
                        title=request.title,
                        template_name=template_name,
                        note_status="draft",
                    )
                    ai_note_id = int(row["id"]) if row else None
                if ai_note_id and request.create_version:
                    version_row = insert_ai_note_version(
                        conn,
                        note_id=ai_note_id,
                        user_id=int(user_id),
                        title=request.title,
                        transcript=request.transcript or "",
                        ai_draft=request.professional_note,
                        final_note=request.professional_note,
                    )
                    version_id = int(version_row["id"]) if version_row else None
                conn.commit()
            finally:
                release_db_connection(conn)
        except Exception:
            logger.exception("ORB Dictate AI Notes convergence skipped")

    return OrbDictateSaveResponse(
        note_id=str(ai_note_id or note_id),
        saved_output_id=saved_output_id,
        ai_note_id=ai_note_id,
        version_id=version_id,
        standalone_boundary=STANDALONE_BOUNDARY,
        message="Saved for review. Not added to live care records.",
    )


def export_dictate_note(title: str, professional_note: str, fmt: str) -> tuple[str, str, str]:
    """Returns (file_path, filename, media_type)."""
    export_title = title or "ORB Dictate note"
    if fmt == "docx":
        path = create_docx_export(export_title, professional_note, template_name="ORB Dictate")
        filename = f"{safe_filename(export_title)}.docx"
        return path, filename, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if fmt == "pdf":
        path = create_pdf_export(export_title, professional_note, template_name="ORB Dictate")
        filename = f"{safe_filename(export_title)}.pdf"
        return path, filename, "application/pdf"
    raise ValueError("Unsupported export format")


def list_dictate_notes_for_user(user: dict[str, Any]) -> list[OrbDictateNoteSummary]:
    """List recent dictate artefacts from saved outputs."""
    items: list[OrbDictateNoteSummary] = []
    try:
        from schemas.orb_saved_outputs import OrbSavedOutputListRequest

        uid = user.get("user_id") or user.get("id")
        if not uid:
            return items
        result = orb_saved_output_service.list_outputs(
            int(uid),
            OrbSavedOutputListRequest(tag="orb-dictate", limit=50),
        )
        for row in result.items:
            items.append(
                OrbDictateNoteSummary(
                    note_id=row.id,
                    title=row.title,
                    note_type="daily_record",  # type: ignore[arg-type]
                    updated_at=row.updated_at,
                )
            )
    except Exception:
        logger.exception("list dictate notes failed")
    return items


def get_templates_payload() -> list[dict[str, Any]]:
    return [t.model_dump() for t in list_dictate_templates()]


QUALITY_LABELS: dict[str, str] = {
    "child_voice": "Child voice",
    "safeguarding": "Safeguarding",
    "manager_oversight": "Manager oversight",
    "impact": "Impact and outcome",
    "factual_clarity": "Factual clarity",
    "staff_response": "Staff response",
    "professional_curiosity": "Professional curiosity",
    "chronology_relevance": "Chronology relevance",
    "plan_risk_review": "Plan and risk review",
    "recording_tone": "Recording tone",
    "non_judgemental_language": "Non-judgemental language",
    "evidence_of_action": "Evidence of action",
    "follow_up_review_date": "Follow-up review date",
}


def _build_analysis_suggestions(quality: Any, note_type: str) -> tuple[list[str], list[OrbDictateBrainSuggestion]]:
    missing: list[str] = []
    suggestions: list[OrbDictateBrainSuggestion] = []
    checks = quality.model_dump() if hasattr(quality, "model_dump") else dict(quality)
    for key, value in checks.items():
        if key == "recording_quality":
            continue
        label = QUALITY_LABELS.get(key, key.replace("_", " "))
        if value in {"missing", "weak"}:
            missing.append(f"{label} — add detail before finalising")
            suggestions.append(
                OrbDictateBrainSuggestion(
                    id=f"suggest_{key}",
                    category="safeguarding" if key == "safeguarding" else "wording",
                    label=f"Strengthen {label.lower()}",
                    detail=f"Consider adding {label.lower()} based on what you observed.",
                )
            )
        elif value in {"review", "needs_review"}:
            suggestions.append(
                OrbDictateBrainSuggestion(
                    id=f"review_{key}",
                    category="wording",
                    label=f"Review {label.lower()}",
                    detail=f"{label} may need refinement — check accuracy before finalising.",
                )
            )
    return missing, suggestions


def analyze_dictate_session(request: OrbDictateAnalyzeRequest) -> OrbDictateAnalyzeResponse:
    """Session brain analysis via existing intelligence heuristics — no OS record access."""
    note_type = _resolve_note_type(
        OrbDictateGenerateRequest(
            input_text=request.input_text,
            note_type=request.note_type,
            mode=request.mode,
        )
    )
    transcript = _truncate(request.input_text)
    template = get_dictate_template(note_type)  # type: ignore[arg-type]
    record_type = resolve_record_type(
        record_type_id=request.record_type_id,
        template_id=request.template_id,
        note_type=note_type,
    )
    quality = compute_quality_checks(transcript, note_type)
    missing, suggestions = _build_analysis_suggestions(quality, note_type)

    framework_missing = framework_missing_checks(record_type, transcript)
    for item in framework_missing:
        if item not in missing:
            missing.append(item)

    for prompt in orb_residential_quality_service.build_missing_capture_prompts(quality, note_type=note_type):
        if prompt not in missing:
            missing.append(prompt)

    intel_packet = indicare_intelligence_core_service.build_intelligence_packet(
        transcript,
        mode=request.mode or note_type,
    )
    intel_summary = intelligence_context_summary(intel_packet)
    safeguarding: list[str] = []
    if quality.safeguarding in {"present", "good"}:
        safeguarding.append(
            "Safeguarding themes detected — ensure escalation and notifications are documented."
        )
    for check in record_type.get("safeguarding_checks", [])[:3]:
        if check not in safeguarding:
            safeguarding.append(check)

    child_voice_check = (
        "Child voice appears present — verify direct quotes are accurate."
        if quality.child_voice in {"present", "good"}
        else "Child voice not clearly present — consider adding what the young person said or communicated."
    )
    manager_note = None
    if quality.manager_oversight == "missing":
        manager_note = "Manager oversight not documented — add notification or review if required."
    elif record_type.get("manager_oversight_checks"):
        manager_note = str(record_type["manager_oversight_checks"][0])

    ofsted_check = None
    if intel_summary.get("gaps"):
        ofsted_check = (
            "Consider inspection evidence gaps identified in your transcript — link practice to child impact."
        )

    follow_up = list(record_type.get("suggested_follow_up_actions", []))[:4]
    if not follow_up:
        follow_up = ["Review transcript", "Confirm facts and times", "Finalise in ORB Write"]

    _, intel_meta = _finalize_dictate_text(
        text=transcript,
        note_type=note_type,
        mode=request.mode,
        intel_packet=intel_packet,
        source_text=transcript,
    )

    return OrbDictateAnalyzeResponse(
        detected_record_type=str(record_type.get("label", template.title)),
        record_type_id=str(record_type.get("id")),
        required_sections=list(record_type.get("required_sections", [])),
        orb_will_check=orb_checks_summary(record_type),
        safeguarding_concerns=safeguarding,
        missing_information=missing,
        professional_wording_suggestions=suggestions,
        recommended_next_actions=follow_up,
        possible_outputs=suggested_output_labels(str(record_type.get("id"))),
        recording_quality_score=quality.recording_quality,
        recording_quality_guidance=recording_quality_guidance(record_type),
        child_voice_check=child_voice_check,
        ofsted_evidence_check=ofsted_check,
        manager_oversight_note=manager_note,
        quality_checks=quality,
        standalone_boundary=STANDALONE_BOUNDARY,
        brain_metadata=_dictate_brain_metadata(
            note_type=note_type,
            mode=request.mode,
            transcript_text=transcript,
            feature="dictate_analyze",
            intelligence_meta=intel_meta,
        ),
    )


REVIEW_REQUIRED_STATEMENT = (
    "This document requires adult review before saving or exporting as a formal record. "
    "The adult remains responsible for the final record."
)


def prepare_write_document(request: OrbDictatePrepareWriteRequest) -> OrbDictatePrepareWriteResponse:
    """Build structured ORB Write body with section prompts — template-to-Write auto-fill."""
    note_type = request.note_type
    record_type = resolve_record_type(
        record_type_id=request.record_type_id,
        template_id=request.template_id,
        note_type=note_type,
    )
    transcript = _truncate(request.transcript)
    professional = _truncate(request.professional_note)
    source_text = f"{transcript}\n\n{professional}".strip()
    missing = list(request.missing_prompts)
    if not missing and source_text:
        quality = compute_quality_checks(source_text, note_type)
        missing = orb_residential_quality_service.build_missing_capture_prompts(
            quality,
            note_type=note_type,
        )
    structured = build_structured_write_body(
        record_type=record_type,
        note_type=note_type,
        transcript=transcript,
        professional_note=professional,
        missing_prompts=missing or None,
    )
    quality = compute_quality_checks(structured, note_type)
    intel_packet = indicare_intelligence_core_service.build_intelligence_packet(
        source_text or structured,
        mode=note_type,
    )
    _, intel_meta = _finalize_dictate_text(
        text=structured,
        note_type=note_type,
        intel_packet=intel_packet,
        source_text=source_text or transcript,
    )
    template = get_dictate_template(note_type)  # type: ignore[arg-type]
    section_prompts = [
        p for section in template.sections for p in section.prompts[:1]
    ]
    headings = list(record_type.get("pdf_heading_order") or record_type.get("final_document_headings") or [])
    return OrbDictatePrepareWriteResponse(
        title=document_title_for_record_type(record_type),
        note_type=note_type,  # type: ignore[arg-type]
        record_type_id=str(record_type.get("id")),
        record_type_label=str(record_type.get("label")),
        document_headings=headings,
        structured_body=structured,
        section_prompts=section_prompts[:20],
        quality_checks=quality,
        standalone_boundary=STANDALONE_BOUNDARY,
        brain_metadata=_dictate_brain_metadata(
            note_type=note_type,
            transcript_text=source_text,
            feature="write",
            intelligence_meta=intel_meta,
        ),
    )


def finalise_dictate_document(
    request: OrbDictateFinaliseRequest,
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
) -> OrbDictateFinaliseResponse:
    """Generate structured document for ORB Write handoff — draft only, no live OS save."""
    from datetime import datetime, timezone

    gen_request = OrbDictateGenerateRequest(
        input_text=request.input_text,
        note_type=request.note_type,
        mode=request.mode,
        participants=request.participants,
        segments=request.segments,
        include_child_voice=request.include_child_voice,
        include_safeguarding=request.include_safeguarding,
        include_manager_oversight=request.include_manager_oversight,
        include_actions=request.include_actions,
        include_ofsted_lens=request.include_ofsted_lens,
        consent_confirmed=request.consent_confirmed,
        investigation_boundary_confirmed=request.investigation_boundary_confirmed,
        source="dictation",
    )
    generated = generate_dictate_note(
        gen_request,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
    )
    record_type = resolve_record_type(
        record_type_id=request.record_type_id,
        template_id=request.template_id,
        note_type=generated.note_type,
    )
    professional = generated.professional_note
    if request.adult_edits and request.adult_edits.strip():
        professional = request.adult_edits.strip()
    if request.accepted_suggestions:
        appendix_lines = [
            f"- {s.label}: {s.detail}"
            for s in request.accepted_suggestions
            if s.status in {"accepted", "applied"}
        ]
        if appendix_lines:
            professional += "\n\n## Accepted suggestions (review before use)\n\n" + "\n".join(appendix_lines)

    missing_notes = [
        s.detail for s in request.accepted_suggestions if s.category == "missing" and s.status == "accepted"
    ]
    professional = structure_document_body(
        record_type=record_type,
        professional_note=professional,
        missing_notes=missing_notes or None,
        adult_edits_preserved=bool(request.adult_edits and request.adult_edits.strip()),
        note_type=generated.note_type,
        transcript=request.transcript or generated.transcript or request.input_text,
    )

    transcript = request.transcript or generated.transcript
    headings = list(record_type.get("pdf_heading_order") or record_type.get("final_document_headings") or [])
    return OrbDictateFinaliseResponse(
        title=document_title_for_record_type(record_type),
        note_type=generated.note_type,
        record_type_id=str(record_type.get("id")),
        record_type_label=str(record_type.get("label")),
        document_headings=headings,
        professional_note=professional,
        summary=generated.summary,
        transcript=transcript,
        quality_checks=generated.quality_checks,
        review_required_statement=REVIEW_REQUIRED_STATEMENT,
        standalone_boundary=STANDALONE_BOUNDARY,
        governance_notice=GOVERNANCE_NOTICE,
        timestamp=datetime.now(timezone.utc).isoformat(),
        template_id=request.template_id,
        accepted_suggestions=request.accepted_suggestions,
    )
