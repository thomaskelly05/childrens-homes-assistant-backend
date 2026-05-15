export type OrbTranscriptMode = 'off' | 'session_only' | 'do_not_store'

export function transcriptPolicy(mode: OrbTranscriptMode) {
  return {
    rawAudioStored: false,
    transcriptStored: mode === 'session_only',
    unsafeTranscriptStored: false,
    label: mode === 'do_not_store' ? 'Do not store transcript' : mode === 'session_only' ? 'Session transcript' : 'Transcript off'
  }
}

