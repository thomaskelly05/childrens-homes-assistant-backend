from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_current_user
from db.connection import get_db
from repositories.actions_repository import list_actions
from repositories.documents_repository import list_documents
from repositories.evidence_repository import list_evidence
from schemas.operational_state import OperationalSearchRequest
from services.os_chronology_service import list_chronology
from services.operational_state_service import operational_state_service

router = APIRouter(prefix="/os", tags=["operational-state"])


def _filters(
    *,
    home_id: int | None = None,
    young_person_id: int | None = None,
    staff_id: int | None = None,
    state_type: str | None = None,
) -> dict[str, Any]:
    return {
        key: value
        for key, value in {
            "home_id": home_id,
            "young_person_id": young_person_id,
            "staff_id": staff_id,
            "state_type": state_type,
        }.items()
        if value not in (None, "", [], {})
    }


def _safe(label: str, errors: list[dict[str, str]], fn):
    try:
        return fn()
    except Exception as exc:
        errors.append({"source": label, "message": str(exc)})
        return []


def _snapshot_payload(
    *,
    conn,
    current_user: dict[str, Any],
    home_id: int | None = None,
    young_person_id: int | None = None,
    staff_id: int | None = None,
    state_type: str | None = None,
    include_resolved: bool = False,
    search: OperationalSearchRequest | None = None,
) -> dict[str, Any]:
    errors: list[dict[str, str]] = []
    filters = _filters(home_id=home_id, young_person_id=young_person_id, staff_id=staff_id, state_type=state_type)
    repository_filters = {key: value for key, value in filters.items() if key != "state_type"}
    chronology = _safe(
        "chronology",
        errors,
        lambda: list_chronology(
            current_user=current_user,
            filters=repository_filters,
            page=1,
            page_size=200,
        ).get("items", []),
    )
    actions = _safe("actions", errors, lambda: list_actions(conn, current_user=current_user, filters=repository_filters, limit=250))
    evidence = _safe("evidence", errors, lambda: list_evidence(conn, current_user=current_user, filters=repository_filters, limit=250))
    documents = _safe("documents", errors, lambda: list_documents(conn, current_user=current_user, filters=repository_filters, limit=250))
    snapshot = operational_state_service.build_snapshot(
        current_user=current_user,
        chronology=chronology,
        actions=actions,
        evidence=evidence,
        documents=documents,
        workforce=[],
        scope=filters,
        search=search,
        include_resolved=include_resolved,
    )
    payload = snapshot.model_dump()
    payload["source_errors"] = errors
    payload["source_counts"] = {
        "chronology": len(chronology),
        "actions": len(actions),
        "evidence": len(evidence),
        "documents": len(documents),
    }
    return payload


@router.get("/operational-states")
def get_operational_states(
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    staff_id: int | None = Query(default=None),
    state_type: str | None = Query(default=None),
    include_resolved: bool = Query(default=False),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    return _snapshot_payload(
        conn=conn,
        current_user=current_user,
        home_id=home_id,
        young_person_id=young_person_id,
        staff_id=staff_id,
        state_type=state_type,
        include_resolved=include_resolved,
    )


@router.get("/operational-queues")
def get_operational_queues(
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    staff_id: int | None = Query(default=None),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    payload = _snapshot_payload(
        conn=conn,
        current_user=current_user,
        home_id=home_id,
        young_person_id=young_person_id,
        staff_id=staff_id,
    )
    return {
        "generated_at": payload["generated_at"],
        "scope": payload["scope"],
        "queues": payload["queues"],
        "summary": payload["summary"],
        "refresh": payload["refresh"],
        "source_errors": payload["source_errors"],
    }


@router.get("/evidence-graph")
def get_evidence_graph(
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    payload = _snapshot_payload(
        conn=conn,
        current_user=current_user,
        home_id=home_id,
        young_person_id=young_person_id,
    )
    return {
        "generated_at": payload["generated_at"],
        "scope": payload["scope"],
        "relationships": payload["evidence_relationships"],
        "summary": {
            "relationship_count": len(payload["evidence_relationships"]),
            "used_in_inspection_readiness": sum(1 for item in payload["evidence_relationships"] if item.get("used_in_inspection_readiness")),
            "chronology_linked": sum(1 for item in payload["evidence_relationships"] if item.get("chronology_event_ids")),
        },
        "source_errors": payload["source_errors"],
    }


@router.post("/operational-search")
def operational_search(
    request: OperationalSearchRequest,
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    payload = _snapshot_payload(
        conn=conn,
        current_user=current_user,
        home_id=home_id,
        young_person_id=young_person_id,
        state_type=request.state_type,
        search=request,
    )
    return {
        "generated_at": payload["generated_at"],
        "scope": payload["scope"],
        "results": payload["search_results"],
        "summary": {"result_count": len(payload["search_results"])},
        "source_errors": payload["source_errors"],
    }


@router.get("/assistant/context-brief")
def get_assistant_context_brief(
    home_id: int | None = Query(default=None),
    young_person_id: int | None = Query(default=None),
    conn=Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    payload = _snapshot_payload(
        conn=conn,
        current_user=current_user,
        home_id=home_id,
        young_person_id=young_person_id,
    )
    return {
        "generated_at": payload["generated_at"],
        "scope": payload["scope"],
        "assistant_context": payload["assistant_context"],
        "summary": payload["summary"],
        "source_errors": payload["source_errors"],
    }
