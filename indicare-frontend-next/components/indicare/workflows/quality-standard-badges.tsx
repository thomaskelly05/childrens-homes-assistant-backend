import Link from 'next/link'

import { RegulatoryReference } from '@/lib/regulatory-framework/types'

const toneByFramework: Record<RegulatoryReference['framework'], string> = {
  children_homes_regulations_2015: 'border-blue-100 bg-blue-50 text-blue-700',
  quality_standards: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  sccif: 'border-purple-100 bg-purple-50 text-purple-700',
  reg44: 'border-amber-100 bg-amber-50 text-amber-800',
  reg45: 'border-cyan-100 bg-cyan-50 text-cyan-700',
  lac_review: 'border-pink-100 bg-pink-50 text-pink-700',
  ofsted_evidence: 'border-slate-200 bg-slate-50 text-slate-700'
}

export function QualityStandardBadges({ references, limit = 8 }: { references: RegulatoryReference[]; limit?: number }) {
  const visible = references.slice(0, limit)

  if (!visible.length) {
    return <span className="rounded-full border border-dashed border-slate-200 px-3 py-2 text-xs font-bold text-slate-500">No regulatory links mapped yet</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((reference) => (
        <Link
          key={reference.id}
          href={`/regulatory/${reference.id}`}
          className={`rounded-full border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${toneByFramework[reference.framework]}`}
        >
          {reference.code}
        </Link>
      ))}
      {references.length > visible.length ? <span className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-500">+{references.length - visible.length}</span> : null}
    </div>
  )
}
