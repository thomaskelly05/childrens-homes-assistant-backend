import Link from 'next/link'

import { RegulatoryCoverageItem } from '@/lib/regulatory-framework/types'

function labelForStrength(strength: RegulatoryCoverageItem['evidenceStrength']) {
  if (strength === 'strong' || strength === 'adequate') return 'Strong evidence'
  if (strength === 'review_required') return 'Needs review'
  if (strength === 'gap') return 'Evidence gap'
  return 'Partial evidence'
}

export function SccifCoveragePanel({ items, limit }: { items: RegulatoryCoverageItem[]; limit?: number }) {
  const visible = typeof limit === 'number' ? items.slice(0, limit) : items

  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <Link key={item.reference.id} href={`/regulatory/${item.reference.id}`} className="block rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition hover:bg-white hover:shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-slate-950">{item.reference.title}</h3>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{labelForStrength(item.evidenceStrength)}</span>
          </div>
          <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
            {item.events.length} events · {item.evidence.length} evidence · {item.actions.length} actions
          </p>
        </Link>
      ))}
    </div>
  )
}
