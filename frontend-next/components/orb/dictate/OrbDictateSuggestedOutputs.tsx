'use client'

import { suggestedOutputsForRecordType } from '@/lib/orb/dictate/orb-dictate-studio-templates'
import { resolveOrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-framework'
import type { OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

export function OrbDictateSuggestedOutputs({
  activeNoteType,
  studioTemplateId,
  generatedTypes,
  onSelectOutput,
  disabled,
  variant = 'rail'
}: {
  activeNoteType: OrbDictateNoteType
  studioTemplateId?: string
  generatedTypes: OrbDictateNoteType[]
  onSelectOutput: (noteType: OrbDictateNoteType) => void
  disabled?: boolean
  variant?: 'rail' | 'panel'
}) {
  const recordType = resolveOrbRecordingRecordType({
    studioTemplateId,
    noteType: activeNoteType
  })
  const outputs = suggestedOutputsForRecordType(recordType.id).map((o) => ({
    id: o.id,
    label: `Create ${o.label}`,
    noteType: o.dictate_note_type
  }))

  const isRail = variant === 'rail'

  return (
    <div
      className={`orb-dictate-suggested-outputs ${isRail ? 'orb-dictate-suggested-outputs--rail' : ''}`}
      data-orb-suggested-outputs
      data-orb-suggested-outputs-variant={variant}
      data-orb-suggested-outputs-record-type={recordType.id}
    >
      <header className={`shrink-0 ${isRail ? 'px-1 pb-2' : 'border-b border-[var(--orb-line)]/40 px-4 py-3'}`}>
        <h3 className={`font-semibold text-[var(--orb-foreground)] ${isRail ? 'text-xs' : 'text-sm'}`}>
          Suggested outputs
        </h3>
        <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--orb-muted)]">
          Relevant to {recordType.label}. Adult review required before use.
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
        {outputs.map((output) => {
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
