import type { OrbVoiceV2HandoffPayload, OrbVoiceV2Mode, OrbVoiceV2Turn } from './orb-voice-v2-types.ts'
import { ORB_VOICE_V2_ADULT_REVIEW_LABEL } from './orb-voice-v2-copy.ts'
import { orbVoiceV2TranscriptMarkdown } from './orb-voice-v2-turns.ts'

export function buildOrbVoiceV2Summary(turns: OrbVoiceV2Turn[], mode: OrbVoiceV2Mode): string {
  const transcript = orbVoiceV2TranscriptMarkdown(turns)
  if (!transcript.trim()) {
    return `${ORB_VOICE_V2_ADULT_REVIEW_LABEL}\n\nNo conversation turns to summarise yet.`
  }
  const adultTurns = turns.filter((t) => t.role === 'adult').map((t) => t.text)
  const orbTurns = turns.filter((t) => t.role === 'orb').map((t) => t.text)
  const themes = adultTurns.slice(0, 3).join(' ')
  const orbFocus = orbTurns.slice(-2).join(' ')
  return [
    ORB_VOICE_V2_ADULT_REVIEW_LABEL,
    '',
    `Mode: ${mode.replace(/_/g, ' ')}`,
    '',
    'What you talked through:',
    themes || '—',
    '',
    'ORB reflections:',
    orbFocus || '—',
    '',
    'Full transcript:',
    transcript
  ].join('\n')
}

export function buildOrbVoiceV2Handoff(
  turns: OrbVoiceV2Turn[],
  mode: OrbVoiceV2Mode,
  summary: string,
  ttsProvider: string | null
): OrbVoiceV2HandoffPayload {
  return {
    source: 'orb_voice_v2',
    mode,
    conversationTranscript: orbVoiceV2TranscriptMarkdown(turns),
    summary,
    audioStored: false,
    selectedVoice: 'katherine',
    ttsProvider,
    adultReviewStatus: 'generated_for_adult_review'
  }
}
