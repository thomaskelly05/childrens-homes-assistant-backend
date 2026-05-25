'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  getWorkforceDashboard,
  workforceOrbHref,
  type WorkforceContextDashboard
} from '@/lib/os-api/workforce-context'

export function CareHubWorkforceContext() {
  const [dashboard, setDashboard] = useState<WorkforceContextDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void getWorkforceDashboard().then((result) => {
      if (!active) return
      if (result.ok) setDashboard(result.data)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const shift = dashboard?.shift
  const staffCount = shift?.staff_count ?? 0
  const lead = shift?.shift_lead_name
  const unavailable =
    !dashboard ||
    (!staffCount && !lead && !dashboard.actions.length && !dashboard.staffing_risks.length)

  return (
    <section
      data-testid="care-hub-workforce-shift"
      className="rounded-[28px] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-800">Workforce and shift</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Staff and shift context</h2>
          <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-slate-600">
            Safe metadata only — shift lead, staffing signals, actions and training indicators. No HR or supervision
            notes in cards.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase text-slate-600">
          {staffCount > 0 ? (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-900">{staffCount} on shift</span>
          ) : null}
          {dashboard?.actions.length ? (
            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-800">{dashboard.actions.length} actions</span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">Loading workforce summary…</p>
      ) : unavailable ? (
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-600" data-testid="care-hub-workforce-unavailable">
          Workforce summary is unavailable. Open staff or rota area to check manually.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {lead ? (
            <p className="text-sm font-semibold text-slate-700">
              Shift lead: <span className="text-slate-950">{lead}</span>
            </p>
          ) : null}
          {shift?.gaps?.length ? (
            <p className="text-sm font-semibold text-amber-900">{shift.gaps[0]}</p>
          ) : null}
          <ul className="space-y-2">
            {[...(dashboard?.staff_on_shift ?? []), ...(dashboard?.actions ?? []), ...(dashboard?.staffing_risks ?? [])]
              .slice(0, 4)
              .map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2">
                  <p className="text-xs font-black text-slate-800">{item.title}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-600">{item.safe_summary}</p>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/staff"
          data-testid="care-hub-open-staff"
          className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
        >
          Open staff area
        </Link>
        {dashboard?.shift?.shift_lead_id ? (
          <Link
            href={`/staff/${dashboard.shift.shift_lead_id}`}
            data-testid="care-hub-open-shift-lead-profile"
            className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-900"
          >
            Shift lead profile
          </Link>
        ) : null}
        <Link
          href="/staff/training-matrix"
          data-testid="care-hub-open-training"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800"
        >
          Training matrix
        </Link>
        <Link
          href="/staff/supervision"
          data-testid="care-hub-open-supervision"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800"
        >
          Supervision
        </Link>
        <Link
          href="/shifts/current"
          data-testid="care-hub-open-shifts"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-800"
        >
          Current shift
        </Link>
        <Link
          href="/handover"
          data-testid="care-hub-workforce-handover"
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black text-violet-900"
        >
          Handover
        </Link>
        <Link
          href={workforceOrbHref('manager_daily_brief', 'What staffing issues need manager review today?')}
          data-testid="care-hub-workforce-ask-orb"
          className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-900"
        >
          Ask OS ORB
        </Link>
      </div>
    </section>
  )
}
