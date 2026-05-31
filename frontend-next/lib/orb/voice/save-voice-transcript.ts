import { createOrbSavedOutput, type OrbSavedOutputType } from '@/lib/orb/standalone-client'
import type { OrbVoiceModeId, VoiceTurn } from '@/lib/orb/voice/orb-voice-types'

const LOCAL_VOICE_TRANSCRIPTS_KEY = 'orb-voice-transcript-fallback'

export type SaveVoiceTranscriptOptions = {
  mode?: OrbVoiceModeId
  provider?: string
  startedAt?: string
  endedAt?: string
  projectId?: string | null
}

export type SaveVoiceTranscriptResult = {
  ok: boolean
  savedRemote: boolean
  outputId?: string
  message: string
}

function formatTranscriptMarkdown(turns: VoiceTurn[], meta: SaveVoiceTranscriptOptions): string {
  const header = [
    meta.provider ? `**Provider:** ${meta.provider}` : null,
    meta.mode ? `**Mode:** ${meta.mode.replace(/_/g, ' ')}` : null,
    meta.startedAt ? `**Started:** ${meta.startedAt}` : null,
    meta.endedAt ? `**Ended:** ${meta.endedAt}` : null,
    meta.projectId ? `**Project:** ${meta.projectId}` : null
  ]
    .filter(Boolean)
    .join(' · ')

  const body = turns
    .map((turn) => {
      const label = turn.role === 'user' ? 'You' : turn.role === 'assistant' ? 'ORB' : 'System'
      const interrupted = turn.interrupted ? ' *(interrupted)*' : ''
      return `### ${label}${interrupted}\n\n${turn.text.trim()}`
    })
    .join('\n\n')

  return header ? `${header}\n\n${body}` : body
}

function saveLocalFallback(turns: VoiceTurn[], title: string, meta: SaveVoiceTranscriptOptions) {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(LOCAL_VOICE_TRANSCRIPTS_KEY)
    const list = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : []
    list.unshift({
      id: `local_${Date.now()}`,
      title,
      type: 'voice_transcript',
      turns,
      meta,
      savedAt: new Date().toISOString()
    })
    window.localStorage.setItem(LOCAL_VOICE_TRANSCRIPTS_KEY, JSON.stringify(list.slice(0, 40)))
  } catch {
    /* ignore quota */
  }
}

export async function saveVoiceTranscript(
  turns: VoiceTurn[],
  options: SaveVoiceTranscriptOptions = {}
): Promise<SaveVoiceTranscriptResult> {
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
  const content = formatTranscriptMarkdown(turns, options)
  const tags = ['orb-voice', 'voice-transcript']
  if (options.provider) tags.push(`provider-${options.provider}`)
  if (options.mode) tags.push(`mode-${options.mode}`)

  try {
    const record = await createOrbSavedOutput({
      title,
      type: 'voice_transcript' as OrbSavedOutputType,
      summary: `${turns.length} voice turns · ${options.provider ?? 'browser'}`,
      content_markdown: content,
      tags,
      created_from: 'manual'
    })
    return {
      ok: true,
      savedRemote: true,
      outputId: record.id,
      message: 'Transcript saved to Saved Outputs.'
    }
  } catch {
    saveLocalFallback(turns, title, options)
    return {
      ok: true,
      savedRemote: false,
      message: 'Saved locally. Reconnect to sync to Saved Outputs.'
    }
  }
}
