import Link from 'next/link'

import type { ChildArchiveRecord } from '@/lib/os-api/child-lifecycle'

export function ArchiveRecordCard({ record, childId }: { record: ChildArchiveRecord; childId: string }) {
  return (
    <article
      data-testid="child-archive-record-card"
      className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {record.record_type} · {record.source_type}
          </p>
          <h3 className="mt-2 text-lg font-black text-slate-950">{record.title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{record.safe_summary}</p>
          {record.safeguarding_sensitive ? (
            <p
              data-testid="child-archive-sensitivity-badge"
              className="mt-2 inline-block rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-rose-900"
            >
              Safeguarding — safe summary only
            </p>
          ) : null}
        </div>
        <div className="text-right text-xs font-semibold text-slate-500">
          {record.event_date ? <p>Event {record.event_date.slice(0, 10)}</p> : null}
          {record.signed_off_at ? <p>Signed off {record.signed_off_at.slice(0, 10)}</p> : null}
          {record.author_name ? <p>Author: {record.author_name}</p> : null}
          {record.signed_off_by_name ? <p>Signed off by: {record.signed_off_by_name}</p> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
        <Link href={`/young-people/${childId}/chronology`} className="rounded-xl border border-slate-200 px-3 py-1.5 text-slate-700">
          Story chronology
        </Link>
        {record.plan_impact_ids?.length ? (
          <Link href={`/young-people/${childId}/plan-impacts`} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900">
            {record.plan_impact_ids.length} plan impact(s)
          </Link>
        ) : null}
        {record.lifeecho_memory_id ? (
          <Link href={`/young-people/${childId}/lifeecho`} className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-900">
            LifeEcho linked
          </Link>
        ) : null}
      </div>
    </article>
  )
}
