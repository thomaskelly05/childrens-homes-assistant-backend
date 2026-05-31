import { createOrbSavedOutput, type OrbSavedOutputType } from '@/lib/orb/standalone-client'
import type { VoiceTurn } from '@/lib/orb/voice/orb-voice-types'

const LOCAL_VOICE_TRANSCRIPTS_KEY = 'orb-voice-transcript-fallback'

export type SaveVoiceTranscriptResult = {
  ok: boolean
  savedRemote: boolean
  outputId?: string
  message: string
}

function formatTranscriptMarkdown(turns: VoiceTurn[]): string {
  return turns
    .map((turn) => {
      const label = turn.role === 'user' ? 'You' : turn.role === 'assistant' ? 'ORB' : 'System'
      const interrupted = turn.interrupted ? ' *(interrupted)*' : ''
      return `### ${label}${interrupted}\n\n${turn.text.trim()}`
    })
    .join('\n\n')
}

function saveLocalFallback(turns: VoiceTurn[], title: string) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(LOCAL_VOICE_TRANSCRIPTS_KEY)
    const list = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : []
    list.unshift({
      id: `local_${Date.now()}`,
      title,
      type: 'voice_transcript',
      turns,
      savedAt: new Date().toISOString()
    })
    window.localStorage.setItem(LOCAL_VOICE_TRANSCRIPTS_KEY, JSON.stringify(list.slice(0, 40)))
  } catch {
    /* ignore quota */
  }
}

export async function saveVoiceTranscript(turns: VoiceTurn[]): Promise<SaveVoiceTranscriptResult> {
  if (!turns.length) {
    return { ok: false, savedRemote: false, message: 'Nothing to save yet.' }
  }

  const dateLabel = new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  const title = `ORB Voice conversation — ${dateLabel}`
  const content = formatTranscriptMarkdown(turns)

  try {
    const record = await createOrbSavedOutput({
      title,
      type: 'voice_transcript' as OrbSavedOutputType,
      summary: `${turns.length} voice turns`,
      content_markdown: content,
      tags: ['orb-voice', 'voice-transcript'],
      created_from: 'manual'
    })
    return {
      ok: true,
      savedRemote: true,
      outputId: record.id,
      message: 'Transcript saved to Saved Outputs.'
    }
  } catch {
    saveLocalFallback(turns, title)
    return {
      ok: true,
      savedRemote: false,
      message: 'Saved locally. Reconnect to sync to Saved Outputs.'
    }
  }
}
