'use client'

import type { OrbModeDecision, OrbSelectedMode } from '@/lib/orb/types'

const modes: Array<{ id: OrbSelectedMode; label: string; description: string }> = [
  { id: 'auto', label: 'Auto', description: 'Routes by role, workspace and question.' },
  { id: 'care', label: 'Care brain', description: 'Warm operational support.' },
  { id: 'inspector', label: 'Inspector brain', description: 'Evidence-led regulatory challenge.' },
  { id: 'general', label: 'General', description: 'Everyday assistant with no care retrieval.' }
]

export function OrbModeSwitcher({
  value,
  decision,
  onChange
}: {
  value: OrbSelectedMode
  decision: OrbModeDecision
  onChange: (mode: OrbSelectedMode) => void
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Orb reasoning mode</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={`rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              value === mode.id ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-slate-100 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="block text-sm font-black">{mode.label}</span>
            <span className="mt-1 block text-xs leading-5">{mode.description}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <strong className="text-slate-950">Active:</strong> {decision.brain.replaceAll('_', ' ')} · {decision.reason}
      </div>
    </div>
  )
}

