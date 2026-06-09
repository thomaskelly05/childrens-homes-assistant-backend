'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { Lock, Shield, Sun } from 'lucide-react'

import { getFounderDashboardData } from '@/lib/founder/intelligence-service'
import { FounderActivityFeed } from '@/components/founder/founder-activity-feed'
import { FounderAgentCard } from '@/components/founder/founder-agent-card'
import { FounderCostCentre } from '@/components/founder/founder-cost-centre'
import { FounderKpiCard } from '@/components/founder/founder-kpi-card'
import { FounderReadinessPanel } from '@/components/founder/founder-readiness-panel'
import { FounderRecommendationCard } from '@/components/founder/founder-recommendation-card'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { FounderTrendCard } from '@/components/founder/founder-trend-card'

const chartColours = ['#22d3ee', '#38bdf8', '#818cf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#94a3b8']

const abandonmentTone = {
  low: 'text-emerald-300',
  medium: 'text-amber-300',
  high: 'text-rose-300'
} as const

const demandTone = {
  rising: 'text-emerald-300',
  stable: 'text-slate-300',
  falling: 'text-rose-300'
} as const

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1220] px-3 py-2 text-xs shadow-xl">
      <p className="font-bold text-white">{label}</p>
      <p className="mt-1 text-cyan-300">{payload[0].value} queries</p>
    </div>
  )
}

export function FounderDashboardPage() {
  const data = useMemo(() => getFounderDashboardData(), [])

  const orbChartData = useMemo(
    () => data.orbIntelligence.categories.map((category) => ({ name: category.name, volume: category.volume })),
    [data.orbIntelligence.categories]
  )

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <header className="founder-surface rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Founder-only operating dashboard
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">IndiCare Intelligence Command Centre</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
                Private live overview of business performance, ORB usage, risk, revenue, Ofsted readiness, and what to build next.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <Link
                href="/founder/briefing"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
              >
                <Sun className="h-4 w-4" aria-hidden />
                Daily Briefing
              </Link>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Prepared for</p>
                <p className="mt-1 text-sm font-bold text-white">Thomas Kelly</p>
                <p className="text-xs text-slate-500">Founder · IndiCare Intelligence</p>
              </div>
            </div>
          </div>
        </header>

        <FounderSectionCard eyebrow="Mission Control" title="Executive KPIs" description="Live business and product signals across revenue, adoption, impact, and AI cost.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.kpis.map((kpi) => (
              <FounderKpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </FounderSectionCard>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <FounderSectionCard
            eyebrow="Live Activity Feed"
            title="Platform activity"
            description="Anonymised operational events only. No child names, staff names, or identifiable safeguarding details."
          >
            <FounderActivityFeed items={data.activityFeed} />
          </FounderSectionCard>

          <FounderSectionCard eyebrow="Data Safety" title="Private intelligence notice">
            <div className="flex gap-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-5">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden />
              <p className="text-sm leading-7 text-slate-300">
                This dashboard uses anonymised operational intelligence only. It must not expose child names, staff names, personal records, addresses, or identifiable safeguarding details.
              </p>
            </div>
          </FounderSectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <FounderSectionCard eyebrow="ORB Intelligence" title="Question and output patterns" description="Category demand across ORB conversations and generated reports.">
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Safeguarding query volume</p>
                <p className="mt-2 text-3xl font-black text-white">{data.orbIntelligence.safeguardingVolume}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Report generation volume</p>
                <p className="mt-2 text-3xl font-black text-white">{data.orbIntelligence.reportGenerationVolume}</p>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orbChartData} margin={{ top: 8, right: 8, left: -18, bottom: 48 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} angle={-24} textAnchor="end" height={70} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="volume" radius={[8, 8, 0, 0]}>
                    {orbChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={chartColours[index % chartColours.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Fastest growing category</p>
                <p className="mt-2 text-lg font-bold text-cyan-200">{data.orbIntelligence.fastestGrowing}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Emerging themes</p>
                <ul className="mt-3 space-y-2">
                  {data.orbIntelligence.emergingThemes.map((theme) => (
                    <li key={theme} className="text-sm leading-6 text-slate-300">
                      {theme}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FounderSectionCard>

          <FounderSectionCard eyebrow="Product Intelligence" title="Feature usage and demand" description="Adoption, abandonment risk, and build priority across the product surface.">
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-slate-500">Most used</p>
                <p className="mt-1 text-lg font-bold text-white">{data.productIntelligence.mostUsed}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-slate-500">Least used</p>
                <p className="mt-1 text-lg font-bold text-white">{data.productIntelligence.leastUsed}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-slate-500">Abandonment risk</p>
                <p className="mt-1 text-lg font-bold text-amber-300">{data.productIntelligence.highestAbandonmentRisk}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs text-slate-500">Feature demand</p>
                <p className="mt-1 text-lg font-bold text-cyan-300">{data.productIntelligence.topDemand}</p>
              </div>
            </div>
            <div className="space-y-3">
              {data.productIntelligence.features.map((feature) => (
                <article key={feature.name} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-bold text-white">{feature.name}</p>
                    <p className="text-sm font-bold text-slate-300">{feature.usage}% adoption</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${feature.usage}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
                    <span className="text-slate-500">Trend {feature.trend > 0 ? '+' : ''}{feature.trend}%</span>
                    <span className={abandonmentTone[feature.abandonmentRisk]}>Abandonment {feature.abandonmentRisk}</span>
                    <span className={demandTone[feature.demand]}>Demand {feature.demand}</span>
                  </div>
                </article>
              ))}
            </div>
          </FounderSectionCard>
        </div>

        <FounderSectionCard eyebrow="Ofsted Intelligence" title="Inspection readiness across homes" description="Readiness scores calculated by the Ofsted Readiness Engine with recurring evidence gaps.">
          <FounderReadinessPanel homes={data.ofstedIntelligence.homes} commonGaps={data.ofstedIntelligence.commonGaps} />
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Sector Intelligence" title="Anonymous aggregated trends" description="Sector-wide patterns across children's homes with no identifiable child or staff information.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.sectorIntelligence.map((trend) => (
              <FounderTrendCard key={trend.id} trend={trend} />
            ))}
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Founder Recommendations" title="What to build next" description="AI-style prioritisation based on usage, risk, readiness, and unit economics.">
          <div className="grid gap-4 xl:grid-cols-2">
            {data.recommendations.map((recommendation) => (
              <FounderRecommendationCard key={recommendation.id} recommendation={recommendation} />
            ))}
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Agent Command Centre" title="Founder agents" description="Specialist agents for briefing, product, Ofsted, growth, quality, and storytelling.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.agents.map((agent) => (
              <FounderAgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="AI Cost Centre" title="Unit economics and usage guardrails" description="OpenAI spend, margin signals, and usage warnings for founder oversight.">
          <FounderCostCentre data={data.costCentre} />
        </FounderSectionCard>
      </div>
    </div>
  )
}
