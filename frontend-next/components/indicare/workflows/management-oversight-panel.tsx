import Link from 'next/link'

import { CareAction } from '@/lib/evidence/types'
import { ChronologyEvent } from '@/lib/chronology/types'

export function ManagementOversightPanel({ events, actions }: { events: ChronologyEvent[]; actions: CareAction[] }) {
  const reviewEvents = events.filter((event) => event.tags.includes('manager-review') || event.tags.includes('overdue-manager-review') || event.eventType === 'manager_review')
  const overdueActions = actions.filter((action) => action.status === 'overdue')
  const missingOversight = events.filter((event) => {
    const needsReview = ['incident', 'missing_episode', 'safeguarding', 'risk_review', 'reg44_finding'].includes(event.eventType)
    return needsReview && !event.tags.includes('manager-review') && !event.tags.includes('overdue-manager-review')
  })

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/chronology" className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-blue-800">
          <strong className="block text-2xl font-black">{reviewEvents.length}</strong>
          <span className="text-xs font-black uppercase tracking-[0.14em]">Review events</span>
        </Link>
        <Link href="/actions" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700">
          <strong className="block text-2xl font-black">{overdueActions.length}</strong>
          <span className="text-xs font-black uppercase tracking-[0.14em]">Overdue actions</span>
        </Link>
        <Link href="/chronology" className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
          <strong className="block text-2xl font-black">{missingOversight.length}</strong>
          <span className="text-xs font-black uppercase tracking-[0.14em]">Oversight checks</span>
        </Link>
      </div>
      {missingOversight.slice(0, 4).map((event) => (
        <Link key={event.id} href={`/chronology/${event.id}`} className="block rounded-2xl border border-amber-100 bg-white p-4 text-sm font-bold leading-6 text-slate-600">
          <span className="font-black text-slate-950">{event.title}</span>
          <br />
          Manager oversight placeholder: mark reviewed, add evidence or create an action.
        </Link>
      ))}
    </div>
  )
}
