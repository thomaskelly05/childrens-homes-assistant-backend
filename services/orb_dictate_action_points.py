"""Structured action point helpers for ORB Dictate — no invented owners or deadlines."""

from __future__ import annotations

import re
from uuid import uuid4

from schemas.orb_dictate import OrbDictateActionPoint, OrbDictateTranscriptSegment

NOT_STATED = "Not stated"

SAFEGUARDING_TERMS = re.compile(
    r"\b(safeguard|lado|ofsted|reg\s*40|strategy meeting|child protection|significant harm|police|escalat)",
    re.I,
)


def _new_action_id() -> str:
    return f"act_{uuid4().hex[:10]}"


def format_segment_source_ref(segment: OrbDictateTranscriptSegment) -> str:
    label = segment.speaker_label or "Speaker"
    start = (segment.started_at or "").strip()
    end = (segment.ended_at or "").strip()
    if start and end and re.match(r"^\d{1,2}:\d{2}", start):
        return f"Source: {label}, {start}–{end}"
    if start and re.match(r"^\d{1,2}:\d{2}", start):
        return f"Source: {label}, {start}"
    if segment.id:
        return f"Source: {label}, transcript turn"
    return "Source not available"


def parse_action_point_from_string(
    raw: str,
    *,
    segment: OrbDictateTranscriptSegment | None = None,
) -> OrbDictateActionPoint:
    text = raw.strip()
    source_label = format_segment_source_ref(segment) if segment else None
    management = bool(SAFEGUARDING_TERMS.search(text))

    action = text
    owner = NOT_STATED
    deadline = NOT_STATED

    owner_match = re.match(
        r"^(?:action:\s*)?(.+?)\s*[-–—]\s*owner:\s*(.+?)(?:\s*[-–—]\s*deadline:\s*(.+))?$",
        text,
        re.I,
    )
    if owner_match:
        action = owner_match.group(1).strip()
        owner = (owner_match.group(2) or "").strip() or NOT_STATED
        deadline = (owner_match.group(3) or "").strip() or NOT_STATED

    return OrbDictateActionPoint(
        id=_new_action_id(),
        action=action or text,
        owner=owner,
        deadline=deadline,
        status="pending",
        source_segment_id=segment.id if segment else None,
        source_label=source_label,
        management_oversight=management,
    )


def normalize_structured_actions(
    raw: list[dict] | None,
    fallback_strings: list[str] | None = None,
    segments: list[OrbDictateTranscriptSegment] | None = None,
) -> list[OrbDictateActionPoint]:
    segments = segments or []
    if raw:
        points: list[OrbDictateActionPoint] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            seg_id = item.get("source_segment_id")
            segment = next((s for s in segments if s.id == seg_id), None)
            action_text = str(item.get("action") or "").strip()
            if not action_text:
                continue
            point = parse_action_point_from_string(action_text, segment=segment)
            point.owner = str(item.get("owner") or "").strip() or NOT_STATED
            point.deadline = str(item.get("deadline") or "").strip() or NOT_STATED
            point.management_oversight = bool(item.get("management_oversight", point.management_oversight))
            points.append(point)
        return points

    fallback = fallback_strings or []
    result: list[OrbDictateActionPoint] = []
    for idx, action in enumerate(fallback):
        segment = segments[idx] if idx < len(segments) else None
        result.append(parse_action_point_from_string(action, segment=segment))
    return result
