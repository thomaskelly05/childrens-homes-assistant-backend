import type { OrbVoiceV2Turn } from './orb-voice-v2-types.ts'

export function createOrbVoiceV2Turn(role: 'adult' | 'orb', text: string): OrbVoiceV2Turn {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text: text.trim()
  }
}

export function orbVoiceV2TranscriptMarkdown(turns: OrbVoiceV2Turn[]): string {
  return turns
    .map((turn) => `${turn.role === 'adult' ? 'Adult' : 'ORB'}: ${turn.text}`)
    .join('\n\n')
}

export function orbVoiceV2RecentTurns(turns: OrbVoiceV2Turn[], limit = 8): Array<{ role: 'adult' | 'orb'; text: string }> {
  return turns.slice(-limit).map((turn) => ({ role: turn.role, text: turn.text }))
}
