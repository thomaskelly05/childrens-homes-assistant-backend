'use client'

import { Loader2 } from 'lucide-react'

import {
  ORB_DICTATE_APPLY_ORB_CHANGE,
  ORB_DICTATE_EDIT_ASSISTANT_SUPPORTING,
  ORB_DICTATE_EDIT_ASSISTANT_TITLE,
  ORB_DICTATE_EDIT_INSTRUCTION_PLACEHOLDER,
  ORB_DICTATE_QUICK_EDIT_PROMPTS
} from '@/lib/orb/dictate/orb-dictate-capture-copy'

export type OrbDictateEditAssistantProps = {
  instruction: string
  onInstructionChange: (value: string) => void
  onApply: () => void
  applying: boolean
  disabled: boolean
  canApply: boolean
  editNote?: string | null
  applyStatus?: string | null
}

export function OrbDictateEditAssistant({
  instruction,
  onInstructionChange,
  onApply,
  applying,
  disabled,
  canApply,
  editNote,
  applyStatus
}: OrbDictateEditAssistantProps) {
  return (
    <section
      className="orb-dictate-edit-assistant rounded-2xl border border-[var(--orb-line)]/20 bg-white p-4 shadow-sm"
      data-orb-dictate-edit-assistant
      data-orb-dictate-assistant-rail-premium
    >
      <h4 className="text-sm font-semibold tracking-tight text-[var(--orb-foreground)]" data-orb-dictate-edit-assistant-title>
        {ORB_DICTATE_EDIT_ASSISTANT_TITLE}
      </h4>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--orb-foreground)]/75" data-orb-dictate-edit-assistant-supporting>
        {ORB_DICTATE_EDIT_ASSISTANT_SUPPORTING}
      </p>

      <textarea
        value={instruction}
        onChange={(e) => onInstructionChange(e.target.value)}
        disabled={disabled}
        rows={4}
        placeholder={ORB_DICTATE_EDIT_INSTRUCTION_PLACEHOLDER}
        className="orb-dictate-edit-instruction mt-3 w-full resize-y rounded-xl border border-[var(--orb-line)]/30 bg-white px-3 py-2.5 text-sm leading-relaxed text-[var(--orb-foreground)] outline-none focus:border-[var(--orb-primary)]/40 focus:ring-2 focus:ring-[var(--orb-primary)]/10 disabled:opacity-70"
        data-orb-dictate-edit-instruction
        aria-label="ORB edit instruction"
      />

      <div className="mt-2.5 flex flex-wrap gap-1.5" role="list" aria-label="Quick ORB edit prompts">
        {ORB_DICTATE_QUICK_EDIT_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            role="listitem"
            disabled={disabled}
            data-orb-dictate-quick-edit-prompt={prompt.id}
            className="orb-dictate-secondary-action rounded-full border border-[var(--orb-line)]/35 bg-[var(--orb-surface)]/60 px-2.5 py-1 text-[10px] font-semibold text-[var(--orb-foreground)] transition hover:border-[var(--orb-primary)]/30 disabled:opacity-60"
            onClick={() => onInstructionChange(prompt.instruction)}
          >
            {prompt.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        data-orb-dictate-apply-orb-change
        disabled={disabled || applying || !canApply}
        className="orb-dictate-apply-action orb-dictate-primary-action mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-55"
        onClick={onApply}
      >
        {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" aria-hidden /> : null}
        {ORB_DICTATE_APPLY_ORB_CHANGE}
      </button>

      {applyStatus ? (
        <p className="orb-dictate-assistant-status mt-2 text-xs font-medium leading-relaxed text-[var(--orb-primary)]" data-orb-dictate-apply-status>
          {applyStatus}
        </p>
      ) : null}

      {editNote ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-edit-offline-note>
          {editNote}
        </p>
      ) : null}
    </section>
  )
}
