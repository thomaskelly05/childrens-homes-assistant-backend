'use client'

import type { OrbAppearanceMode } from '@/lib/orb/orb-appearance'
import { ORB_RESIDENTIAL_THEME_LOCK_COPY } from '@/lib/orb/orb-appearance'

const OPTIONS: Array<{ id: OrbAppearanceMode; label: string }> = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' }
]

export function OrbAppearanceControl({
  value,
  onChange,
  residentialLocked = false,
  lockCopy = ORB_RESIDENTIAL_THEME_LOCK_COPY
}: {
  value: OrbAppearanceMode
  onChange: (mode: OrbAppearanceMode) => void
  residentialLocked?: boolean
  lockCopy?: string
}) {
  const effectiveValue = residentialLocked ? 'light' : value

  return (
    <div className="space-y-2" data-orb-appearance-control data-orb-appearance-locked={residentialLocked ? 'true' : undefined}>
      <p className="text-xs font-medium text-slate-700">Appearance</p>
      {residentialLocked ? (
        <p className="text-[11px] leading-5 text-slate-600" data-orb-appearance-lock-copy>
          {lockCopy}
        </p>
      ) : (
        <p className="text-[11px] leading-5 text-slate-600" data-orb-appearance-hint>
          System changes automatically based on time of day.
        </p>
      )}
      <div
        className="orb-appearance-segmented flex rounded-xl border border-slate-200 bg-white p-0.5"
        role="radiogroup"
        aria-label="Appearance"
        aria-disabled={residentialLocked}
      >
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={effectiveValue === option.id}
            disabled={residentialLocked && option.id !== 'light'}
            onClick={() => {
              if (residentialLocked) return
              onChange(option.id)
            }}
            className={`min-h-[2.75rem] flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
              effectiveValue === option.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            } ${residentialLocked && option.id !== 'light' ? 'cursor-not-allowed opacity-45' : ''}`}
            data-orb-appearance-option={option.id}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
