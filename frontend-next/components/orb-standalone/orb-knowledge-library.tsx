'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Loader2, Plus, Search, X } from 'lucide-react'

import {
  fetchOrbKnowledgeSources,
  fetchOrbKnowledgeSummary,
  ingestOrbKnowledgeText,
  searchOrbKnowledge,
  type OrbKnowledgeSearchResult,
  type OrbKnowledgeSource,
  type OrbKnowledgeSourceType
} from '@/lib/orb/standalone-client'

const SOURCE_TYPES: OrbKnowledgeSourceType[] = [
  'recording_quality',
  'regulatory_framework',
  'safeguarding_principles',
  'product_context',
  'therapeutic_practice',
  'practice_guidance',
  'policy',
  'user_uploaded',
  'general_knowledge'
]

export function OrbKnowledgeLibraryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sources, setSources] = useState<OrbKnowledgeSource[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OrbKnowledgeSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [draft, setDraft] = useState({
    title: '',
    source_type: 'recording_quality' as OrbKnowledgeSourceType,
    source_label: '',
    text: ''
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sourceList, libSummary] = await Promise.all([
        fetchOrbKnowledgeSources(undefined, needsReviewOnly ? 'needs_review' : undefined),
        fetchOrbKnowledgeSummary()
      ])
      setSources(sourceList)
      setSummary(
        `${libSummary.source_count} sources · ${libSummary.chunk_count} passages · standalone reference only`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load Knowledge Library')
    } finally {
      setLoading(false)
    }
  }, [needsReviewOnly])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    setSearching(true)
    setError(null)
    try {
      const data = await searchOrbKnowledge(query)
      setSearchResults(data.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  async function handleIngest(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.text.trim()) return
    setIngesting(true)
    setError(null)
    try {
      await ingestOrbKnowledgeText({
        title: draft.title.trim(),
        text: draft.text.trim(),
        source_type: draft.source_type,
        source_label: draft.source_label.trim() || draft.title.trim()
      })
      setDraft({ title: '', source_type: 'recording_quality', source_label: '', text: '' })
      setAddOpen(false)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add source')
    } finally {
      setIngesting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-end bg-black/55 p-0 sm:p-4">
      <div
        role="dialog"
        aria-label="ORB Knowledge Library"
        className="flex h-full w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#0d1117] shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:border"
      >
        <header className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
          <BookOpen className="h-5 w-5 text-cyan-300" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">Knowledge Library</h2>
            <p className="text-[11px] text-slate-500">Standalone reference documents — no OS records</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06]"
            aria-label="Close Knowledge Library"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {summary ? <p className="mb-3 text-[11px] text-slate-500">{summary}</p> : null}
          {error ? <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}

          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge…"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/40"
            />
            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-100 ring-1 ring-cyan-300/30 disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Search
            </button>
          </form>

          {searchResults.length > 0 ? (
            <div className="mb-4 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Search results</p>
              {searchResults.map((result) => (
                <article
                  key={`${result.source_id}-${result.chunk_index}`}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-[11px] text-slate-400"
                >
                  <p className="font-medium text-slate-200">{result.citation_label}</p>
                  <p className="text-[10px] text-slate-500">
                    {result.source_title}
                    {result.section ? ` · ${result.section}` : ''}
                    {result.page ? ` · p. ${result.page}` : ''}
                    {result.hybrid_score != null ? ` · match ${Math.round(result.hybrid_score * 10) / 10}` : ''}
                  </p>
                  {result.match_reason ? (
                    <p className="text-[9px] text-slate-600">{result.match_reason}</p>
                  ) : null}
                  {result.warning ? (
                    <p className="text-[9px] text-amber-200/90">{result.warning}</p>
                  ) : null}
                  <p className="mt-1 line-clamp-4 leading-5">{result.text}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
            <label className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <input
                type="checkbox"
                checked={needsReviewOnly}
                onChange={(e) => setNeedsReviewOnly(e.target.checked)}
                className="rounded border-white/20"
              />
              Needs review
            </label>
            <button
              type="button"
              onClick={() => setAddOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-cyan-200 hover:bg-white/[0.04]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add source
            </button>
          </div>

          {addOpen ? (
            <form onSubmit={handleIngest} className="mb-4 space-y-2 rounded-xl border border-white/10 p-3">
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Title"
                required
                className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
              />
              <select
                value={draft.source_type}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, source_type: e.target.value as OrbKnowledgeSourceType }))
                }
                className="w-full rounded-lg border border-white/10 bg-[#0d1117] px-2 py-1.5 text-xs text-white"
              >
                {SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <input
                value={draft.source_label}
                onChange={(e) => setDraft((d) => ({ ...d, source_label: e.target.value }))}
                placeholder="Source label (optional)"
                className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
              />
              <textarea
                value={draft.text}
                onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                placeholder="Paste guidance text…"
                required
                rows={5}
                className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
              />
              <button
                type="submit"
                disabled={ingesting}
                className="w-full rounded-lg bg-cyan-500/20 py-2 text-xs font-semibold text-cyan-50 disabled:opacity-50"
              >
                {ingesting ? 'Ingesting…' : 'Ingest text source'}
              </button>
            </form>
          ) : null}

          {loading ? (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sources…
            </p>
          ) : (
            <ul className="space-y-2">
              {sources.map((source) => (
                <li
                  key={source.id}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px]"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-slate-200">{source.title}</span>
                    {source.official_source ? (
                      <span className="rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-medium text-cyan-100">
                        Official summary
                      </span>
                    ) : source.origin === 'seeded' || source.origin === 'built_in' ? (
                      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-slate-400">
                        Built-in
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-slate-400">
                        Uploaded
                      </span>
                    )}
                    <span className="rounded-full bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase text-slate-500">
                      {source.source_type.replace(/_/g, ' ')}
                    </span>
                    {source.confidence_level ? (
                      <span className="text-[9px] text-slate-600">{source.confidence_level}</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-slate-500">
                    {source.governance_status?.replace(/_/g, ' ') ?? source.status}
                    {source.source_version ? ` · ${source.source_version}` : ''}
                    {source.publisher ? ` · ${source.publisher}` : ''}
                  </p>
                  {source.governance_status === 'needs_review' ||
                  source.governance_status === 'expired' ? (
                    <p className="mt-0.5 text-[9px] text-amber-200/90">May need review</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
