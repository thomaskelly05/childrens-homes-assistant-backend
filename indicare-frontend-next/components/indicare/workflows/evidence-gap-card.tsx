import Link from 'next/link'

import { RegulatoryCoverageItem } from '@/lib/regulatory-framework/types'

export function EvidenceGapCard({ item }: { item: RegulatoryCoverageItem }) {
  const firstEvent = item.events[0]
  const firstAction = item.actions[0]
  const href = firstAction ? `/actions/${firstAction.id}` : firstEvent ? `/chronology/${firstEvent.id}` : `/regulatory/${item.reference.id}`

  return (
    <Link href={href} className="block rounded-[24px] border border-amber-100 bg-amber-50/80 p-5 text-amber-900 transition hover:-translate-y-0.5 hover:shadow-lg">
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">{item.evidenceStrength}</span>
      <h3 className="mt-3 text-base font-black">{item.reference.title}</h3>
      <p className="mt-2 text-sm font-bold leading-6">{item.gaps[0] || item.reference.commonEvidenceGaps[0]}</p>
      <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-amber-700">Next: {item.suggestedNextAction}</p>
    </Link>
  )
}
