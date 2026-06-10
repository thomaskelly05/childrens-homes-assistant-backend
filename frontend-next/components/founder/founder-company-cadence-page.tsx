'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { buildCeoAgenda, buildCompanyCadences } from '@/lib/founder/company/company-cadence-engine'
import { buildCompanyLiveKpis } from '@/lib/founder/company/company-live-kpi-builder'

export function FounderCompanyCadencePage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { kpis } = useMemo(() => buildCompanyLiveKpis(), [refreshKey])
  const cadences = useMemo(() => buildCompanyCadences(kpis), [kpis])
  const ceoAgenda = useMemo(() => buildCeoAgenda(kpis), [kpis])

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Operating cadence"
          subtitle="Daily, weekly, monthly and quarterly company rhythms."
          showBack
          backHref="/founder/company"
        />

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRefreshKey((k) => k + 1)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-200">
            <RefreshCw className="h-4 w-4" /> Generate Daily CEO Agenda
          </button>
          <Link href="/founder/intelligence/briefings" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-300">
            Generate Weekly Executive Pack
          </Link>
          <Link href="/founder/company/board-report" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-300">
            Generate Monthly Board Report
          </Link>
          <Link href="/founder/operating-loop" className="rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-300">
            Run Company Operating Loop
          </Link>
        </div>

        {ceoAgenda.length > 0 ? (
          <FounderSectionCard title="Today's CEO agenda (preview)">
            <ul className="space-y-2 text-sm text-slate-300">
              {ceoAgenda.slice(0, 6).map((a) => (
                <li key={a.id} className="rounded-lg border border-white/10 px-3 py-2">
                  <span className="text-[10px] uppercase text-slate-500">{a.category}</span> — {a.title}
                </li>
              ))}
            </ul>
          </FounderSectionCard>
        ) : null}

        {cadences.map((cadence) => (
          <FounderSectionCard key={cadence.id} title={cadence.title} description={`${cadence.cadenceType} · Owner: ${cadence.owner}`}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Agenda</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">{cadence.agenda.map((a) => <li key={a}>· {a}</li>)}</ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Required inputs</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-400">{cadence.requiredInputs.map((i) => <li key={i}>· {i}</li>)}</ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Outputs</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">{cadence.outputs.map((o) => <li key={o}>· {o}</li>)}</ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Generated actions</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {(cadence.generatedActions ?? []).map((a) => <li key={a}>· {a}</li>)}
                </ul>
                {cadence.approvalRequired ? (
                  <p className="mt-3 text-xs text-amber-200/90">External sharing requires Thomas approval.</p>
                ) : null}
              </div>
            </div>
          </FounderSectionCard>
        ))}
      </div>
    </div>
  )
}
