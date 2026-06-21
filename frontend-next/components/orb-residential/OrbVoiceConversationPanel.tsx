'use client'

import { useCallback, useState } from 'react'

import {
  ORB_VOICE_CONVERSATION_SUBLABEL,
  ORB_VOICE_CONVERSATION_TITLE
} from '@/lib/orb/voice/orb-voice-reflective-copy'
import type { VoiceTurn } from '@/lib/orb/voice/orb-voice-types'

function formatTurnTime(iso?: string): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
}

export function OrbVoiceConversationPanel({
  turns,
  interimTranscript,
  editable = false,
  onTurnTextChange,
  className = ''
}: {
  turns: VoiceTurn[]
  interimTranscript?: string
  editable?: boolean
  onTurnTextChange?: (turnId: string, text: string) => void
  className?: string
}) {
  const dialogue = turns.filter((t) => t.role === 'user' || t.role === 'assistant')
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleBlur = useCallback(
    (turnId: string, value: string) => {
      setEditingId(null)
      onTurnTextChange?.(turnId, value)
    },
    [onTurnTextChange]
  )

  if (!dialogue.length && !interimTranscript?.trim()) return null

  return (
    <section
      className={`orb-voice-conversation w-full space-y-2 text-left ${className}`.trim()}
      data-orb-voice-conversation-panel
      data-orb-voice-conversation
    >
      <div data-orb-voice-conversation-header>
        <p className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-voice-conversation-title>
          {ORB_VOICE_CONVERSATION_TITLE}
        </p>
        <p className="text-[11px] text-[var(--orb-muted)]" data-orb-voice-conversation-sublabel>
          {ORB_VOICE_CONVERSATION_SUBLABEL}
        </p>
      </div>

      <div
        className="max-h-[min(40dvh,20rem)] overflow-y-auto rounded-2xl border border-[var(--orb-line)]/25 bg-[var(--orb-surface-elevated)]/40 p-3 backdrop-blur-sm"
        data-orb-voice-conversation-transcript
      >
        {dialogue.length ? (
          <div className="space-y-2">
            {dialogue.map((line) => {
              const time = formatTurnTime(line.completedAt || line.startedAt)
              const isEditing = editable && editingId === line.id
              return (
                <div
                  key={line.id}
                  className={`rounded-xl px-3 py-2 text-xs leading-5 ${
                    line.role === 'user'
                      ? 'ml-3 bg-[var(--orb-primary-soft)]/35 text-[var(--orb-foreground)]'
                      : 'mr-3 bg-[var(--orb-surface)]/80 text-[var(--orb-foreground)]'
                  }`}
                  data-orb-voice-conversation-turn={line.role}
                  data-orb-voice-transcript-turn={line.role}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                      {line.role === 'user' ? 'Adult' : 'ORB'}
                    </span>
                    {time ? (
                      <span className="text-[10px] text-[var(--orb-muted)]" data-orb-voice-turn-time>
                        {time}
                      </span>
                    ) : null}
                  </div>
                  {isEditing ? (
                    <textarea
                      className="mt-1 w-full resize-y rounded-lg border border-[var(--orb-line)]/40 bg-transparent p-2 text-xs"
                      defaultValue={line.text}
                      rows={3}
                      onBlur={(e) => handleBlur(line.id, e.target.value)}
                      data-orb-voice-conversation-edit
                    />
                  ) : (
                    <p
                      className={`mt-0.5 whitespace-pre-wrap ${editable ? 'cursor-text' : ''}`}
                      onClick={editable ? () => setEditingId(line.id) : undefined}
                    >
                      {line.text}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
        {interimTranscript?.trim() ? (
          <p className="text-xs italic leading-5 text-[var(--orb-muted)]" data-orb-voice-interim>
            {interimTranscript}
          </p>
        ) : null}
      </div>
    </section>
  )
}
