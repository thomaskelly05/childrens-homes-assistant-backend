'use client'

import type { WorkspaceItemCard } from '@/lib/childWorkspaceApi'

function field(label: string, value: string) {
  if (!value) return null
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

export function RecordExtraFields({ item }: { item: WorkspaceItemCard }) {
  const raw = item.raw || {}
  const extras = [
    field('Record type', String(raw.record_type || raw.document_type || '')),
    field('Category', String(raw.category || '')),
    field('Author', String(raw.author_name || raw.created_by_name || '')),
    field('Home', String(raw.home_name || '')),
    field('Child', String(raw.child_name || raw.young_person_name || ''))
  ].filter(Boolean)

  if (!extras.length) {
    return (
      <p className="text-xs font-semibold text-slate-500">No additional typed fields returned for this item.</p>
    )
  }

  return <div className="space-y-2">{extras}</div>
}
