'use client'

import type { InspectionReadinessDashboard } from '@/lib/os-api/inspection-readiness'

type Props = { dashboard: InspectionReadinessDashboard | null }

export function InspectionReadinessSummary({ dashboard }: Props) {
  if (!dashboard) return null
  return (
    <section data-testid="inspection-readiness-summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
        <p className="text-[10px] font-black uppercase text-blue-700">Reg 44</p>
        <p className="mt-2 text-xs leading-6 text-blue-950">{dashboard.reg44_summary}</p>
      </div>
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
        <p className="text-[10px] font-black uppercase text-indigo-700">Reg 45</p>
        <p className="mt-2 text-xs leading-6 text-indigo-950">{dashboard.reg45_summary}</p>
      </div>
      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
        <p className="text-[10px] font-black uppercase text-violet-700">SCCIF</p>
        <p className="mt-2 text-xs leading-6 text-violet-950">{dashboard.sccif_summary}</p>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4" data-testid="inspection-quality-standards-alignment">
        <p className="text-[10px] font-black uppercase text-slate-600">Quality Standards alignment</p>
        <p className="mt-2 text-xs leading-6 text-slate-700">{dashboard.quality_standards_summary}</p>
      </div>
    </section>
  )
}
