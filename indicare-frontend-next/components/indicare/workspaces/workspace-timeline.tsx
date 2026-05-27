import Link from 'next/link'

import type { ChronologyEvent } from '@/lib/chronology/types'
import { routeToChronologyEvent } from '@/lib/routes/os-routes'

export function WorkspaceTimeline({ events }: { events: ChronologyEvent[] }) {
  if (!events.length) return <p className="text-sm leading-6 text-slate-500">No linked chronology records were found.</p>
  return (
    <div className="space-y-3">
      {events.slice(0, 10).map((event) => (
        <Link key={event.id} href={routeToChronologyEvent(event.id)} className="block rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <span className="text-xs font-bold text-slate-400">{new Date(event.dateTime).toLocaleString('en-GB')}</span>
          <h3 className="mt-2 text-sm font-black text-slate-950">{event.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{event.summary}</p>
        </Link>
      ))}
    </div>
  )
}

