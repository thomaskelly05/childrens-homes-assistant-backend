'use client'

import { useEffect, useState } from 'react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
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

  function update(key: keyof StandaloneOrbAccessibilityPreferences, value: boolean) {
    setPrefs((current) => {
      const next = { ...current, [key]: value }
      saveStandaloneOrbAccessibility(next)
      onChange?.(next)
      return next
    })
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Accessibility"
      subtitle="Reading, contrast and sensory options"
      onClose={onClose}
      panelId="accessibility"
      ariaLabel="ORB accessibility"
      footer="Preferences are stored in localStorage on this device."
    >
      <div className="p-4" data-orb-accessibility-panel>
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
    </OrbStandalonePanelShell>
  )
}
