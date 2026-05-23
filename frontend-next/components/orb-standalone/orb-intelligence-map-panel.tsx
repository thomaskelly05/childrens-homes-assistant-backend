'use client'

import { useEffect, useState } from 'react'
import { Map, X } from 'lucide-react'

import {
  fetchStandaloneOrbCapabilities,
  fetchStandaloneOrbCapabilitiesSummary,
  type StandaloneOrbCapability
} from '@/lib/orb/standalone-client'

const DISPLAY_ORDER = [
  'core_chat',
  'voice',
  'vision',
  'file_upload',
  'knowledge_library',
  'agents',
  'deep_research',
  'saved_outputs',
  'staff_profiles',
  'child_profiles',
  'collaboration',
  'mobile',
  'notifications',
  'security'
]

function statusLabel(status: string) {
  if (status === 'built') return 'Built'
  if (status === 'partial') return 'Partial'
  if (status === 'planned') return 'Planned'
  return status
}

export function OrbIntelligenceMapPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [capabilities, setCapabilities] = useState<StandaloneOrbCapability[]>([])
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    Promise.all([fetchStandaloneOrbCapabilities(), fetchStandaloneOrbCapabilitiesSummary()])
      .then(([caps, sum]) => {
        if (cancelled) return
        setCapabilities(caps)
        setSummary(sum)
      })
      .catch(() => {
        if (!cancelled) setCapabilities([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

  const byCategory = new globalThis.Map<string, StandaloneOrbCapability>()
  for (const cap of capabilities) {
    if (!byCategory.has(cap.category) || cap.status === 'built') {
      byCategory.set(cap.category, cap)
    }
  }

  const ordered = DISPLAY_ORDER.map((cat) => byCategory.get(cat)).filter(Boolean) as StandaloneOrbCapability[]

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center" role="dialog" aria-label="IndiCare Intelligence Map">
      <div className="orb-floating-panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1117] p-6 text-white">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/90">
              <Map className="h-4 w-4" />
              IndiCare Intelligence Map
            </p>
            <h2 className="mt-1 text-xl font-black">Product parity</h2>
            {summary ? (
              <p className="mt-2 text-xs text-slate-500">
                {String(summary.built ?? 0)} built · {String(summary.partial ?? 0)} partial ·{' '}
                {String(summary.planned ?? 0)} planned
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/10" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? <p className="text-sm text-slate-500">Loading capability map…</p> : null}

        <ul className="mt-2 space-y-2">
          {ordered.map((cap) => (
            <li
              key={cap.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div>
                <p className="text-sm font-bold text-slate-200">{cap.title}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-600">{cap.surface.replace(/_/g, ' ')}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                  cap.status === 'built'
                    ? 'bg-emerald-500/15 text-emerald-200'
                    : cap.status === 'partial'
                      ? 'bg-amber-500/15 text-amber-200'
                      : 'bg-slate-500/15 text-slate-400'
                }`}
              >
                {statusLabel(cap.status)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Staff profiles, child profiles, live collaboration, notifications and screen share remain OS or planned surfaces.
          Security/RBAC is enforced at the IndiCare OS layer.
        </p>
      </div>
    </div>
  )
}
