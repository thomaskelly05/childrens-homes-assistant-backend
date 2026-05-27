import Link from 'next/link'

import { OrbInlineHint } from '@/components/indicare/operational/orb-inline-hint'
import type { ChildJourneyCard } from '@/lib/child-journey/child-journey-routes'

export function ChildJourneyContextCard({ item, showCount = false }: { item: ChildJourneyCard; showCount?: boolean }) {
  return (
    <article className="os-review-card group flex min-h-[120px] flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <Link href={item.href} className="flex flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
          <span className={`os-status-pill shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${item.statusTone}`}>
            {item.status}
          </span>
        </div>
        {showCount && typeof item.count === 'number' ? (
          <p className="mt-2 text-2xl font-black text-slate-950">{item.count}</p>
        ) : null}
        <p className={`${showCount && typeof item.count === 'number' ? 'mt-1' : 'mt-2'} flex-1 text-xs font-semibold leading-5 text-slate-500`}>
          {item.summary}
        </p>
        <span className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-blue-600 opacity-0 transition group-hover:opacity-100">
          Open →
        </span>
      </Link>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <OrbInlineHint label={item.orbHint.label} href={item.orbHint.href} tone="cyan" />
      </div>
    </article>
  )
}
