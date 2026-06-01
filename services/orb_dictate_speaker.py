"""ORB Dictate speaker/participant helpers — introductions, not biometrics."""

from __future__ import annotations

import re
from typing import Any
from uuid import uuid4

from schemas.orb_dictate import (
    OrbDictateParticipant,
    OrbDictateSpeakerSummary,
    OrbDictateTranscriptSegment,
)

SPEAKER_BOUNDARY_COPY = (
    "Speaker labels are based on introductions and your corrections. "
    "ORB Dictate does not verify identity by voice."
)

INTRO_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^(.+?),\s*(.+?),\s*speaking\.?$", re.I), "name_role"),
    (re.compile(r"^(.+?)\s+speaking\.?$", re.I), "name_only"),
    (re.compile(r"^this is\s+(.+?)(?:\.|$)", re.I), "name_only"),
    (re.compile(r"^my name is\s+(.+?)(?:\.|$)", re.I), "name_only"),
    (re.compile(r"^i['']?m\s+(.+?)(?:\.|$)", re.I), "name_only"),
    (re.compile(r"^(.+?),\s*(deputy|registered|manager|worker|nurse|social worker).*$", re.I), "name_role_loose"),
]

ROLE_SUFFIX = re.compile(
    r",\s*(registered manager|deputy manager|team manager|support worker|"
    r"residential support worker|social worker|nurse|key worker|manager)\s*$",
    re.I,
)


def _new_id(prefix: str = "p") -> str:
    return f"{prefix}_{uuid4().hex[:10]}"


def _new_segment_id() -> str:
    return f"seg_{uuid4().hex[:10]}"


def parse_introduction_line(line: str) -> tuple[str, str | None] | None:
    text = line.strip().strip('"').strip("'")
    if not text or len(text) > 200:
        return None
    for pattern, kind in INTRO_PATTERNS:
        m = pattern.match(text)
        if not m:
            continue
        if kind == "name_role":
            return m.group(1).strip(), m.group(2).strip()
        if kind == "name_role_loose":
            name = m.group(1).strip()
            role_match = ROLE_SUFFIX.search(name)
            if role_match:
                return name[: role_match.start()].strip(), role_match.group(1).strip()
            return name, m.group(2).strip() if m.lastindex and m.lastindex >= 2 else None
        return m.group(1).strip(), None
    return None


def suggest_participants_from_text(text: str) -> list[OrbDictateParticipant]:
    suggestions: list[OrbDictateParticipant] = []
    seen: set[str] = set()
    for line in text.splitlines():
        parsed = parse_introduction_line(line)
        if not parsed:
            continue
        name, role = parsed
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        suggestions.append(
            OrbDictateParticipant(
                id=_new_id(),
                name=name,
                role=role,
                introduced_by="self",
            )
        )
    return suggestions


def participant_label(participant: OrbDictateParticipant) -> str:
    if participant.role:
        return f"{participant.name}, {participant.role}"
    return participant.name


def _normalise_segment_source(source: str) -> str:
    mapping = {
        "dictation": "live",
        "template": "paste",
        "live": "live",
        "upload": "upload",
        "paste": "paste",
        "orb_voice": "orb_voice",
    }
    return mapping.get(source, "paste")


def text_to_segments(
    text: str,
    *,
    source: str = "paste",
    participants: list[OrbDictateParticipant] | None = None,
) -> list[OrbDictateTranscriptSegment]:
    source = _normalise_segment_source(source)
    """Split transcript into segments; detect inline speaker labels like 'Tom Kelly:'."""
    participants = participants or []
    by_name = {p.name.lower(): p for p in participants}
    segments: list[OrbDictateTranscriptSegment] = []
    label_re = re.compile(r"^([A-Z][A-Za-z' -]{1,60})(?:,\s*[^:\n]{1,80})?:\s*(.+)$")
    unknown_idx = 0

    for block in re.split(r"\n\s*\n", text.strip()):
        block = block.strip()
        if not block:
            continue
        speaker_id: str | None = None
        speaker_label = "Speaker 1"
        body = block

        first_line, _, rest = block.partition("\n")
        m = label_re.match(first_line.strip())
        if m:
            name = m.group(1).strip()
            body = m.group(2).strip()
            if rest:
                body = f"{body}\n{rest}".strip()
            p = by_name.get(name.lower())
            if p:
                speaker_id = p.id
                speaker_label = participant_label(p)
            else:
                unknown_idx += 1
                speaker_label = name if "," not in name else name
        else:
            intro = parse_introduction_line(block.split("\n")[0])
            if intro and len(block.split()) < 12:
                continue
            unknown_idx = max(unknown_idx, 0) + 1
            speaker_label = f"Speaker {unknown_idx}" if unknown_idx else "Speaker 1"

        segments.append(
            OrbDictateTranscriptSegment(
                id=_new_segment_id(),
                speaker_id=speaker_id,
                speaker_label=speaker_label,
                text=body,
                source=source,  # type: ignore[arg-type]
            )
        )
    if not segments and text.strip():
        segments.append(
            OrbDictateTranscriptSegment(
                id=_new_segment_id(),
                speaker_label="Speaker 1",
                text=text.strip(),
                source=source,  # type: ignore[arg-type]
            )
        )
    return segments


def segments_to_plain_text(segments: list[OrbDictateTranscriptSegment]) -> str:
    lines: list[str] = []
    for seg in segments:
        label = seg.speaker_label or "Speaker"
        lines.append(f"{label}: {seg.text.strip()}")
    return "\n\n".join(lines)


def build_speaker_summary(
    participants: list[OrbDictateParticipant],
    segments: list[OrbDictateTranscriptSegment],
) -> OrbDictateSpeakerSummary:
    known_ids = {p.id for p in participants}
    labels_in_segments = {s.speaker_label for s in segments if s.speaker_label}
    known_speakers = sum(
        1
        for p in participants
        if p.id in {s.speaker_id for s in segments if s.speaker_id}
        or p.name in labels_in_segments
        or participant_label(p) in labels_in_segments
    )
    unknown_labels = [
        s.speaker_label
        for s in segments
        if s.speaker_label.startswith("Speaker ") and not s.speaker_id
    ]
    unknown_speakers = len(set(unknown_labels))
    needs_review = bool(unknown_speakers) or any(
        s.speaker_id not in known_ids and s.speaker_id for s in segments
    )
    return OrbDictateSpeakerSummary(
        known_speakers=known_speakers,
        unknown_speakers=unknown_speakers,
        needs_review=needs_review or len(participants) == 0,
    )


def anonymise_note_text(
    text: str,
    participants: list[OrbDictateParticipant],
) -> str:
    result = text
    for p in participants:
        if p.name:
            replacement = p.role or "Staff member"
            result = re.sub(re.escape(p.name), replacement, result, flags=re.I)
    return result


def participants_block_for_prompt(
    participants: list[OrbDictateParticipant],
    segments: list[OrbDictateTranscriptSegment],
) -> str:
    if not participants and not segments:
        return ""
    lines = ["Participants:"]
    for p in participants:
        role = f" ({p.role})" if p.role else ""
        lines.append(f"- {p.name}{role}")
    if segments:
        lines.append("\nTranscript by speaker:")
        for seg in segments[:80]:
            flag = " [direct quote]" if seg.is_direct_quote else ""
            review = " [needs review]" if seg.needs_review else ""
            lines.append(f"{seg.speaker_label}{flag}{review}: {seg.text[:2000]}")
    return "\n".join(lines)
