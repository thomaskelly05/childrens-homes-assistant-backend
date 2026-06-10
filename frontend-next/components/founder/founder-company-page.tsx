'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Building2, ChevronRight } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { FounderCompanyKpiCard } from '@/components/founder/founder-company-kpi-card'
import { buildCompanyOperatingModel } from '@/lib/founder/company/company-service'

const STATUS_TONE = {
  healthy: 'text-emerald-300 border-emerald-400/40',
  watch: 'text-amber-300 border-amber-400/40',
  'at-risk': 'text-rose-300 border-rose-400/40',
  unavailable: 'text-slate-400 border-white/20'
} as const

export function FounderCompanyPage() {
  const model = useMemo(() => buildCompanyOperatingModel(), [])

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Founder Company Operating Model"
          subtitle="Live executive operating system for IndiCare Intelligence."
        />

        <FounderSectionCard eyebrow="Company score" title="Overall company health">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Overall score</p>
              <p className="mt-2 text-4xl font-black text-white">{model.scorecard.overallCompanyScore}/100</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Confidence</p>
              <p className="mt-2 text-4xl font-black text-white">{model.scorecard.overallConfidence}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Last updated</p>
              <p className="mt-2 text-sm text-slate-300">{new Date(model.generatedAt).toLocaleString('en-GB')}</p>
            </div>
          </div>
          {model.limitations.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-amber-200/90">
              {model.limitations.slice(0, 4).map((l) => (
                <li key={l}>· {l}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/founder/company/scorecard" className="rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-200">
              View scorecard
            </Link>
            <Link href="/founder/company/cadence" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-300">
              Operating cadence
            </Link>
            <Link href="/founder/company/board-report" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-300">
              Board report
            </Link>
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Executive departments" title="Department owners" description="Thomas at the helm with AI agents as the executive team.">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {model.departments.map((dept) => (
              <article key={dept.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">{dept.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">{dept.aiAgentOwner}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_TONE[dept.status]}`}>
                    {dept.status}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-400">Score: {dept.score ?? '—'}/100 · Confidence {dept.confidence ?? '—'}%</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {dept.liveKpis.slice(0, 2).map((kpi) => (
                    <FounderCompanyKpiCard key={kpi.id} kpi={kpi} compact />
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Priority: {dept.currentPriorities[0] ?? '—'}
                </p>
                <p className="mt-1 text-xs text-rose-200/80">
                  Risk: {dept.openRisks[0] ?? 'None flagged'}
                </p>
                <Link
                  href={`/founder/company/departments/${dept.id}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-300 hover:text-cyan-200"
                >
                  Open department <ChevronRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
          <Link href="/founder/company/departments" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-300">
            <Building2 className="h-4 w-4" /> All departments
          </Link>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Live company KPIs" title="Headline metrics" description="Real live metrics or unavailable — no mock numbers.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {model.companyKpis.map((kpi) => (
              <FounderCompanyKpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="CEO agenda" title="Today's CEO agenda">
          <ul className="space-y-3">
            {model.ceoAgenda.length > 0 ? (
              model.ceoAgenda.map((item) => (
                <li key={item.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.category}</span>
                  <p className="mt-1 font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                </li>
              ))
            ) : (
              <p className="text-sm text-slate-400">Connect live data sources to populate the CEO agenda.</p>
            )}
          </ul>
        </FounderSectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <FounderSectionCard eyebrow="Risks" title="Department risks">
            <ul className="space-y-2 text-sm text-slate-300">
              {model.scorecard.risks.length > 0 ? model.scorecard.risks.map((r) => <li key={r}>· {r}</li>) : <li>No risks from connected data.</li>}
            </ul>
          </FounderSectionCard>
          <FounderSectionCard eyebrow="Opportunities" title="Department opportunities">
            <ul className="space-y-2 text-sm text-slate-300">
              {model.scorecard.opportunities.length > 0 ? model.scorecard.opportunities.map((o) => <li key={o}>· {o}</li>) : <li>No opportunities identified yet.</li>}
            </ul>
          </FounderSectionCard>
        </div>

        <FounderSectionCard eyebrow="Data integrity" title="Data limitations">
          <ul className="space-y-1 text-sm text-amber-200/90">
            {model.limitations.map((l) => (
              <li key={l}>· {l}</li>
            ))}
          </ul>
        </FounderSectionCard>
      </div>
    </div>
  )
}
