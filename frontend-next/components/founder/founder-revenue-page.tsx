'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2, PoundSterling, TrendingUp } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { founderGet } from '@/lib/founder/api/founder-api-client'
import type { AiMarginAnalysis, CommercialRisk, PricingModel, RevenueSnapshot } from '@/lib/founder/revenue/revenue-types'

type RevenueSnapshotPayload = {
  snapshot: RevenueSnapshot
  margin: AiMarginAnalysis
  risks: CommercialRisk[]
  recommendations: string[]
  sourcesConnected: string[]
  unavailableSources: string[]
}

function formatGbp(value: number | null, unavailable = '—'): string {
  if (value === null) return unavailable
  return `£${value.toLocaleString('en-GB', { minimumFractionDigits: value < 10 ? 2 : 0, maximumFractionDigits: 2 })}`
}

function formatPercent(value: number | null): string {
  if (value === null) return '—'
  return `${value.toFixed(1)}%`
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </article>
  )
}

function warningTone(level: AiMarginAnalysis['marginWarningLevel']): string {
  if (level === 'critical') return 'text-rose-300 border-rose-400/30 bg-rose-500/10'
  if (level === 'elevated') return 'text-amber-200 border-amber-400/30 bg-amber-500/10'
  if (level === 'unavailable') return 'text-slate-400 border-white/10 bg-white/5'
  return 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10'
}

function PricingCard({ model }: { model: PricingModel }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-white">{model.name}</h3>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">
          {model.status}
        </span>
      </div>
      <p className="mt-2 text-lg font-black text-cyan-200">
        {model.pricePerUser > 0 ? `£${model.pricePerUser.toFixed(2)}/user` : 'Pilot — no charge'}
        {model.pricePerProvider ? ` · £${model.pricePerProvider}/provider` : ''}
      </p>
      <p className="mt-2 text-xs text-slate-400">{model.targetCustomer}</p>
      <p className="mt-2 text-xs text-slate-500">{model.includedUsage}</p>
      <p className="mt-1 text-xs text-slate-500">{model.marginNotes}</p>
    </article>
  )
}

export function FounderRevenuePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<RevenueSnapshotPayload | null>(null)
  const [pricing, setPricing] = useState<PricingModel[]>([])
  const fetchedRef = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [snapshotResult, pricingResult] = await Promise.all([
      founderGet<RevenueSnapshotPayload>('/revenue/snapshot'),
      founderGet<{ models: PricingModel[] }>('/revenue/pricing')
    ])

    if (!snapshotResult.ok) {
      setError(snapshotResult.error)
      setPayload(null)
    } else {
      setPayload(snapshotResult.data)
    }

    if (pricingResult.ok) setPricing(pricingResult.data.models)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    void load()
  }, [load])

  const snapshot = payload?.snapshot
  const unavailable = snapshot?.source === 'unavailable'

  return (
    <div className="founder-dashboard min-h-screen space-y-8">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <FounderNavHeader
        title="Founder Revenue Intelligence"
        subtitle="Live commercial intelligence for IndiCare Intelligence."
      />

      <div className="flex justify-end">
        <Link
          href="/founder/revenue/forecast"
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/20"
        >
          <TrendingUp className="h-4 w-4" aria-hidden />
          Revenue Forecast
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading revenue intelligence…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
      ) : null}

      {snapshot ? (
        <>
          {unavailable ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              Live billing source not connected.
            </div>
          ) : null}

          <FounderSectionCard
            eyebrow="Revenue Snapshot"
            title="Commercial position"
            description={
              snapshot.source === 'estimated'
                ? 'Some values are estimated and labelled accordingly — not live billing truth.'
                : unavailable
                  ? 'AI cost may still be available; revenue metrics require live billing.'
                  : 'Live-connected metrics where billing data is available.'
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <MetricCard label="MRR" value={formatGbp(snapshot.mrr)} />
              <MetricCard label="ARR" value={formatGbp(snapshot.arr)} />
              <MetricCard label="Active Subscriptions" value={snapshot.activeSubscriptions?.toString() ?? '—'} />
              <MetricCard label="Paid Users" value={snapshot.paidUsers?.toString() ?? '—'} />
              <MetricCard label="Trial Users" value={snapshot.trialUsers?.toString() ?? '—'} />
              <MetricCard label="Conversion Rate" value={formatPercent(snapshot.conversionRate)} />
              <MetricCard label="Churn Rate" value={formatPercent(snapshot.churnRate)} />
              <MetricCard label="ARPU" value={formatGbp(snapshot.averageRevenuePerUser)} />
              <MetricCard label="Gross Margin" value={formatGbp(snapshot.grossMargin)} hint={formatPercent(snapshot.grossMarginPercent)} />
              <MetricCard label="AI Cost" value={formatGbp(snapshot.aiCost)} />
            </div>
            {snapshot.limitations.length > 0 ? (
              <ul className="mt-4 space-y-1 text-xs text-slate-500">
                {snapshot.limitations.slice(0, 5).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : null}
          </FounderSectionCard>

          {payload?.margin ? (
            <FounderSectionCard eyebrow="AI Cost Centre" title="Unit economics and margin risk">
              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${warningTone(payload.margin.marginWarningLevel)}`}>
                {payload.margin.marginWarningLabel}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Total AI Cost" value={formatGbp(payload.margin.totalAiCost)} />
                <MetricCard label="Cost per Conversation" value={formatGbp(payload.margin.costPerConversation)} />
                <MetricCard label="Cost per Active User" value={formatGbp(payload.margin.costPerActiveUser)} />
                <MetricCard label="Cost per Provider" value={formatGbp(payload.margin.costPerProvider)} />
              </div>
              {payload.recommendations.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {payload.recommendations.map((item) => (
                    <li key={item} className="flex gap-2">
                      <PoundSterling className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </FounderSectionCard>
          ) : null}

          <FounderSectionCard eyebrow="Pricing Models" title="Current and draft pricing">
            <div className="grid gap-4 md:grid-cols-2">
              {pricing.map((model) => (
                <PricingCard key={model.id} model={model} />
              ))}
            </div>
          </FounderSectionCard>

          {payload?.risks && payload.risks.length > 0 ? (
            <FounderSectionCard eyebrow="Commercial Risks" title="Honest commercial risk register">
              <div className="space-y-3">
                {payload.risks.map((risk) => (
                  <div key={risk.id} className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                    <div>
                      <p className="text-sm font-bold text-white">{risk.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{risk.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FounderSectionCard>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
