"""Map provider diarisation output into ORB Dictate transcript segments."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from schemas.orb_dictate import OrbDictateTranscriptSegment

LOW_CONFIDENCE_THRESHOLD = 0.65


def _new_segment_id() -> str:
    return f"seg_{uuid4().hex[:10]}"


def _format_timestamp(seconds: float | None) -> str | None:
    if seconds is None or seconds < 0:
        return None
    total = int(seconds)
    mm = total // 60
    ss = total % 60
    return f"{mm:02d}:{ss:02d}"


def _normalise_speaker_label(raw: str | None, index: int) -> str:
    label = (raw or "").strip()
    if not label:
        return f"Speaker {index + 1}"
    lower = label.lower()
    if lower.startswith("speaker"):
        digits = "".join(ch for ch in label if ch.isdigit())
        return f"Speaker {digits or index + 1}"
    return label


def map_diarisation_to_orb_transcript_segments(
    provider_segments: list[dict[str, Any]],
    *,
    source: str = "upload",
) -> tuple[list[OrbDictateTranscriptSegment], list[str], bool]:
    """Return (segments, warnings, has_provider_diarisation)."""
    warnings: list[str] = []
    if not provider_segments:
        return [], ["No diarised segments from provider"], False

    speaker_keys = {
        str(s.get("speaker_id") or s.get("speaker") or f"spk_{i}").lower()
        for i, s in enumerate(provider_segments)
        if isinstance(s, dict)
    }
    if len(speaker_keys) < 2 and len(provider_segments) > 1:
        warnings.append(
            "Provider returned multiple segments but only one speaker id — review speaker separation"
        )

    segments: list[OrbDictateTranscriptSegment] = []
    for index, raw in enumerate(provider_segments):
        if not isinstance(raw, dict):
            continue
        text = str(raw.get("text") or "").strip()
        if not text:
            continue
        confidence_raw = raw.get("confidence")
        confidence = float(confidence_raw) if confidence_raw is not None else None
        needs_review = confidence is not None and confidence < LOW_CONFIDENCE_THRESHOLD
        if needs_review:
            label = _normalise_speaker_label(str(raw.get("speaker") or ""), index)
            warnings.append(
                f"Low confidence ({confidence:.2f}) for {label} turn {index + 1}"
            )
        start = raw.get("start")
        end = raw.get("end")
        segments.append(
            OrbDictateTranscriptSegment(
                id=str(raw.get("id") or _new_segment_id()),
                speaker_label=_normalise_speaker_label(str(raw.get("speaker") or ""), index),
                text=text,
                started_at=_format_timestamp(float(start)) if start is not None else None,
                ended_at=_format_timestamp(float(end)) if end is not None else None,
                confidence=confidence,
                source=source,  # type: ignore[arg-type]
                needs_review=needs_review,
            )
        )

    has_diarisation = len(speaker_keys) > 1 or any(s.confidence is not None for s in segments)
    if not has_diarisation and segments:
        warnings.append("Provider segments present but diarisation not verified — treating as heuristic")

    return segments, warnings, has_diarisation


def diarisation_confidence_warnings(segments: list[OrbDictateTranscriptSegment]) -> list[str]:
    return [
        f'Low confidence speaker separation for "{seg.speaker_label}" — confirm labels before using in a record'
        for seg in segments
        if seg.confidence is not None and seg.confidence < LOW_CONFIDENCE_THRESHOLD
    ]
