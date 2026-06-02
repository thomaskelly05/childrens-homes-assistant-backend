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
      <div
        className="orb-appearance-segmented flex rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-0.5"
        role="radiogroup"
        aria-label="Appearance"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            onClick={() => onChange(option.id)}
            className={`min-h-[2.25rem] flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
              value === option.id
                ? 'bg-gradient-to-r from-[#168bff] to-[#0d5fcc] text-white shadow-sm'
                : 'text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
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
