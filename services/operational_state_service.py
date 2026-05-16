from __future__ import annotations

import hashlib
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any, Iterable

from schemas.operational_state import (
    AssistantContextBriefDTO,
    EvidenceRelationshipDTO,
    OperationalLink,
    OperationalQueueDTO,
    OperationalSearchRequest,
    OperationalSearchResultDTO,
    OperationalStateDTO,
    OperationalStateSnapshotDTO,
)

COMPLETE_STATUSES = {"completed", "complete", "closed", "done", "resolved", "approved", "archived"}
PRIORITY_SCORE = {"urgent": 100, "high": 82, "medium": 60, "low": 35, "info": 15}


def _now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(item).strip() for item in value if str(item or "").strip()]
    text = str(value).strip()
    return [item.strip() for item in text.split(",") if item.strip()] if "," in text else ([text] if text else [])


def _first(row: dict[str, Any], keys: Iterable[str], default: str = "") -> str:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return str(value)
    return default


def _normalise_priority(value: Any, *, default: str = "medium") -> str:
    token = _lower(value).replace("-", "_").replace(" ", "_")
    if token in {"critical", "urgent"}:
        return "urgent"
    if token in {"high", "medium", "low"}:
        return token
    if token in {"info", "informational"}:
        return "low"
    return default


def _is_open(value: Any) -> bool:
    return _lower(value).replace("-", "_").replace(" ", "_") not in COMPLETE_STATUSES


def _hash_id(*parts: Any) -> str:
    raw = ":".join(_text(part) for part in parts if _text(part))
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _date(row: dict[str, Any]) -> str:
    value = row.get("updated_at") or row.get("created_at") or row.get("date_time") or row.get("uploaded_at") or row.get("due_date")
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return _text(value) or _now()


def _href(source_type: str, source_id: str, young_person_id: str | None = None) -> str:
    if source_type in {"chronology", "os_chronology", "daily_log", "care_record"}:
        return f"/chronology/{source_id}" if source_id else "/chronology"
    if "safeguard" in source_type or "missing" in source_type:
        return "/safeguarding"
    if "incident" in source_type:
        return f"/incidents/{source_id}" if source_id else "/incidents"
    if "document" in source_type or "reg44" in source_type:
        return f"/documents/{source_id}" if source_id else "/documents"
    if "evidence" in source_type or "standard" in source_type:
        return f"/evidence/{source_id}" if source_id else "/evidence"
    if "action" in source_type or "task" in source_type:
        return f"/actions/{source_id}" if source_id else "/actions"
    if young_person_id:
        return f"/young-people/{young_person_id}"
    return "/dashboard"


def _link(row: dict[str, Any], link_type: str, fallback_type: str) -> OperationalLink:
    source_type = _first(row, ["source_type", "record_type", "type", "original_table"], fallback_type)
    source_id = _first(row, ["source_id", "id", "original_id", "record_id"], "")
    title = _first(row, ["title", "summary", "description", "document_type"], source_type.replace("_", " ").title())
    young_person_id = _first(row, ["young_person_id", "youngPersonId"], "")
    return OperationalLink(
        link_type=link_type,
        id=source_id or _hash_id(source_type, title),
        label=title[:140],
        href=_href(source_type, source_id, young_person_id or None),
        source_type=source_type,
    )


def _state(
    *,
    state_type: str,
    category: str,
    title: str,
    reason: str,
    next_action: str,
    source: dict[str, Any],
    priority: str = "medium",
    severity: str | None = None,
    evidence_links: list[OperationalLink] | None = None,
    chronology_links: list[OperationalLink] | None = None,
    regulation_relevance: list[str] | None = None,
    review_required: bool = True,
    resolved: bool = False,
    status: str = "needs_review",
    refresh_events: list[str] | None = None,
) -> OperationalStateDTO:
    source_type = _first(source, ["source_type", "record_type", "type", "original_table"], state_type)
    source_id = _first(source, ["source_id", "id", "original_id", "record_id"], _hash_id(source_type, reason))
    priority_value = _normalise_priority(priority)
    created_at = _date(source)
    return OperationalStateDTO(
        id=f"{state_type}:{source_type}:{source_id}:{_hash_id(reason, next_action)}",
        state_type=state_type,
        category=category,
        title=title,
        severity=(severity or priority_value),  # type: ignore[arg-type]
        priority=priority_value,  # type: ignore[arg-type]
        priority_score=PRIORITY_SCORE.get(priority_value, 60),
        scope_type="child" if source.get("young_person_id") else "staff" if source.get("staff_id") else "home" if source.get("home_id") else "provider",
        linked_child_id=_text(source.get("young_person_id") or source.get("youngPersonId")) or None,
        linked_staff_id=_text(source.get("staff_id") or source.get("assigned_to_staff_id") or source.get("assigned_to_user_id")) or None,
        linked_home_id=_text(source.get("home_id") or source.get("homeId")) or None,
        linked_document_id=_text(source.get("document_id") or source.get("id")) if "document" in source_type else None,
        reason=reason,
        created_at=created_at,
        updated_at=_date(source),
        next_action=next_action,
        evidence_links=evidence_links or [],
        chronology_links=chronology_links or [],
        regulation_relevance=sorted(set(regulation_relevance or [])),
        review_required=review_required,
        resolved=resolved,
        status="resolved" if resolved else status,
        source_type=source_type,
        source_id=source_id,
        refresh_events=refresh_events or ["operational_state_changed", "dashboard_refresh_required"],
    )


class OperationalStateService:
    """Deterministic operational state facade over existing OS records.

    This service does not infer safeguarding conclusions. It surfaces workflow,
    evidence and chronology indicators that need professional review.
    """

    def build_snapshot(
        self,
        *,
        current_user: dict[str, Any],
        chronology: list[dict[str, Any]] | None = None,
        actions: list[dict[str, Any]] | None = None,
        evidence: list[dict[str, Any]] | None = None,
        documents: list[dict[str, Any]] | None = None,
        workforce: list[dict[str, Any]] | None = None,
        scope: dict[str, Any] | None = None,
        search: OperationalSearchRequest | None = None,
        include_resolved: bool = False,
    ) -> OperationalStateSnapshotDTO:
        scope = {key: value for key, value in (scope or {}).items() if value not in (None, "", [], {})}
        states = self.calculate_states(
            chronology=chronology or [],
            actions=actions or [],
            evidence=evidence or [],
            documents=documents or [],
            workforce=workforce or [],
        )
        if not include_resolved:
            states = [state for state in states if not state.resolved]
        states = self._filter_scope(states, scope)
        states = sorted(states, key=lambda item: (item.priority_score, item.updated_at), reverse=True)
        queues = self.build_queues(states)
        relationships = self.build_evidence_relationships(
            states=states,
            chronology=chronology or [],
            actions=actions or [],
            evidence=evidence or [],
            documents=documents or [],
        )
        search_results = self.search(
            request=search or OperationalSearchRequest(),
            states=states,
            chronology=chronology or [],
            actions=actions or [],
            evidence=evidence or [],
            documents=documents or [],
        )
        generated_at = _now()
        return OperationalStateSnapshotDTO(
            generated_at=generated_at,
            scope=scope,
            states=states,
            queues=queues,
            evidence_relationships=relationships,
            search_results=search_results,
            assistant_context=self.build_assistant_context(scope=scope, states=states, queues=queues, relationships=relationships),
            summary={
                "total": len(states),
                "review_required": sum(1 for state in states if state.review_required),
                "urgent": sum(1 for state in states if state.priority == "urgent"),
                "high": sum(1 for state in states if state.priority == "high"),
                "evidence_linked": sum(1 for state in states if state.evidence_links),
                "chronology_linked": sum(1 for state in states if state.chronology_links),
                "permission_scope": {
                    "role": current_user.get("role"),
                    "home_id": current_user.get("home_id") or current_user.get("homeId"),
                },
            },
            refresh={
                "events": sorted({event for state in states for event in state.refresh_events}),
                "strategy": "refresh derived operational state after source record, chronology, evidence, document or governance changes",
                "chronology_aware": True,
                "dashboard_aware": True,
            },
        )

    def calculate_states(
        self,
        *,
        chronology: list[dict[str, Any]],
        actions: list[dict[str, Any]],
        evidence: list[dict[str, Any]],
        documents: list[dict[str, Any]],
        workforce: list[dict[str, Any]],
    ) -> list[OperationalStateDTO]:
        states: list[OperationalStateDTO] = []
        states.extend(self._action_states(actions))
        states.extend(self._chronology_states(chronology))
        states.extend(self._evidence_states(evidence))
        states.extend(self._document_states(documents))
        states.extend(self._staff_states(workforce))
        return self._dedupe_states(states)

    def _action_states(self, actions: list[dict[str, Any]]) -> list[OperationalStateDTO]:
        states: list[OperationalStateDTO] = []
        for action in actions:
            if not _is_open(action.get("status")):
                continue
            source_text = " ".join([_lower(action.get("source_type")), _lower(action.get("title")), _lower(action.get("description")), _lower(action.get("regulation"))])
            priority = _normalise_priority(action.get("priority"), default="high" if action.get("status") == "overdue" else "medium")
            if _lower(action.get("status")) == "overdue":
                state_type, category, title = "overdue_review", "workflow", "Review overdue"
                reason = "An open action is overdue or marked late."
                next_action = "Review the source record, update the action owner and record progress."
            elif "inspection" in source_text or "reg44" in source_text or "reg45" in source_text or "annex" in source_text:
                state_type, category, title = "inspection_action", "inspection", "Inspection follow-up required"
                reason = "An inspection or regulatory action remains open."
                next_action = "Link supporting evidence and confirm whether manager sign-off is needed."
            elif action.get("evidence_required"):
                state_type, category, title = "missing_evidence", "evidence", "Evidence overdue"
                reason = "The action identifies evidence that still needs to be gathered or linked."
                next_action = "Attach evidence or record why it is not yet available."
            else:
                state_type, category, title = "management_oversight", "workflow", "Follow-up required"
                reason = "An operational action is open in the current scope."
                next_action = "Review the action and record the next accountable step."
            states.append(
                _state(
                    state_type=state_type,
                    category=category,
                    title=title,
                    reason=reason,
                    next_action=next_action,
                    source=action,
                    priority=priority,
                    evidence_links=[_link({"id": item, "source_type": "evidence", "title": item}, "evidence", "evidence") for item in _list(action.get("evidence_ids"))],
                    regulation_relevance=_list(action.get("regulation")),
                    refresh_events=["action_changed", "operational_queue_refresh", "dashboard_refresh_required"],
                )
            )
        return states

    def _chronology_states(self, chronology: list[dict[str, Any]]) -> list[OperationalStateDTO]:
        states: list[OperationalStateDTO] = []
        for event in chronology:
            text = " ".join(
                [
                    _lower(event.get("title")),
                    _lower(event.get("summary")),
                    _lower(event.get("full_text")),
                    _lower(event.get("category")),
                    " ".join(_lower(tag) for tag in _list(event.get("tags"))),
                ]
            )
            source_type = _lower(event.get("source_type"))
            safeguarding = bool(event.get("safeguarding_flags")) or "safeguard" in text or source_type in {"safeguarding", "risk_assessment", "risk_review"}
            incident = "incident" in source_type or "incident" in text or "restraint" in text
            missing = "missing" in source_type or "missing episode" in text or "unauthorised absence" in text
            voice_visible = any(term in text for term in ["child voice", "said", "told", "wanted", "wishes", "felt"])
            oversight_visible = any(term in text for term in ["manager", "oversight", "review", "rm", "ri", "sign-off", "signoff"])
            chronology_link = [_link(event, "chronology", "chronology")]
            regulation = _list(event.get("regulation_refs") or event.get("regulation_links") or event.get("sccif_area"))
            if missing:
                states.append(
                    _state(
                        state_type="missing_episode_active",
                        category="safeguarding",
                        title="Missing episode needs review",
                        reason="Chronology contains a missing episode indicator.",
                        next_action="Check return interview status, risk review and chronology linkage.",
                        source=event,
                        priority="urgent",
                        chronology_links=chronology_link,
                        regulation_relevance=regulation or ["Reg 12", "Reg 40", "SCCIF help and protection"],
                        refresh_events=["chronology_changed", "safeguarding_dashboard_refresh", "operational_queue_refresh"],
                    )
                )
            if safeguarding or incident:
                states.append(
                    _state(
                        state_type="safeguarding_follow_up",
                        category="safeguarding",
                        title="Safeguarding follow-up required",
                        reason="A safeguarding, risk or incident chronology marker is visible.",
                        next_action="Review source records, evidence links and manager oversight before relying on the entry.",
                        source=event,
                        priority="high" if safeguarding else "medium",
                        chronology_links=chronology_link,
                        regulation_relevance=regulation or ["Reg 12", "SCCIF help and protection"],
                        refresh_events=["chronology_changed", "safeguarding_dashboard_refresh", "dashboard_refresh_required"],
                    )
                )
                if not oversight_visible:
                    states.append(
                        _state(
                            state_type="practice_oversight_required",
                            category="governance",
                            title="Practice oversight required",
                            reason="Manager oversight is not visible on a safeguarding or incident-linked chronology item.",
                            next_action="Record manager review or confirm why oversight is not required.",
                            source=event,
                            priority="high",
                            chronology_links=chronology_link,
                            regulation_relevance=regulation or ["Leadership and management"],
                            refresh_events=["manager_review_changed", "governance_dashboard_refresh"],
                        )
                    )
                if not voice_visible:
                    states.append(
                        _state(
                            state_type="child_voice_missing",
                            category="child",
                            title="Child voice missing",
                            reason="Visible wording does not show the child's voice, wishes or feelings.",
                            next_action="Add the child's words or explain why this was not possible.",
                            source=event,
                            priority="medium",
                            chronology_links=chronology_link,
                            regulation_relevance=["Reg 7", "SCCIF experiences and progress"],
                            refresh_events=["chronology_changed", "child_overview_refresh"],
                        )
                    )
        return states

    def _evidence_states(self, evidence: list[dict[str, Any]]) -> list[OperationalStateDTO]:
        states: list[OperationalStateDTO] = []
        for item in evidence:
            quality = _lower(item.get("quality"))
            if quality not in {"draft", "partial", "review_required", "weak", "gap"}:
                continue
            states.append(
                _state(
                    state_type="evidence_gap",
                    category="evidence",
                    title="Evidence needs review",
                    reason="Evidence is draft, partial or marked review required.",
                    next_action="Review source quality before using this evidence for inspection readiness.",
                    source=item,
                    priority="high" if quality in {"review_required", "gap"} else "medium",
                    evidence_links=[_link(item, "evidence", "evidence")],
                    regulation_relevance=_list(item.get("linked_regulation")),
                    refresh_events=["evidence_changed", "inspection_dashboard_refresh", "dashboard_refresh_required"],
                )
            )
        return states

    def _document_states(self, documents: list[dict[str, Any]]) -> list[OperationalStateDTO]:
        states: list[OperationalStateDTO] = []
        for document in documents:
            status = _lower(document.get("status"))
            doc_type = _lower(document.get("document_type") or document.get("category"))
            if status not in {"review_required", "action_plan_open", "processing", "draft", "unsigned"} and "reg44" not in doc_type and "reg45" not in doc_type:
                continue
            if status in {"review_required", "draft", "unsigned"}:
                state_type, title, reason, action = "document_signoff_required", "Awaiting sign-off", "A document is awaiting review or sign-off.", "Review the document and record sign-off or next steps."
            elif "reg44" in doc_type:
                state_type, title, reason, action = "reg44_evidence_gap", "Reg 44 evidence gap", "Reg 44 evidence or follow-up is visible for review.", "Check evidence links and management response."
            elif "reg45" in doc_type:
                state_type, title, reason, action = "reg45_review_due", "Reg 45 review required", "Reg 45 evidence or review material is visible for review.", "Check review evidence and leadership sign-off."
            else:
                state_type, title, reason, action = "stale_evidence", "Evidence review recommended", "Document processing or action planning is still open.", "Confirm whether evidence is ready to rely on."
            states.append(
                _state(
                    state_type=state_type,
                    category="inspection" if "reg44" in doc_type or "reg45" in doc_type else "documents",
                    title=title,
                    reason=reason,
                    next_action=action,
                    source=document,
                    priority="high" if status in {"review_required", "unsigned"} else "medium",
                    evidence_links=[_link(document, "document", "document")],
                    regulation_relevance=_list(document.get("regulation")) or (["Reg 44"] if "reg44" in doc_type else ["Reg 45"] if "reg45" in doc_type else []),
                    refresh_events=["document_changed", "inspection_dashboard_refresh", "governance_dashboard_refresh"],
                )
            )
        return states

    def _staff_states(self, workforce: list[dict[str, Any]]) -> list[OperationalStateDTO]:
        states: list[OperationalStateDTO] = []
        for member in workforce:
            text = " ".join([_lower(member.get("status")), _lower(member.get("training_status")), _lower(member.get("supervision_status")), _lower(member.get("dbs_status"))])
            checks = [
                ("training_expiring", "Training expiring", "Training is expiring or overdue.", "Review training evidence and booking status.", "training"),
                ("supervision_overdue", "Supervision overdue", "Supervision appears overdue or not visible.", "Check supervision record and next booked date.", "supervision"),
                ("dbs_check_expiring", "DBS/check expiring", "DBS or safer recruitment check appears expiring.", "Review safer recruitment evidence.", "dbs"),
                ("probation_review_due", "Probation review due", "Probation review appears due.", "Confirm review date and manager sign-off.", "probation"),
            ]
            for state_type, title, reason, action, term in checks:
                if term in text and any(flag in text for flag in ["overdue", "expir", "due", "review"]):
                    states.append(
                        _state(
                            state_type=state_type,
                            category="staff",
                            title=title,
                            reason=reason,
                            next_action=action,
                            source={**member, "source_type": "staff", "source_id": member.get("id")},
                            priority="high",
                            refresh_events=["staff_compliance_changed", "governance_dashboard_refresh"],
                        )
                    )
        return states

    def build_queues(self, states: list[OperationalStateDTO]) -> list[OperationalQueueDTO]:
        groups: dict[str, list[OperationalStateDTO]] = defaultdict(list)
        for state in states:
            groups[self._queue_type(state)].append(state)
        queues: list[OperationalQueueDTO] = []
        for queue_type, items in groups.items():
            ordered = sorted(items, key=lambda item: (item.priority_score, item.updated_at), reverse=True)
            top = ordered[0]
            queues.append(
                OperationalQueueDTO(
                    id=f"queue:{queue_type}",
                    queue_type=queue_type,
                    title=self._queue_title(queue_type),
                    count=len(items),
                    highest_priority=top.priority,
                    highest_priority_score=top.priority_score,
                    status=top.status,
                    reason=top.reason,
                    next_action=top.next_action,
                    operational_state_ids=[item.id for item in ordered],
                    linked_child_ids=sorted({item.linked_child_id for item in items if item.linked_child_id}),
                    linked_staff_ids=sorted({item.linked_staff_id for item in items if item.linked_staff_id}),
                    linked_home_ids=sorted({item.linked_home_id for item in items if item.linked_home_id}),
                    evidence_links=self._unique_links([link for item in ordered for link in item.evidence_links])[:8],
                    chronology_links=self._unique_links([link for item in ordered for link in item.chronology_links])[:8],
                    regulation_relevance=sorted({reg for item in items for reg in item.regulation_relevance}),
                    updated_at=max(item.updated_at for item in items),
                )
            )
        return sorted(queues, key=lambda item: (item.highest_priority_score, item.count), reverse=True)

    def build_evidence_relationships(
        self,
        *,
        states: list[OperationalStateDTO],
        chronology: list[dict[str, Any]],
        actions: list[dict[str, Any]],
        evidence: list[dict[str, Any]],
        documents: list[dict[str, Any]],
    ) -> list[EvidenceRelationshipDTO]:
        relationships: list[EvidenceRelationshipDTO] = []
        states_by_evidence = defaultdict(list)
        for state in states:
            for link in state.evidence_links:
                states_by_evidence[link.id].append(state.id)
        for item in evidence:
            source_id = _first(item, ["source_id", "id", "original_id"], "")
            source_type = _first(item, ["source_type", "original_table"], "evidence")
            regulation = _list(item.get("linked_regulation"))
            relationships.append(
                EvidenceRelationshipDTO(
                    id=f"evidence:{_hash_id(source_type, source_id)}",
                    relationship_type="supports_operational_readiness" if regulation else "source_evidence",
                    source_type=source_type,
                    source_id=source_id,
                    source_label=_first(item, ["title", "description"], "Evidence item"),
                    target_type="regulation" if regulation else "operational_record",
                    target_id=regulation[0] if regulation else source_id,
                    target_label=regulation[0] if regulation else source_type.replace("_", " ").title(),
                    regulation_relevance=regulation,
                    chronology_event_ids=_list(item.get("chronology_event_id")),
                    operational_state_ids=states_by_evidence.get(source_id, []),
                    used_in_inspection_readiness=bool(regulation or "inspection" in _lower(source_type)),
                )
            )
        for collection, source_name in [(chronology, "chronology"), (actions, "action"), (documents, "document")]:
            for row in collection:
                for evidence_id in _list(row.get("evidence_ids") or row.get("linked_evidence")):
                    source_id = _first(row, ["source_id", "id", "original_id"], "")
                    source_type = _first(row, ["source_type", "record_type", "document_type"], source_name)
                    relationships.append(
                        EvidenceRelationshipDTO(
                            id=f"{source_name}:{_hash_id(source_type, source_id, evidence_id)}",
                            relationship_type=f"{source_name}_to_evidence",
                            source_type=source_type,
                            source_id=source_id,
                            source_label=_first(row, ["title", "summary", "description"], source_type.replace("_", " ").title()),
                            target_type="evidence",
                            target_id=evidence_id,
                            target_label=evidence_id,
                            regulation_relevance=_list(row.get("regulation") or row.get("regulation_refs") or row.get("sccif_area")),
                            chronology_event_ids=[source_id] if source_name == "chronology" else [],
                            operational_state_ids=states_by_evidence.get(evidence_id, []),
                            used_in_inspection_readiness=source_name == "document" or bool(row.get("regulation")),
                        )
                    )
        return self._dedupe_relationships(relationships)[:250]

    def search(
        self,
        *,
        request: OperationalSearchRequest,
        states: list[OperationalStateDTO],
        chronology: list[dict[str, Any]],
        actions: list[dict[str, Any]],
        evidence: list[dict[str, Any]],
        documents: list[dict[str, Any]],
    ) -> list[OperationalSearchResultDTO]:
        query = _lower(request.query)
        results: list[OperationalSearchResultDTO] = []
        for state in states:
            haystack = _lower(f"{state.title} {state.reason} {state.next_action} {state.state_type} {' '.join(state.regulation_relevance)}")
            if request.state_type and state.state_type != request.state_type:
                continue
            if request.unresolved_only and state.resolved:
                continue
            if request.safeguarding_relevant and state.category != "safeguarding":
                continue
            if request.evidence_gaps_only and state.category != "evidence":
                continue
            if request.regulation and request.regulation.lower() not in haystack:
                continue
            if query and query not in haystack:
                continue
            results.append(
                OperationalSearchResultDTO(
                    id=state.id,
                    result_type="operational_state",
                    title=state.title,
                    summary=state.reason,
                    href=self._state_href(state),
                    priority=state.priority,
                    source_type=state.source_type,
                    source_id=state.source_id,
                    linked_child_id=state.linked_child_id,
                    linked_staff_id=state.linked_staff_id,
                    linked_home_id=state.linked_home_id,
                    evidence_links=state.evidence_links,
                    chronology_links=state.chronology_links,
                    regulation_relevance=state.regulation_relevance,
                )
            )
        results.extend(self._record_search_results("chronology", chronology, query, request))
        results.extend(self._record_search_results("action", actions, query, request))
        results.extend(self._record_search_results("evidence", evidence, query, request))
        results.extend(self._record_search_results("document", documents, query, request))
        return sorted(results, key=lambda item: PRIORITY_SCORE.get(item.priority, 60), reverse=True)[: max(1, min(request.limit, 100))]

    def build_assistant_context(
        self,
        *,
        scope: dict[str, Any],
        states: list[OperationalStateDTO],
        queues: list[OperationalQueueDTO],
        relationships: list[EvidenceRelationshipDTO],
    ) -> AssistantContextBriefDTO:
        highest = states[:5]
        return AssistantContextBriefDTO(
            scope=scope,
            operational_state_ids=[state.id for state in highest],
            highest_priority_states=highest,
            queue_summary=queues[:6],
            evidence_relationship_count=len(relationships),
            chronology_link_count=sum(1 for state in states if state.chronology_links),
            guardrails=[
                "Use operational states as review indicators, not conclusions.",
                "Do not infer safeguarding decisions without cited records.",
                "Prefer minimal, permission-scoped context.",
            ],
        )

    def _record_search_results(
        self,
        result_type: str,
        rows: list[dict[str, Any]],
        query: str,
        request: OperationalSearchRequest,
    ) -> list[OperationalSearchResultDTO]:
        results: list[OperationalSearchResultDTO] = []
        for row in rows:
            title = _first(row, ["title", "summary", "description", "document_type"], result_type.replace("_", " ").title())
            summary = _first(row, ["summary", "description", "full_text", "extracted_text"], "Record available for review.")
            regulation = _list(row.get("regulation") or row.get("regulation_refs") or row.get("linked_regulation") or row.get("sccif_area"))
            haystack = _lower(f"{title} {summary} {' '.join(regulation)} {row.get('source_type')}")
            if query and query not in haystack:
                continue
            if request.safeguarding_relevant and "safeguard" not in haystack and "risk" not in haystack:
                continue
            if request.evidence_gaps_only and result_type != "evidence":
                continue
            if request.regulation and request.regulation.lower() not in haystack:
                continue
            source_type = _first(row, ["source_type", "record_type", "document_type"], result_type)
            source_id = _first(row, ["source_id", "id", "original_id"], "")
            results.append(
                OperationalSearchResultDTO(
                    id=f"{result_type}:{source_type}:{source_id}",
                    result_type=result_type,
                    title=title,
                    summary=summary,
                    href=_href(source_type, source_id, _text(row.get("young_person_id")) or None),
                    priority=_normalise_priority(row.get("priority") or row.get("severity") or ("high" if "safeguard" in haystack else "medium")),  # type: ignore[arg-type]
                    source_type=source_type,
                    source_id=source_id,
                    linked_child_id=_text(row.get("young_person_id")) or None,
                    linked_staff_id=_text(row.get("staff_id") or row.get("assigned_to_staff_id")) or None,
                    linked_home_id=_text(row.get("home_id")) or None,
                    evidence_links=[_link({"id": item, "source_type": "evidence", "title": item}, "evidence", "evidence") for item in _list(row.get("evidence_ids") or row.get("linked_evidence"))],
                    chronology_links=[_link(row, "chronology", "chronology")] if result_type == "chronology" else [],
                    regulation_relevance=regulation,
                )
            )
        return results

    def _filter_scope(self, states: list[OperationalStateDTO], scope: dict[str, Any]) -> list[OperationalStateDTO]:
        result = states
        if scope.get("young_person_id"):
            result = [state for state in result if state.linked_child_id in {None, str(scope["young_person_id"])}]
        if scope.get("staff_id"):
            result = [state for state in result if state.linked_staff_id in {None, str(scope["staff_id"])}]
        if scope.get("home_id"):
            result = [state for state in result if state.linked_home_id in {None, str(scope["home_id"])}]
        if scope.get("state_type"):
            result = [state for state in result if state.state_type == scope["state_type"]]
        return result

    def _dedupe_states(self, states: list[OperationalStateDTO]) -> list[OperationalStateDTO]:
        seen: set[str] = set()
        result: list[OperationalStateDTO] = []
        for state in states:
            key = f"{state.state_type}:{state.source_type}:{state.source_id}:{state.linked_child_id}:{state.linked_staff_id}"
            if key in seen:
                continue
            seen.add(key)
            result.append(state)
        return result

    def _dedupe_relationships(self, relationships: list[EvidenceRelationshipDTO]) -> list[EvidenceRelationshipDTO]:
        seen: set[str] = set()
        result: list[EvidenceRelationshipDTO] = []
        for relationship in relationships:
            key = f"{relationship.relationship_type}:{relationship.source_type}:{relationship.source_id}:{relationship.target_type}:{relationship.target_id}"
            if key in seen:
                continue
            seen.add(key)
            result.append(relationship)
        return result

    def _unique_links(self, links: list[OperationalLink]) -> list[OperationalLink]:
        seen: set[str] = set()
        result: list[OperationalLink] = []
        for link in links:
            key = f"{link.link_type}:{link.source_type}:{link.id}"
            if key in seen:
                continue
            seen.add(key)
            result.append(link)
        return result

    def _queue_type(self, state: OperationalStateDTO) -> str:
        if state.state_type in {"safeguarding_follow_up", "missing_episode_active", "child_voice_missing"}:
            return "safeguarding_follow_up"
        if state.state_type in {"overdue_review", "management_oversight"}:
            return "overdue_reviews"
        if state.state_type in {"evidence_gap", "missing_evidence", "stale_evidence"}:
            return "missing_evidence"
        if state.state_type in {"document_signoff_required"}:
            return "unsigned_documents"
        if state.state_type in {"inspection_action", "reg44_evidence_gap", "reg45_review_due"}:
            return "inspection_actions"
        if state.category == "staff":
            return "staff_compliance_actions"
        if state.category == "governance":
            return "management_oversight_actions"
        return "unresolved_operational_states"

    def _queue_title(self, queue_type: str) -> str:
        return {
            "safeguarding_follow_up": "Safeguarding follow-up",
            "overdue_reviews": "Overdue reviews",
            "missing_evidence": "Missing evidence",
            "unsigned_documents": "Awaiting sign-off",
            "inspection_actions": "Inspection actions",
            "staff_compliance_actions": "Staff compliance actions",
            "management_oversight_actions": "Management oversight",
            "unresolved_operational_states": "Operational states",
        }.get(queue_type, queue_type.replace("_", " ").title())

    def _state_href(self, state: OperationalStateDTO) -> str:
        if state.linked_child_id:
            return f"/young-people/{state.linked_child_id}"
        if state.category == "safeguarding":
            return "/safeguarding"
        if state.category == "inspection":
            return "/ofsted-readiness"
        if state.category == "staff":
            return "/staff"
        if state.category == "evidence":
            return "/evidence"
        if state.category == "governance":
            return "/settings"
        return "/dashboard"


operational_state_service = OperationalStateService()
