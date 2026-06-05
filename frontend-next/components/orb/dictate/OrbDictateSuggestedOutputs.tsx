'use client'

import { ORB_DICTATE_SUGGESTED_OUTPUTS } from '@/lib/orb/dictate/orb-dictate-studio-templates'
import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

export function OrbDictateSuggestedOutputs({
  activeNoteType,
  generatedTypes,
  onSelectOutput,
  disabled,
  variant = 'rail'
}: {
  activeNoteType: OrbDictateNoteType
  generatedTypes: OrbDictateNoteType[]
  onSelectOutput: (noteType: OrbDictateNoteType) => void
  disabled?: boolean
  variant?: 'rail' | 'panel'
}) {
  const isRail = variant === 'rail'

  return (
    <div
      className={`orb-dictate-suggested-outputs ${isRail ? 'orb-dictate-suggested-outputs--rail' : ''}`}
      data-orb-suggested-outputs
      data-orb-suggested-outputs-variant={variant}
    >
      <header className={`shrink-0 ${isRail ? 'px-1 pb-2' : 'border-b border-[var(--orb-line)]/40 px-4 py-3'}`}>
        <h3 className={`font-semibold text-[var(--orb-foreground)] ${isRail ? 'text-xs' : 'text-sm'}`}>
          Suggested outputs
        </h3>
        <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--orb-muted)]">
          One transcript can create multiple draft outputs. Adult review required before use.
        </p>
      </header>
      <div
        className={
          isRail
            ? 'flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : 'flex flex-wrap gap-2 p-4'
        }
        role="list"
        aria-label="Suggested draft outputs"
      >
        {ORB_DICTATE_SUGGESTED_OUTPUTS.map((output) => {
          const isActive = activeNoteType === output.noteType
          const wasGenerated = generatedTypes.includes(output.noteType)
          return (
            <button
              key={output.id}
              type="button"
              data-orb-suggested-output={output.id}
              disabled={disabled}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs transition disabled:opacity-50 ${
                isActive
                  ? 'border-[var(--orb-primary)]/50 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                  : 'border-[var(--orb-line)]/50 bg-[var(--orb-surface)] text-[var(--orb-foreground)] hover:border-[var(--orb-primary)]/30'
              }`}
              onClick={() => onSelectOutput(output.noteType)}
            >
              <span className="font-medium">{output.label}</span>
              {wasGenerated ? (
                <span className="ml-1.5 text-[10px] text-emerald-300" aria-label="Draft created">
                  ✓
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
