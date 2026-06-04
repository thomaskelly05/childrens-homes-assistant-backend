"""ORB Dictate — voice-to-recording companion service for ORB Residential."""

from __future__ import annotations

import json
import logging
import os
from typing import Any
from uuid import uuid4

from openai import OpenAI

from core.policy_engine import policy_engine
from db.ai_note_versions_db import ensure_ai_note_versions_table, insert_ai_note_version
from db.ai_notes_db import ensure_ai_meetings_table, insert_ai_meeting_note, update_ai_meeting_note
from db.connection import get_db_connection, release_db_connection
from schemas.orb_dictate import (
    OrbDictateGenerateRequest,
    OrbDictateGenerateResponse,
    OrbDictateNotePatch,
    OrbDictateNoteSummary,
    OrbDictateSaveRequest,
    OrbDictateSaveResponse,
)
from services.orb_dictate_quality import MULTI_PERSON_NOTE_TYPES, compute_quality_checks
from services.orb_dictate_speaker import (
    SPEAKER_BOUNDARY_COPY,
    build_speaker_summary,
    participants_block_for_prompt,
    segments_to_plain_text,
    suggest_participants_from_text,
    text_to_segments,
)
from schemas.orb_saved_outputs import OrbSavedOutputCreate
from services.ai_note_export_service import create_docx_export, create_pdf_export, safe_filename
from services.ai_notes_service import transcribe_audio
from services.orb_dictate_template_registry import get_dictate_template, list_dictate_templates
from services.orb_saved_output_service import orb_saved_output_service
from services.orb_brain_metadata_service import build_brain_metadata
from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.indicare_intelligence_route_finalize_service import intelligence_context_summary
from services.recording_intelligence_service import recording_intelligence_service

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
) -> dict[str, Any]:
    intel_packet = indicare_intelligence_core_service.build_intelligence_packet(
        transcript_text or "dictate recording",
        mode=mode or note_type,
    )
    intel_summary = intelligence_context_summary(intel_packet)
    return build_brain_metadata(
        surface="orb_standalone",
        mode=mode or note_type,
        lens=note_type,
        feature="dictate",
        extra={
            "output_type": note_type,
            "indicare_intelligence_core": intel_summary,
        },
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


def _openai_client() -> OpenAI | None:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    return OpenAI(api_key=key)


def _truncate(text: str, max_len: int = 120_000) -> str:
    return (text or "").strip()[:max_len]


def _fallback_generate(request: OrbDictateGenerateRequest) -> OrbDictateGenerateResponse:
    note_type = _resolve_note_type(request)
    template = get_dictate_template(note_type)  # type: ignore[arg-type]
    transcript = _truncate(request.input_text)
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
    return OrbDictateGenerateResponse(
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


def _build_generate_prompt(request: OrbDictateGenerateRequest, note_type: str) -> tuple[str, str]:
    template = get_dictate_template(note_type)  # type: ignore[arg-type]
    transcript_body = (
        segments_to_plain_text(request.segments)
        if request.segments
        else request.input_text
    )
    intel_packet = indicare_intelligence_core_service.build_intelligence_packet(
        transcript_body,
        mode=request.mode or note_type,
    )
    intelligence_block = "\n\n".join(
        part
        for part in (
            intel_packet.get("prompt_block"),
            recording_intelligence_service.build_prompt_block(transcript_body),
        )
        if part
    )
    speaker_block = participants_block_for_prompt(request.participants, request.segments)
    section_spec = "\n".join(
        f"- {s.title}: " + "; ".join(s.prompts)
        for s in template.sections
    )
    flags = []
    if request.include_child_voice:
        flags.append("Include child voice with direct quotes where known.")
    if request.include_safeguarding:
        flags.append("Include safeguarding considerations where relevant.")
    if request.include_manager_oversight:
        flags.append("Include manager oversight and notifications where relevant.")
    if request.include_ofsted_lens:
        flags.append("Add a short Ofsted/SCCIF evidence lens paragraph.")

    quality_guidance = (
        "Recording quality priorities: factual, observable wording; child-centred language; "
        "child voice with direct quotes where stated; staff response and support; clear outcome; "
        "follow-up actions; safeguarding considerations; manager oversight prompts where relevant; "
        "Ofsted/evidence relevance only when requested — never invent facts or evidence."
    )

    investigation_rules = ""
    if note_type == "investigation_meeting":
        investigation_rules = (
            "\nInvestigation meeting rules: use neutral language; do not state allegations as fact; "
            "do not make findings or conclusions unless explicitly provided in the input; "
            "attribute statements (e.g. 'X stated that…'); flag points requiring clarification."
        )

    system = (
        "You are ORB Dictate for ORB Residential — Powered by IndiCare Intelligence. "
        "Turn rough spoken notes into professional, factual recording wording. "
        "Return JSON only with keys: title, professional_note, summary, actions (array of strings), "
        "ofsted_lens (string or null). "
        "Never invent facts. Use [not stated] where detail is missing. "
        "Use non-judgemental, child-centred language. "
        "Do not claim submission to any care system. "
        "When speakers are identified, attribute key points by name/role where useful — do not over-attribute."
        f"{investigation_rules}"
    )
    user = (
        f"Note type: {template.title}\n"
        f"Purpose: {template.purpose}\n"
        f"Audience: {request.audience}\n"
        f"Tone: {request.tone}\n"
        f"Source: {request.source}\n"
        f"Mode: {request.mode or note_type}\n\n"
        f"Required sections:\n{section_spec}\n\n"
        f"Instructions:\n" + "\n".join(f"- {f}" for f in flags) + "\n\n"
        f"{quality_guidance}\n\n"
        f"{speaker_block}\n\n"
        f"{intelligence_block}\n\n"
        f"Rough input / transcript:\n{transcript_body}"
    )
    return system, user


def generate_dictate_note(request: OrbDictateGenerateRequest) -> OrbDictateGenerateResponse:
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

    client = _openai_client()
    if not client:
        req = request.model_copy(update={"participants": participants, "segments": segments})
        return _fallback_generate(req)

    system, user = _build_generate_prompt(request, note_type)
    try:
        response = client.chat.completions.create(
            model=os.environ.get("ORB_DICTATE_MODEL", "gpt-4.1-mini"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
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
    ofsted = parsed.get("ofsted_lens")
    ofsted_text = _truncate(str(ofsted), 4000) if ofsted else None
    if request.include_ofsted_lens and not ofsted_text:
        ofsted_text = (
            "Consider how this practice demonstrates child impact and evidence for inspection preparation. "
            "Review against your home's Quality Standards mapping."
        )

    transcript_text = segments_to_plain_text(segments) if segments else _truncate(request.input_text)
    quality = compute_quality_checks(professional, note_type)
    return OrbDictateGenerateResponse(
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
        brain_metadata=_dictate_brain_metadata(
            note_type=note_type,
            mode=request.mode,
            transcript_text=transcript_text,
        ),
    )


async def transcribe_dictate_audio(file_path: str) -> dict[str, Any]:
    result = await transcribe_audio(file_path)
    transcript = str(result.get("transcript") or result.get("text") or "").strip()
    participants = suggest_participants_from_text(transcript)
    segments = text_to_segments(transcript, source="upload", participants=participants)
    return {
        "transcript": transcript,
        "segments": [s.model_dump() for s in segments],
        "participants": [p.model_dump() for p in participants],
        "speaker_summary": build_speaker_summary(participants, segments).model_dump(),
        "speaker_boundary_notice": SPEAKER_BOUNDARY_COPY,
    }


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
