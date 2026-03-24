from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.document_rules_engine import (
    build_workflow_tasks,
    get_document_rule_payload,
    list_document_rules,
    suggest_document_links,
)

router = APIRouter(prefix="/document-rules", tags=["Document Rules"])


class DocumentRuleLinkRequest(BaseModel):
    document_type: str
    payload: dict | None = None


@router.get("")
@router.get("/")
def api_list_document_rules():
    return {
        "ok": True,
        "rules": list_document_rules(),
    }


@router.get("/{document_type}")
def api_get_document_rule(document_type: str):
    rule = get_document_rule_payload(document_type)
    if not rule:
        raise HTTPException(status_code=404, detail="Document rule not found")
    return {
        "ok": True,
        "rule": rule,
    }


@router.get("/{document_type}/workflow")
def api_get_document_workflow(document_type: str):
    tasks = build_workflow_tasks(document_type)
    if not tasks:
        raise HTTPException(status_code=404, detail="Document workflow not found")
    return {
        "ok": True,
        "workflow": tasks,
    }


@router.post("/suggest-links")
def api_suggest_document_links(body: DocumentRuleLinkRequest):
    rows = suggest_document_links(
        document_type=body.document_type,
        payload=body.payload or {},
    )
    return {
        "ok": True,
        "links": rows,
    }
