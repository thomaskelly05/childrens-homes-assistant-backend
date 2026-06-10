'use client'

import { useMemo, useState } from 'react'
import { FileCheck, Shield } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { FounderCompanyKpiCard } from '@/components/founder/founder-company-kpi-card'
import {
  boardReportExternalCopyBlocked,
  generateCompanyBoardReport
} from '@/lib/founder/company/company-board-report-engine'
import { buildCompanyLiveKpis } from '@/lib/founder/company/company-live-kpi-builder'
import type { CompanyBoardReport } from '@/lib/founder/company/company-types'

export function FounderCompanyBoardReportPage() {
  const { kpis, limitations } = useMemo(() => buildCompanyLiveKpis(), [])
  const [report, setReport] = useState<CompanyBoardReport | null>(null)
  const [generating, setGenerating] = useState(false)

  function handleGenerate() {
    setGenerating(true)
    try {
      const next = generateCompanyBoardReport(kpis, limitations, { actor: 'thomas', writeAudit: true })
      setReport(next)
    } finally {
      setGenerating(false)
    }
  }

  const copyBlock = report ? boardReportExternalCopyBlocked(report) : ''

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Board report"
          subtitle="Board-style report from live data and approved forecasts only."
          showBack
          backHref="/founder/company"
        />

        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
          <div className="flex items-center gap-2 font-bold">
            <Shield className="h-4 w-4" /> External use requires approval (company-board-report)
          </div>
          <p className="mt-2 text-amber-100/90">Forecasts are labelled as assumptions. No fake traction or invented revenue.</p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-bold text-cyan-200 disabled:opacity-50"
        >
          <FileCheck className="h-4 w-4" />
          {generating ? 'Generating…' : 'Generate board report'}
        </button>

        {report ? (
          <>
            <FounderSectionCard title={report.title} description={`Status: ${report.status} · ${report.periodStart.slice(0, 10)} to ${report.periodEnd.slice(0, 10)}`}>
              {copyBlock ? <p className="mb-4 text-sm text-rose-200/90">{copyBlock}</p> : null}
              {report.approvalId ? (
                <p className="mb-4 text-sm text-slate-400">Approval queued: {report.approvalId}</p>
              ) : null}
              <div className="space-y-6">
                {report.sections.map((section) => (
                  <article key={section.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-white">{section.title}</h3>
                      <span className="text-[10px] uppercase text-slate-500">{section.sourceStatus}</span>
                    </div>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-300">{section.body}</pre>
                  </article>
                ))}
              </div>
            </FounderSectionCard>

            <FounderSectionCard title="Live metrics in report">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {report.liveMetrics.map((kpi) => (
                  <FounderCompanyKpiCard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </FounderSectionCard>

            {report.forecasts.length > 0 ? (
              <FounderSectionCard title="Forecasts (assumptions)">
                <div className="grid gap-4 sm:grid-cols-2">
                  {report.forecasts.map((kpi) => (
                    <FounderCompanyKpiCard key={kpi.id} kpi={kpi} />
                  ))}
                </div>
              </FounderSectionCard>
            ) : null}

            <FounderSectionCard title="Limitations">
              <ul className="space-y-1 text-sm text-amber-200/90">
                {report.limitations.map((l) => <li key={l}>· {l}</li>)}
              </ul>
            </FounderSectionCard>
          </>
        ) : (
          <p className="text-sm text-slate-400">Generate a board report from connected live data. Missing sources will show as unavailable.</p>
        )}
      </div>
    </div>
  )
}
