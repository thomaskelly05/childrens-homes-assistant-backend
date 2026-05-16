from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from repositories.actions_repository import create_action, get_action, list_actions, update_action
from repositories.documents_repository import create_document_metadata, create_reg44_metadata, get_document, list_documents
from repositories.evidence_repository import build_coverage, create_evidence_link, get_evidence, list_evidence
from repositories.operational_writeback_repository import create_comment, create_review_request, get_lifecycle_snapshot, list_audit_timeline, transition_record
from repositories.reports_repository import generate_report_draft, get_report, list_reports, save_report_draft, update_report_workflow
from repositories.workflow_repository import create_workflow_event, get_workflow, list_workflows
from repositories.workspaces_repository import adult_workspace, get_adult, get_young_person, list_adults, list_young_people, young_person_workspace
from services.document_extraction_pipeline import extraction_pipeline
from services.document_security_service import document_security_service
from services.file_storage import storage_from_env
from services.os_chronology_service import get_chronology_event, list_chronology
from services.operational_lifecycle_service import operational_lifecycle_service


router = APIRouter(prefix="/os", tags=["OS Live Data"])


class FlexiblePayload(BaseModel):
    model_config = ConfigDict(extra="allow")


def ok(data: Any, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    response: dict[str, Any] = {"success": True, "data": data}
    if meta is not None:
        response["meta"] = meta
    return response


def _filters(**kwargs: Any) -> dict[str, Any]:
    return {key: value for key, value in kwargs.items() if value not in (None, "")}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None


def _allowed_home_ids(current_user: dict[str, Any]) -> set[int]:
    raw = current_user.get("allowed_home_ids") or current_user.get("allowedHomeIds") or current_user.get("home_ids") or []
    values = raw if isinstance(raw, (list, tuple, set)) else [raw]
    allowed = {_safe_int(item) for item in values}
    allowed.add(_safe_int(current_user.get("home_id") or current_user.get("homeId")))
    return {item for item in allowed if item is not None}


def _resolve_upload_home(home_id: int | None, current_user: dict[str, Any]) -> int:
    requested = _safe_int(home_id)
    allowed = _allowed_home_ids(current_user)
    role = str(current_user.get("role") or "").lower()
    provider_role = role in {"admin", "super_admin", "superadmin", "founder", "owner", "provider_admin", "responsible_individual", "ri"}
    if requested is not None:
        if requested in allowed or provider_role:
            return requested
        raise HTTPException(status_code=403, detail="You do not have access to this home")
    if len(allowed) == 1:
        return next(iter(allowed))
    raise HTTPException(status_code=400, detail="home_id is required for document uploads")


def _with_transition(payload: FlexiblePayload | None, transition: str) -> dict[str, Any]:
    data = payload.model_dump(exclude_unset=True) if payload else {}
    data["transition"] = transition
    return data


@router.get("/chronology")
def os_chronology(
    home_id: int | None = None,
    young_person_id: int | None = None,
    staff_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    type: str | None = Query(default=None),
    source_type: str | None = None,
    regulation: str | None = None,
    sccif_area: str | None = None,
    quality_standard: str | None = None,
    safeguarding_only: bool = False,
    risk_only: bool = False,
    evidence_only: bool = False,
    actions_required: bool = False,
    search: str | None = None,
    report_period: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user=Depends(get_current_user),
):
    page_data = list_chronology(
        current_user=current_user,
        filters=_filters(
            home_id=home_id,
            young_person_id=young_person_id,
            staff_id=staff_id,
            date_from=date_from,
            date_to=date_to,
            type=type,
            source_type=source_type,
            regulation=regulation,
            sccif_area=sccif_area,
            quality_standard=quality_standard,
            safeguarding_only=safeguarding_only,
            risk_only=risk_only,
            evidence_only=evidence_only,
            actions_required=actions_required,
            search=search,
            report_period=report_period,
        ),
        page=page,
        page_size=page_size,
    )
    meta = {key: page_data[key] for key in ["page", "page_size", "total", "has_more"]}
    return ok(page_data["items"], meta=meta)


@router.get("/chronology/{event_id}")
def os_chronology_detail(event_id: str, current_user=Depends(get_current_user)):
    event = get_chronology_event(event_id=event_id, current_user=current_user)
    if not event:
        raise HTTPException(status_code=404, detail="Chronology event not found.")
    return ok(event)


@router.get("/young-people/{young_person_id}/chronology")
def os_young_person_chronology(
    young_person_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    current_user=Depends(get_current_user),
):
    page_data = list_chronology(
        current_user=current_user,
        filters={"young_person_id": young_person_id},
        page=page,
        page_size=page_size,
    )
    meta = {key: page_data[key] for key in ["page", "page_size", "total", "has_more"]}
    return ok(page_data["items"], meta=meta)


@router.get("/actions")
def os_actions(
    home_id: int | None = None,
    young_person_id: int | None = None,
    owner_user_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    source_type: str | None = None,
    source_id: int | None = None,
    limit: int = Query(default=250, ge=1, le=600),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    actions = list_actions(
        conn,
        current_user=current_user,
        filters=_filters(
            home_id=home_id,
            young_person_id=young_person_id,
            owner_user_id=owner_user_id,
            status=status,
            priority=priority,
            source_type=source_type,
            source_id=source_id,
        ),
        limit=limit,
    )
    return ok(actions, meta={"total": len(actions)})


@router.get("/actions/{action_id}")
def os_action_detail(action_id: str, current_user=Depends(get_current_user), conn=Depends(get_db)):
    action = get_action(conn, action_id=action_id, current_user=current_user)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")
    return ok(action)


@router.patch("/actions/{action_id}")
def os_action_update(action_id: str, payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(update_action(conn, action_id=action_id, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.post("/actions")
def os_action_create(payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(create_action(conn, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.post("/actions/{action_id}/complete")
def os_action_complete(action_id: str, payload: FlexiblePayload | None = None, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(transition_record(conn, entity_type="action", record_id=action_id, payload=_with_transition(payload, "complete"), current_user=current_user))


@router.post("/actions/{action_id}/reopen")
def os_action_reopen(action_id: str, payload: FlexiblePayload | None = None, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(transition_record(conn, entity_type="action", record_id=action_id, payload=_with_transition(payload, "reopen"), current_user=current_user))


@router.post("/actions/{action_id}/assign")
def os_action_assign(action_id: str, payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(transition_record(conn, entity_type="action", record_id=action_id, payload=_with_transition(payload, "assign"), current_user=current_user))


@router.post("/actions/{action_id}/escalate")
def os_action_escalate(action_id: str, payload: FlexiblePayload | None = None, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(transition_record(conn, entity_type="action", record_id=action_id, payload=_with_transition(payload, "escalate"), current_user=current_user))


@router.post("/actions/{action_id}/mark-overdue")
def os_action_mark_overdue(action_id: str, payload: FlexiblePayload | None = None, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(transition_record(conn, entity_type="action", record_id=action_id, payload=_with_transition(payload, "mark_overdue"), current_user=current_user))


@router.post("/actions/{action_id}/sign-off")
def os_action_sign_off(action_id: str, payload: FlexiblePayload | None = None, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(transition_record(conn, entity_type="action", record_id=action_id, payload=_with_transition(payload, "management_sign_off"), current_user=current_user))


@router.post("/workflows/records/{entity_type}/{record_id}/transition")
def os_record_transition(entity_type: str, record_id: str, payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(transition_record(conn, entity_type=entity_type, record_id=record_id, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.get("/operational-states/lifecycle/definitions")
def os_operational_lifecycle_definitions(current_user=Depends(get_current_user)):
    return ok({
        "states": operational_lifecycle_service.statuses(),
        "transitions": ["open", "acknowledge", "assign", "review", "resolve", "reopen", "escalate", "archive", "sign_off"],
        "principles": [
            "Lifecycle events are operational records, not blame markers.",
            "Resolution should retain evidence, chronology and governance links.",
            "Sign-off remains a management action where policy requires it.",
        ],
    })


@router.get("/workflows/records/{entity_type}/{record_id}/lifecycle")
def os_record_lifecycle(entity_type: str, record_id: str, limit: int = Query(default=100, ge=1, le=300), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(get_lifecycle_snapshot(conn, entity_type=entity_type, record_id=record_id, current_user=current_user, limit=limit))


@router.get("/evidence")
def os_evidence(
    home_id: int | None = None,
    young_person_id: int | None = None,
    source_type: str | None = None,
    source_id: int | None = None,
    regulation: str | None = None,
    quality: str | None = None,
    limit: int = Query(default=250, ge=1, le=600),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    items = list_evidence(
        conn,
        current_user=current_user,
        filters=_filters(home_id=home_id, young_person_id=young_person_id, source_type=source_type, source_id=source_id, regulation=regulation, quality=quality),
        limit=limit,
    )
    return ok(items, meta={"total": len(items)})


@router.get("/evidence/{evidence_id}")
def os_evidence_detail(evidence_id: str, current_user=Depends(get_current_user), conn=Depends(get_db)):
    item = get_evidence(conn, evidence_id=evidence_id, current_user=current_user)
    if not item:
        raise HTTPException(status_code=404, detail="Evidence not found.")
    return ok(item)


@router.post("/evidence/attach")
def os_evidence_attach(payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(create_evidence_link(conn, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.post("/evidence/{evidence_id}/transition")
def os_evidence_transition(evidence_id: str, payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(transition_record(conn, entity_type="evidence", record_id=evidence_id, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.get("/documents")
def os_documents(
    home_id: int | None = None,
    young_person_id: int | None = None,
    document_type: str | None = None,
    limit: int = Query(default=250, ge=1, le=600),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    documents = list_documents(conn, current_user=current_user, filters=_filters(home_id=home_id, young_person_id=young_person_id, document_type=document_type), limit=limit)
    return ok(documents, meta={"total": len(documents)})


@router.post("/documents/upload")
async def os_document_upload(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    document_type: str = Form(default="other"),
    home_id: int | None = Form(default=None),
    young_person_id: int | None = Form(default=None),
    staff_id: int | None = Form(default=None),
    extracted_text: str | None = Form(default=None),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    storage = storage_from_env()
    resolved_home_id = _resolve_upload_home(home_id, current_user)
    stored = await storage.save_upload(file, home_id=resolved_home_id)
    text = (extracted_text or "").strip()
    if not text and stored.get("mime_type") == "text/plain":
        text = Path(str(stored["storage_path"])).read_text(encoding="utf-8", errors="ignore")
    extraction = extraction_pipeline().extract(text=text, document_type=document_type) if text else None
    document = create_document_metadata(
        conn,
        payload={
            **stored,
            "title": title or stored.get("file_name"),
            "document_type": document_type,
            "home_id": resolved_home_id,
            "young_person_id": young_person_id,
            "staff_id": staff_id,
            "text": text or None,
            "status": extraction.status if extraction else "queued",
            "extraction_status": extraction.status if extraction else "queued",
            "findings": extraction.findings if extraction else [],
            "actions_detected": extraction.actions_detected if extraction else [],
            "evidence_detected": extraction.evidence_detected if extraction else [],
            "chronology_links": extraction.chronology_links if extraction else [],
            "safeguarding_flags": extraction.safeguarding_flags if extraction else [],
            "regulation_references": extraction.regulation_references if extraction else [],
            "metadata": {
                "storage": stored,
                "processor": extraction.processor if extraction else "pending",
                "classification": stored.get("classification"),
            },
        },
        current_user=current_user,
    )
    return ok(document)


@router.get("/documents/uploads/{bucket}/{file_name}")
def os_document_uploaded_file(bucket: str, file_name: str, current_user=Depends(get_current_user)):
    storage = storage_from_env()
    root = storage.root.resolve()
    bucket_home_id = _safe_int(bucket)
    if bucket_home_id is None or bucket_home_id not in _allowed_home_ids(current_user):
        role = str(current_user.get("role") or "").lower()
        if role not in {"admin", "super_admin", "superadmin", "founder", "owner", "provider_admin", "responsible_individual", "ri"}:
            raise HTTPException(status_code=403, detail="You do not have access to this document")
    target = document_security_service.validate_path_under_root(root, root / bucket / file_name)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found.")
    return FileResponse(target)


@router.post("/documents/reg44/upload")
def os_reg44_upload(payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(create_reg44_metadata(conn, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.post("/documents/extract")
def os_document_extract_text(payload: FlexiblePayload, current_user=Depends(get_current_user)):
    data = payload.model_dump(exclude_unset=True)
    text = str(data.get("text") or data.get("extracted_text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Paste or extracted text is required.")
    extraction = extraction_pipeline().extract(text=text, document_type=data.get("document_type"))
    return ok(extraction.__dict__)


@router.post("/documents/reg44/extract-text")
def os_reg44_extract_text(payload: FlexiblePayload, current_user=Depends(get_current_user)):
    return os_document_extract_text(payload, current_user)


@router.get("/documents/{document_id}")
def os_document_detail(document_id: str, current_user=Depends(get_current_user), conn=Depends(get_db)):
    document = get_document(conn, document_id=document_id, current_user=current_user)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    return ok(document)


@router.post("/documents/{document_id}/transition")
def os_document_transition(document_id: str, payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(transition_record(conn, entity_type="document", record_id=document_id, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.get("/reports")
def os_reports(
    home_id: int | None = None,
    young_person_id: int | None = None,
    report_type: str | None = None,
    limit: int = Query(default=250, ge=1, le=600),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    reports = list_reports(conn, current_user=current_user, filters=_filters(home_id=home_id, young_person_id=young_person_id, report_type=report_type), limit=limit)
    return ok(reports, meta={"total": len(reports)})


@router.post("/reports/generate")
def os_report_generate(payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    chronology = list_chronology(
        current_user=current_user,
        filters=_filters(home_id=data.get("home_id"), young_person_id=data.get("young_person_id"), date_from=data.get("date_from"), date_to=data.get("date_to")),
        page=1,
        page_size=100,
    )["items"]
    evidence = list_evidence(conn, current_user=current_user, filters=_filters(home_id=data.get("home_id"), young_person_id=data.get("young_person_id")), limit=100)
    draft = generate_report_draft(payload=data, chronology_items=chronology, evidence=evidence)
    saved = save_report_draft(
        conn,
        report_id="generated",
        payload={
            **data,
            **draft,
            "status": "draft",
            "metadata": {
                **(data.get("metadata") or {}),
                "generated_from": "os_reports_generate",
                "chronology_event_ids": [item.get("id") for item in chronology],
                "evidence_ids": [item.get("id") for item in evidence],
            },
        },
        current_user=current_user,
    )
    return ok({**draft, "persisted_report": saved, "id": saved.get("id", draft["id"])})


@router.post("/reports/{report_id}/save-draft")
def os_report_save_draft(report_id: str, payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(save_report_draft(conn, report_id=report_id, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.post("/reports/{report_id}/transition")
def os_report_transition(report_id: str, payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    transitioned = transition_record(conn, entity_type="report", record_id=report_id, payload=data, current_user=current_user)
    try:
        report = update_report_workflow(conn, report_id=report_id, payload={"status": transitioned["status"], **data}, current_user=current_user)
    except HTTPException:
        report = None
    return ok({"transition": transitioned, "report": report})


@router.get("/reports/{report_id}")
def os_report_detail(report_id: str, current_user=Depends(get_current_user), conn=Depends(get_db)):
    report = get_report(conn, report_id=report_id, current_user=current_user)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    return ok(report)


@router.get("/regulatory/references")
def os_regulatory_references():
    return ok(
        [
            {"type": "sccif", "key": "experiences_and_progress", "label": "Children's experiences and progress"},
            {"type": "sccif", "key": "helped_and_protected", "label": "Children are helped and protected"},
            {"type": "sccif", "key": "leadership_management", "label": "Leadership and management"},
            {"type": "quality_standard", "key": "protection_of_children", "label": "Protection of children"},
            {"type": "regulation", "key": "reg_12", "label": "Regulation 12 - Protection of children standard"},
            {"type": "regulation", "key": "reg_44", "label": "Regulation 44 - Independent person visits"},
            {"type": "regulation", "key": "reg_45", "label": "Regulation 45 - Review of quality of care"},
        ]
    )


@router.get("/regulatory/coverage")
def os_regulatory_coverage(current_user=Depends(get_current_user), conn=Depends(get_db)):
    evidence = list_evidence(conn, current_user=current_user, limit=600)
    actions = list_actions(conn, current_user=current_user, limit=600)
    return ok(build_coverage(evidence, actions))


@router.get("/ofsted-readiness")
def os_ofsted_readiness(current_user=Depends(get_current_user), conn=Depends(get_db)):
    evidence = list_evidence(conn, current_user=current_user, limit=600)
    actions = list_actions(conn, current_user=current_user, filters={"status": "overdue"}, limit=600)
    coverage = build_coverage(evidence, actions)
    gaps = [area for area in coverage["areas"] if area["status"] == "gap"]
    return ok({"coverage": coverage, "evidence_count": len(evidence), "overdue_actions": len(actions), "gaps": gaps, "readiness_state": "requires_attention" if gaps or actions else "inspection_ready"})


@router.get("/management/oversight")
def os_management_oversight(current_user=Depends(get_current_user), conn=Depends(get_db)):
    actions = list_actions(conn, current_user=current_user, limit=600)
    evidence = list_evidence(conn, current_user=current_user, limit=600)
    reports = list_reports(conn, current_user=current_user, limit=200)
    chronology = list_chronology(current_user=current_user, filters={}, page=1, page_size=200)["items"]
    coverage = build_coverage(evidence, actions)
    overdue_actions = [action for action in actions if action.get("status") == "overdue"]
    review_queue = [
        event
        for event in chronology
        if event.get("source_type") in {"incident", "safeguarding", "risk_assessment", "risk_review", "workflow_event"}
        and "manager-review" not in (event.get("tags") or [])
    ]
    safeguarding_escalations = [
        event
        for event in chronology
        if event.get("source_type") == "safeguarding" or "safeguarding" in (event.get("tags") or [])
    ][:50]
    sign_off_queue = [
        item
        for item in [*actions, *reports]
        if str(item.get("status") or "").lower() in {"manager_review", "ri_review", "review_required", "in_progress"}
    ][:100]
    missing_evidence = [area for area in coverage["areas"] if area["status"] == "gap"]
    risk_indicators = [
        {"key": "repeated_incidents", "label": "Repeated incidents", "count": sum(1 for event in chronology if event.get("source_type") == "incident")},
        {"key": "missing_from_care", "label": "Missing-from-care trends", "count": sum(1 for event in chronology if "missing" in " ".join(event.get("tags") or []).lower())},
        {"key": "medication_concerns", "label": "Medication concerns", "count": sum(1 for event in chronology if event.get("source_type") == "medication")},
        {"key": "direct_work_gaps", "label": "Missing direct work", "count": sum(1 for action in actions if "direct work" in str(action.get("title") or action.get("description") or "").lower())},
    ]
    return ok(
        {
            "cards": {
                "overdue_reviews": len(review_queue),
                "overdue_actions": len(overdue_actions),
                "safeguarding_escalations": len(safeguarding_escalations),
                "missing_evidence": len(missing_evidence),
                "sign_off_queue": len(sign_off_queue),
            },
            "escalation_queue": safeguarding_escalations,
            "review_queue": review_queue[:100],
            "sign_off_queue": sign_off_queue,
            "compliance_heatmap": coverage,
            "risk_indicators": risk_indicators,
        }
    )


@router.get("/retrieval/sources")
def os_retrieval_sources(
    home_id: int | None = None,
    young_person_id: int | None = None,
    q: str | None = None,
    limit: int = Query(default=100, ge=1, le=300),
    current_user=Depends(get_current_user),
    conn=Depends(get_db),
):
    filters = _filters(home_id=home_id, young_person_id=young_person_id, search=q)
    chronology = list_chronology(current_user=current_user, filters=filters, page=1, page_size=min(limit, 200))["items"]
    evidence = list_evidence(conn, current_user=current_user, filters=_filters(home_id=home_id, young_person_id=young_person_id), limit=limit)
    reports = list_reports(conn, current_user=current_user, filters=_filters(home_id=home_id, young_person_id=young_person_id), limit=limit)
    documents = list_documents(conn, current_user=current_user, filters=_filters(home_id=home_id, young_person_id=young_person_id), limit=limit)
    sources = []
    for item in chronology:
        sources.append(
            {
                "id": item.get("id"),
                "source_type": item.get("source_type"),
                "source_id": item.get("source_id"),
                "title": item.get("title"),
                "retrieval_text": "\n\n".join([str(item.get("title") or ""), str(item.get("summary") or ""), str(item.get("full_text") or "")]).strip(),
                "citations": [{"label": item.get("citation_label"), "source_url": item.get("source_url"), "date_time": item.get("date_time")}],
                "linked_records": {
                    "actions": item.get("action_ids") or [],
                    "evidence": item.get("evidence_ids") or [],
                    "documents": item.get("document_ids") or [],
                    "reports": item.get("report_ids") or [],
                },
                "chronology_context": {"date_time": item.get("date_time"), "category": item.get("category")},
                "regulation_context": {"regulations": item.get("regulation_links") or [], "sccif": item.get("sccif_links") or []},
            }
        )
    for collection_name, collection in [("evidence", evidence), ("report", reports), ("document", documents)]:
        for item in collection:
            sources.append(
                {
                    "id": item.get("id"),
                    "source_type": collection_name,
                    "source_id": item.get("source_id") or item.get("original_id"),
                    "title": item.get("title"),
                    "retrieval_text": "\n\n".join([str(item.get("title") or ""), str(item.get("description") or item.get("body") or item.get("extracted_text") or "")]).strip(),
                    "citations": item.get("citations") or [{"label": item.get("title"), "source_url": item.get("file_url")}],
                    "linked_records": {
                        "actions": item.get("linked_actions") or [],
                        "evidence": item.get("linked_evidence") or item.get("evidence_links") or [],
                        "reports": item.get("linked_report_ids") or [],
                    },
                    "chronology_context": {"source_type": collection_name, "source_id": item.get("source_id")},
                    "regulation_context": {"regulation": item.get("regulation") or item.get("linked_regulation"), "tags": item.get("tags") or []},
                }
            )
    return ok(sources[:limit], meta={"total": len(sources)})


@router.post("/collaboration/comments")
def os_create_comment(payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    entity_type = str(data.get("entity_type") or data.get("record_type") or "record")
    record_id = str(data.get("record_id") or data.get("entity_id") or "")
    if not record_id:
        raise HTTPException(status_code=400, detail="record_id is required.")
    return ok(create_comment(conn, entity_type=entity_type, record_id=record_id, payload=data, current_user=current_user))


@router.post("/collaboration/review-requests")
def os_create_review_request(payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    entity_type = str(data.get("entity_type") or data.get("record_type") or "record")
    record_id = str(data.get("record_id") or data.get("entity_id") or "")
    if not record_id:
        raise HTTPException(status_code=400, detail="record_id is required.")
    return ok(create_review_request(conn, entity_type=entity_type, record_id=record_id, payload=data, current_user=current_user))


@router.get("/audit/{entity_type}/{record_id}")
def os_audit_timeline(entity_type: str, record_id: str, limit: int = Query(default=100, ge=1, le=300), current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(list_audit_timeline(conn, entity_type=entity_type, record_id=record_id, current_user=current_user, limit=limit))


@router.get("/workflows")
def os_workflows(current_user=Depends(get_current_user), conn=Depends(get_db)):
    workflows = list_workflows(conn, current_user=current_user)
    return ok(workflows, meta={"total": len(workflows)})


@router.get("/workflows/{workflow_id}")
def os_workflow_detail(workflow_id: str, current_user=Depends(get_current_user), conn=Depends(get_db)):
    workflow = get_workflow(conn, workflow_id=workflow_id, current_user=current_user)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found.")
    return ok(workflow)


@router.post("/workflows/{workflow_id}/events")
def os_workflow_event(workflow_id: str, payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(create_workflow_event(conn, workflow_id=workflow_id, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.get("/young-people")
def os_young_people(limit: int = Query(default=250, ge=1, le=600), current_user=Depends(get_current_user), conn=Depends(get_db)):
    people = list_young_people(conn, current_user=current_user, limit=limit)
    return ok(people, meta={"total": len(people)})


@router.get("/young-people/{young_person_id}")
def os_young_person(young_person_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    person = get_young_person(conn, young_person_id=young_person_id, current_user=current_user)
    if not person:
        raise HTTPException(status_code=404, detail="Young person not found.")
    return ok(person)


@router.get("/young-people/{young_person_id}/workspace")
def os_young_person_workspace(young_person_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(young_person_workspace(conn, young_person_id=young_person_id, current_user=current_user))


@router.get("/adults")
def os_adults(limit: int = Query(default=250, ge=1, le=600), current_user=Depends(get_current_user), conn=Depends(get_db)):
    adults = list_adults(conn, current_user=current_user, limit=limit)
    return ok(adults, meta={"total": len(adults)})


@router.get("/adults/{adult_id}")
def os_adult(adult_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    adult = get_adult(conn, adult_id=adult_id, current_user=current_user)
    if not adult:
        raise HTTPException(status_code=404, detail="Staff member not found.")
    return ok(adult)


@router.get("/adults/{adult_id}/workspace")
def os_adult_workspace(adult_id: int, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(adult_workspace(conn, adult_id=adult_id, current_user=current_user))

