'use client'

import Link from 'next/link'

import type { HandoverDraftRecord } from '@/lib/os-api/handover-intelligence'

export function HandoverDraftList({
  drafts,
  activeDraftId,
  onSelect
}: {
  drafts: HandoverDraftRecord[]
  activeDraftId?: string
  onSelect: (id: string) => void
}) {
  if (!drafts.length) {
    return (
      <p className="text-xs font-semibold text-slate-500" data-testid="handover-draft-list-empty">
        No saved handover drafts yet.
      </p>
    )
  }

  return (
    <ul data-testid="handover-draft-list" className="space-y-2">
      {drafts.map((draft) => (
        <li key={draft.id}>
          <button
            type="button"
            onClick={() => onSelect(draft.id)}
            className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-black transition ${
              activeDraftId === draft.id
                ? 'border-blue-300 bg-blue-50 text-blue-950'
                : 'border-slate-100 bg-white text-slate-800 hover:border-slate-200'
            }`}
          >
            {draft.title}
            <span className="mt-1 block text-[10px] font-semibold uppercase text-slate-500">{draft.status}</span>
          </button>
        </li>
      ))}
      <li>
        <Link
          href="/handover/current"
          className="block rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs font-black text-slate-600"
          data-testid="handover-open-current"
        >
          Open current handover
        </Link>
      </li>
    </ul>
  )
}
