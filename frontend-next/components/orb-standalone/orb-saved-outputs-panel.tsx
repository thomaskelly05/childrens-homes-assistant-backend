'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Loader2, Search, Trash2 } from 'lucide-react'

import {
  OrbIntelligenceOutput,
  type OrbIntelligenceOutputView
} from '@/components/orb-standalone/orb-intelligence-output'
import { OrbSavedOutputDetailActions } from '@/components/orb-standalone/orb-saved-output-detail-actions'
import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import {
  isOrbStationAuthError,
  OrbStationAuthError,
  OrbStationEmptyState,
  OrbStationReconnectBanner,
  shouldBlockStationForAuth
} from '@/components/orb-standalone/orb-station-panel-states'
import {
  extractSavedOutputBrainMetadata,
  savedOutputSourceLabel,
  savedOutputTypeLabel,
  type OrbSavedOutputRerunState
} from '@/lib/orb/orb-saved-output-adapters'
import { shouldShowOrbBrainIndicator, orbBrainIndicatorLabel } from '@/lib/orb/orb-brain-metadata'
import {
  archiveOrbSavedOutput,
  deleteOrbSavedOutput,
  getOrbSavedOutput,
  updateOrbSavedOutput,
  type OrbSavedOutputRecord,
  type OrbSavedOutputSummary
} from '@/lib/orb/standalone-client'
import { getOrbLocalSavedOutput, removeOrbLocalSavedOutput } from '@/lib/orb/orb-saved-outputs-local'
import { listOrbSavedOutputsResilient, orbLocalSavedOutputAsRecord } from '@/lib/orb/orb-saved-outputs-resilience'
import type { StandaloneProject, StandaloneWorkspace } from '@/lib/orb/standalone-local-store'

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
  onReuseInChat,
  onAskOrb,
  onSendToDictate,
  onUseInShiftBuilder,
  onRerun,
  residentialSurface = false,
  sessionReady = true
}: {
  open: boolean
  onClose: () => void
  workspace: StandaloneWorkspace
  onReuseInChat?: (prompt: string) => void
  onAskOrb?: (prompt: string) => void
  onSendToDictate?: (text: string) => void
  onUseInShiftBuilder?: (notes: string, focus?: string) => void
  onRerun?: (state: OrbSavedOutputRerunState) => void
  residentialSurface?: boolean
  sessionReady?: boolean
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
  const [storageMode, setStorageMode] = useState<'server' | 'local' | 'mixed'>('server')
  const [reconnectSuggested, setReconnectSuggested] = useState(false)
  const refreshGuardRef = useRef(false)

  const refresh = useCallback(async () => {
    if (refreshGuardRef.current) return
    refreshGuardRef.current = true
    setLoading(true)
    setError(null)
    try {
      const result = await listOrbSavedOutputsResilient({
        search: search.trim() || undefined,
        output_type: typeFilter || undefined,
        project_id: projectFilter || undefined,
        status: statusFilter || undefined,
        include_archived: includeArchived
      })
      setItems(result.items)
      setStorageMode(result.storageMode)
      setReconnectSuggested(result.reconnectSuggested)
      if (result.storageMode === 'local' && result.items.length) {
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load saved outputs')
    } finally {
      setLoading(false)
      refreshGuardRef.current = false
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
    if (selectedId.startsWith('local_')) {
      const local = getOrbLocalSavedOutput(selectedId)
      setDetail(local ? orbLocalSavedOutputAsRecord(local) : null)
      return
    }
    void getOrbSavedOutput(selectedId)
      .then(setDetail)
      .catch(() => {
        const local = getOrbLocalSavedOutput(selectedId)
        setDetail(local ? orbLocalSavedOutputAsRecord(local) : null)
      })
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

  const detailBrain = useMemo(
    () => (detail ? extractSavedOutputBrainMetadata(detail) : null),
    [detail]
  )

  async function handleArchive(id: string) {
    await archiveOrbSavedOutput(id)
    setNotice('Output archived.')
    void refresh()
    if (selectedId === id) setSelectedId(null)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this saved output permanently?')) return
    if (id.startsWith('local_')) {
      removeOrbLocalSavedOutput(id)
    } else {
      await deleteOrbSavedOutput(id)
    }
    setNotice('Output deleted.')
    void refresh()
    if (selectedId === id) setSelectedId(null)
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

  function handleRerun(state: OrbSavedOutputRerunState) {
    if (!state.available) return
    onRerun?.(state)
    onClose()
  }

  return (
    <OrbStandalonePanelShell
      open={open}
      title="Saved Outputs"
      subtitle="Reuse, export and improve your ORB work"
      onClose={onClose}
      panelId="saved_outputs"
      ariaLabel="ORB saved outputs"
      footer="Saved outputs are standalone ORB artefacts."
      {...orbStationShellProps(residentialSurface, 'wide')}
    >
      <div className="flex min-h-0 flex-col md:flex-row" data-orb-saved-outputs-panel>
        <div className="flex w-full shrink-0 flex-col border-b border-white/[0.06] md:max-w-md md:border-b-0 md:border-r">
          {reconnectSuggested && items.length ? (
            <div className="p-3 pb-0">
              <OrbStationReconnectBanner onRefresh={() => void refresh()} />
              <p className="mt-1 text-[10px] text-slate-500" data-orb-saved-outputs-local-hint>
                Showing {storageMode === 'mixed' ? 'local and synced' : 'local'} saved outputs until ORB reconnects.
              </p>
            </div>
          ) : null}
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

          <div className="max-h-[40vh] flex-1 overflow-y-auto p-2 md:max-h-none" data-orb-saved-outputs-list>
            {loading ? (
              <p className="flex items-center gap-2 px-2 py-4 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </p>
            ) : error ? (
              shouldBlockStationForAuth(sessionReady, error) ? (
                <OrbStationAuthError detail={error} />
              ) : isOrbStationAuthError(error) ? (
                <OrbStationReconnectBanner onRefresh={() => void refresh()} />
              ) : (
                <OrbStationEmptyState
                  dataAttr="saved_outputs_error"
                  title="Could not load saved outputs"
                  body="Try again in a moment. Use Details in account settings if this persists."
                />
              )
            ) : items.length === 0 ? (
              <OrbStationEmptyState
                dataAttr="saved_outputs"
                title="No saved outputs yet."
                body={
                  storageMode === 'local'
                    ? 'Save from ORB chat, Dictate, Documents or Shift Builder — drafts stay on this device until you reconnect.'
                    : 'Save from chat answers, Dictate, Documents, Policy Card or Shift Builder to build your library here.'
                }
              />
            ) : (
              grouped.map(([projectName, groupItems]) => (
                <div key={projectName} className="mb-4">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {projectName}
                  </p>
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
                          data-orb-saved-output-item
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-white line-clamp-1">{item.title}</span>
                            <span className="shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                              {savedOutputTypeLabel(item.type)}
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

        <div
          className="flex min-h-[12rem] min-w-0 flex-1 flex-col md:border-l md:border-white/[0.04]"
          data-orb-saved-output-detail
        >
          {detail ? (
            <>
              <div className="border-b border-white/[0.06] px-4 py-3">
                <h3 className="text-base font-semibold text-white">{detail.title}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {savedOutputTypeLabel(detail.type)} · {savedOutputSourceLabel(detail)} ·{' '}
                  {new Date(detail.created_at).toLocaleString()}
                </p>
                {shouldShowOrbBrainIndicator(detailBrain) && detailBrain ? (
                  <p className="mt-1 text-[10px] text-cyan-300/80" data-orb-saved-output-brain>
                    {orbBrainIndicatorLabel(detailBrain)}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
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
                    onClick={() => void handleDelete(detail.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-400/20 px-2 py-1 text-xs text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <OrbSavedOutputDetailActions
                  record={detail}
                  onNotice={setNotice}
                  onAskOrb={onAskOrb || onReuseInChat}
                  onSendToDictate={onSendToDictate}
                  onUseInShiftBuilder={onUseInShiftBuilder}
                  onReuseInChat={onReuseInChat}
                  onRerun={onRerun ? handleRerun : undefined}
                />
                <OrbIntelligenceOutput output={recordToView(detail)} />
              </div>
            </>
          ) : (
            <div
              className="flex flex-1 items-center justify-center p-8 text-center text-sm text-slate-500"
              data-orb-saved-output-detail-empty
            >
              Select a saved output to open, export, or reuse in chat.
            </div>
          )}
          {notice ? (
            <p className="shrink-0 border-t border-white/[0.06] px-4 py-2 text-xs text-emerald-300/90">{notice}</p>
          ) : null}
        </div>
      </div>
    </OrbStandalonePanelShell>
  )
}
