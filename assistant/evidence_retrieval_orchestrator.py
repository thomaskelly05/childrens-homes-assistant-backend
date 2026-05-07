from __future__ import annotations

"""Evidence retrieval orchestration for IndiCare OS assistant.

This module ranks visible/scoped OS evidence for a user query before answer
construction. It is intentionally deterministic and conservative: it does not
retrieve outside the supplied scope and it does not treat prior chat memory as
OS evidence.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


SAFEGUARDING_TERMS = {
    "safeguarding",
    "risk",
    "missing",
    "abscond",
    "police",
    "exploitation",
    "self-harm",
    "suicidal",
    "injury",
    "restraint",
    "allegation",
    "lado",
    "strategy meeting",
    "urgent",
}

OVERSIGHT_TERMS = {
    "manager",
    "oversight",
    "review",
    "action",
    "follow up",
    "quality",
    "audit",
    "reg44",
    "reg45",
    "ri",
    "responsible individual",
    "owner",
    "due",
    "overdue",
}

INSPECTION_TERMS = {
    "inspection",
    "ofsted",
    "sccif",
    "regulation",
    "reg 12",
    "reg 13",
    "reg 14",
    "reg 40",
    "reg 44",
    "reg 45",
    "quality of care",
}

RECORD_TYPE_WEIGHTS = {
    "safeguarding_record": 35,
    "incident": 30,
    "missing_episode": 30,
    "risk_assessment": 28,
    "risk": 26,
    "manager_action": 24,
    "inspection_action": 24,
    "reg44_visit": 22,
    "reg44_finding": 22,
    "reg45_review": 22,
    "reg45_action": 22,
    "quality_audit": 20,
    "task": 18,
    "handover": 16,
    "handover_record": 16,
    "daily_note": 14,
    "keywork": 14,
    "education_record": 12,
    "health_record": 12,
    "family_contact": 12,
}


@dataclass(frozen=True)
class RetrievedEvidence:
    citation_ref: str
    record_type: str
    title: str
    date: str
    excerpt: str
    score: int
    reasons: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class EvidenceRetrievalResult:
    query: str
    evidence_count: int
    retrieved: list[RetrievedEvidence] = field(default_factory=list)
    retrieval_focus: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    text = _safe_string(value)
    if not text:
        return None
    for candidate in (text, text.replace("Z", "+00:00"), text[:10]):
        try:
            if len(candidate) == 10 and "-" in candidate:
                return datetime.combine(date.fromisoformat(candidate), datetime.min.time())
            return datetime.fromisoformat(candidate)
        except Exception:
            continue
    return None


def _citation_ref(item: dict[str, Any]) -> str:
    citation = _safe_string(item.get("citation_ref"))
    if citation:
        return citation
    record_type = _safe_string(item.get("record_type") or item.get("type"))
    record_id = _safe_string(item.get("record_id") or item.get("id"))
    if record_type and record_id:
        return f"[{record_type}:{record_id}]"
    return ""


def _record_type(item: dict[str, Any]) -> str:
    return _safe_string(item.get("record_type") or item.get("type") or "record").lower()


def _date(item: dict[str, Any]) -> str:
    return _safe_string(item.get("date") or item.get("event_at") or item.get("updated_at") or item.get("created_at"))


def _title(item: dict[str, Any]) -> str:
    return _safe_string(item.get("label") or item.get("title") or _record_type(item) or "Record")


def _excerpt(item: dict[str, Any]) -> str:
    return _safe_string(item.get("excerpt") or item.get("summary") or item.get("description") or item.get("notes") or item.get("outcome"))[:500]


def _text(item: dict[str, Any]) -> str:
    return " ".join(
        _safe_string(item.get(key))
        for key in ("label", "title", "excerpt", "summary", "description", "notes", "outcome", "section", "status")
    ).lower()


def _tokens(text: str) -> set[str]:
    cleaned = "".join(ch.lower() if ch.isalnum() else " " for ch in text)
    return {token for token in cleaned.split() if len(token) >= 3}


def _focus_from_query(query: str) -> list[str]:
    lowered = query.lower()
    focus: list[str] = []
    if any(term in lowered for term in SAFEGUARDING_TERMS):
        focus.append("safeguarding")
    if any(term in lowered for term in OVERSIGHT_TERMS):
        focus.append("management_oversight")
    if any(term in lowered for term in INSPECTION_TERMS):
        focus.append("inspection_or_regulation")
    if any(term in lowered for term in {"what changed", "change", "recent", "this week", "today", "yesterday"}):
        focus.append("recent_change")
    if any(term in lowered for term in {"chronology", "timeline", "sequence", "history"}):
        focus.append("chronology")
    if any(term in lowered for term in {"action", "overdue", "follow up", "task"}):
        focus.append("actions")
    return focus or ["general"]


def _recency_score(item: dict[str, Any]) -> int:
    parsed = _parse_datetime(_date(item))
    if parsed is None:
        return 0
    if parsed.tzinfo is not None:
        parsed = parsed.replace(tzinfo=None)
    age_days = max(0, (datetime.utcnow() - parsed).days)
    if age_days <= 7:
        return 18
    if age_days <= 30:
        return 12
    if age_days <= 90:
        return 6
    return 2


def _score_item(item: dict[str, Any], query: str, focus: list[str]) -> tuple[int, list[str]]:
    record_type = _record_type(item)
    text = _text(item)
    query_tokens = _tokens(query)
    item_tokens = _tokens(text)

    score = RECORD_TYPE_WEIGHTS.get(record_type, 8)
    reasons = [f"record_type_weight:{record_type}"]

    overlap = len(query_tokens & item_tokens)
    if overlap:
        score += overlap * 8
        reasons.append(f"query_token_overlap:{overlap}")

    if "safeguarding" in focus and any(term in text for term in SAFEGUARDING_TERMS):
        score += 30
        reasons.append("safeguarding_focus_match")

    if "management_oversight" in focus and any(term in text for term in OVERSIGHT_TERMS):
        score += 24
        reasons.append("oversight_focus_match")

    if "inspection_or_regulation" in focus and any(term in text for term in INSPECTION_TERMS):
        score += 22
        reasons.append("inspection_focus_match")

    if "actions" in focus and record_type in {"task", "manager_action", "inspection_action", "reg45_action", "reg44_action"}:
        score += 20
        reasons.append("action_record_focus_match")

    if "chronology" in focus and _date(item):
        score += 10
        reasons.append("dated_chronology_item")

    recency = _recency_score(item)
    if "recent_change" in focus:
        score += recency
        if recency:
            reasons.append(f"recency_weight:{recency}")

    if _citation_ref(item):
        score += 8
        reasons.append("citation_available")
    else:
        score -= 25
        reasons.append("citation_missing_penalty")

    if not _excerpt(item):
        score -= 8
        reasons.append("excerpt_missing_penalty")

    return max(0, score), reasons


def retrieve_relevant_evidence(
    *,
    query: str,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 12,
    min_score: int = 10,
) -> EvidenceRetrievalResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    safe_query = _safe_string(query)
    if not evidence:
        return EvidenceRetrievalResult(
            query=safe_query,
            evidence_count=0,
            retrieved=[],
            retrieval_focus=_focus_from_query(safe_query),
            warnings=["no_visible_evidence_for_retrieval"],
        )

    focus = _focus_from_query(safe_query)
    retrieved: list[RetrievedEvidence] = []

    for item in evidence:
        if not isinstance(item, dict):
            continue
        ref = _citation_ref(item)
        score, reasons = _score_item(item, safe_query, focus)
        if score < min_score or not ref:
            continue
        retrieved.append(
            RetrievedEvidence(
                citation_ref=ref,
                record_type=_record_type(item),
                title=_title(item),
                date=_date(item),
                excerpt=_excerpt(item),
                score=score,
                reasons=reasons,
            )
        )

    retrieved = sorted(
        retrieved,
        key=lambda item: (item.score, item.date, item.citation_ref),
        reverse=True,
    )[: max(1, min(int(limit), 50))]

    warnings: list[str] = []
    if not retrieved:
        warnings.append("no_relevant_cited_evidence_retrieved")

    return EvidenceRetrievalResult(
        query=safe_query,
        evidence_count=len(evidence),
        retrieved=retrieved,
        retrieval_focus=focus,
        warnings=warnings,
    )


def serialise_evidence_retrieval(result: EvidenceRetrievalResult) -> dict[str, Any]:
    return {
        "query": result.query,
        "evidence_count": result.evidence_count,
        "retrieval_focus": result.retrieval_focus,
        "warnings": result.warnings,
        "retrieved": [
            {
                "citation_ref": item.citation_ref,
                "record_type": item.record_type,
                "title": item.title,
                "date": item.date,
                "excerpt": item.excerpt,
                "score": item.score,
                "reasons": item.reasons,
            }
            for item in result.retrieved
        ],
    }


def build_evidence_retrieval_prompt_block(result: EvidenceRetrievalResult) -> str:
    lines = [
        "EVIDENCE RETRIEVAL CONTEXT",
        "Use retrieved evidence as the cited evidence base. Do not use prior chat memory as OS evidence.",
        f"Query: {result.query}",
        f"Evidence searched: {result.evidence_count}. Focus: {', '.join(result.retrieval_focus)}.",
        "",
    ]

    if result.retrieved:
        lines.append("Retrieved evidence:")
        for item in result.retrieved:
            date = item.date or "date not visible"
            lines.append(f"- {item.citation_ref} [{item.record_type}] {date}: {item.title} — {item.excerpt} (score {item.score})")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
