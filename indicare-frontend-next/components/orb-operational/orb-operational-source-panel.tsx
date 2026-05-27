'use client'

import Link from 'next/link'

import type { OrbOperationalEvidenceItem, OrbOperationalSource } from '@/lib/orb/operational-client'

export function OrbOperationalSourcePanel({
  sources,
  evidenceItems
}: {
  sources: OrbOperationalSource[]
  evidenceItems?: OrbOperationalEvidenceItem[]
}) {
  const items = evidenceItems?.length
    ? evidenceItems
    : sources.map((source, index) => ({
        id: `src-${index}`,
        label: source.label,
        source_type: source.source_type,
        basis: source.basis,
        route: source.route
      }))

  return (
    <section
      className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white"
      data-testid="orb-operational-source-panel"
    >
      <h2 className="text-lg font-black text-slate-950">Sources & evidence</h2>
      <p className="mt-1 text-xs font-semibold text-slate-500">Summary-level excerpts only.</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">{item.source_type.replaceAll('_', ' ')}</p>
            <h3 className="mt-1 text-sm font-black text-slate-900">{item.label}</h3>
            {item.basis ? <p className="mt-1 line-clamp-3 text-xs font-semibold leading-5 text-slate-500">{item.basis}</p> : null}
            {item.route ? (
              <Link href={item.route} className="mt-2 inline-block text-xs font-black text-blue-700">
                Open source
              </Link>
            ) : null}
          </article>
        ))}
        {!items.length ? (
          <p className="text-sm font-semibold leading-6 text-slate-500">Source labels appear when operational context is available.</p>
        ) : null}
      </div>
    </section>
  )
}
