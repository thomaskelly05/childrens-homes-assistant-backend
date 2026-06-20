'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Archive, Loader2, Trash2 } from 'lucide-react'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import {
  OrbPremiumButton,
  OrbPremiumPill,
  OrbPremiumToolbar,
  OrbStudioEmptyState,
  OrbStudioHeader
} from '@/components/orb/premium'
import { ORB_PREMIUM_ACTION_LABELS } from '@/components/orb/premium/orb-premium-theme'
import {
  OrbIntelligenceOutput,
  type OrbIntelligenceOutputView
} from '@/components/orb-standalone/orb-intelligence-output'
import { OrbSavedOutputDetailActions } from '@/components/orb-standalone/orb-saved-output-detail-actions'
import { orbStationShellProps } from '@/components/orb-standalone/orb-app-modal'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'
import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import {
  isOrbStationAuthError,
  OrbStationAuthError,
  OrbStationEmptyState,
  OrbStationReconnectBanner,
  shouldBlockStationForAuth
} from '@/components/orb-standalone/orb-station-panel-states'
import {
  extractSavedOutputBrainMetadata,
  savedOutputReviewStatusLabel,
  savedOutputSourceLabel,
  savedOutputPlatformLabel,
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
import {
  ORB_RECORDS_EMPTY_SUBTITLE,
  ORB_RECORDS_EMPTY_TITLE,
  ORB_RECORDS_FILTER_CHIPS,
  ORB_RECORDS_FOOTER,
  ORB_RECORDS_LOAD_ERROR,
  ORB_RECORDS_PANEL_SUBTITLE,
  ORB_RECORDS_PANEL_TITLE
} from '@/lib/orb/orb-user-facing-names'

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
  onStartInOrbWrite,
  onOpenSavedOutputInOrbWrite,
  onStartInDictate,
  onStartInCommunicate,
  onStartInChat,
  onStartInDocuments,
  onOpenGuidedDemo,
  guidedDemoActive = false,
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
  onStartInOrbWrite?: () => void
  onOpenSavedOutputInOrbWrite?: (record: OrbSavedOutputRecord) => void
  onStartInDictate?: () => void
  onStartInCommunicate?: () => void
  onStartInChat?: () => void
  onStartInDocuments?: () => void
  onOpenGuidedDemo?: () => void
  guidedDemoActive?: boolean
  residentialSurface?: boolean
  sessionReady?: boolean
}) {
  const { isMobile } = useOrbResponsiveMode()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<OrbSavedOutputSummary[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [chipFilter, setChipFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
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
      setError(err instanceof Error ? err.message : ORB_RECORDS_LOAD_ERROR)
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

  const activeFilterCount =
    (chipFilter !== 'all' ? 1 : 0) + (projectFilter ? 1 : 0) + (includeArchived ? 1 : 0) + (statusFilter ? 1 : 0)

  const showRecordsEmptyCanvas = residentialSurface && items.length === 0 && !loading && !error

  async function handleArchive(id: string) {
    await archiveOrbSavedOutput(id)
    setNotice('Output archived.')
    void refresh()
    if (selectedId === id) setSelectedId(null)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this record or draft permanently?')) return
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
      title={ORB_RECORDS_PANEL_TITLE}
      subtitle={isMobile ? ORB_RECORDS_PANEL_SUBTITLE : ORB_RECORDS_PANEL_SUBTITLE}
      onClose={onClose}
      panelId="saved_outputs"
      ariaLabel="ORB records and drafts"
      footer={isMobile ? undefined : ORB_RECORDS_FOOTER}
      {...orbStationShellProps(residentialSurface, 'wide')}
    >
      <div
        className={`orb-studio-shell flex min-h-0 flex-col gap-2 p-2 sm:gap-3 sm:p-4 ${showRecordsEmptyCanvas ? 'items-center justify-center' : 'lg:flex-row'} ${residentialSurface ? 'orb-workspace orb-workspace--records' : ''}`}
        data-orb-saved-outputs-panel
        data-orb-studio-shell="saved_outputs"
        {...(residentialSurface ? { 'data-orb-workspace-records': true } : {})}
        {...(items.length === 0 && !loading ? { 'data-orb-saved-outputs-empty': true } : {})}
      >
        {showRecordsEmptyCanvas ? (
          <div className="flex w-full max-w-md flex-col items-center justify-center py-8" data-orb-records-empty>
            <OrbStudioEmptyState
              icon={<GlassOrbMark size="sm" pulse aria-hidden />}
              title={ORB_RECORDS_EMPTY_TITLE}
              description={ORB_RECORDS_EMPTY_SUBTITLE}
              className="orb-records-empty-state"
              actions={
                <>
                  {onStartInDictate ? (
                    <OrbPremiumButton variant="secondary" onClick={onStartInDictate} data-orb-saved-start-dictate>
                      Start in Dictate
                    </OrbPremiumButton>
                  ) : null}
                  {onStartInCommunicate ? (
                    <OrbPremiumButton variant="secondary" onClick={onStartInCommunicate} data-orb-saved-start-communicate>
                      Start in Communicate
                    </OrbPremiumButton>
                  ) : null}
                  {onStartInOrbWrite ? (
                    <OrbPremiumButton variant="primary" onClick={onStartInOrbWrite} data-orb-saved-start-write>
                      Create in ORB Write
                    </OrbPremiumButton>
                  ) : null}
                </>
              }
            />
          </div>
        ) : (
        <>
        <div className="flex w-full shrink-0 flex-col lg:w-[var(--orb-desktop-saved-list-width,27.5rem)] lg:max-w-[var(--orb-desktop-saved-list-width,27.5rem)] lg:border-b-0 lg:border-r lg:border-[var(--orb-mobile-ws-card-border,var(--orb-line))]">
          {!isMobile ? (
          <OrbStudioHeader
            title={ORB_RECORDS_PANEL_TITLE}
            subtitle={ORB_RECORDS_PANEL_SUBTITLE}
            className="px-2 pb-2 lg:px-3"
          />
          ) : null}
          {reconnectSuggested && items.length ? (
            <div className="p-3 pb-0">
              <OrbStationReconnectBanner onRefresh={() => void refresh()} />
              <p className="mt-1 text-[10px] text-[var(--orb-mobile-ws-muted,var(--orb-muted))]" data-orb-saved-outputs-local-hint>
                Showing {storageMode === 'mixed' ? 'local and synced' : 'local'} records and drafts until ORB reconnects.
              </p>
            </div>
          ) : null}
          <div className="space-y-2 p-3" data-orb-premium-page="saved_outputs">
            <OrbPremiumToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchSurfaceId="saved_outputs"
              searchInputProps={{ 'data-orb-saved-outputs-search': '' } as React.InputHTMLAttributes<HTMLInputElement>}
              filtersDataAttr="data-orb-saved-outputs-filters"
              filters={
                isMobile ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setMobileFiltersOpen((open) => !open)}
                      className="inline-flex min-h-[2.75rem] items-center rounded-full border border-[var(--orb-line)] px-3 py-1 text-xs font-semibold text-[var(--orb-foreground)]"
                      data-orb-saved-outputs-filter-toggle
                      aria-expanded={mobileFiltersOpen}
                    >
                      Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                    </button>
                    {mobileFiltersOpen ? (
                      <div
                        className="w-full space-y-2 rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] p-2.5"
                        data-orb-saved-outputs-mobile-filters
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {ORB_RECORDS_FILTER_CHIPS.map((chip) => (
                            <OrbPremiumPill
                              key={chip.id}
                              active={chipFilter === chip.id}
                              onClick={() => {
                                setChipFilter(chip.id)
                                setTypeFilter(chip.type)
                              }}
                              className="text-[10px]"
                            >
                              {chip.label}
                            </OrbPremiumPill>
                          ))}
                        </div>
                        <select
                          value={projectFilter}
                          onChange={(e) => setProjectFilter(e.target.value)}
                          className="w-full rounded-lg border border-[var(--orb-mobile-ws-card-border,var(--orb-line))] bg-[var(--orb-mobile-ws-input,var(--orb-surface))] px-2 py-1.5 text-xs text-[var(--orb-mobile-ws-text,var(--orb-foreground))]"
                        >
                          <option value="">All projects</option>
                          {workspace.projects.map((p: StandaloneProject) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <label className="flex min-h-[2.75rem] items-center gap-1 text-[var(--orb-mobile-ws-muted,var(--orb-muted))]">
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
                            className="ml-auto min-h-[2.75rem] rounded-lg border border-[var(--orb-mobile-ws-card-border,var(--orb-line))] px-2 py-1 text-[var(--orb-mobile-ws-text,var(--orb-foreground))]"
                          >
                            Refresh
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    {ORB_RECORDS_FILTER_CHIPS.map((chip) => (
                      <OrbPremiumPill
                        key={chip.id}
                        active={chipFilter === chip.id}
                        onClick={() => {
                          setChipFilter(chip.id)
                          setTypeFilter(chip.type)
                        }}
                        className="text-[10px]"
                      >
                        {chip.label}
                      </OrbPremiumPill>
                    ))}
                  </>
                )
              }
            />
            {!isMobile ? (
              <>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full rounded-lg border border-[var(--orb-mobile-ws-card-border,var(--orb-line))] bg-[var(--orb-mobile-ws-input,var(--orb-surface))] px-2 py-1.5 text-xs text-[var(--orb-mobile-ws-text,var(--orb-foreground))]"
                >
                  <option value="">All projects</option>
                  {workspace.projects.map((p: StandaloneProject) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="flex items-center gap-1 text-[var(--orb-mobile-ws-muted,var(--orb-muted))]">
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
                    className="ml-auto rounded-lg border border-[var(--orb-mobile-ws-card-border,var(--orb-line))] px-2 py-1 text-[var(--orb-mobile-ws-text,var(--orb-foreground))]"
                  >
                    Refresh
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div className="max-h-[min(36vh,18rem)] flex-1 overflow-y-auto p-2 lg:max-h-none" data-orb-saved-outputs-list>
            {loading ? (
              <p className="flex items-center gap-2 px-2 py-4 text-xs text-[var(--orb-mobile-ws-muted,var(--orb-muted))]">
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
                  title={ORB_RECORDS_LOAD_ERROR}
                  body="Try again in a moment. Open Help & Safety or account settings if this persists."
                />
              )
            ) : items.length === 0 ? (
              <div data-orb-records-empty>
              <OrbStudioEmptyState
                title={ORB_RECORDS_EMPTY_TITLE}
                description={isMobile ? undefined : ORB_RECORDS_EMPTY_SUBTITLE}
                className={isMobile ? '!px-4 !py-6' : undefined}
                actions={
                  <>
                    {onStartInOrbWrite ? (
                      <OrbPremiumButton variant="primary" onClick={onStartInOrbWrite} data-orb-saved-start-write>
                        {isMobile ? 'Create in ORB Write' : 'Create document'}
                      </OrbPremiumButton>
                    ) : null}
                    {onStartInDictate ? (
                      <OrbPremiumButton variant="secondary" onClick={onStartInDictate} data-orb-saved-start-dictate>
                        Start in Dictate
                      </OrbPremiumButton>
                    ) : null}
                    {guidedDemoActive && onOpenGuidedDemo ? (
                      <OrbPremiumButton variant="secondary" onClick={onOpenGuidedDemo} data-orb-saved-open-guided-demo>
                        Open Guided Demo
                      </OrbPremiumButton>
                    ) : null}
                  </>
                }
              />
              </div>
            ) : (
              grouped.map(([projectName, groupItems]) => (
                <div key={projectName} className="mb-4">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-mobile-ws-muted,var(--orb-muted))]">
                    {projectName}
                  </p>
                  <ul className="space-y-1">
                    {groupItems.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={`orb-panel-card orb-liquid-card w-full rounded-xl border px-3 py-2 text-left transition ${
                            selectedId === item.id
                              ? 'border-[var(--orb-primary,#168bff)]/40 bg-[var(--orb-primary-soft,rgba(22,139,255,0.16))]'
                              : 'border-[var(--orb-mobile-ws-card-border,var(--orb-line))] hover:bg-[var(--orb-surface-hover)]'
                          }`}
                          data-orb-saved-output-item
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-[var(--orb-mobile-ws-text,var(--orb-foreground))] line-clamp-1">{item.title}</span>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span
                                className="rounded bg-[var(--orb-mobile-ws-input,rgba(255,255,255,0.06))] px-1.5 py-0.5 text-[10px] text-[var(--orb-mobile-ws-muted,var(--orb-muted))]"
                                data-orb-saved-output-review-status
                              >
                                {savedOutputReviewStatusLabel(item)}
                              </span>
                              <span className="rounded bg-[var(--orb-mobile-ws-input,rgba(255,255,255,0.06))] px-1.5 py-0.5 text-[10px] text-[var(--orb-mobile-ws-muted,var(--orb-muted))]">
                                {savedOutputTypeLabel(item.type)}
                              </span>
                            </div>
                          </div>
                          {item.summary ? (
                            <p className="mt-1 line-clamp-2 text-xs text-[var(--orb-mobile-ws-muted,var(--orb-muted))]">{item.summary}</p>
                          ) : null}
                          <p className="mt-1 text-[10px] text-[var(--orb-mobile-ws-muted,var(--orb-muted))] opacity-80">
                            {savedOutputPlatformLabel(item) ? `${savedOutputPlatformLabel(item)} · ` : ''}
                            {savedOutputTypeLabel(item.type)}
                            {item.source_count ? ` · ${item.source_count} sources` : ''} ·{' '}
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
          className={`flex min-h-[10rem] min-w-0 flex-1 flex-col lg:min-h-[12rem] lg:border-l lg:border-[var(--orb-mobile-ws-card-border,var(--orb-line))] ${isMobile && items.length === 0 ? 'hidden' : ''}`}
          data-orb-saved-output-detail
        >
          {detail ? (
            <>
              <div className="border-b border-[var(--orb-mobile-ws-card-border,var(--orb-line))] px-4 py-3">
                <h3 className="text-base font-semibold text-[var(--orb-mobile-ws-text,var(--orb-foreground))]">{detail.title}</h3>
                <p className="mt-1 text-xs text-[var(--orb-mobile-ws-muted,var(--orb-muted))]">
                  <span
                    className="font-medium text-[var(--orb-mobile-ws-text,var(--orb-foreground))]"
                    data-orb-saved-output-review-status
                  >
                    {savedOutputReviewStatusLabel(detail)}
                  </span>
                  {' · '}
                  {savedOutputTypeLabel(detail.type)} · {savedOutputSourceLabel(detail)}
                  {savedOutputPlatformLabel(detail) ? ` · ${savedOutputPlatformLabel(detail)}` : ''} ·{' '}
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
                    className="rounded-lg border border-[var(--orb-mobile-ws-card-border,var(--orb-line))] px-2 py-1 text-xs text-[var(--orb-mobile-ws-text,var(--orb-foreground))]"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleArchive(detail.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-mobile-ws-card-border,var(--orb-line))] px-2 py-1 text-xs text-[var(--orb-mobile-ws-text,var(--orb-foreground))]"
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
                  onOpenInOrbWrite={
                    onOpenSavedOutputInOrbWrite
                      ? () => onOpenSavedOutputInOrbWrite(detail)
                      : undefined
                  }
                  onUseInShiftBuilder={onUseInShiftBuilder}
                  onReuseInChat={onReuseInChat}
                  onRerun={onRerun ? handleRerun : undefined}
                />
                <OrbIntelligenceOutput output={recordToView(detail)} />
              </div>
            </>
          ) : (
            <div
              className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--orb-mobile-ws-muted,var(--orb-muted))]"
              data-orb-saved-output-detail-empty
            >
              {items.length === 0 && !isMobile ? (
                <div className="space-y-3" data-orb-saved-output-empty-state>
                  <p className="font-medium text-[var(--orb-foreground)]">{ORB_RECORDS_EMPTY_TITLE}</p>
                  <p className="text-xs">Save reviews, action plans and documents here.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {onStartInOrbWrite ? (
                      <OrbPremiumButton variant="primary" onClick={onStartInOrbWrite} data-orb-saved-start-write>
                        Create document
                      </OrbPremiumButton>
                    ) : null}
                    {onStartInDictate ? (
                      <OrbPremiumButton variant="secondary" onClick={onStartInDictate} data-orb-saved-start-dictate>
                        Start in Dictate
                      </OrbPremiumButton>
                    ) : null}
                  </div>
                </div>
              ) : (
                'Select a record or draft to open, review in ORB Write, or reuse in Chat.'
              )}
            </div>
          )}
          {notice ? (
            <p className="shrink-0 border-t border-[var(--orb-mobile-ws-card-border,var(--orb-line))] px-4 py-2 text-xs text-emerald-300/90">{notice}</p>
          ) : null}
        </div>
        </>
        )}
      </div>
    </OrbStandalonePanelShell>
  )
}
