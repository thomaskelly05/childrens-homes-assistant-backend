'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Search } from 'lucide-react'

import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  OrbCitationHealthSummary,
  OrbSourceGovernanceActions,
  OrbSourceGovernanceBadges
} from '@/components/orb-standalone/orb-source-governance-panel'
import {
  approveOrbKnowledgeSource,
  archiveOrbKnowledgeSource,
  fetchOrbKnowledgeSources,
  fetchOrbKnowledgeSummary,
  fetchOrbOfficialSources,
  fetchOrbSourceCitationHealth,
  fetchOrbSourcesNeedingReview,
  importOrbOfficialSource,
  ingestOrbKnowledgeText,
  markOrbKnowledgeNeedsReview,
  rebuildOrbKnowledgeCitations,
  searchOrbKnowledge,
  type OrbKnowledgeCitationHealth,
  type OrbKnowledgeDocumentFamily,
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

const DOCUMENT_FAMILIES: { value: OrbKnowledgeDocumentFamily | string; label: string }[] = [
  { value: 'provider_policy', label: 'Provider policy' },
  { value: 'ofsted', label: 'Ofsted' },
  { value: 'dfe', label: 'DfE' },
  { value: 'legislation', label: 'Legislation' },
  { value: 'safeguarding', label: 'Safeguarding' },
  { value: 'internal_guidance', label: 'Internal guidance' },
  { value: 'indicare_product', label: 'IndiCare product' },
  { value: 'other', label: 'Other' }
]

type GovernanceTab = 'all' | 'official' | 'needs_review'

export function OrbKnowledgeLibraryPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sources, setSources] = useState<OrbKnowledgeSource[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<OrbKnowledgeSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [tab, setTab] = useState<GovernanceTab>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const [governanceBusy, setGovernanceBusy] = useState(false)
  const [healthBySource, setHealthBySource] = useState<Record<string, OrbKnowledgeCitationHealth>>({})
  const [draft, setDraft] = useState({
    title: '',
    source_type: 'recording_quality' as OrbKnowledgeSourceType,
    source_label: '',
    text: ''
  })
  const [importDraft, setImportDraft] = useState({
    title: '',
    document_family: 'provider_policy' as OrbKnowledgeDocumentFamily | string,
    publisher: '',
    source_url: '',
    document_version_label: '',
    review_due_at: '',
    text: '',
    approve_now: false
  })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [libSummary, sourceList] = await Promise.all([
        fetchOrbKnowledgeSummary(),
        tab === 'official'
          ? fetchOrbOfficialSources()
          : tab === 'needs_review'
            ? fetchOrbSourcesNeedingReview()
            : fetchOrbKnowledgeSources()
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
  }, [tab])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  async function loadHealth(sourceId: string) {
    try {
      const health = await fetchOrbSourceCitationHealth(sourceId)
      setHealthBySource((prev) => ({ ...prev, [sourceId]: health }))
    } catch {
      /* optional */
    }
  }

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

  async function handleImportOfficial(event: React.FormEvent) {
    event.preventDefault()
    if (!importDraft.title.trim() || !importDraft.text.trim()) return
    setIngesting(true)
    setError(null)
    try {
      const result = await importOrbOfficialSource({
        title: importDraft.title.trim(),
        text: importDraft.text.trim(),
        document_family: importDraft.document_family,
        publisher: importDraft.publisher.trim() || undefined,
        source_url: importDraft.source_url.trim() || undefined,
        document_version_label: importDraft.document_version_label.trim() || undefined,
        review_due_at: importDraft.review_due_at.trim() || undefined,
        source_integrity: 'full_document',
        approve_now: importDraft.approve_now
      })
      setHealthBySource((prev) => ({
        ...prev,
        [result.source.id]: result.citation_health
      }))
      setImportDraft({
        title: '',
        document_family: 'provider_policy',
        publisher: '',
        source_url: '',
        document_version_label: '',
        review_due_at: '',
        text: '',
        approve_now: false
      })
      setImportOpen(false)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import official source')
    } finally {
      setIngesting(false)
    }
  }

  async function runGovernance(
    action: 'approve' | 'review' | 'archive' | 'rebuild',
    sourceId: string
  ) {
    setGovernanceBusy(true)
    try {
      if (action === 'approve') await approveOrbKnowledgeSource(sourceId)
      if (action === 'review') await markOrbKnowledgeNeedsReview(sourceId)
      if (action === 'archive') await archiveOrbKnowledgeSource(sourceId)
      if (action === 'rebuild') {
        const result = await rebuildOrbKnowledgeCitations(sourceId)
        setHealthBySource((prev) => ({ ...prev, [sourceId]: result.citation_health }))
      }
      await refresh()
      if (action !== 'rebuild') await loadHealth(sourceId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Governance action failed')
    } finally {
      setGovernanceBusy(false)
    }
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Knowledge Library"
      subtitle="Sources support ORB answers. Check official status and review dates."
      onClose={onClose}
      panelId="knowledge"
      ariaLabel="ORB Knowledge Library"
      footer="Standalone ORB does not access IndiCare OS records."
    >
      <div className="px-4 py-3" data-orb-knowledge-library>
          {summary ? <p className="mb-3 text-[11px] text-slate-500">{summary}</p> : null}
          {error ? <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}

          <div className="mb-3 flex flex-wrap gap-1" data-orb-knowledge-sections>
            {(['all', 'official', 'needs_review'] as GovernanceTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium ${
                  tab === t ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-500 hover:bg-white/[0.04]'
                }`}
              >
                {t === 'all' ? 'Imported sources' : t === 'official' ? 'Official sources' : 'Needs review'}
              </button>
            ))}
            <span className="rounded-lg px-2 py-1 text-[10px] text-slate-600">Citation health</span>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setImportOpen((v) => !v)
                setAddOpen(false)
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-100"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Import official source
            </button>
            <span className="inline-flex items-center rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-500">
              Source governance
            </span>
          </div>

          <form onSubmit={handleSearch} className="mb-4 flex gap-2" data-orb-knowledge-search>
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
            <div className="mb-4 space-y-2" data-orb-knowledge-search-results>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Search</p>
              {searchResults.map((result) => (
                <article
                  key={`${result.source_id}-${result.chunk_index}`}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5 text-[11px] text-slate-400"
                >
                  <p className="font-medium text-slate-200" data-orb-exact-citation>
                    {result.exact_citation || result.citation_label}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {result.source_title}
                    {result.heading ? ` · ${result.heading}` : result.section ? ` · ${result.section}` : ''}
                    {result.page ? ` · p. ${result.page}` : ''}
                    {result.paragraph_number ? ` · para. ${result.paragraph_number}` : ''}
                  </p>
                  {result.source_integrity === 'summary_only' ? (
                    <p data-orb-summary-only-warning className="text-[9px] text-amber-200/90">
                      Built-in summary — not full official text
                    </p>
                  ) : null}
                  {result.warning ? (
                    <p className="text-[9px] text-amber-200/90">{result.warning}</p>
                  ) : null}
                  <p className="mt-1 line-clamp-4 leading-5">{result.excerpt || result.text}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Sources</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setImportOpen((v) => !v)
                  setAddOpen(false)
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-amber-200 hover:bg-white/[0.04]"
              >
                <Plus className="h-3.5 w-3.5" />
                Import official source
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddOpen((v) => !v)
                  setImportOpen(false)
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-cyan-200 hover:bg-white/[0.04]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add source
              </button>
            </div>
          </div>

          {importOpen ? (
            <form onSubmit={handleImportOfficial} className="mb-4 space-y-2 rounded-xl border border-amber-500/20 p-3">
              <p className="text-xs font-semibold text-amber-100">Import official source</p>
              <input
                value={importDraft.title}
                onChange={(e) => setImportDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Title"
                required
                className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
              />
              <select
                value={importDraft.document_family}
                onChange={(e) => setImportDraft((d) => ({ ...d, document_family: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-[#0d1117] px-2 py-1.5 text-xs text-white"
              >
                {DOCUMENT_FAMILIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
              <input
                value={importDraft.publisher}
                onChange={(e) => setImportDraft((d) => ({ ...d, publisher: e.target.value }))}
                placeholder="Publisher"
                className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
              />
              <input
                value={importDraft.source_url}
                onChange={(e) => setImportDraft((d) => ({ ...d, source_url: e.target.value }))}
                placeholder="Source URL (optional)"
                className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
              />
              <input
                value={importDraft.document_version_label}
                onChange={(e) => setImportDraft((d) => ({ ...d, document_version_label: e.target.value }))}
                placeholder="Version label"
                className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
              />
              <input
                value={importDraft.review_due_at}
                onChange={(e) => setImportDraft((d) => ({ ...d, review_due_at: e.target.value }))}
                placeholder="Review due (ISO date, optional)"
                className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
              />
              <textarea
                value={importDraft.text}
                onChange={(e) => setImportDraft((d) => ({ ...d, text: e.target.value }))}
                placeholder="Paste official text with # headings…"
                required
                rows={6}
                className="w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-xs text-white"
              />
              <label className="flex items-center gap-2 text-[10px] text-slate-400">
                <input
                  type="checkbox"
                  checked={importDraft.approve_now}
                  onChange={(e) => setImportDraft((d) => ({ ...d, approve_now: e.target.checked }))}
                />
                Approve now
              </label>
              <button
                type="submit"
                disabled={ingesting}
                className="w-full rounded-lg bg-amber-500/20 py-2 text-xs font-semibold text-amber-50 disabled:opacity-50"
              >
                {ingesting ? 'Importing…' : 'Import and index'}
              </button>
            </form>
          ) : null}

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
                    <OrbSourceGovernanceBadges source={source} />
                  </div>
                  <p className="mt-0.5 text-slate-500">
                    {source.document_family ? `${source.document_family} · ` : ''}
                    {source.source_version || source.document_version_label || ''}
                    {source.publisher ? ` · ${source.publisher}` : ''}
                  </p>
                  {source.governance_status === 'needs_review' ||
                  source.governance_status === 'expired' ? (
                    <p className="mt-0.5 text-[9px] text-amber-200/90">May need review</p>
                  ) : null}
                  <OrbSourceGovernanceActions
                    sourceId={source.id}
                    busy={governanceBusy}
                    onApprove={(id) => void runGovernance('approve', id)}
                    onNeedsReview={(id) => void runGovernance('review', id)}
                    onArchive={(id) => void runGovernance('archive', id)}
                    onRebuild={(id) => void runGovernance('rebuild', id)}
                  />
                  <button
                    type="button"
                    className="mt-1 text-[9px] text-slate-600 underline"
                    onClick={() => void loadHealth(source.id)}
                  >
                    Show citation health
                  </button>
                  {healthBySource[source.id] ? (
                    <div className="mt-2">
                      <OrbCitationHealthSummary health={healthBySource[source.id]} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
      </div>
    </OrbStandalonePanelShell>
  )
}
