'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { PriorityBadge } from '@/components/os/priority-badge'
import { SourceBadge } from '@/components/os/source-badge'
import { StatusChip } from '@/components/os/status-chip'
import type { WorkspaceItemCard } from '@/lib/childWorkspaceApi'

export function ItemDrawer({
  item,
  open,
  onClose,
  footer
}: {
  item: WorkspaceItemCard | null
  open: boolean
  onClose: () => void
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !item) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close item details"
        className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-item-drawer-title"
        data-testid="workspace-item-drawer"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.type}</p>
            <h2 id="workspace-item-drawer-title" className="mt-1 text-lg font-black text-slate-950">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {item.summary ? <p className="text-sm leading-7 text-slate-700">{item.summary}</p> : null}
          <div className="flex flex-wrap gap-2">
            {item.status ? <StatusChip label={item.status} tone="blue" /> : null}
            <PriorityBadge value={item.priority} />
            {item.date ? <StatusChip label={item.date} tone="slate" /> : null}
          </div>
          <SourceBadge table={item.sourceTable} id={item.sourceId} />
        </div>

        {footer ? <div className="border-t border-slate-100 px-5 py-4">{footer}</div> : null}
      </aside>
    </>
  )
}
