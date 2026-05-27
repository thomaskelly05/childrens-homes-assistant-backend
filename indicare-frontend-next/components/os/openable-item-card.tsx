'use client'

import { PriorityBadge } from '@/components/os/priority-badge'
import { SourceBadge } from '@/components/os/source-badge'
import { StatusChip } from '@/components/os/status-chip'
import type { WorkspaceItemCard } from '@/lib/childWorkspaceApi'

export function OpenableItemCard({ item, onOpen }: { item: WorkspaceItemCard; onOpen: (item: WorkspaceItemCard) => void }) {
  return (
    <article className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{item.type}</p>
          <h3 className="mt-1 text-base font-black text-slate-950">{item.title}</h3>
          {item.summary ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.summary}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {item.status ? <StatusChip label={item.status} tone="blue" /> : null}
            <PriorityBadge value={item.priority} />
            {item.date ? <StatusChip label={item.date} tone="slate" /> : null}
          </div>
          <div className="mt-2">
            <SourceBadge table={item.sourceTable} id={item.sourceId} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="inline-flex min-h-10 shrink-0 items-center rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white"
        >
          Open
        </button>
      </div>
    </article>
  )
}
