from __future__ import annotations

from services.orb_dictate_action_points import (
    NOT_STATED,
    format_segment_source_ref,
    normalize_structured_actions,
    parse_action_point_from_string,
)
from services.orb_dictate_speaker import build_speakers_from_segments
from schemas.orb_dictate import OrbDictateTranscriptSegment
from services.orb_recording_framework_service import get_framework_payload


def test_unconfirmed_speakers_remain_generic():
    segments = [
        OrbDictateTranscriptSegment(id="s1", speaker_label="Speaker 1", text="Hello", source="upload"),
        OrbDictateTranscriptSegment(id="s2", speaker_label="Speaker 2", text="Hi", source="upload"),
    ]
    speakers = build_speakers_from_segments(segments, [])
    assert len(speakers) == 2
    assert all(not s.is_confirmed for s in speakers)
    assert speakers[0].display_label == "Speaker 1"


def test_confirmed_speaker_from_participant():
    from schemas.orb_dictate import OrbDictateParticipant

    segments = [
        OrbDictateTranscriptSegment(
            id="s1",
            speaker_id="p1",
            speaker_label="Tom Kelly, Registered Manager",
            text="Opening",
            source="paste",
        )
    ]
    participants = [
        OrbDictateParticipant(
            id="p1",
            name="Tom Kelly",
            role="Registered Manager",
            introduced_by="self",
        )
    ]
    speakers = build_speakers_from_segments(segments, participants)
    assert speakers[0].is_confirmed
    assert speakers[0].source == "transcript_named"


def test_action_points_not_stated_when_missing():
    point = parse_action_point_from_string("Arrange follow-up meeting")
    assert point.owner == NOT_STATED
    assert point.deadline == NOT_STATED


def test_source_ref_no_fabricated_timestamps():
    seg = OrbDictateTranscriptSegment(
        id="s1",
        speaker_label="Speaker 2",
        text="Agreed actions",
        source="paste",
    )
    ref = format_segment_source_ref(seg)
    assert "transcript turn" in ref
    assert "–" not in ref or ":" not in ref.split("–")[-1]


def test_meeting_record_types_in_framework():
    payload = get_framework_payload()
    ids = {r["id"] for r in payload["record_types"]}
    assert len(payload["record_types"]) == 31
    for rid in (
        "meeting_notes",
        "professional_consultation",
        "home_visit_note",
        "assessment_notes",
        "supervision_discussion",
        "multi_agency_discussion",
        "strategy_safeguarding_discussion",
    ):
        assert rid in ids


def test_structured_actions_from_llm_payload():
    segments = [
        OrbDictateTranscriptSegment(id="s1", speaker_label="Speaker 1", text="Action agreed", source="paste")
    ]
    points = normalize_structured_actions(
        [{"action": "Email social worker", "owner": "Manager", "deadline": "Friday"}],
        [],
        segments,
    )
    assert points[0].owner == "Manager"
    assert points[0].deadline == "Friday"
