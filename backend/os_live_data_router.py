from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from repositories.actions_repository import create_action, get_action, list_actions, update_action
from repositories.documents_repository import create_reg44_metadata, get_document, list_documents
from repositories.evidence_repository import build_coverage, get_evidence, list_evidence
from repositories.reports_repository import generate_report_draft, get_report, list_reports, save_report_draft
from repositories.workflow_repository import create_workflow_event, get_workflow, list_workflows
from repositories.workspaces_repository import adult_workspace, get_adult, get_young_person, list_adults, list_young_people, young_person_workspace
from services.os_chronology_service import get_chronology_event, list_chronology


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


@router.post("/documents/reg44/upload")
def os_reg44_upload(payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(create_reg44_metadata(conn, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


@router.post("/documents/reg44/extract-text")
def os_reg44_extract_text(payload: FlexiblePayload, current_user=Depends(get_current_user)):
    data = payload.model_dump(exclude_unset=True)
    text = str(data.get("text") or data.get("extracted_text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Paste or extracted text is required.")
    findings = [
        {
            "title": line[:120],
            "summary": line,
            "severity": "high" if any(term in line.lower() for term in ["safeguarding", "risk", "unsafe", "missing"]) else "medium",
            "review_required": True,
        }
        for line in text.splitlines()
        if line.strip()
    ][:20]
    return ok({"text": text, "findings": findings, "review_required": True})


@router.get("/documents/{document_id}")
def os_document_detail(document_id: str, current_user=Depends(get_current_user), conn=Depends(get_db)):
    document = get_document(conn, document_id=document_id, current_user=current_user)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    return ok(document)


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
    return ok(generate_report_draft(payload=data, chronology_items=chronology, evidence=evidence))


@router.post("/reports/{report_id}/save-draft")
def os_report_save_draft(report_id: str, payload: FlexiblePayload, current_user=Depends(get_current_user), conn=Depends(get_db)):
    return ok(save_report_draft(conn, report_id=report_id, payload=payload.model_dump(exclude_unset=True), current_user=current_user))


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

