'use client'

import type { Reg45ImprovementActionDraft } from '@/lib/os-api/reg45-quality-review'

type Props = { actions: Reg45ImprovementActionDraft[] }

export function Reg45ImprovementActions({ actions }: Props) {
  if (!actions.length) return null
  return (
    <section data-testid="reg45-improvement-actions" className="space-y-2">
      <h4 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Improvement action drafts</h4>
      <ul className="space-y-2">
        {actions.map((action) => (
          <li
            key={action.id}
            className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-950"
          >
            <span className="font-black">{action.title}</span>
            <p className="mt-1 text-emerald-900/80">{action.description}</p>
            <p className="mt-1 text-[10px] uppercase text-emerald-700">Draft — manager review needed</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
