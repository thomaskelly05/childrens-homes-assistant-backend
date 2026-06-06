'use client'

import { useState } from 'react'
import { Check, Loader2, Sparkles, X } from 'lucide-react'

import {
  buildLocalDictateEditFallback,
  editOrbDictateDocument,
  type OrbDictateEditResult
} from '@/lib/orb/dictate/orb-dictate-client'
import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'
import { ORB_CONVERGED_WRITE_PANEL_GROUPS } from '@/lib/orb/orb-converged-actions'
import { ORB_WRITE_AI_ACTIONS, type OrbWriteAiAction } from '@/lib/orb/write/orb-write-ai-actions'
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

  function runAction(action: OrbWriteAiAction) {
    setInstruction(action.instruction)
    void runEdit(action.mode, action.instruction)
  }

  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]"
      data-orb-write-ai-panel
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/40 px-3 py-2.5">
        <Sparkles className="h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-[var(--orb-foreground)]">ORB guidance</h3>
          <p className="text-[10px] leading-snug text-[var(--orb-muted)]">
            ORB suggests — you review and apply. Nothing is submitted automatically.
          </p>
        </div>
        {editing ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--orb-muted)]" aria-label="ORB is working" /> : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {ORB_CONVERGED_WRITE_PANEL_GROUPS.map((group) => (
          <section key={group.key} className="mb-3 last:mb-0" data-orb-write-ai-group={group.key}>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">{group.title}</h4>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ORB_WRITE_AI_ACTIONS.filter((a) => group.actionIds.includes(a.id)).map((action) => (
                <button
                  key={action.id}
                  type="button"
                  data-orb-write-ai-action={action.id}
                  disabled={editing}
                  className="text-[var(--orb-foreground)] disabled:opacity-50"
                  onClick={() => runAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </section>
        ))}

        <form
          className="mt-4 space-y-2 border-t border-[var(--orb-line)]/40 pt-3"
          onSubmit={(e) => {
            e.preventDefault()
            const text = instruction.trim()
            if (!text) return
            void runEdit(undefined, text)
          }}
        >
          <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]" htmlFor="orb-write-ai-instruction">
            Custom instruction
          </label>
          <textarea
            id="orb-write-ai-instruction"
            data-orb-write-ai-instruction-input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            placeholder="Ask ORB to improve this record…"
            className="w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)]"
          />
          <button
            type="submit"
            disabled={editing || !instruction.trim()}
            data-orb-write-ai-submit
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500/90 to-blue-600/90 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {editing ? 'ORB is suggesting…' : 'Ask ORB'}
          </button>
        </form>

        {pendingEdit ? (
          <section
            className="mt-4 rounded-xl border border-sky-400/30 bg-sky-500/5 p-3"
            data-orb-write-ai-preview
          >
            <p className="text-xs font-semibold text-[var(--orb-foreground)]">{pendingEdit.version_label}</p>
            {pendingEdit.change_summary.length ? (
              <ul className="mt-2 space-y-1 text-[11px] text-[var(--orb-muted)]">
                {pendingEdit.change_summary.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-[var(--orb-line)]/40 bg-[var(--orb-surface)] p-2 text-xs leading-relaxed text-[var(--orb-foreground)]">
              {pendingEdit.revised_text}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                data-orb-write-ai-apply
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600/90 px-3 py-1.5 text-[11px] font-medium text-white"
                onClick={() => {
                  onApplyRevision(pendingEdit.revised_text, pendingEdit.version_label)
                  setPendingEdit(null)
                }}
              >
                <Check className="h-3.5 w-3.5" />
                Apply suggestion
              </button>
              <button
                type="button"
                data-orb-write-ai-discard
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-3 py-1.5 text-[11px] font-medium text-[var(--orb-muted)]"
                onClick={() => setPendingEdit(null)}
              >
                <X className="h-3.5 w-3.5" />
                Discard
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
