'use client'

import Link from 'next/link'

import type { SccifEvidenceItem } from '@/lib/os-api/sccif-alignment'

type Props = {
  items: SccifEvidenceItem[]
}

function strengthLabel(strength: string) {
  return strength.replaceAll('_', ' ')
}

export function SccifEvidenceList({ items }: Props) {
  if (!items.length) {
    return (
      <p className="text-sm font-semibold text-slate-600" data-testid="sccif-evidence-empty">
        No mapped evidence items in current scope.
      </p>
    )
  }

  return (
    <ul data-testid="sccif-evidence-list" className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          data-testid={`sccif-evidence-${item.id}`}
          className="rounded-2xl border border-slate-100 bg-white px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-slate-950">{item.title}</p>
              <p className="mt-1 text-xs leading-6 text-slate-600">{item.safe_summary}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">
              {strengthLabel(item.evidence_strength)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
            {item.manager_review_required ? (
              <span className="text-amber-800">Manager review needed</span>
            ) : null}
            {item.safeguarding_review_required ? (
              <span className="text-violet-800">Safeguarding review</span>
            ) : null}
            {item.evidence_strength === 'prompt_only' ? (
              <span className="text-rose-700">Not inspection proof yet</span>
            ) : null}
          </div>
          <Link
            href={item.route}
            className="mt-2 inline-flex text-[10px] font-black uppercase tracking-[0.12em] text-blue-700 underline"
          >
            {item.action_label || 'Open'}
          </Link>
        </li>
      ))}
    </ul>
  )
}
