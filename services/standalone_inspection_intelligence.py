from __future__ import annotations

from typing import Any

from services.standalone_timeline_intelligence import timeline_summary


STANDARD_AREAS = {
    "safeguarding": ["safeguarding", "risk", "harm", "missing", "police", "exploitation"],
    "leadership": ["manager", "oversight", "review", "audit", "action", "leadership"],
    "chronology": ["chronology", "timeline", "date", "time", "sequence", "outcome"],
    "child_voice": ["child voice", "said", "wishes", "feelings", "views"],
    "reflective_practice": ["reflection", "trauma", "relational", "restorative", "co-regulation"],
    "evidence": ["ofsted", "quality standard", "sccif", "evidence", "impact"],
}


def build_inspection_readiness(project_id: str, local_memory: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build a standalone inspection evidence preparation view.

    This intentionally wraps the standalone timeline intelligence and mirrors the
    existing Ofsted evidence engine's evidence-led approach: do not invent facts;
    score only from available project memory/timeline material.
    """
    local_memory = local_memory or {}
    timeline = timeline_summary(project_id)
    corpus_parts = [timeline.get("summary") or ""]
    corpus_parts.extend(local_memory.get("themes") or [])
    corpus_parts.extend(local_memory.get("alerts") or [])
    corpus_parts.extend(str(item.get("text") or "") for item in local_memory.get("timeline") or [])
    corpus = " ".join(corpus_parts).lower()

    scores = _scores(corpus, timeline)
    gaps = _gaps(corpus, timeline, scores)
    strengths = _strengths(corpus, scores)
    summary = _summary(scores, gaps, strengths, timeline)

    return {
        "ok": True,
        "project_id": project_id,
        "summary": summary,
        "scores": scores,
        "strengths": strengths,
        "gaps": gaps,
        "timeline": timeline,
        "standards_mapping": _standards_mapping(corpus),
        "suggested_actions": _suggested_actions(gaps, scores),
    }


def _scores(corpus: str, timeline: dict[str, Any]) -> dict[str, int]:
    event_count = int(timeline.get("eventCount") or 0)
    analysis = timeline.get("analysis") or {}
    safeguarding_flags = int(analysis.get("safeguardingFlags") or 0)
    alerts = analysis.get("alerts") or []

    return {
        "safeguarding": _clamp(45 + safeguarding_flags * 8 + _hits(corpus, STANDARD_AREAS["safeguarding"]) * 5),
        "chronology": _clamp(35 + event_count * 5 - (15 if any("gap" in str(a).lower() for a in alerts) else 0)),
        "leadership": _clamp(35 + _hits(corpus, STANDARD_AREAS["leadership"]) * 8),
        "child_voice": _clamp(30 + _hits(corpus, STANDARD_AREAS["child_voice"]) * 12),
        "reflective_practice": _clamp(30 + _hits(corpus, STANDARD_AREAS["reflective_practice"]) * 10),
        "evidence": _clamp(35 + _hits(corpus, STANDARD_AREAS["evidence"]) * 10 + min(event_count, 8) * 3),
    }


def _gaps(corpus: str, timeline: dict[str, Any], scores: dict[str, int]) -> list[dict[str, str]]:
    gaps: list[dict[str, str]] = []
    if scores["child_voice"] < 55:
        gaps.append({"area": "Child voice", "gap": "Limited child voice evidence is visible in the current project intelligence."})
    if scores["leadership"] < 55:
        gaps.append({"area": "Leadership oversight", "gap": "Management review, oversight or action evidence needs strengthening."})
    if scores["chronology"] < 55:
        gaps.append({"area": "Chronology", "gap": "Chronology evidence is limited or needs clearer sequencing."})
    if any(term in corpus for term in ["unclear", "unknown", "not recorded", "missing information"]):
        gaps.append({"area": "Recording quality", "gap": "Possible unclear or missing information has been identified."})
    if int(timeline.get("eventCount") or 0) == 0:
        gaps.append({"area": "Timeline", "gap": "No live chronology events have been captured yet."})
    return gaps[:8]


def _strengths(corpus: str, scores: dict[str, int]) -> list[dict[str, str]]:
    strengths = []
    for area, score in scores.items():
        if score >= 70:
            strengths.append({"area": area.replace("_", " ").title(), "strength": "Visible evidence is developing well in this area."})
    if "safeguarding" in corpus or "risk" in corpus:
        strengths.append({"area": "Safeguarding", "strength": "Safeguarding language or risk awareness is visible in project material."})
    return strengths[:8]


def _standards_mapping(corpus: str) -> list[dict[str, Any]]:
    mapping = []
    labels = {
        "safeguarding": "Help and protection",
        "leadership": "Leadership and management",
        "child_voice": "Children's experiences and progress",
        "reflective_practice": "Positive relationships and care practice",
        "evidence": "Inspection evidence",
        "chronology": "Recording and chronology quality",
    }
    for key, terms in STANDARD_AREAS.items():
        hits = _hits(corpus, terms)
        if hits:
            mapping.append({"area": labels[key], "evidence_hits": hits, "reason": f"Project intelligence references {', '.join([t for t in terms if t in corpus][:4])}."})
    return mapping


def _suggested_actions(gaps: list[dict[str, str]], scores: dict[str, int]) -> list[str]:
    actions = []
    for gap in gaps:
        area = gap.get("area", "evidence")
        actions.append(f"Strengthen {area.lower()} evidence")
    if scores.get("chronology", 0) < 65:
        actions.append("Generate a chronology pack")
    if scores.get("leadership", 0) < 65:
        actions.append("Create a leadership oversight summary")
    if scores.get("safeguarding", 0) < 65:
        actions.append("Review safeguarding evidence")
    return list(dict.fromkeys(actions))[:6]


def _summary(scores: dict[str, int], gaps: list[dict[str, str]], strengths: list[dict[str, str]], timeline: dict[str, Any]) -> str:
    average = round(sum(scores.values()) / max(len(scores), 1))
    if average >= 75:
        opening = "Inspection evidence preparation evidence is developing strongly."
    elif average >= 55:
        opening = "Inspection evidence preparation evidence is developing, with some areas needing review."
    else:
        opening = "Inspection evidence preparation evidence needs strengthening."
    return f"{opening} {len(strengths)} strength area(s), {len(gaps)} evidence gap(s), and {timeline.get('eventCount', 0)} chronology event(s) are currently visible."


def _hits(corpus: str, terms: list[str]) -> int:
    return sum(1 for term in terms if term in corpus)


def _clamp(value: int) -> int:
    return max(0, min(100, int(value)))
