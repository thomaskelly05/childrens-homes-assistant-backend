'use client'

import { useEffect, useState } from 'react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
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

  const byCategory = new globalThis.Map<string, StandaloneOrbCapability>()
  for (const cap of capabilities) {
    if (!byCategory.has(cap.category) || cap.status === 'built') {
      byCategory.set(cap.category, cap)
    }
  }

  const ordered = DISPLAY_ORDER.map((cat) => byCategory.get(cat)).filter(Boolean) as StandaloneOrbCapability[]

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Intelligence map"
      subtitle="Standalone capability parity view"
      onClose={onClose}
      panelId="intelligence_map"
      ariaLabel="IndiCare Intelligence Map"
      footer="Staff profiles, child profiles and live collaboration require IndiCare OS context."
    >
      <div className="p-4" data-orb-intelligence-map-panel>
        {summary ? (
          <p className="mb-3 text-xs text-slate-500">
            {String(summary.built ?? 0)} built · {String(summary.partial ?? 0)} partial ·{' '}
            {String(summary.planned ?? 0)} planned
          </p>
        ) : null}

        {loading ? <p className="text-sm text-slate-500">Loading capability map…</p> : null}

        <ul className="space-y-2">
          {ordered.map((cap) => (
            <li
              key={cap.id}
              className="orb-panel-card flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-200">{cap.title}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-600">{cap.surface.replace(/_/g, ' ')}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ${
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
      </div>
    </OrbStandalonePanelShell>
  )
}
