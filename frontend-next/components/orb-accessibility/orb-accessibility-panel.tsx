'use client'

import { useState } from 'react'

import { defaultOrbAccessibilityPreferences, type OrbAccessibilityPreferences } from '@/lib/orb/accessibility/preferences'

const controls: Array<{ key: keyof OrbAccessibilityPreferences; label: string }> = [
  { key: 'neurodiverseMode', label: 'Neurodiverse mode' },
  { key: 'dyslexiaMode', label: 'Dyslexia mode' },
  { key: 'lowVisionMode', label: 'Low vision mode' },
  { key: 'hearingAccessibility', label: 'Hearing accessibility' },
  { key: 'motorAccessibility', label: 'Motor accessibility' },
  { key: 'emotionalRegulationMode', label: 'Emotional regulation mode' },
  { key: 'captions', label: 'Captions' },
  { key: 'transcript', label: 'Transcript' },
  { key: 'reducedMotion', label: 'Reduced motion' },
  { key: 'highContrast', label: 'High contrast' },
  { key: 'largerText', label: 'Larger text' },
  { key: 'simplifiedLayout', label: 'Simplified layout' },
  { key: 'focusMode', label: 'Focus mode' },
  { key: 'largeTapTargets', label: 'Large tap targets' },
  { key: 'voiceFirstNavigation', label: 'Voice-first navigation' }
]

export function OrbAccessibilityPanel() {
  const [preferences, setPreferences] = useState(defaultOrbAccessibilityPreferences)

  return (
    <section className="rounded-[36px] border border-white/10 bg-white/8 p-6 text-white backdrop-blur">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">Accessibility-first ORB</p>
      <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">Make ORB easier to use</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">OpenDyslexic is not bundled; dyslexia mode uses system font fallbacks, wider tracking and calmer spacing.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {controls.map((control) => (
          <label key={control.key} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold">
            {control.label}
            <input
              type="checkbox"
              checked={Boolean(preferences[control.key])}
              onChange={(event) => setPreferences((current) => ({ ...current, [control.key]: event.target.checked }))}
              className="h-5 w-5 accent-cyan-200"
            />
          </label>
        ))}
      </div>
    </section>
  )
}

