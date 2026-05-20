'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Search, Sparkles } from 'lucide-react'

import { SlideOverPreview } from '@/components/indicare/previews/slide-over-preview'
import { useAuth } from '@/contexts/auth-context'
import { userHasAnyPermission } from '@/lib/auth/permissions'
import type { SearchResult } from '@/lib/os-api/command-search'

export function CommandSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [previewOpen, setPreviewOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const results = useMemo(
    () => searchResults.filter((result) => userHasAnyPermission(user, result.permissionsRequired)),
    [searchResults, user]
  )
  const selectedResult = results[previewIndex] || results[0]

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setQuery('')
        setPreviewOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    setPreviewIndex(0)
  }, [query])

  useEffect(() => {
    const clean = query.trim()
    if (!clean) {
      setSearchResults([])
      setWarning(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const handle = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/command-search?q=${encodeURIComponent(clean)}`, {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal
        })
        const payload = await response.json().catch(() => ({ results: [] }))
        if (!response.ok) throw new Error(payload?.warning || 'Search is not available just now.')
        setSearchResults(Array.isArray(payload.results) ? payload.results : [])
        setWarning(payload.warning || (payload.source !== 'live' ? 'Live search is not available just now.' : null))
      } catch (error) {
        if (controller.signal.aborted) return
        setSearchResults([])
        setWarning(error instanceof Error ? error.message : 'Search is not available just now.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(handle)
    }
  }, [query])

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setPreviewIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setPreviewIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && selectedResult) {
      event.preventDefault()
      setQuery('')
      router.push(selectedResult.href)
    }
  }

  return (
    <div className="relative w-full max-w-2xl">
      <label className="sr-only" htmlFor="global-command-search">Search IndiCare OS</label>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 text-slate-400" aria-hidden />
        <input
          ref={inputRef}
          id="global-command-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search child, document, chronology, evidence... Cmd/Ctrl K"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
        />
        <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 sm:inline">Cmd K</span>
      </div>

      {query.trim() ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 rounded-[24px] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/15">
          <Link
            href={`/orb?q=${encodeURIComponent(query)}`}
            className="mb-2 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
            onClick={() => setQuery('')}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Ask IndiCare about &quot;{query}&quot;
          </Link>
          {results.length ? (
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="max-h-[420px] space-y-2 overflow-auto">
                {results.map((result, index) => (
                  <div
                    key={`${result.type}-${result.id}`}
                    onMouseEnter={() => setPreviewIndex(index)}
                    className={`rounded-2xl px-4 py-3 transition ${selectedResult?.id === result.id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={result.href}
                        className="min-w-0 flex-1 focus:outline-none"
                        onClick={() => setQuery('')}
                      >
                        <strong className="block truncate text-sm font-black text-slate-950">{result.title}</strong>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{result.description}</p>
                        <p className="mt-1 text-[11px] font-bold leading-5 text-slate-400">
                          {[result.date, result.linkedContext, result.whyItMatters].filter(Boolean).join(' · ')}
                        </p>
                      </Link>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{result.group}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={result.chronologyHref} className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-600">Chronology</Link>
                      {result.actions.slice(0, 2).map((action) => (
                        <Link key={`${result.id}-${action.id}`} href={action.route} className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-black text-slate-600">
                          {action.label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewIndex(index)
                          setPreviewOpen(true)
                        }}
                        className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700"
                      >
                        <Eye className="mr-1 h-3 w-3" aria-hidden />
                        Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {selectedResult ? (
                <aside className="hidden rounded-2xl border border-slate-100 bg-slate-50 p-3 lg:block">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Preview</p>
                  <h3 className="mt-2 text-sm font-black text-slate-950">{selectedResult.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{selectedResult.description}</p>
                  {selectedResult.whyItMatters ? <p className="mt-2 text-xs font-bold leading-5 text-blue-700">{selectedResult.whyItMatters}</p> : null}
                  <div className="mt-3 grid gap-2">
                    {selectedResult.actions.map((action) => (
                      <Link key={action.id} href={action.route} className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700">
                        {action.label}
                      </Link>
                    ))}
                  </div>
                </aside>
              ) : null}
            </div>
          ) : (
            <p className="px-4 py-5 text-sm font-semibold text-slate-500">{loading ? 'Searching live OS records...' : 'No live records match your search.'}</p>
          )}
          {warning ? <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">{warning}</p> : null}
        </div>
      ) : null}
      {selectedResult ? (
        <SlideOverPreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          entity={{ entity_type: selectedResult.entityType, entity_id: selectedResult.id }}
          title={selectedResult.title}
          description={selectedResult.description}
        />
      ) : null}
    </div>
  )
}
