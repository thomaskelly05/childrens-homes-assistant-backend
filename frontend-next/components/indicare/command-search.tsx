'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { searchIndiCare } from '@/lib/indicare/search'

export function CommandSearch() {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchIndiCare(query), [query])

  return (
    <div className="relative w-full max-w-2xl">
      <label className="sr-only" htmlFor="global-command-search">Search IndiCare OS</label>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" aria-hidden />
        <input
          id="global-command-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search records, staff, incidents, reports or actions..."
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>

      {query.trim() ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[420px] overflow-auto rounded-[24px] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15">
          {results.length ? (
            <div className="space-y-2">
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  href={result.href}
                  className="block rounded-2xl px-4 py-3 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  onClick={() => setQuery('')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm font-black text-slate-950">{result.title}</strong>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{result.group}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{result.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-4 py-5 text-sm font-semibold text-slate-500">No records match your search.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
