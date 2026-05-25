'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function ArchiveFilterBar({ childId }: { childId: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const search = params.get('search') || ''
  const recordType = params.get('record_type') || ''

  return (
    <form
      data-testid="child-archive-filter-bar"
      className="flex flex-wrap gap-3 rounded-[24px] border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const q = new URLSearchParams()
        const s = String(form.get('search') || '').trim()
        const t = String(form.get('record_type') || '').trim()
        if (s) q.set('search', s)
        if (t) q.set('record_type', t)
        router.push(`/young-people/${childId}/archive?${q}`)
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
      <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-2 text-sm font-black text-white">
        Filter
      </button>
    </form>
  )
}
