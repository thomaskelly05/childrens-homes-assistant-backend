'use client'

import { useCallback, useEffect, useState } from 'react'
import { Archive, CheckCircle2, Download, Loader2, Search, Send, Trash2, X } from 'lucide-react'

import {
  archiveOperationalOutput,
  deleteOperationalOutput,
  exportOperationalOutput,
  getOperationalOutput,
  listOperationalOutputs,
  markOperationalOutputForReview,
  markOperationalOutputReviewed,
  OPERATIONAL_ARTEFACT_NOTICE,
  type OrbOperationalOutputRecord,
  type OrbOperationalOutputSummary
} from '@/lib/orb/operational-client'

const TYPE_LABELS: Record<string, string> = {
  manager_briefing: 'Manager briefing',
  safeguarding_theme_review: 'Safeguarding review',
  record_quality_review: 'Record quality',
  ofsted_evidence_briefing: 'Ofsted evidence',
  action_priority_plan: 'Action priority plan',
  staff_support_briefing: 'Staff support',
  child_journey_summary: 'Child journey',
  governance_briefing: 'Governance',
  handover_intelligence: 'Handover',
  inspection_preparation: 'Inspection prep',
  operational_note: 'Operational note'
}

export function OrbOperationalOutputsPanel({
  open,
  onClose,
  refreshToken = 0
}: {
  open: boolean
  onClose: () => void
  refreshToken?: number
}) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<OrbOperationalOutputSummary[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [reviewFilter, setReviewFilter] = useState('')
  const [awaitingOnly, setAwaitingOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<OrbOperationalOutputRecord | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listOperationalOutputs({
        search: search.trim() || undefined,
        output_type: typeFilter || undefined,
        status: statusFilter || undefined,
        review_status: reviewFilter || undefined,
        awaiting_review_only: awaitingOnly
      })
      setItems(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load operational outputs')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, statusFilter, reviewFilter, awaitingOnly])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh, refreshToken])

  useEffect(() => {
    if (!selectedId || !open) {
      setDetail(null)
      return
    }
    void getOperationalOutput(selectedId).then((record) => setDetail(record))
  }, [selectedId, open, refreshToken])

  async function handleExport(fmt: 'markdown' | 'plain_text' = 'markdown') {
    if (!selectedId) return
    const exported = await exportOperationalOutput(selectedId, fmt)
    if (!exported) {
      setNotice('Export failed.')
      return
    }
    void navigator.clipboard.writeText(exported.content)
    setNotice(`Exported ${exported.filename} to clipboard.`)
  }

  async function handleReview() {
    if (!selectedId) return
    const updated = await markOperationalOutputForReview(selectedId)
    if (updated) {
      setDetail(updated)
      setNotice('Sent to manager review.')
      void refresh()
    }
  }

  async function handleReviewed() {
    if (!selectedId) return
    const updated = await markOperationalOutputReviewed(selectedId)
    if (updated) {
      setDetail(updated)
      setNotice('Marked as reviewed.')
      void refresh()
    }
  }

  async function handleArchive() {
    if (!selectedId) return
    await archiveOperationalOutput(selectedId)
    setSelectedId(null)
    setNotice('Output archived.')
    void refresh()
  }

  async function handleDelete() {
    if (!selectedId) return
    await deleteOperationalOutput(selectedId)
    setSelectedId(null)
    void refresh()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-950/40 p-4 backdrop-blur-sm"
      data-testid="orb-operational-outputs-panel"
    >
      <section className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Operational outputs</p>
            <h2 className="text-xl font-black text-slate-950">Saved OS artefacts</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <p className="border-b border-slate-100 px-5 py-3 text-xs font-semibold leading-5 text-slate-600" data-testid="orb-operational-artefact-notice">
          {OPERATIONAL_ARTEFACT_NOTICE}
        </p>

        <div className="grid gap-2 border-b border-slate-100 px-5 py-3 md:grid-cols-2">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search outputs"
              className="flex-1 text-sm font-semibold outline-none"
            />
          </label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold">
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold">
            <option value="">All review states</option>
            <option value="awaiting_review">Awaiting review</option>
            <option value="review_required">Review required</option>
            <option value="reviewed">Reviewed</option>
          </select>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={awaitingOnly} onChange={(e) => setAwaitingOnly(e.target.checked)} />
            Awaiting review only
          </label>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="w-2/5 overflow-y-auto border-r border-slate-100 p-3">
            {loading ? (
              <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </p>
            ) : null}
            {error ? <p className="text-sm font-bold text-rose-700">{error}</p> : null}
            {!loading && !items.length ? (
              <p className="text-sm font-semibold text-slate-500">No saved operational outputs yet.</p>
            ) : null}
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      selectedId === item.id ? 'border-blue-300 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-white'
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase text-blue-700">{TYPE_LABELS[item.type] || item.type}</p>
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    <p className="mt-1 text-[11px] font-bold text-slate-500">
                      {item.review_status.replace('_', ' ')} · {item.status}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!detail ? (
              <p className="text-sm font-semibold text-slate-500">Select an output to view briefing, recommendations and linked actions.</p>
            ) : (
              <article className="space-y-4" data-testid="orb-operational-output-detail">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">{TYPE_LABELS[detail.type] || detail.type}</p>
                  <h3 className="text-lg font-black text-slate-950">{detail.title}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {detail.scope_label || 'Operational scope'} · Ref {detail.id.slice(0, 8)}
                  </p>
                </div>
                {detail.summary ? <p className="text-sm font-semibold leading-6 text-slate-700">{detail.summary}</p> : null}
                {detail.content_markdown ? (
                  <pre className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-800">{detail.content_markdown}</pre>
                ) : null}
                {detail.recommendations?.length ? (
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Recommendations</p>
                    <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-700">
                      {detail.recommendations.map((rec, i) => (
                        <li key={i}>- {(rec as { title?: string }).title}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {detail.linked_action_ids?.length ? (
                  <p className="text-xs font-bold text-emerald-800" data-testid="orb-linked-actions">
                    Linked actions: {detail.linked_action_ids.join(', ')}
                  </p>
                ) : null}
                {detail.audit_reference ? (
                  <p className="text-xs font-bold text-slate-500">Audit: {detail.audit_reference}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExport('markdown')}
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white"
                    data-testid="orb-export-markdown"
                  >
                    <Download className="mr-1 inline h-3 w-3" />
                    Export markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReview()}
                    className="rounded-full bg-amber-500 px-4 py-2 text-xs font-black text-white"
                    data-testid="orb-send-manager-review"
                  >
                    <Send className="mr-1 inline h-3 w-3" />
                    Send to manager review
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReviewed()}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:bg-slate-300"
                    disabled={detail.review_status === 'reviewed'}
                    data-testid="orb-mark-reviewed"
                  >
                    <CheckCircle2 className="mr-1 inline h-3 w-3" />
                    Mark reviewed
                  </button>
                  <button type="button" onClick={() => void handleArchive()} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black">
                    <Archive className="mr-1 inline h-3 w-3" />
                    Archive
                  </button>
                  <button type="button" onClick={() => void handleDelete()} className="rounded-full border border-rose-200 px-4 py-2 text-xs font-black text-rose-800">
                    <Trash2 className="mr-1 inline h-3 w-3" />
                    Delete
                  </button>
                </div>
              </article>
            )}
            {notice ? <p className="mt-4 text-xs font-semibold text-blue-800">{notice}</p> : null}
          </div>
        </div>
      </section>
    </div>
  )
}
