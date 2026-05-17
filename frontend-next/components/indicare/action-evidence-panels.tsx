import Link from 'next/link'

import { CareAction, EvidenceGap, EvidenceItem } from '@/lib/evidence/types'
import { routeToAction, routeToChronologyEvent, routeToEvidence } from '@/lib/routes/os-routes'

function personName(id?: string) {
  return id ? `Child ${id}` : 'Home-wide'
}

function staffName(id?: string) {
  return id ? `Staff ${id}` : 'Unassigned'
}

export function ActionsPanel({ actions }: { actions: CareAction[] }) {
  if (!actions.length) {
    return <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-500">No linked actions were returned by the live OS.</p>
  }

  return (
    <div className="space-y-3">
      {actions.map((action) => {
        return (
          <article key={action.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{action.priority}</span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{action.status}</span>
            </div>
            <Link href={routeToAction(action.id)} className="mt-3 block text-sm font-black text-slate-950 hover:text-blue-700">{action.title}</Link>
            <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
            <p className="mt-3 text-xs font-bold text-slate-500">Due {action.dueDate || 'not set'} · {personName(action.youngPersonId)} · {staffName(action.assignedToStaffId)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={routeToAction(action.id)} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Open action</Link>
              <Link href="/evidence" className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">Open evidence workspace</Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function EvidenceGapsPanel({ gaps }: { gaps: EvidenceGap[] }) {
  if (!gaps.length) {
    return <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-500">No evidence gaps were returned by the live OS.</p>
  }

  return (
    <div className="space-y-3">
      {gaps.map((gap) => (
        <article key={gap.id} className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4">
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">{gap.priority}</span>
          <Link href={gap.sourceEventIds[0] ? routeToChronologyEvent(gap.sourceEventIds[0]) : '/evidence'} className="mt-3 block text-sm font-black text-amber-950 hover:text-amber-700">{gap.title}</Link>
          <p className="mt-2 text-sm leading-6 text-amber-800">{gap.description}</p>
          <p className="mt-3 text-xs font-bold text-amber-900">{gap.regulation || 'Operational evidence'} · {personName(gap.youngPersonId)}</p>
        </article>
      ))}
    </div>
  )
}

export function EvidenceItemsPanel({ evidence }: { evidence: EvidenceItem[] }) {
  if (!evidence.length) {
    return <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-500">No linked evidence was returned by the live OS.</p>
  }

  return (
    <div className="space-y-3">
      {evidence.map((item) => (
        <article key={item.id} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">{item.quality}</span>
          <Link href={routeToEvidence(item.id)} className="mt-3 block text-sm font-black text-emerald-950 hover:text-emerald-700">{item.title}</Link>
          <p className="mt-2 text-sm leading-6 text-emerald-800">{item.description}</p>
          <p className="mt-3 text-xs font-bold text-emerald-900">{item.linkedRegulation || 'Care evidence'} · {personName(item.youngPersonId)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={routeToEvidence(item.id)} className="text-xs font-black text-emerald-800">Open evidence</Link>
            <Link href="/chronology" className="text-xs font-black text-emerald-800">Open linked chronology</Link>
          </div>
        </article>
      ))}
    </div>
  )
}
