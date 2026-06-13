/**
 * Internal capability map for ORB Dictate meeting intelligence.
 * Not shown in product UI — documents honest gaps vs implemented features.
 */
export const ORB_DICTATE_CAPABILITY_ROADMAP = {
  implemented: [
    'live_recording',
    'audio_upload',
    'paste_transcript',
    'orb_voice_import',
    'transcript_segments',
    'speaker_heuristic_labels',
    'manual_speaker_confirmation',
    'structured_action_points',
    'source_check_disclosure',
    'orb_write_handoff',
    'document_reference_link'
  ],
  partial: [
    'local_draft_storage',
    'retry_after_failed_upload'
  ],
  not_implemented: [
    'offline_capture',
    'meeting_auto_detection',
    'teams_zoom_meet_integration',
    'screen_sharing',
    'translation_welsh',
    'deleted_record_recovery',
    'team_analytics',
    'stored_audio_playback',
    'voice_biometric_diarisation'
  ]
} as const

export const ORB_DICTATE_CAPTURE_MODE_COPY =
  'Record a meeting, home visit, consultation or shift discussion.'
