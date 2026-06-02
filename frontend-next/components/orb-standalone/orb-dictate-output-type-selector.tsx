'use client'

import {
  ORB_DICTATE_HERO_OUTPUT_HINTS,
  ORB_DICTATE_HERO_OUTPUT_TYPES
} from '@/lib/orb/dictate/orb-dictate-hero-output-types'
import {
  ORB_DICTATE_NOTE_TYPE_LABELS,
  type OrbDictateNoteType
} from '@/lib/orb/dictate/orb-dictate-types'

export function OrbDictateOutputTypeSelector({
  value,
  onChange,
  compact = false
}: {
  value: OrbDictateNoteType
  onChange: (noteType: OrbDictateNoteType) => void
  compact?: boolean
}) {
  return (
    <section data-orb-dictate-output-types>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
        Output type
      </h3>
      <p className="mt-1 text-[11px] text-[var(--orb-muted)]">
        Choose the residential record ORB should shape from your rough notes.
      </p>
      <div
        className={
          compact
            ? 'mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3'
            : 'orb-dictate-output-types mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3'
        }
      >
        {ORB_DICTATE_HERO_OUTPUT_TYPES.map((noteType) => {
          const selected = value === noteType
          const hint = ORB_DICTATE_HERO_OUTPUT_HINTS[noteType]
          return (
            <button
              key={noteType}
              type="button"
              data-orb-dictate-output-type={noteType}
              aria-pressed={selected}
              className={`orb-dictate-output-type-card rounded-xl border px-3 py-2.5 text-left transition ${
                selected
                  ? 'border-[var(--orb-primary)]/50 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                  : 'border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] text-[var(--orb-foreground)] hover:border-[var(--orb-primary)]/30'
              }`}
              onClick={() => onChange(noteType)}
            >
              <span className="block text-xs font-medium leading-snug">
                {ORB_DICTATE_NOTE_TYPE_LABELS[noteType]}
              </span>
              {hint ? (
                <span className="mt-0.5 block text-[10px] leading-snug text-[var(--orb-muted)]">
                  {hint}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <details className="mt-2 text-[11px] text-[var(--orb-muted)]">
        <summary className="cursor-pointer hover:text-[var(--orb-foreground)]">
          More record types
        </summary>
        <select
          data-orb-dictate-note-type
          value={value}
          onChange={(e) => onChange(e.target.value as OrbDictateNoteType)}
          className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
        >
          {(Object.keys(ORB_DICTATE_NOTE_TYPE_LABELS) as OrbDictateNoteType[]).map((t) => (
            <option key={t} value={t}>
              {ORB_DICTATE_NOTE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </details>
    </section>
  )
}
