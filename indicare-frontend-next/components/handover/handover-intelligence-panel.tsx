'use client'

import Link from 'next/link'

import { HandoverSectionCard } from '@/components/handover/handover-section-card'
import { HandoverOrbSupport } from '@/components/handover/handover-orb-support'
import type { HandoverIntelligenceDashboard } from '@/lib/os-api/handover-intelligence'

function MetricCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-200"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </Link>
  )
}

export function HandoverIntelligencePanel({
  dashboard,
  fallbackRoutes
}: {
  dashboard: HandoverIntelligenceDashboard | null
  fallbackRoutes?: {
    alerts?: string
    reviews?: string
    safeguarding?: string
    actions?: string
  }
}) {
  if (!dashboard) {
    return (
      <div
        data-testid="handover-intelligence-loading"
        className="rounded-2xl border border-slate-100 bg-white p-6 text-sm font-semibold text-slate-600"
      >
        Handover intelligence is loading…
      </div>
    )
  }

  const routes = { ...fallbackRoutes, ...(dashboard.routes || {}) }

  const sectionOrder = [
    'staff_shift',
    'safeguarding_isn',
    'recording_alerts',
    'reviews',
    'actions',
    'child_updates',
    'health_medication',
    'environment',
    'next_shift_priorities'
  ]
  const ordered = sectionOrder
    .map((id) => dashboard.sections.find((s) => s.id === id))
    .filter(Boolean) as typeof dashboard.sections

  return (
    <aside data-testid="handover-intelligence-panel" className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Urgent" value={dashboard.urgent_count} href={routes.alerts || '/record/alerts'} />
        <MetricCard label="Safeguarding" value={dashboard.safeguarding_count} href={routes.safeguarding || '/safeguarding'} />
        <MetricCard label="Reviews" value={dashboard.review_count} href={routes.reviews || '/record/reviews'} />
        <MetricCard
          label="Actions"
          value={dashboard.action_count}
          href={routes.actions || fallbackRoutes?.actions || '/select-scope'}
        />
        <MetricCard label="Recording alerts" value={dashboard.recording_alert_count} href={routes.alerts || '/record/alerts'} />
      </section>

      <p className="text-xs font-semibold leading-5 text-slate-600" data-testid="handover-safety-copy">
        Handover summaries use metadata and safe summaries. Open linked records for full detail where you have permission.
      </p>
      <p className="sr-only">
        Safeguarding and ISN · Recording alerts · Reviews awaiting action · Next shift priorities
      </p>

      <div className="space-y-3">{ordered.map((section) => <HandoverSectionCard key={section.id} section={section} />)}</div>

      {dashboard.recommendations.length ? (
        <section className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">Recommendations</h3>
          <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-700">
            {dashboard.recommendations.map((rec) => (
              <li key={rec}>{rec}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <HandoverOrbSupport dashboard={dashboard} />
    </aside>
  )
}
