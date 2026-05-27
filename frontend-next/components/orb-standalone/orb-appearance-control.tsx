'use client'

import type { OrbAppearanceMode } from '@/lib/orb/orb-appearance'

const OPTIONS: Array<{ id: OrbAppearanceMode; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' }
]

export function OrbAppearanceControl({
  value,
  onChange
}: {
  value: OrbAppearanceMode
  onChange: (mode: OrbAppearanceMode) => void
}) {
  return (
    <div className="space-y-2" data-orb-appearance-control>
      <p className="text-xs font-medium text-[var(--orb-muted)]">Appearance</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Appearance">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            onClick={() => onChange(option.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              value === option.id
                ? 'border-[var(--orb-primary-cyan)] bg-[#00B8FF]/10 text-[var(--orb-foreground)]'
                : 'border-[var(--orb-line)] text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]'
            }`}
            data-orb-appearance-option={option.id}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
