'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

import { OrbDictateStudioAssistant } from '@/components/orb-standalone/orb-dictate-studio-assistant'
import {
  buildLocalDictateEditFallback,
  editOrbDictateDocument,
  type OrbDictateEditResult
} from '@/lib/orb/dictate/orb-dictate-client'
import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'

export function OrbWriteAiPanel({
  document: doc,
  onApplyRevision
}: {
  document: OrbWriteDocument
  onApplyRevision: (revised: string, label: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [pendingEdit, setPendingEdit] = useState<OrbDictateEditResult | null>(null)
  const [instruction, setInstruction] = useState('')

  async function runEdit(mode: OrbDictateEditMode | undefined, instr: string) {
    setEditing(true)
    try {
      const result = await editOrbDictateDocument({
        document_text: doc.body.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n'),
        instruction: instr,
        note_type: doc.record_type,
        mode,
        preserve_facts: true
      })
      setPendingEdit(result)
    } catch {
      setPendingEdit(
        buildLocalDictateEditFallback(
          doc.body.replace(/<[^>]+>/g, '\n'),
          mode ?? 'professional_language',
          instr
        )
      )
    } finally {
      setEditing(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]" data-orb-write-ai-panel>
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/40 px-3 py-2">
        <Sparkles className="h-4 w-4 text-[var(--orb-primary)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">IndiCare Brain</h3>
        {editing ? <Loader2 className="ml-auto h-4 w-4 animate-spin text-[var(--orb-muted)]" /> : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <OrbDictateStudioAssistant
          editing={editing}
          pendingEdit={pendingEdit}
          originalText={doc.body}
          onRunEdit={(mode, instr) => void runEdit(mode, instr)}
          onApplyEdit={() => {
            if (!pendingEdit) return
            onApplyRevision(pendingEdit.revised_text, pendingEdit.version_label)
            setPendingEdit(null)
          }}
          onDiscardEdit={() => setPendingEdit(null)}
          onKeepSuggestion={() => {
            if (!pendingEdit) return
            onApplyRevision(pendingEdit.revised_text, pendingEdit.version_label)
            setPendingEdit(null)
          }}
          onSetInstruction={setInstruction}
        />
      </div>
      {instruction ? (
        <p className="sr-only" data-orb-write-ai-instruction>
          {instruction}
        </p>
      ) : null}
    </div>
  )
}
