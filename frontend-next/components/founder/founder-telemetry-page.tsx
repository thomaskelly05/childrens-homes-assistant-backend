'use client'

import { useEffect, useState } from 'react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { refreshFounderDashboardData } from '@/lib/founder/intelligence-service'
import {
  getFounderTelemetryEvents,
  getFounderTelemetrySummary,
  hydrateFounderTelemetryFromLiveData,
  refreshFounderTelemetrySummary
} from '@/lib/founder/telemetry'

export function FounderTelemetryPage() {
  const [, setTick] = useState(0)

  useEffect(() => {
    refreshFounderDashboardData()
      .then(() => hydrateFounderTelemetryFromLiveData())
      .then(() => refreshFounderTelemetrySummary())
      .then(() => setTick((t) => t + 1))
      .catch(() => undefined)
  }, [])

  const summary = getFounderTelemetrySummary()
  const events = getFounderTelemetryEvents()
  const hasEvents = events.length > 0

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Founder Telemetry"
          subtitle="Live platform events with anonymised operational metadata only. No child, staff or provider names."
        />

        {!hasEvents ? (
          <div className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-12 text-center">
            <p className="text-lg font-bold text-slate-300">No live telemetry yet.</p>
            <p className="mt-2 text-sm text-slate-500">Connect live data sources on the command centre to populate telemetry events.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Total events', value: summary.totalEvents },
                { label: 'Events today', value: summary.eventsToday },
                { label: 'ORB conversations', value: summary.orbConversations },
                { label: 'AI requests', value: summary.aiRequests },
                { label: 'Errors', value: summary.errors },
                { label: 'Feedback', value: summary.feedbackCount },
                { label: 'AI cost estimate', value: summary.estimatedAiCost > 0 ? `£${summary.estimatedAiCost.toFixed(2)}` : '—' },
                { label: 'Last updated', value: summary.lastUpdated ? new Date(summary.lastUpdated).toLocaleString('en-GB') : '—' }
              ].map((item) => (
                <div key={item.label} className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            {summary.topOrbModes.length > 0 ? (
              <FounderSectionCard eyebrow="ORB" title="Top ORB modes">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {summary.topOrbModes.map((mode) => (
                    <div key={mode.mode} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-bold text-white">{mode.mode}</p>
                      <p className="text-sm text-cyan-300">{mode.count} events</p>
                    </div>
                  ))}
                </div>
              </FounderSectionCard>
            ) : null}

            {summary.featureUsage.length > 0 ? (
              <FounderSectionCard eyebrow="Features" title="Feature usage">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {summary.featureUsage.map((f) => (
                    <div key={f.feature} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                      <p className="font-bold text-white">{f.feature}</p>
                      <p className="text-sm text-emerald-300">{f.count} events</p>
                    </div>
                  ))}
                </div>
              </FounderSectionCard>
            ) : null}

            <FounderSectionCard eyebrow="Events" title="Live event stream">
              <div className="max-h-[480px] space-y-2 overflow-y-auto">
                {events.slice(0, 50).map((event) => (
                  <div key={event.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm">
                    <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-200">
                      {event.eventType}
                    </span>
                    <span className="text-slate-500">{new Date(event.timestamp).toLocaleString('en-GB')}</span>
                    <span className="text-slate-400">{event.source}</span>
                    {event.route ? <span className="text-slate-500">{event.route}</span> : null}
                  </div>
                ))}
              </div>
            </FounderSectionCard>
          </>
        )}
      </div>
    </div>
  )
}
