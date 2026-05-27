'use client'

import type { Reg45ReviewDashboard } from '@/lib/os-api/reg45-quality-review'

type Props = { dashboard: Reg45ReviewDashboard | null }

export function Reg45ReviewDashboardSummary({ dashboard }: Props) {
  if (!dashboard) return null
  return (
    <section data-testid="reg45-review-dashboard" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
        <p className="text-[10px] font-black uppercase text-slate-400">Draft reviews</p>
        <p className="text-2xl font-black text-slate-950">{dashboard.draft_review_count}</p>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3">
        <p className="text-[10px] font-black uppercase text-blue-700">Ready for manager</p>
        <p className="text-2xl font-black text-blue-950">{dashboard.ready_for_manager_count}</p>
      </div>
      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3">
        <p className="text-[10px] font-black uppercase text-violet-700">RI review required</p>
        <p className="text-2xl font-black text-violet-950">{dashboard.ri_review_required_count}</p>
      </div>
      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 px-4 py-3">
        <p className="text-[10px] font-black uppercase text-amber-700">Key gaps</p>
        <p className="text-2xl font-black text-amber-950">{dashboard.key_gaps?.length ?? 0}</p>
      </div>
      <p className="sm:col-span-2 lg:col-span-4 text-sm font-semibold text-slate-600">{dashboard.summary}</p>
    </section>
  )
}
