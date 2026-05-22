from __future__ import annotations

import logging
import sys
import time
from typing import Any

from db.connection import get_db_connection, release_db_connection
from repositories.actions_repository import list_actions
from repositories.documents_repository import list_documents
from repositories.evidence_repository import list_evidence
from repositories.os_repository_utils import array_text, isoformat, normalise_severity, table_exists
from services.os_chronology_service import PRIORITY_CHRONOLOGY_SOURCES, _query_source

logger = logging.getLogger(__name__)


def _event_from_document(document: dict[str, Any]) -> dict[str, Any]:
    source_id = str(document.get("source_id") or document.get("original_id") or document.get("id") or "")
    source_type = str(document.get("source_type") or "document")
    young_person_id = document.get("young_person_id")
    tags = array_text(document.get("tags") or document.get("document_type") or source_type)
    title = str(document.get("title") or document.get("file_name") or "Document")
    summary = str(document.get("extracted_text") or document.get("document_type") or document.get("status") or "Document available for review.")
    if len(summary) > 500:
        summary = summary[:497].rstrip() + "..."
    return {
        "id": f"{source_type}:{source_id}",
        "source_type": source_type,
        "source_id": source_id,
        "source_table": document.get("original_table") or source_type,
        "canonical_source_key": f"{document.get('original_table') or source_type}:{source_id}",
        "date_time": document.get("uploaded_at") or document.get("created_at") or "",
        "title": title,
        "summary": summary,
        "full_text": document.get("extracted_text") or summary,
        "young_person_ids": [str(young_person_id)] if young_person_id is not None else [],
        "staff_ids": array_text(document.get("uploaded_by")),
        "home_id": str(document.get("home_id")) if document.get("home_id") is not None else None,
        "category": str(document.get("document_type") or document.get("category") or "Document"),
        "severity": "medium",
        "tags": sorted(set([*tags, "document"])),
        "safeguarding_flags": [],
        "risk_flags": [],
        "regulation_links": [{"regulation": document.get("regulation"), "label": document.get("regulation"), "confidence": "direct"}] if document.get("regulation") else [],
        "sccif_links": [],
        "quality_standard_links": [],
        "evidence_ids": array_text(document.get("linked_evidence")),
        "action_ids": array_text(document.get("linked_actions")),
        "document_ids": [str(document.get("id"))] if document.get("id") else [],
        "report_ids": [],
        "created_by": str(document.get("uploaded_by")) if document.get("uploaded_by") else None,
        "citation_label": title,
        "source_url": f"/documents/{document.get('id')}",
        "metadata": document.get("metadata") if isinstance(document.get("metadata"), dict) else {},
    }


def _event_from_action(action: dict[str, Any]) -> dict[str, Any]:
    source_id = str(action.get("source_id") or action.get("original_id") or action.get("id") or "")
    young_person_id = action.get("young_person_id")
    title = str(action.get("title") or "Action")
    summary = str(action.get("description") or action.get("summary") or action.get("status") or "Action available for review.")
    return {
        "id": f"action:{source_id}",
        "source_type": "action",
        "source_id": source_id,
        "source_table": action.get("original_table") or "actions",
        "canonical_source_key": f"{action.get('original_table') or 'actions'}:{source_id}",
        "date_time": action.get("due_at") or action.get("created_at") or action.get("updated_at") or "",
        "title": title,
        "summary": summary,
        "full_text": summary,
        "young_person_ids": [str(young_person_id)] if young_person_id is not None else [],
        "staff_ids": array_text(action.get("assigned_to") or action.get("owner_user_id")),
        "home_id": str(action.get("home_id")) if action.get("home_id") is not None else None,
        "category": "Action",
        "severity": normalise_severity(action.get("priority")),
        "tags": sorted(set([*array_text(action.get("tags")), "action"])),
        "safeguarding_flags": [],
        "risk_flags": [],
        "regulation_links": [],
        "sccif_links": [],
        "quality_standard_links": [],
        "evidence_ids": array_text(action.get("linked_evidence")),
        "action_ids": [str(action.get("id"))] if action.get("id") else [],
        "document_ids": array_text(action.get("linked_documents")),
        "report_ids": [],
        "created_by": str(action.get("created_by")) if action.get("created_by") else None,
        "citation_label": title,
        "source_url": f"/actions/{action.get('id')}",
        "metadata": action.get("metadata") if isinstance(action.get("metadata"), dict) else {},
    }


def _event_from_evidence(evidence: dict[str, Any]) -> dict[str, Any]:
    source_id = str(evidence.get("source_id") or evidence.get("original_id") or evidence.get("id") or "")
    young_person_id = evidence.get("young_person_id")
    title = str(evidence.get("title") or evidence.get("evidence_title") or "Evidence")
    summary = str(evidence.get("description") or evidence.get("summary") or evidence.get("body") or "Evidence available for review.")
    return {
        "id": f"evidence:{source_id}",
        "source_type": "evidence",
        "source_id": source_id,
        "source_table": evidence.get("original_table") or "evidence",
        "canonical_source_key": f"{evidence.get('original_table') or 'evidence'}:{source_id}",
        "date_time": evidence.get("created_at") or evidence.get("updated_at") or "",
        "title": title,
        "summary": summary,
        "full_text": summary,
        "young_person_ids": [str(young_person_id)] if young_person_id is not None else [],
        "staff_ids": array_text(evidence.get("created_by")),
        "home_id": str(evidence.get("home_id")) if evidence.get("home_id") is not None else None,
        "category": str(evidence.get("category") or "Evidence"),
        "severity": "medium",
        "tags": sorted(set([*array_text(evidence.get("tags")), "evidence"])),
        "safeguarding_flags": [],
        "risk_flags": [],
        "regulation_links": [{"regulation": evidence.get("regulation"), "label": evidence.get("regulation"), "confidence": "direct"}] if evidence.get("regulation") else [],
        "sccif_links": array_text(evidence.get("sccif_links")),
        "quality_standard_links": array_text(evidence.get("quality_standard_links")),
        "evidence_ids": [str(evidence.get("id"))] if evidence.get("id") else [],
        "action_ids": array_text(evidence.get("linked_actions")),
        "document_ids": array_text(evidence.get("linked_documents")),
        "report_ids": [],
        "created_by": str(evidence.get("created_by")) if evidence.get("created_by") else None,
        "citation_label": title,
        "source_url": f"/evidence/{evidence.get('id')}",
        "metadata": evidence.get("metadata") if isinstance(evidence.get("metadata"), dict) else {},
    }


def _dedicated_chronology_has_rows(conn: Any, *, current_user: dict[str, Any], filters: dict[str, Any]) -> bool:
    for source in PRIORITY_CHRONOLOGY_SOURCES:
        if not table_exists(conn, source["table"]):
            continue
        rows = _query_source(
            conn,
            source,
            current_user=current_user,
            filters=filters,
            source_limit=1,
        )
        if rows:
            return True
    return False


def apply() -> None:
    try:
        import services.os_chronology_service as chronology_service
    except Exception:
        logger.warning("Could not import chronology service for live fallback patch", exc_info=True)
        return

    original = chronology_service.list_chronology
    if getattr(original, "_indicare_chronology_fallback_patched", False):
        return

    def patched_list_chronology(*, current_user: dict[str, Any], filters: dict[str, Any] | None = None, page: int = 1, page_size: int = 50) -> dict[str, Any]:
        started = time.perf_counter()
        result = original(current_user=current_user, filters=filters, page=page, page_size=page_size)
        primary_ms = round((time.perf_counter() - started) * 1000, 2)
        if (result.get("total") or 0) > 0 or result.get("items"):
            logger.info(
                "chronology_primary_hit young_person_id=%s items=%s total=%s primary_ms=%s",
                (filters or {}).get("young_person_id"),
                len(result.get("items") or []),
                result.get("total"),
                primary_ms,
            )
            return result

        filters_in = filters or {}
        conn = get_db_connection()
        try:
            probe_started = time.perf_counter()
            if _dedicated_chronology_has_rows(conn, current_user=current_user, filters=filters_in):
                probe_ms = round((time.perf_counter() - probe_started) * 1000, 2)
                logger.info(
                    "chronology_fallback_skipped dedicated_rows_exist young_person_id=%s primary_ms=%s probe_ms=%s",
                    filters_in.get("young_person_id"),
                    primary_ms,
                    probe_ms,
                )
                return result

            fallback_started = time.perf_counter()
            fallback_items = []
            docs = list_documents(conn, current_user=current_user, filters=filters_in, limit=200)
            docs_ms = round((time.perf_counter() - fallback_started) * 1000, 2)
            fallback_items.extend(_event_from_document(item) for item in docs)

            actions_started = time.perf_counter()
            fallback_items.extend(_event_from_action(item) for item in list_actions(conn, current_user=current_user, filters=filters_in, limit=200))
            actions_ms = round((time.perf_counter() - actions_started) * 1000, 2)

            evidence_started = time.perf_counter()
            fallback_items.extend(_event_from_evidence(item) for item in list_evidence(conn, current_user=current_user, filters=filters_in, limit=200))
            evidence_ms = round((time.perf_counter() - evidence_started) * 1000, 2)
        finally:
            release_db_connection(conn)

        fallback_items.sort(key=lambda item: item.get("date_time") or "", reverse=True)
        page = max(1, int(page or 1))
        page_size = max(1, min(int(page_size or 50), 200))
        start = (page - 1) * page_size
        end = start + page_size
        total_ms = round((time.perf_counter() - started) * 1000, 2)
        if fallback_items:
            logger.info(
                "chronology_fallback_recovery young_person_id=%s count=%s primary_ms=%s docs_ms=%s actions_ms=%s evidence_ms=%s total_ms=%s",
                filters_in.get("young_person_id"),
                len(fallback_items),
                primary_ms,
                docs_ms,
                actions_ms,
                evidence_ms,
                total_ms,
            )
        return {
            "items": fallback_items[start:end],
            "page": page,
            "page_size": page_size,
            "total": len(fallback_items),
            "has_more": end < len(fallback_items),
        }

    patched_list_chronology._indicare_chronology_fallback_patched = True  # type: ignore[attr-defined]
    chronology_service.list_chronology = patched_list_chronology
    workspace_repo = sys.modules.get("repositories.workspaces_repository")
    if workspace_repo is not None:
        setattr(workspace_repo, "list_chronology", patched_list_chronology)


apply()
