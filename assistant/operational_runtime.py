from __future__ import annotations

"""Operational Copilot runtime for IndiCare OS assistant.

This module coordinates retrieval, intent routing, intelligence modules and
rendering hints into one Copilot-ready payload. It is the beginning of the
runtime layer that makes the assistant behave coherently rather than as isolated
features.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.action_extraction import extract_actions, serialise_action_extraction
from assistant.chronology_drafting import build_chronology_draft, serialise_chronology_draft
from assistant.evidence_retrieval_orchestrator import retrieve_relevant_evidence, serialise_evidence_retrieval
from assistant.inspection_evidence_pack import build_inspection_evidence_pack, serialise_inspection_evidence_pack
from assistant.management_summary_builder import build_management_summary, serialise_management_summary
from assistant.operational_dashboard import build_operational_dashboard, serialise_operational_dashboard
from assistant.quality_scoring import build_quality_score, serialise_quality_score
from assistant.real_time_alerts import build_real_time_alerts, serialise_real_time_alerts
from assistant.structured_safeguarding_review import build_structured_safeguarding_review, serialise_structured_safeguarding_review


INTENT_KEYWORDS = {
    "safeguarding_review": {"safeguarding", "risk", "missing", "exploitation", "self-harm", "strategy", "lado"},
    "chronology": {"chronology", "timeline", "sequence", "history", "multi-agency"},
    "actions": {"action", "actions", "overdue", "task", "follow up", "owner"},
    "inspection": {"inspection", "ofsted", "reg 45", "reg45", "evidence pack", "sccif"},
    "dashboard": {"dashboard", "overview", "position", "status", "today"},
    "quality": {"quality", "score", "benchmark", "assurance", "governance"},
    "handover": {"handover", "shift", "briefing"},
}


@dataclass(frozen=True)
class RuntimePlan:
    intent: str
    modules: list[str]
    cards: list[str]
    response_style: str
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class OperationalRuntimeResult:
    query: str
    assistant_surface: str
    role: str
    intent: str
    plan: RuntimePlan
    retrieved_evidence: dict[str, Any]
    modules: dict[str, Any] = field(default_factory=dict)
    cards: list[dict[str, Any]] = field(default_factory=list)
    citations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _dedupe(items: list[str]) -> list[str]:
    output: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = _safe_string(item)
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(text)
    return output


def detect_runtime_intent(query: str) -> str:
    lowered = _safe_string(query).lower()
    scores: dict[str, int] = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        scores[intent] = sum(1 for keyword in keywords if keyword in lowered)
    best_intent, best_score = max(scores.items(), key=lambda item: item[1])
    return best_intent if best_score else "general_answer"


def build_runtime_plan(*, query: str, role: str = "manager") -> RuntimePlan:
    intent = detect_runtime_intent(query)

    if intent == "safeguarding_review":
        modules = ["retrieval", "safeguarding_review", "alerts", "actions", "dashboard"]
        cards = ["safeguarding_review", "alerts", "actions", "citations"]
        response_style = "safeguarding_review"
    elif intent == "chronology":
        modules = ["retrieval", "chronology_draft", "dashboard"]
        cards = ["chronology", "evidence", "gaps", "citations"]
        response_style = "chronology"
    elif intent == "actions":
        modules = ["retrieval", "actions", "alerts", "dashboard"]
        cards = ["actions", "alerts", "citations"]
        response_style = "action_summary"
    elif intent == "inspection":
        modules = ["retrieval", "inspection_evidence_pack", "quality_score", "management_summary"]
        cards = ["inspection_pack", "quality_score", "evidence_gaps", "citations"]
        response_style = "inspection_readiness"
    elif intent == "quality":
        modules = ["retrieval", "quality_score", "management_summary", "dashboard"]
        cards = ["quality_score", "management_summary", "citations"]
        response_style = "quality_review"
    elif intent == "handover":
        modules = ["retrieval", "dashboard", "alerts", "actions"]
        cards = ["shift_handover", "alerts", "actions", "citations"]
        response_style = "handover"
    elif intent == "dashboard":
        modules = ["retrieval", "dashboard", "alerts", "management_summary"]
        cards = ["dashboard", "alerts", "summary", "citations"]
        response_style = "dashboard_overview"
    else:
        modules = ["retrieval", "dashboard", "management_summary"]
        cards = ["summary", "citations"]
        response_style = "general_operational_answer"

    warnings: list[str] = []
    if _safe_string(role).lower() in {"rsw", "support worker", "residential support worker"} and intent in {"quality", "inspection"}:
        warnings.append("frontline_role_quality_or_inspection_request_needs_manager_review")

    return RuntimePlan(intent=intent, modules=modules, cards=cards, response_style=response_style, warnings=warnings)


def _collect_citations(payload: Any, limit: int = 60) -> list[str]:
    refs: list[str] = []

    def walk(value: Any) -> None:
        if len(refs) >= limit:
            return
        if isinstance(value, dict):
            for key in ("citation_ref", "evidence_ref"):
                ref = _safe_string(value.get(key))
                if ref and ref not in refs:
                    refs.append(ref)
            for key in ("citation_refs", "evidence_refs", "citations"):
                maybe = value.get(key)
                if isinstance(maybe, list):
                    for candidate in maybe:
                        ref = _safe_string(candidate)
                        if ref and ref not in refs:
                            refs.append(ref)
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(payload)
    return refs[:limit]


def _collect_warnings(payload: Any, limit: int = 60) -> list[str]:
    warnings: list[str] = []

    def walk(value: Any) -> None:
        if len(warnings) >= limit:
            return
        if isinstance(value, dict):
            maybe = value.get("warnings")
            if isinstance(maybe, list):
                warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(payload)
    return _dedupe(warnings)[:limit]


def _runtime_card(key: str, title: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "key": key,
        "title": title,
        "payload": payload,
        "citations": _collect_citations(payload, limit=20),
        "warnings": _collect_warnings(payload, limit=20),
    }


def run_operational_runtime(
    *,
    query: str,
    evidence_index: list[dict[str, Any]] | None,
    role: str = "manager",
    assistant_surface: str = "os_embedded",
    scope_type: str = "home",
) -> OperationalRuntimeResult:
    safe_query = _safe_string(query)
    evidence = evidence_index if isinstance(evidence_index, list) else []
    plan = build_runtime_plan(query=safe_query, role=role)

    retrieval = serialise_evidence_retrieval(
        retrieve_relevant_evidence(query=safe_query, evidence_index=evidence, limit=16)
    )

    retrieved_refs = {_safe_string(item.get("citation_ref")) for item in retrieval.get("retrieved", []) if isinstance(item, dict)}
    scoped_evidence = [
        item for item in evidence
        if isinstance(item, dict) and _safe_string(item.get("citation_ref")) in retrieved_refs
    ] or evidence

    modules: dict[str, Any] = {"retrieval": retrieval}
    cards: list[dict[str, Any]] = []

    if "safeguarding_review" in plan.modules:
        payload = serialise_structured_safeguarding_review(build_structured_safeguarding_review(evidence_index=scoped_evidence))
        modules["safeguarding_review"] = payload
        cards.append(_runtime_card("safeguarding_review", "Safeguarding review", payload))

    if "chronology_draft" in plan.modules:
        payload = serialise_chronology_draft(build_chronology_draft(evidence_index=scoped_evidence))
        modules["chronology_draft"] = payload
        cards.append(_runtime_card("chronology_draft", "Chronology draft", payload))

    if "actions" in plan.modules:
        payload = serialise_action_extraction(extract_actions(evidence_index=scoped_evidence))
        modules["actions"] = payload
        cards.append(_runtime_card("actions", "Actions", payload))

    if "alerts" in plan.modules:
        payload = serialise_real_time_alerts(build_real_time_alerts(evidence_index=scoped_evidence, audience=role))
        modules["alerts"] = payload
        cards.append(_runtime_card("alerts", "Operational alerts", payload))

    if "inspection_evidence_pack" in plan.modules:
        payload = serialise_inspection_evidence_pack(build_inspection_evidence_pack(evidence_index=scoped_evidence))
        modules["inspection_evidence_pack"] = payload
        cards.append(_runtime_card("inspection_evidence_pack", "Inspection evidence pack", payload))

    if "quality_score" in plan.modules:
        payload = serialise_quality_score(build_quality_score(evidence_index=scoped_evidence))
        modules["quality_score"] = payload
        cards.append(_runtime_card("quality_score", "Quality score", payload))

    if "management_summary" in plan.modules:
        payload = serialise_management_summary(build_management_summary(evidence_index=scoped_evidence, audience=role, scope_type=scope_type))
        modules["management_summary"] = payload
        cards.append(_runtime_card("management_summary", "Management summary", payload))

    if "dashboard" in plan.modules:
        payload = serialise_operational_dashboard(build_operational_dashboard(evidence_index=scoped_evidence, scope_type=scope_type, user_role=role))
        modules["dashboard"] = payload
        cards.append(_runtime_card("dashboard", "Operational dashboard", payload))

    citations = _dedupe(_collect_citations(modules))
    warnings = _dedupe(plan.warnings + _collect_warnings(modules))

    return OperationalRuntimeResult(
        query=safe_query,
        assistant_surface=assistant_surface,
        role=role,
        intent=plan.intent,
        plan=plan,
        retrieved_evidence=retrieval,
        modules=modules,
        cards=cards,
        citations=citations,
        warnings=warnings,
    )


def serialise_operational_runtime(result: OperationalRuntimeResult) -> dict[str, Any]:
    return {
        "query": result.query,
        "assistant_surface": result.assistant_surface,
        "role": result.role,
        "intent": result.intent,
        "plan": {
            "intent": result.plan.intent,
            "modules": result.plan.modules,
            "cards": result.plan.cards,
            "response_style": result.plan.response_style,
            "warnings": result.plan.warnings,
        },
        "retrieved_evidence": result.retrieved_evidence,
        "modules": result.modules,
        "cards": result.cards,
        "citations": result.citations,
        "warnings": result.warnings,
    }


def build_operational_runtime_prompt_block(result: OperationalRuntimeResult) -> str:
    lines = [
        "OPERATIONAL RUNTIME CONTEXT",
        "Use this as the orchestrated evidence and module context for the answer. Do not use prior chat memory as OS evidence.",
        f"Intent: {result.intent}. Role: {result.role}. Surface: {result.assistant_surface}.",
        f"Response style: {result.plan.response_style}.",
        "",
    ]

    retrieved = result.retrieved_evidence.get("retrieved") if isinstance(result.retrieved_evidence, dict) else []
    if isinstance(retrieved, list) and retrieved:
        lines.append("Retrieved evidence:")
        for item in retrieved[:10]:
            if not isinstance(item, dict):
                continue
            lines.append(f"- {item.get('citation_ref')} {item.get('title')}: {item.get('excerpt')}")

    if result.cards:
        lines.append("")
        lines.append("Runtime cards:")
        for card in result.cards:
            lines.append(f"- {card.get('title')} ({card.get('key')}): {len(card.get('citations', []))} citation(s)")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
