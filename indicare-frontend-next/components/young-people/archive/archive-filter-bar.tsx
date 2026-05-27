'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function ArchiveFilterBar({ childId }: { childId: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const search = params.get('search') || ''
  const recordType = params.get('record_type') || ''
  const sourceType = params.get('source_type') || ''
  const dateFrom = params.get('date_from') || ''
  const dateTo = params.get('date_to') || ''

  const pushFilters = (form: FormData) => {
    const q = new URLSearchParams()
    const s = String(form.get('search') || '').trim()
    const t = String(form.get('record_type') || '').trim()
    const st = String(form.get('source_type') || '').trim()
    const df = String(form.get('date_from') || '').trim()
    const dt = String(form.get('date_to') || '').trim()
    if (s) q.set('search', s)
    if (t) q.set('record_type', t)
    if (st) q.set('source_type', st)
    if (df) q.set('date_from', df)
    if (dt) q.set('date_to', dt)
    const qs = q.toString()
    router.push(`/young-people/${childId}/archive${qs ? `?${qs}` : ''}`)
  }

  return (
    <form
      data-testid="child-archive-filter-bar"
      className="flex flex-wrap gap-3 rounded-[24px] border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault()
        pushFilters(new FormData(event.currentTarget))
      }}
    >
      <input
        name="search"
        defaultValue={search}
        placeholder="Search title or summary"
        className="min-w-[200px] flex-1 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
      />
      <select
        name="record_type"
        defaultValue={recordType}
        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold"
      >
        <option value="">All types</option>
        <option value="recording">Recording</option>
        <option value="document">Document</option>
        <option value="incident">Incident</option>
      </select>
      <input
        name="source_type"
        defaultValue={sourceType}
        placeholder="Source type"
        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
      />
      <input
        type="date"
        name="date_from"
        defaultValue={dateFrom}
        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        aria-label="From date"
      />
      <input
        type="date"
        name="date_to"
        defaultValue={dateTo}
        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        aria-label="To date"
      />
      <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-2 text-sm font-black text-white">
        Filter
      </button>
      <button
        type="button"
        data-testid="child-archive-clear-filters"
        className="rounded-2xl border border-slate-200 px-5 py-2 text-sm font-black text-slate-700"
        onClick={() => router.push(`/young-people/${childId}/archive`)}
      >
        Clear
      </button>
    </form>
  )
}
