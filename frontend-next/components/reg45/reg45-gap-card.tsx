'use client'

import Link from 'next/link'

import type { Reg45ReviewGap } from '@/lib/os-api/reg45-quality-review'

type Props = { gap: Reg45ReviewGap }

export function Reg45GapCard({ gap }: Props) {
  return (
    <article
      data-testid="reg45-gap-card"
      className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4"
    >
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">Potential gap</p>
      <h4 className="mt-1 text-sm font-black text-amber-950">{gap.title}</h4>
      <p className="mt-2 text-xs font-semibold leading-6 text-amber-900/90">{gap.description}</p>
      {gap.recommended_action ? (
        <p className="mt-2 text-xs font-semibold text-slate-700">May support: {gap.recommended_action}</p>
      ) : null}
      {gap.route ? (
        <Link
          href={gap.route}
          className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.1em] text-amber-900 underline"
        >
          {gap.action_label || 'Review gap'}
        </Link>
      ) : null}
    </article>
  )
}
