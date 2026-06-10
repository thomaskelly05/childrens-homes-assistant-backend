'use client'

import { useMemo } from 'react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { FounderCompanyKpiCard } from '@/components/founder/founder-company-kpi-card'
import { buildCompanyOperatingModel } from '@/lib/founder/company/company-service'
import { COMPANY_DEPARTMENTS } from '@/lib/founder/company/company-departments'

export function FounderCompanyScorecardPage() {
  const model = useMemo(() => buildCompanyOperatingModel(), [])

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Company scorecard"
          subtitle="Conservative scores — missing live data lowers confidence."
          showBack
          backHref="/founder/company"
        />

        <FounderSectionCard title="Overall company score">
          <p className="text-5xl font-black text-white">{model.scorecard.overallCompanyScore}/100</p>
          <p className="mt-2 text-slate-400">Data confidence: {model.scorecard.overallConfidence}%</p>
        </FounderSectionCard>

        <FounderSectionCard title="Department scores">
          <div className="space-y-4">
            {model.scorecard.departmentScores.map((ds) => {
              const name = COMPANY_DEPARTMENTS.find((d) => d.id === ds.departmentId)?.name ?? ds.departmentId
              return (
                <div key={ds.departmentId} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-white">{name}</p>
                    <p className="text-cyan-300">{ds.score}/100 · {ds.confidence}% confidence</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{ds.reason}</p>
                  {ds.risks.length > 0 ? <p className="mt-2 text-sm text-rose-200/80">Risks: {ds.risks.join('; ')}</p> : null}
                  <p className="mt-1 text-xs text-slate-500">Trend unavailable until more live data is captured.</p>
                </div>
              )
            })}
          </div>
        </FounderSectionCard>

        <FounderSectionCard title="Live KPI table">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {model.scorecard.liveKpis.slice(0, 18).map((kpi) => (
              <FounderCompanyKpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </FounderSectionCard>

        <FounderSectionCard title="Missing data">
          <ul className="space-y-1 text-sm text-amber-200/90">
            {model.limitations.map((l) => <li key={l}>· {l}</li>)}
          </ul>
        </FounderSectionCard>
      </div>
    </div>
  )
}
