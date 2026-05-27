'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Archive, Download, Loader2, MessageSquarePlus, Search, Trash2 } from 'lucide-react'

import {
  OrbIntelligenceOutput,
  type OrbIntelligenceOutputView
} from '@/components/orb-standalone/orb-intelligence-output'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  archiveOrbSavedOutput,
  deleteOrbSavedOutput,
  exportOrbSavedOutput,
  getOrbSavedOutput,
  listOrbSavedOutputs,
  reuseOrbSavedOutput,
  STANDALONE_ARTEFACT_NOTICE,
  updateOrbSavedOutput,
  type OrbSavedOutputRecord,
  type OrbSavedOutputSummary,
  type OrbSavedOutputType
} from '@/lib/orb/standalone-client'
import type { StandaloneProject, StandaloneWorkspace } from '@/lib/orb/standalone-local-store'

const TYPE_LABELS: Record<string, string> = {
  action_plan: 'Action plan',
  document_review: 'Document review',
  manager_briefing: 'Manager briefing',
  staff_briefing: 'Staff briefing',
  deep_research: 'Deep research',
  policy_comparison: 'Policy comparison',
  ofsted_evidence_map: 'Ofsted evidence',
  recording_rewrite: 'Recording rewrite',
  safeguarding_reflection: 'Safeguarding',
  therapeutic_practice: 'Therapeutic',
  general_research: 'Research',
  intelligence_note: 'Note',
  checklist: 'Checklist',
  supervision_guide: 'Supervision'
}

const FILTER_CHIPS: Array<{ id: string; label: string; type: string }> = [
  { id: 'all', label: 'All', type: '' },
  { id: 'briefings', label: 'Briefings', type: 'manager_briefing' },
  { id: 'action_plans', label: 'Action plans', type: 'action_plan' },
  { id: 'document_reviews', label: 'Document reviews', type: 'document_review' },
  { id: 'research', label: 'Research', type: 'deep_research' },
  { id: 'safeguarding', label: 'Safeguarding', type: 'safeguarding_reflection' },
  { id: 'ofsted', label: 'Ofsted', type: 'ofsted_evidence_map' }
]

function recordToView(record: OrbSavedOutputRecord): OrbIntelligenceOutputView {
  const intel = record.intelligence_output as OrbIntelligenceOutputView | undefined
  if (intel?.title) return intel
  return {
    title: record.title,
    summary: record.summary || record.content_markdown?.slice(0, 2000) || '',
    type: record.type,
    sources: record.sources,
    citations: record.citations,
    quality: record.quality as OrbIntelligenceOutputView['quality']
  }
}

export function OrbSavedOutputsPanel({
  open,
  onClose,
  workspace,
  onReuseInChat
}: {
  open: boolean
  onClose: () => void
  workspace: StandaloneWorkspace
  onReuseInChat?: (prompt: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<OrbSavedOutputSummary[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [chipFilter, setChipFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<OrbSavedOutputRecord | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeProject = workspace.projects.find((p) => p.id === workspace.activeProjectId)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await listOrbSavedOutputs({
        search: search.trim() || undefined,
        output_type: typeFilter || undefined,
        project_id: projectFilter || undefined,
        status: statusFilter || undefined,
        include_archived: includeArchived
      })
      setItems(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load saved outputs')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter, projectFilter, statusFilter, includeArchived])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    void getOrbSavedOutput(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
  }, [selectedId])

  const grouped = useMemo(() => {
    const map = new Map<string, OrbSavedOutputSummary[]>()
    for (const item of items) {
      const key = item.project_name || item.project_id || 'No project'
      const list = map.get(key) || []
      list.push(item)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [items])

  async function handleArchive(id: string) {
    await archiveOrbSavedOutput(id)
    setNotice('Output archived.')
    void refresh()
    if (selectedId === id) setSelectedId(null)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this saved output permanently?')) return
    await deleteOrbSavedOutput(id)
    setNotice('Output deleted.')
    void refresh()
    if (selectedId === id) setSelectedId(null)
  }

  async function handleExport(id: string) {
    const exported = await exportOrbSavedOutput(id, 'markdown')
    void navigator.clipboard.writeText(exported.content)
    setNotice('Export markdown copied to clipboard.')
  }

  async function handleReuse(id: string) {
    const reuse = await reuseOrbSavedOutput(id)
    onReuseInChat?.(reuse.suggested_prompt)
    onClose()
  }

  async function handleRename(id: string, current: string) {
    const next = window.prompt('Rename output', current)
    if (!next?.trim()) return
    await updateOrbSavedOutput(id, { title: next.trim() })
    setNotice('Renamed.')
    void refresh()
    if (selectedId === id) {
      const updated = await getOrbSavedOutput(id)
      setDetail(updated)
    }
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Saved outputs"
      subtitle="Your standalone ORB library"
      onClose={onClose}
      panelId="saved_outputs"
      wide
      ariaLabel="ORB saved outputs"
      footer="Saved outputs are standalone ORB artefacts."
    >
      <div className="flex min-h-0 flex-col md:flex-row" data-orb-saved-outputs-panel>
        <div className="flex w-full shrink-0 flex-col border-b border-white/[0.06] md:max-w-md md:border-b-0 md:border-r">
          <div className="space-y-2 p-3">
            <label className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06]">
              <Search className="h-4 w-4 text-slate-500" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saved outputs"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                data-orb-saved-outputs-search
              />
            </label>
            <div className="flex flex-wrap gap-1.5" data-orb-saved-outputs-filters>
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setChipFilter(chip.id)
                    setTypeFilter(chip.type)
                  }}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                    chipFilter === chip.id ? 'bg-white/[0.1] text-white' : 'bg-white/[0.03] text-slate-500'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white"
            >
              <option value="">All projects</option>
              {workspace.projects.map((p: StandaloneProject) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1 text-slate-400">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                Archived
              </label>
              <button
                type="button"
                onClick={() => void refresh()}
                className="ml-auto rounded-lg border border-white/10 px-2 py-1 text-slate-300"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="max-h-[40vh] flex-1 overflow-y-auto p-2 md:max-h-none">
            {loading ? (
              <p className="flex items-center gap-2 px-2 py-4 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </p>
            ) : error ? (
              <p className="px-2 py-4 text-xs text-red-300">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-4 text-xs leading-5 text-slate-500" data-orb-saved-outputs-empty>
                No saved outputs yet. Run a document review, agent or deep research and save the result.
              </p>
            ) : (
                grouped.map(([projectName, groupItems]) => (
                  <div key={projectName} className="mb-4">
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{projectName}</p>
                    <ul className="space-y-1">
                      {groupItems.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.id)}
                            className={`orb-panel-card w-full rounded-xl border px-3 py-2 text-left transition ${
                              selectedId === item.id
                                ? 'border-cyan-300/25 bg-white/[0.08]'
                                : 'border-white/[0.06] hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium text-white line-clamp-1">{item.title}</span>
                              <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                                {TYPE_LABELS[item.type] || item.type}
                              </span>
                            </div>
                            {item.summary ? (
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.summary}</p>
                            ) : null}
                            <p className="mt-1 text-[10px] text-slate-600">
                              {item.source_count ? `${item.source_count} sources · ` : ''}
                              {new Date(item.created_at).toLocaleDateString()}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
          </div>
        </div>

        <div className="flex min-h-[12rem] min-w-0 flex-1 flex-col">
            {detail ? (
              <>
                <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-4 py-2">
                  <button
                    type="button"
                    onClick={() => void handleRename(detail.id, detail.title)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleArchive(detail.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
                  >
                    <Archive className="h-3.5 w-3.5" aria-hidden />
                    Archive
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExport(detail.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Export markdown
                  </button>
                  {onReuseInChat ? (
                    <button
                      type="button"
                      onClick={() => void handleReuse(detail.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-500/10 px-2 py-1 text-xs text-violet-100"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                      Reuse in chat
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void handleDelete(detail.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 px-2 py-1 text-xs text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <OrbIntelligenceOutput output={recordToView(detail)} />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500">
                Select a saved output to open, export, or reuse in chat.
              </div>
            )}
          {notice ? <p className="shrink-0 border-t border-white/[0.06] px-4 py-2 text-xs text-emerald-300/90">{notice}</p> : null}
        </div>
      </div>
    </OrbStandalonePanelShell>
  )
}
