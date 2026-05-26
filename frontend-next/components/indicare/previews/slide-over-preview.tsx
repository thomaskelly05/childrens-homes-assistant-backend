'use client'

import Link from 'next/link'
import { X } from 'lucide-react'

import { EntityPreviewCard } from './entity-preview-card'
import type { ResolvableEntity } from '@/lib/navigation/entity-resolver'

export function SlideOverPreview({
  open,
  onClose,
  entity,
  title,
  description
}: {
  open: boolean
  onClose: () => void
  entity: ResolvableEntity
  title?: string
  description?: string
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/20 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="ml-auto flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-[#f8fafc] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">Quick preview</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">Operational context</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600">
            <X className="h-4 w-4" aria-hidden />
            <span className="sr-only">Close preview</span>
          </button>
        </div>
        <div className="mt-5 space-y-4 overflow-auto">
          <EntityPreviewCard entity={entity} title={title} description={description} />
          <section className="rounded-[24px] border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-black text-slate-950">Preview foundations</h3>
            <div className="mt-3 grid gap-2 text-xs font-bold text-slate-600">
              <Link href="/chronology" className="rounded-2xl bg-slate-50 px-3 py-2">Show surrounding chronology events</Link>
              <Link href="/evidence" className="rounded-2xl bg-slate-50 px-3 py-2">Show related evidence</Link>
              <Link href="/actions" className="rounded-2xl bg-slate-50 px-3 py-2">Show linked actions</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
