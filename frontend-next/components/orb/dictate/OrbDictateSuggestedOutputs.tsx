'use client'

import { ORB_DICTATE_SUGGESTED_OUTPUTS } from '@/lib/orb/dictate/orb-dictate-studio-templates'
import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

export function OrbDictateSuggestedOutputs({
  activeNoteType,
  generatedTypes,
  onSelectOutput,
  disabled
}: {
  activeNoteType: OrbDictateNoteType
  generatedTypes: OrbDictateNoteType[]
  onSelectOutput: (noteType: OrbDictateNoteType) => void
  disabled?: boolean
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-orb-suggested-outputs>
      <header className="shrink-0 border-b border-[var(--orb-line)]/40 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
          What Happens Next
        </h3>
        <p className="mt-0.5 text-[10px] text-[var(--orb-muted)]">
          One transcript can create multiple draft outputs. Review each before use.
        </p>
      </header>
      <div className="flex flex-wrap gap-2 p-3">
        {ORB_DICTATE_SUGGESTED_OUTPUTS.map((output) => {
          const isActive = activeNoteType === output.noteType
          const wasGenerated = generatedTypes.includes(output.noteType)
          return (
            <button
              key={output.id}
              type="button"
              data-orb-suggested-output={output.id}
              disabled={disabled}
              className={`rounded-xl border px-3 py-2 text-left text-xs transition disabled:opacity-50 ${
                isActive
                  ? 'border-[var(--orb-primary)]/50 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                  : 'border-[var(--orb-line)]/50 bg-[var(--orb-surface)] text-[var(--orb-foreground)] hover:border-[var(--orb-primary)]/30'
              }`}
              onClick={() => onSelectOutput(output.noteType)}
            >
              {output.label}
              {wasGenerated ? <span className="ml-1 text-[10px] text-emerald-300">✓</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
