"""Tests for ORB Dictate diarisation mapping — mocked provider output."""

from __future__ import annotations

from services.orb_dictate_diarisation import (
    diarisation_confidence_warnings,
    map_diarisation_to_orb_transcript_segments,
)
from services.orb_dictate_speaker import build_speakers_from_segments
from schemas.orb_dictate import OrbDictateTranscriptSegment


def test_map_diarised_provider_segments():
    raw = [
        {"id": "p1", "speaker": "SPEAKER_00", "text": "Good morning team.", "start": 0.0, "end": 2.5, "confidence": 0.91},
        {"id": "p2", "speaker": "SPEAKER_01", "text": "Morning.", "start": 2.6, "end": 4.0, "confidence": 0.88},
    ]
    segments, warnings, has_diarisation = map_diarisation_to_orb_transcript_segments(raw)
    assert len(segments) == 2
    assert has_diarisation is True
    assert segments[0].speaker_label
    assert segments[0].started_at == "00:00"
    assert segments[1].ended_at == "00:04"


def test_low_confidence_warning():
    raw = [
        {"speaker": "Speaker 1", "text": "Unclear audio.", "confidence": 0.4},
    ]
    segments, warnings, _ = map_diarisation_to_orb_transcript_segments(raw)
    assert segments[0].needs_review is True
    assert any("Low confidence" in w for w in warnings)
    assert diarisation_confidence_warnings(segments)


def test_unconfirmed_speakers_remain_generic_after_diarisation():
    segments = [
        OrbDictateTranscriptSegment(id="s1", speaker_label="Speaker 1", text="Hi", source="upload", confidence=0.9),
        OrbDictateTranscriptSegment(id="s2", speaker_label="Speaker 2", text="Hello", source="upload", confidence=0.85),
    ]
    speakers = build_speakers_from_segments(segments, [])
    assert all(not s.is_confirmed for s in speakers)
    assert speakers[0].source == "diarised"


def test_empty_provider_segments():
    segments, warnings, has_diarisation = map_diarisation_to_orb_transcript_segments([])
    assert segments == []
    assert has_diarisation is False
    assert warnings
