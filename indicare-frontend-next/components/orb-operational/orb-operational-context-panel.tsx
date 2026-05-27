'use client'

import Link from 'next/link'

import type { OrbOperationalContextCard, OrbOperationalContextStatus } from '@/lib/orb/operational-client'

const severityStyles: Record<string, string> = {
  info: 'border-slate-100 bg-slate-50 text-slate-700',
  low: 'border-slate-100 bg-slate-50 text-slate-700',
  medium: 'border-amber-100 bg-amber-50 text-amber-900',
  high: 'border-orange-100 bg-orange-50 text-orange-950',
  urgent: 'border-rose-100 bg-rose-50 text-rose-950'
}

export function OrbOperationalContextPanel({
  cards,
  contextStatus
}: {
  cards: OrbOperationalContextCard[]
  contextStatus?: OrbOperationalContextStatus | null
}) {
  if (contextStatus?.unavailable) {
    return (
      <section
        className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white"
        data-testid="orb-operational-context-unavailable"
      >
        <h2 className="text-lg font-black text-slate-950">Context used</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-amber-800">
          {contextStatus.message || 'Operational context temporarily unavailable — general guidance only.'}
        </p>
      </section>
    )
  }

  return (
    <section
      className="rounded-[32px] bg-white p-5 shadow-lg shadow-slate-200/60 ring-1 ring-white"
      data-testid="orb-operational-context-panel"
    >
      <h2 className="text-lg font-black text-slate-950">What ORB used</h2>
      <p className="mt-1 text-xs font-semibold text-slate-500">Summary-level context cards — no raw record bodies.</p>
      <div className="mt-4 space-y-3">
        {cards.map((card) => (
          <article
            key={card.id}
            className={`rounded-2xl border px-4 py-3 ${severityStyles[card.severity || 'info'] || severityStyles.info}`}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">{card.type.replaceAll('_', ' ')}</p>
            <h3 className="mt-1 text-sm font-black">{card.title}</h3>
            <p className="mt-1 text-xs font-semibold leading-5">{card.summary}</p>
            {card.count != null ? (
              <p className="mt-1 text-[11px] font-bold opacity-70">{card.count} item(s) in window</p>
            ) : null}
            {card.route_hint ? (
              <Link href={card.route_hint} className="mt-2 inline-block text-xs font-black text-blue-700">
                Open in OS
              </Link>
            ) : null}
          </article>
        ))}
        {!cards.length ? (
          <p className="text-sm font-semibold leading-6 text-slate-500">Context cards appear after ORB loads permissioned summary context.</p>
        ) : null}
      </div>
    </section>
  )
}
