import {
  buildSavedOutputCreateBody,
  buildVoiceSavedOutputBrainMetadata
} from '@/lib/orb/orb-saved-output-adapters'
import { createOrbSavedOutput, type OrbSavedOutputType } from '@/lib/orb/standalone-client'
import type { OrbVoiceModeId, VoiceTurn } from '@/lib/orb/voice/orb-voice-types'

const LOCAL_VOICE_TRANSCRIPTS_KEY = 'orb-voice-transcript-fallback'

export type SaveVoiceTranscriptOptions = {
  mode?: OrbVoiceModeId
  provider?: string
  startedAt?: string
  endedAt?: string
  projectId?: string | null
  /** User-visible voice summary (e.g. assistant reply shown in chat). */
  voiceSummary?: string
}

export type SaveVoiceTranscriptResult = {
  ok: boolean
  savedRemote: boolean
  outputId?: string
  message: string
}

export function formatVoiceTurnsPlainText(turns: VoiceTurn[]): string {
  return turns
    .filter((turn) => turn.role === 'user' || turn.role === 'assistant')
    .map((turn) => {
      const label = turn.role === 'user' ? 'You' : 'ORB'
      return `${label}: ${turn.text.trim()}`
    })
    .join('\n\n')
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

export function buildVoiceSavedOutputContent(
  turns: VoiceTurn[],
  meta: SaveVoiceTranscriptOptions = {}
): string {
  const summary =
    meta.voiceSummary?.trim() ||
    [...turns].reverse().find((t) => t.role === 'assistant')?.text.trim() ||
    ''
  const transcriptBlock = formatTranscriptMarkdown(turns, meta)
  if (summary) {
    return `## Voice summary\n\n${summary}\n\n## Transcript\n\n${transcriptBlock}`
  }
  return `## Transcript\n\n${transcriptBlock}`
}

export function buildVoiceSavedOutputCreatePayload(
  turns: VoiceTurn[],
  options: SaveVoiceTranscriptOptions = {}
) {
  const dateLabel = new Date().toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  const title = `ORB Voice conversation — ${dateLabel}`
  const sourceText = formatVoiceTurnsPlainText(turns)
  const tags = ['orb-voice', 'voice-transcript']
  if (options.provider) tags.push(`provider-${options.provider}`)
  if (options.mode) tags.push(`mode-${options.mode}`)

  return buildSavedOutputCreateBody({
    title,
    type: 'voice_transcript' as OrbSavedOutputType,
    summary: `${turns.length} voice turns · ${options.provider ?? 'browser'}`,
    content_markdown: buildVoiceSavedOutputContent(turns, options),
    tags,
    created_from: 'voice',
    extras: {
      source_feature: 'voice',
      source_text: sourceText,
      brain_metadata: buildVoiceSavedOutputBrainMetadata()
    }
  })
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
      created_from: 'voice',
      source_feature: 'voice',
      brain_metadata: buildVoiceSavedOutputBrainMetadata(),
      source_text: formatVoiceTurnsPlainText(turns),
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

  const payload = buildVoiceSavedOutputCreatePayload(turns, options)

  try {
    const record = await createOrbSavedOutput(payload)
    return {
      ok: true,
      savedRemote: true,
      outputId: record.id,
      message: 'Saved to ORB Saved Outputs.'
    }
  } catch {
    saveLocalFallback(turns, payload.title, options)
    return {
      ok: true,
      savedRemote: false,
      message: 'Saved locally. Reconnect to sync to Saved Outputs.'
    }
  }
}
