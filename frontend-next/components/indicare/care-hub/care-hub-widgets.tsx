'use client'

import Link from 'next/link'

import {
  OperationalSignalGrid,
  WellbeingRing,
  type OperationalSignal
} from '@/components/indicare/operational-cognition-widgets'
import { Card, StatusBadge } from '@/components/indicare/ui'
import type { CareHubAlert, CareHubPayload } from '@/lib/os-api/care-hub'

export function CareHubIntelligenceWidgets({ payload }: { payload: CareHubPayload | null }) {
  if (!payload?.ok) {
    return (
      <Card>
        <p className="text-sm font-semibold leading-6 text-slate-500">
          Live Care Hub intelligence is not available yet. Existing chronology, governance and ORB routes remain active.
        </p>
      </Card>
    )
  }

  const live = payload.live_status || {}
  const risk = payload.risk_matrix || {}
  const workflow = payload.workflow_completion || {}
  const alerts = payload.alerts?.alerts || []

  const signals: OperationalSignal[] = [
    {
      label: 'Operational risk',
      value: risk.live_operational_risk_score ?? '—',
      detail: risk.matrix_state ? `Matrix ${risk.matrix_state}` : undefined,
      tone: (risk.live_operational_risk_score || 0) >= 60 ? 'amber' : 'emerald'
    },
    {
      label: 'Workflow health',
      value: workflow.workflow_health_pct != null ? `${workflow.workflow_health_pct}%` : '—',
      detail: 'Completion across recent records',
      tone: 'blue'
    },
    {
      label: 'Child voice quality',
      value: live.child_voice_quality_pct != null ? `${live.child_voice_quality_pct}%` : '—',
      detail: 'Voice presence in operational feed',
      tone: 'purple'
    },
    {
      label: 'Inspection readiness',
      value: live.inspection_readiness_pct != null ? `${live.inspection_readiness_pct}%` : '—',
      detail: payload.orb_reasoning?.inspection_summary,
      tone: 'slate'
    }
  ]

  const rings = [
    { label: 'Workflow', value: workflow.workflow_health_pct ?? 0 },
    { label: 'Evidence', value: live.evidence_linkage_pct ?? 0 },
    { label: 'Inspection', value: live.inspection_readiness_pct ?? 0 }
  ]

  return (
    <div className="space-y-6">
      <OperationalSignalGrid signals={signals} />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-700">Live operational dashboard</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">Safeguarding, climate and workforce pressure</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {rings.map((ring) => (
              <WellbeingRing key={ring.label} label={ring.label} value={ring.value} />
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Emotional climate</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {(live.live_emotional_climate as { state?: string })?.state || 'unknown'}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Safeguarding pressure</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {(live.live_safeguarding_pressure as { state?: string })?.state || 'unknown'}
              </p>
            </article>
          </div>
        </Card>

        <Card className="bg-slate-950 text-white ring-slate-800">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-300">ORB intelligence</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
            {payload.orb_reasoning?.conversation_summary || payload.orb_reasoning?.operational_summary || 'ORB operational reasoning available from live feed.'}
          </p>
          <Link
            href="/orb?context=care-hub&q=What%20patterns%20exist%20before%20incidents%3F"
            className="mt-4 inline-flex rounded-2xl bg-blue-500/20 px-4 py-3 text-xs font-black text-blue-100"
          >
            Ask ORB about patterns
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Live alerts</p>
          <div className="mt-4 space-y-3">
            {alerts.length ? (
              alerts.slice(0, 8).map((alert: CareHubAlert, index: number) => (
                <article key={`${alert.type}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-950">{alert.type.replaceAll('_', ' ')}</p>
                    <StatusBadge value={alert.severity} />
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{alert.message}</p>
                </article>
              ))
            ) : (
              <p className="text-sm font-semibold text-slate-500">No live operational alerts from the current feed.</p>
            )}
          </div>
        </Card>

        <Card>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">Workflow & inspection</p>
          <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600">
            <p>Operational completion: {workflow.operational_completion_pct ?? '—'}%</p>
            <p>Inspection vulnerability: {workflow.inspection_vulnerability_pct ?? '—'}%</p>
            <p>{payload.summary}</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
