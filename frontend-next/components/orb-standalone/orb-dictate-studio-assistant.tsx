'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'

import {
  ORB_DICTATE_QUICK_ACTIONS,
  QUICK_ACTION_GROUPS,
  type OrbDictateEditMode,
  type OrbDictateQuickAction
} from '@/lib/orb/dictate/orb-dictate-studio-actions'
import type { OrbDictateEditResult } from '@/lib/orb/dictate/orb-dictate-client'
import { diffOrbDictateSections } from '@/lib/orb/dictate/orb-dictate-diff'

export function OrbDictateStudioAssistant({
  editing,
  pendingEdit,
  originalText,
  onRunEdit,
  onApplyEdit,
  onDiscardEdit,
  onKeepSuggestion,
  onSetInstruction
}: {
  editing: boolean
  pendingEdit: OrbDictateEditResult | null
  originalText: string
  onRunEdit: (mode: OrbDictateEditMode | undefined, instruction: string) => void
  onApplyEdit: () => void
  onDiscardEdit: () => void
  onKeepSuggestion: () => void
  onSetInstruction: (text: string) => void
}) {
  const [instruction, setInstruction] = useState('')

  function runQuick(action: OrbDictateQuickAction) {
    setInstruction(action.instruction)
    onSetInstruction(action.instruction)
    onRunEdit(action.mode, action.instruction)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-orb-dictate-studio-assistant>
      <p className="text-xs text-[var(--orb-muted)]">
        Ask ORB to improve your draft. Changes are suggested — you choose whether to apply them.
      </p>

      <div className="flex flex-wrap gap-1" data-orb-dictate-direct-quote-notice>
        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100">
          Direct quotes are preserved unless you allow rewriting
        </span>
      </div>

      {QUICK_ACTION_GROUPS.map((group) => (
        <section key={group.id}>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">{group.title}</h4>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {ORB_DICTATE_QUICK_ACTIONS.filter((a) => a.group === group.id).map((action) => (
              <button
                key={action.id}
                type="button"
                data-orb-dictate-quick-action={action.id}
                disabled={editing}
                className="rounded-lg border border-[var(--orb-line)]/50 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-200 hover:border-sky-400/40 hover:bg-sky-500/10 disabled:opacity-50"
                onClick={() => runQuick(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      ))}

      <form
        className="mt-auto space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          const text = instruction.trim()
          if (!text) return
          onRunEdit(undefined, text)
        }}
      >
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
          Custom instruction
        </label>
        <textarea
          data-orb-dictate-studio-instruction
          value={instruction}
          onChange={(e) => {
            setInstruction(e.target.value)
            onSetInstruction(e.target.value)
          }}
          rows={3}
          placeholder="Ask ORB to improve this…"
          className="w-full rounded-xl border border-[var(--orb-line)]/60 bg-black/25 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={editing || !instruction.trim()}
          data-orb-dictate-studio-submit-edit
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500/30 to-blue-600/30 py-2.5 text-sm font-medium text-sky-100 disabled:opacity-50"
        >
          {editing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {editing ? 'ORB is revising…' : 'Ask ORB'}
        </button>
      </form>

      {pendingEdit ? (
        <section
          className="rounded-xl border border-sky-400/30 bg-sky-500/5 p-3"
          data-orb-dictate-edit-preview
          data-orb-dictate-section-diff
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-200">
            <Sparkles className="h-3.5 w-3.5" />
            {pendingEdit.version_label}
          </div>
          {pendingEdit.change_summary.length ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-slate-300">
              {pendingEdit.change_summary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {pendingEdit.warnings.length ? (
            <ul className="mt-2 space-y-0.5 text-[11px] text-amber-200/90">
              {pendingEdit.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-2 space-y-2" data-orb-dictate-section-changes>
            {diffOrbDictateSections(originalText, pendingEdit.revised_text).map((section) => (
              <details
                key={section.heading}
                className="rounded-lg border border-[var(--orb-line)]/40 bg-black/20 p-2"
                open
              >
                <summary className="cursor-pointer text-[11px] font-medium text-sky-200">
                  {section.heading} — changed
                </summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase text-slate-500">Before</p>
                    <p className="mt-0.5 max-h-24 overflow-y-auto whitespace-pre-wrap text-[10px] text-slate-400">
                      {section.before.slice(0, 500)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-slate-500">After</p>
                    <p className="mt-0.5 max-h-24 overflow-y-auto whitespace-pre-wrap text-[10px] text-slate-200">
                      {section.after.slice(0, 500)}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-orb-dictate-apply-edit
              className="rounded-lg bg-sky-500/25 px-3 py-1.5 text-xs font-medium text-sky-100"
              onClick={onApplyEdit}
            >
              Apply changes
            </button>
            <button
              type="button"
              data-orb-dictate-keep-suggestion
              className="rounded-lg border border-sky-400/30 px-3 py-1.5 text-xs text-sky-100"
              onClick={onKeepSuggestion}
            >
              Keep as suggestion
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--orb-line)]/50 px-3 py-1.5 text-xs text-slate-300"
              onClick={onDiscardEdit}
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
