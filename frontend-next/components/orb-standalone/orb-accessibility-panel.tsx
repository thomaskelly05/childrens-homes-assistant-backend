'use client'

import { useEffect, useState } from 'react'
import { Accessibility, X } from 'lucide-react'

import {
  defaultStandaloneOrbAccessibility,
  loadStandaloneOrbAccessibility,
  saveStandaloneOrbAccessibility,
  type StandaloneOrbAccessibilityPreferences
} from '@/lib/orb/standalone-accessibility'

const CONTROLS: Array<{ key: keyof StandaloneOrbAccessibilityPreferences; label: string }> = [
  { key: 'dyslexiaMode', label: 'Dyslexia-friendly text' },
  { key: 'lowSensoryMode', label: 'Low sensory mode' },
  { key: 'largeText', label: 'Larger text' },
  { key: 'compactMode', label: 'Compact mode' },
  { key: 'highContrast', label: 'High contrast' },
  { key: 'reducedMotion', label: 'Reduce animations' },
  { key: 'simplifiedReading', label: 'Simplified reading mode' }
]

export function OrbStandaloneAccessibilityPanel({
  open,
  onClose,
  onChange
}: {
  open: boolean
  onClose: () => void
  onChange?: (prefs: StandaloneOrbAccessibilityPreferences) => void
}) {
  const [prefs, setPrefs] = useState(defaultStandaloneOrbAccessibility)

  useEffect(() => {
    if (!open) return
    const loaded = loadStandaloneOrbAccessibility()
    setPrefs(loaded)
    onChange?.(loaded)
  }, [open, onChange])

  if (!open) return null

  function update(key: keyof StandaloneOrbAccessibilityPreferences, value: boolean) {
    setPrefs((current) => {
      const next = { ...current, [key]: value }
      saveStandaloneOrbAccessibility(next)
      onChange?.(next)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-label="Accessibility">
      <div className="orb-floating-panel w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1117] p-6 text-white">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/90">
              <Accessibility className="h-4 w-4" />
              Accessibility
            </p>
            <h2 className="mt-1 text-lg font-black">Reading & sensory</h2>
            <p className="mt-2 text-xs text-slate-500">Stored in localStorage on this device.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-2">
          {CONTROLS.map((control) => (
            <li key={control.key}>
              <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm">
                {control.label}
                <input
                  type="checkbox"
                  checked={prefs[control.key]}
                  onChange={(e) => update(control.key, e.target.checked)}
                  className="h-5 w-5 accent-cyan-300"
                />
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
