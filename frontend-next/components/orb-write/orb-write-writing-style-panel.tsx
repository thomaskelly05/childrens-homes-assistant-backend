'use client'

import { useState } from 'react'
import { Loader2, PenLine } from 'lucide-react'

import { buildLocalDictateEditFallback, editOrbDictateDocument } from '@/lib/orb/dictate/orb-dictate-client'
import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'
import { allTherapeuticPrompts } from '@/lib/orb/recording/orb-therapeutic-writing'
import {
  ORB_SPELLING_GRAMMAR_REMINDER,
  ORB_WRITE_WRITING_STYLE_OPTIONS,
  type OrbTemplateWritingStyleId
} from '@/lib/orb/recording/orb-template-writing-styles'
import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'

export function OrbWriteWritingStylePanel({
  document: doc,
  recordType,
  onApplyRevision
}: {
  document: OrbWriteDocument
  recordType: OrbRecordingRecordType
  onApplyRevision: (revised: string, label: string) => void
}) {
  const [selectedStyle, setSelectedStyle] = useState<OrbTemplateWritingStyleId>('balanced')
  const [editing, setEditing] = useState(false)

  const prompts = allTherapeuticPrompts(recordType.id).slice(0, 5)
  const wf = recordType.writing_framework

  async function runStyleEdit(mode: OrbDictateEditMode, instruction: string, label: string) {
    setEditing(true)
    try {
      const result = await editOrbDictateDocument({
        document_text: doc.body.replace(/<[^>]+>/g, '\n'),
        instruction,
        note_type: doc.record_type,
        mode,
        preserve_facts: true
      })
      onApplyRevision(result.revised_text, label)
    } catch {
      const fallback = buildLocalDictateEditFallback(
        doc.body.replace(/<[^>]+>/g, '\n'),
        mode,
        instruction
      )
      onApplyRevision(fallback.revised_text, fallback.version_label)
    } finally {
      setEditing(false)
    }
  }

  return (
    <div
      className="rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] p-3"
      data-orb-write-writing-style-panel
    >
      <header className="mb-2 flex items-center gap-2">
        <PenLine className="h-3.5 w-3.5 text-[var(--orb-primary)]" aria-hidden />
        <h3 className="text-xs font-semibold text-[var(--orb-foreground)]">Writing style</h3>
        {editing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--orb-muted)]" aria-hidden /> : null}
      </header>
      <p className="text-[10px] text-[var(--orb-muted)]">
        {wf?.writing_guidance ?? recordType.professional_language_guidance}
      </p>
      <div className="mt-2 flex flex-wrap gap-1" data-orb-write-style-options>
        {ORB_WRITE_WRITING_STYLE_OPTIONS.map((style) => (
          <button
            key={style.id}
            type="button"
            disabled={editing || !style.editMode}
            onClick={() => {
              setSelectedStyle(style.id)
              if (style.editMode && style.instruction) {
                void runStyleEdit(style.editMode, style.instruction, style.label)
              }
            }}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold disabled:opacity-50 ${
              selectedStyle === style.id
                ? 'border-sky-400/40 bg-sky-500/10 text-[var(--orb-foreground)]'
                : 'border-[var(--orb-line)] text-[var(--orb-muted)]'
            }`}
            data-orb-write-style={style.id}
            title={style.description}
          >
            {style.chipLabel}
          </button>
        ))}
      </div>
      <ul className="mt-2 space-y-0.5 text-[10px] text-[var(--orb-muted)]" data-orb-write-template-prompts>
        {prompts.map((p) => (
          <li key={p}>• {p}</li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-[var(--orb-muted)]" data-orb-write-spelling-reminder>
        {wf?.spelling_grammar_reminder ?? ORB_SPELLING_GRAMMAR_REMINDER}
      </p>
    </div>
  )
}
