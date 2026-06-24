'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  Home,
  Loader2,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Printer,
  Save,
  Search,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'

import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import {
  listTemplateHomeDocuments,
  requestSectionOrbHelp,
  saveOrUpdateWorkingDocumentToRecords,
  searchWorkingDocumentTemplates
} from '@/lib/orb/template/orb-template-working-document-client'
import type {
  OrbTemplateSourceChip,
  OrbTemplateWorkingDocument,
  OrbTemplateWorkingDocumentSection,
  OrbTemplateWorkingDocumentTable
} from '@/lib/orb/template/orb-template-working-document-types'
import {
  ORB_WRITE_SECTION_ASSIST_ACTIONS,
  sectionAssistInstruction,
  type OrbWriteSectionAssistActionId
} from '@/lib/orb/write/orb-write-section-assist'
import {
  copyWorkingDocumentSectionText,
  copyWorkingDocumentText,
  renderWorkingDocumentPrintHtml
} from '@/lib/orb/write/orb-write-working-document-export'
import { workingDocumentToWriteBody } from '@/lib/orb/write/orb-write-working-document-handoff'

const STATUS_LABELS: Record<OrbTemplateWorkingDocument['status'], string> = {
  draft: 'Draft',
  reviewed: 'Reviewed',
  finalised: 'Finalised',
  archived: 'Archived'
}

const SOURCE_STATION_LABELS: Record<string, string> = {
  chat: 'Chat',
  dictate: 'Dictate',
  voice: 'Voice',
  write: 'Write',
  templates: 'Templates',
  records: 'Records',
  communicate: 'Communicate',
  manual: 'Manual'
}

function SourceChips({ chips }: { chips: OrbTemplateSourceChip[] }) {
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap gap-1" data-orb-write-source-chips>
      {chips.map((chip) => (
        <span
          key={chip.chip_id}
          className="rounded-full border border-[var(--orb-line)]/60 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
          data-orb-source-chip={chip.chip_type}
        >
          {chip.label}
        </span>
      ))}
    </div>
  )
}

function HomeDocumentChips({
  chips,
  notice
}: {
  chips: OrbTemplateSourceChip[]
  notice?: string | null
}) {
  if (!chips.length && !notice) return null
  return (
    <div className="space-y-1" data-orb-write-home-document-chips>
      {chips.map((chip) => (
        <span
          key={chip.chip_id}
          className="mr-1 inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/5 px-2 py-0.5 text-[10px] text-sky-800 dark:text-sky-200"
          data-orb-home-doc-chip={chip.reference_id}
          data-orb-home-doc-status="ready"
        >
          <Home className="mr-0.5 h-2.5 w-2.5" aria-hidden />
          {chip.label}
        </span>
      ))}
      {notice ? (
        <p className="text-[10px] text-[var(--orb-muted)]" data-orb-write-home-doc-notice>
          {notice}
        </p>
      ) : null}
    </div>
  )
}

function EditableWorkingDocumentTable({
  table,
  readOnly,
  onChange
}: {
  table: OrbTemplateWorkingDocumentTable
  readOnly: boolean
  onChange: (next: OrbTemplateWorkingDocumentTable) => void
}) {
  const updateCell = (rowIdx: number, col: string, value: string) => {
    const rows = table.rows.map((row, idx) =>
      idx === rowIdx ? { ...row, [col]: value } : row
    )
    onChange({ ...table, rows })
  }

  const addRow = () => {
    const emptyRow = Object.fromEntries(table.columns.map((c) => [c, '']))
    onChange({ ...table, rows: [...table.rows, emptyRow] })
  }

  const removeRow = (rowIdx: number) => {
    onChange({ ...table, rows: table.rows.filter((_, idx) => idx !== rowIdx) })
  }

  const clearTable = () => {
    onChange({ ...table, rows: [] })
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--orb-line)]/50" data-orb-write-table={table.table_id}>
      <div className="flex items-center justify-between border-b border-[var(--orb-line)]/40 px-3 py-1.5">
        <p className="text-[10px] font-semibold">{table.title}</p>
        {!readOnly && table.editable !== false ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold text-[var(--orb-primary)]"
              data-orb-write-table-add-row={table.table_id}
            >
              <Plus className="h-3 w-3" aria-hidden />
              Add row
            </button>
            <button
              type="button"
              onClick={clearTable}
              className="rounded px-1.5 py-0.5 text-[10px] text-[var(--orb-muted)]"
              data-orb-write-table-clear={table.table_id}
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>
      {table.guidance ? (
        <p className="border-b border-[var(--orb-line)]/20 px-3 py-1 text-[10px] text-[var(--orb-muted)]" data-orb-write-table-guidance>
          {table.guidance}
        </p>
      ) : null}
      <table className="w-full text-[10px]">
        <thead>
          <tr>
            {table.columns.map((col) => (
              <th key={col} className="border-b border-[var(--orb-line)]/30 px-2 py-1 text-left font-semibold">
                {col}
              </th>
            ))}
            {!readOnly && table.editable !== false ? <th className="w-8" /> : null}
          </tr>
        </thead>
        <tbody>
          {table.rows.length ? (
            table.rows.map((row, idx) => (
              <tr key={idx} data-orb-write-table-row={idx}>
                {table.columns.map((col) => (
                  <td key={col} className="border-b border-[var(--orb-line)]/20 px-2 py-1">
                    {readOnly || table.editable === false ? (
                      String(row[col] ?? '')
                    ) : (
                      <input
                        type="text"
                        value={String(row[col] ?? '')}
                        onChange={(e) => updateCell(idx, col, e.target.value)}
                        className="w-full min-w-[4rem] bg-transparent text-[10px] focus:outline-none"
                        data-orb-write-table-cell={`${table.table_id}-${idx}-${col}`}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && table.editable !== false ? (
                  <td className="border-b border-[var(--orb-line)]/20 px-1 py-1">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="rounded p-0.5 text-[var(--orb-muted)] hover:text-red-500"
                      aria-label="Remove row"
                      data-orb-write-table-remove-row={idx}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={(table.columns.length || 1) + (readOnly ? 0 : 1)}
                className="px-2 py-2 text-[var(--orb-muted)]"
                data-orb-write-table-empty
              >
                {table.empty_state_guidance ?? 'Add rows as evidence is gathered. Do not invent data.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function SectionEditor({
  section,
  readOnly,
  onChange,
  onAssist,
  assistLoading
}: {
  section: OrbTemplateWorkingDocumentSection
  readOnly: boolean
  onChange: (body: string) => void
  onAssist: (actionId: OrbWriteSectionAssistActionId) => void
  assistLoading: boolean
}) {
  const [assistOpen, setAssistOpen] = useState(false)

  return (
    <section
      className="rounded-xl border border-[var(--orb-line)]/50 p-3"
      data-orb-write-section={section.section_id}
      id={`orb-write-section-${section.section_id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-[var(--orb-foreground)]">{section.heading}</h3>
          {section.guidance ? (
            <p className="mt-0.5 text-[10px] text-[var(--orb-muted)]" data-orb-write-section-guidance>
              {section.guidance}
            </p>
          ) : null}
          {section.prompt && !section.body ? (
            <p className="mt-1 text-[10px] italic text-[var(--orb-muted)]" data-orb-write-section-prompt>
              {section.prompt}
            </p>
          ) : null}
        </div>
        {!readOnly && section.orb_assist_enabled ? (
          <div className="relative shrink-0">
            <button
              type="button"
              disabled={assistLoading}
              onClick={() => setAssistOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold disabled:opacity-50"
              data-orb-write-section-orb-help={section.section_id}
              aria-expanded={assistOpen}
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              Ask ORB
              <ChevronDown className={`h-3 w-3 transition ${assistOpen ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {assistOpen ? (
              <ul
                className="absolute right-0 z-10 mt-1 min-w-[11rem] rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface)] py-1 shadow-lg"
                data-orb-write-section-assist-menu
              >
                {ORB_WRITE_SECTION_ASSIST_ACTIONS.map((action) => (
                  <li key={action.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-[10px] hover:bg-[var(--orb-surface-hover)]"
                      data-orb-write-section-assist={action.id}
                      onClick={() => {
                        setAssistOpen(false)
                        onAssist(action.id)
                      }}
                    >
                      {action.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      <textarea
        value={section.body}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        rows={4}
        placeholder=""
        className="mt-2 w-full resize-y rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400/40 disabled:opacity-70"
        data-orb-write-section-body={section.section_id}
      />
    </section>
  )
}

export function OrbWriteWorkingDocumentEditor({
  document: initialDocument,
  onDocumentChange,
  onSaved,
  onStatusMessage
}: {
  document: OrbTemplateWorkingDocument
  onDocumentChange?: (doc: OrbTemplateWorkingDocument) => void
  onSaved?: (workspaceItemId: string) => void
  onStatusMessage?: (message: string) => void
}) {
  const { isMobile } = useOrbResponsiveMode()
  const [document, setDocument] = useState(initialDocument)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'unsaved' | 'saved' | 'saving'>('unsaved')
  const [status, setStatus] = useState<string | null>(null)
  const [homeNotice, setHomeNotice] = useState<string | null>(null)
  const [leftPanelOpen, setLeftPanelOpen] = useState(!isMobile)
  const [templateSearchOpen, setTemplateSearchOpen] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [templateResults, setTemplateResults] = useState<Array<Record<string, unknown>>>([])
  const [templateLoading, setTemplateLoading] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [finaliseConfirmOpen, setFinaliseConfirmOpen] = useState(false)
  const [assistLoadingSection, setAssistLoadingSection] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)

  const readOnly = document.status === 'archived' || document.status === 'finalised'
  const isHighRisk =
    document.safeguarding_level === 'high' ||
    Boolean(document.metadata?.manager_review_advisory)

  useEffect(() => {
    setDocument(initialDocument)
  }, [initialDocument.document_id])

  useEffect(() => {
    if (isMobile) setLeftPanelOpen(false)
  }, [isMobile])

  const updateDocument = useCallback(
    (next: OrbTemplateWorkingDocument) => {
      const withBody = { ...next, rendered_body: workingDocumentToWriteBody(next), updated_at: new Date().toISOString() }
      setDocument(withBody)
      setSaveStatus('unsaved')
      onDocumentChange?.(withBody)
    },
    [onDocumentChange]
  )

  const updateSection = useCallback(
    (sectionId: string, body: string) => {
      const sections = document.sections.map((s) =>
        s.section_id === sectionId ? { ...s, body } : s
      )
      updateDocument({ ...document, sections })
    },
    [document, updateDocument]
  )

  const updateTable = useCallback(
    (tableId: string, nextTable: OrbTemplateWorkingDocumentTable) => {
      const tables = document.tables.map((t) => (t.table_id === tableId ? nextTable : t))
      updateDocument({ ...document, tables })
    },
    [document, updateDocument]
  )

  const handleSectionAssist = useCallback(
    async (section: OrbTemplateWorkingDocumentSection, actionId: OrbWriteSectionAssistActionId) => {
      setAssistLoadingSection(section.section_id)
      try {
        const instruction = sectionAssistInstruction(actionId)
        const result = await requestSectionOrbHelp({
          document_id: document.document_id,
          section_id: section.section_id,
          instruction,
          current_body: section.body
        })
        updateSection(section.section_id, result.suggested_body)
        const msg = 'ORB suggestion added — review and edit before saving.'
        setStatus(msg)
        onStatusMessage?.(msg)
      } catch {
        const msg = 'ORB assist unavailable — continue typing manually.'
        setStatus(msg)
        onStatusMessage?.(msg)
      } finally {
        setAssistLoadingSection(null)
      }
    },
    [document.document_id, onStatusMessage, updateSection]
  )

  const handleUseHomeDocuments = useCallback(async () => {
    try {
      const result = await listTemplateHomeDocuments(document.template_id)
      if (result.notice) setHomeNotice(result.notice)
      const chips = result.documents.map((d) => ({
        chip_id: `home_doc_${d.document_id}`,
        label: d.citation_label,
        chip_type: 'home_document' as const,
        reference_id: d.document_id,
        metadata_only: true
      }))
      updateDocument({
        ...document,
        home_document_chips: chips,
        linked_home_document_ids: result.documents.map((d) => d.document_id)
      })
      const msg = result.documents.length
        ? 'Home document chips linked — metadata only, not pasted into body.'
        : 'No relevant home document is currently linked.'
      setStatus(msg)
      onStatusMessage?.(msg)
    } catch {
      setHomeNotice('No relevant home document is currently linked.')
    }
  }, [document, onStatusMessage, updateDocument])

  const handleSaveDraft = useCallback(async () => {
    setSaving(true)
    setSaveStatus('saving')
    setStatus(null)
    try {
      const draftDoc = { ...document, status: 'draft' as const }
      const result = await saveOrUpdateWorkingDocumentToRecords(draftDoc)
      const next = {
        ...draftDoc,
        metadata: { ...draftDoc.metadata, workspace_item_id: result.workspace_item_id }
      }
      setDocument(next)
      onDocumentChange?.(next)
      setSaveStatus('saved')
      const msg = 'Saved to My Drafts'
      setStatus(msg)
      onStatusMessage?.(msg)
      onSaved?.(result.workspace_item_id)
    } catch {
      setSaveStatus('unsaved')
      const msg = 'Could not save — try again when connected.'
      setStatus(msg)
      onStatusMessage?.(msg)
    } finally {
      setSaving(false)
    }
  }, [document, onDocumentChange, onSaved, onStatusMessage])

  const handleCopyDocument = useCallback(async () => {
    const text = copyWorkingDocumentText(document)
    const ok = await copyTextToClipboard(text)
    const msg = ok ? 'Copied to clipboard.' : 'Copy failed.'
    setStatus(msg)
    onStatusMessage?.(msg)
  }, [document, onStatusMessage])

  const handlePrint = useCallback(() => {
    const html = renderWorkingDocumentPrintHtml(document)
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
  }, [document])

  const handleFinalise = useCallback(() => {
    updateDocument({ ...document, status: 'finalised' })
    setFinaliseConfirmOpen(false)
    const msg = 'Marked as finalised — editing is now limited. Save to keep your record.'
    setStatus(msg)
    onStatusMessage?.(msg)
  }, [document, onStatusMessage, updateDocument])

  const scrollToSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId)
    const el = globalThis.document.getElementById(`orb-write-section-${sectionId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    if (!templateSearchOpen) return
    const timer = window.setTimeout(async () => {
      setTemplateLoading(true)
      try {
        const result = await searchWorkingDocumentTemplates(templateSearch, { station: 'write' })
        setTemplateResults((result.templates ?? []) as Array<Record<string, unknown>>)
      } catch {
        setTemplateResults([])
      } finally {
        setTemplateLoading(false)
      }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [templateSearch, templateSearchOpen])

  const allChips = useMemo(
    () => [...document.source_chips, ...document.home_document_chips],
    [document.source_chips, document.home_document_chips]
  )

  const sortedSections = useMemo(
    () => [...document.sections].sort((a, b) => a.sort_order - b.sort_order),
    [document.sections]
  )

  const leftPanel = (
    <aside
      className={`flex min-h-0 flex-col gap-3 overflow-hidden border-[var(--orb-line)]/40 ${
        isMobile ? 'w-full' : 'w-52 shrink-0 border-r pr-2'
      }`}
      data-orb-write-left-panel
      data-orb-write-left-panel-open={leftPanelOpen ? 'true' : 'false'}
    >
      <div>
        <button
          type="button"
          onClick={() => setTemplateSearchOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-lg border border-[var(--orb-line)] px-2 py-1.5 text-[10px] font-semibold"
          data-orb-write-template-search-toggle
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          Search templates
        </button>
        {templateSearchOpen ? (
          <div className="mt-2 space-y-2" data-orb-write-template-search-panel>
            <input
              type="search"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-[var(--orb-line)] px-2 py-1 text-[10px]"
              data-orb-write-template-search-input
            />
            {templateLoading ? (
              <p className="flex items-center gap-1 text-[10px] text-[var(--orb-muted)]">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                Searching…
              </p>
            ) : null}
            <ul className="max-h-32 space-y-1 overflow-y-auto">
              {templateResults.slice(0, 5).map((row) => (
                <li key={String(row.template_id)} className="text-[10px] text-[var(--orb-muted)]">
                  {String(row.title ?? row.template_id)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <nav data-orb-write-section-outline>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Sections</p>
        <ul className="mt-1 space-y-0.5">
          {sortedSections.map((section) => (
            <li key={section.section_id}>
              <button
                type="button"
                onClick={() => {
                  scrollToSection(section.section_id)
                  if (isMobile) setLeftPanelOpen(false)
                }}
                className={`w-full rounded px-2 py-1 text-left text-[10px] ${
                  activeSectionId === section.section_id
                    ? 'bg-[var(--orb-primary-soft)] font-semibold text-[var(--orb-primary)]'
                    : 'text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]'
                }`}
                data-orb-write-outline-section={section.section_id}
              >
                {section.heading}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {document.home_document_context_allowed ? (
        <div data-orb-write-home-docs-panel>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">Home documents</p>
          <HomeDocumentChips chips={document.home_document_chips} notice={homeNotice} />
          {!readOnly ? (
            <button
              type="button"
              onClick={() => void handleUseHomeDocuments()}
              className="mt-1 text-[10px] font-semibold text-[var(--orb-primary)]"
              data-orb-write-use-home-documents
            >
              Link home documents
            </button>
          ) : null}
        </div>
      ) : null}
    </aside>
  )

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-0"
      data-orb-write-working-document
      data-orb-write-working-document-studio
      data-orb-write-mobile={isMobile ? 'true' : 'false'}
      data-orb-write-read-only={readOnly ? 'true' : 'false'}
    >
      <header
        className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--orb-line)]/40 pb-2"
        data-orb-write-studio-top-bar
      >
        {isMobile ? (
          <button
            type="button"
            onClick={() => setLeftPanelOpen(true)}
            className="rounded-lg border p-1.5"
            aria-label="Open section outline"
            data-orb-write-mobile-outline-toggle
          >
            <PanelLeft className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setLeftPanelOpen((v) => !v)}
            className="rounded-lg border p-1.5"
            aria-label={leftPanelOpen ? 'Hide panel' : 'Show panel'}
            data-orb-write-left-panel-toggle
          >
            <PanelLeft className="h-4 w-4" aria-hidden />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={document.title}
            readOnly={readOnly}
            onChange={(e) => updateDocument({ ...document, title: e.target.value })}
            className="w-full bg-transparent text-sm font-semibold focus:outline-none"
            data-orb-write-document-title
          />
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full border border-[var(--orb-line)] px-2 py-0.5 text-[10px] font-medium"
              data-orb-write-status-badge
            >
              {STATUS_LABELS[document.status]}
            </span>
            <span
              className="rounded-full bg-[var(--orb-surface-hover)] px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
              data-orb-write-source-station-chip
            >
              {SOURCE_STATION_LABELS[document.source_station] ?? document.source_station}
            </span>
            <span className="text-[10px] text-[var(--orb-muted)]" data-orb-write-save-status>
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Unsaved changes'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {!readOnly ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveDraft()}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--orb-primary)] px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
              data-orb-write-save-draft
            >
              <Save className="h-3 w-3" aria-hidden />
              {saving ? 'Saving…' : 'Save draft'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleCopyDocument()}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold"
            data-orb-write-copy-document
          >
            <Copy className="h-3 w-3" aria-hidden />
            Copy
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className="rounded-lg border p-1.5"
              aria-label="More actions"
              data-orb-write-more-menu
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
            {moreOpen ? (
              <ul className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border bg-[var(--orb-surface)] py-1 shadow-lg">
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px]"
                    onClick={() => {
                      setMoreOpen(false)
                      handlePrint()
                    }}
                    data-orb-write-print
                  >
                    <Printer className="h-3 w-3" aria-hidden />
                    Print
                  </button>
                </li>
                {!readOnly && document.status === 'draft' ? (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px]"
                      onClick={() => {
                        setMoreOpen(false)
                        setFinaliseConfirmOpen(true)
                      }}
                      data-orb-write-finalise
                    >
                      <Check className="h-3 w-3" aria-hidden />
                      Finalise
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </div>
      </header>

      {finaliseConfirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          data-orb-write-finalise-confirm
        >
          <div className="max-w-sm rounded-xl border bg-[var(--orb-surface)] p-4 shadow-xl">
            <p className="text-sm font-semibold">Finalise this document?</p>
            <p className="mt-2 text-xs text-[var(--orb-muted)]">
              Finalised documents are harder to edit. Confirm you have reviewed the content and it is ready for your
              records workflow.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => setFinaliseConfirmOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-[var(--orb-primary)] px-3 py-1.5 text-xs font-semibold text-white"
                onClick={handleFinalise}
                data-orb-write-finalise-confirm
              >
                Finalise
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isMobile && leftPanelOpen ? (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end bg-black/40"
          data-orb-write-mobile-outline-sheet
          onClick={() => setLeftPanelOpen(false)}
        >
          <div
            className="max-h-[70dvh] rounded-t-2xl border-t bg-[var(--orb-surface)] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold">Outline</p>
              <button type="button" onClick={() => setLeftPanelOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            {leftPanel}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-2 pt-2">
        {!isMobile && leftPanelOpen ? leftPanel : null}

        <main ref={mainRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto" data-orb-write-main-area>
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2" data-orb-write-review-reminder>
            <p className="text-[10px] text-[var(--orb-foreground)]">{document.review_before_use_reminder}</p>
          </div>

          {isHighRisk ? (
            <p
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[10px] text-red-900 dark:text-red-100"
              data-orb-write-high-risk-reminder
            >
              {String(
                document.metadata?.manager_review_advisory ??
                  'This template may need manager, on-call or safeguarding review before use.'
              )}
            </p>
          ) : null}

          <SourceChips chips={allChips} />

          {document.child_voice_prompts.length ? (
            <div className="rounded-lg border border-sky-400/20 bg-sky-500/5 px-3 py-2" data-orb-write-child-voice-prompt>
              <p className="text-[10px] font-semibold text-[var(--orb-foreground)]">Child voice</p>
              <p className="text-[10px] text-[var(--orb-muted)]">{document.child_voice_prompts[0]}</p>
            </div>
          ) : null}

          {sortedSections.map((section) => (
            <SectionEditor
              key={section.section_id}
              section={section}
              readOnly={readOnly}
              onChange={(body) => updateSection(section.section_id, body)}
              onAssist={(actionId) => void handleSectionAssist(section, actionId)}
              assistLoading={assistLoadingSection === section.section_id}
            />
          ))}

          {document.tables.map((table) => (
            <EditableWorkingDocumentTable
              key={table.table_id}
              table={table}
              readOnly={readOnly}
              onChange={(next) => updateTable(table.table_id, next)}
            />
          ))}

          {document.charts.map((chart) => (
            <div
              key={chart.chart_id}
              className="rounded-lg border border-dashed border-[var(--orb-line)] px-3 py-2"
              data-orb-write-chart={chart.chart_id}
              data-orb-write-chart-has-data={chart.has_data ? 'true' : 'false'}
            >
              <p className="text-[10px] font-semibold">{chart.title}</p>
              <p className="text-[10px] text-[var(--orb-muted)]">
                {chart.has_data
                  ? `Chart will appear when rendered (${chart.chart_type}).`
                  : chart.empty_state_guidance ||
                    'Chart will appear when enough data is added to the linked table.'}
              </p>
            </div>
          ))}

          <p className="text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-write-compliance-disclaimer>
            {document.compliance_disclaimer}
          </p>
        </main>
      </div>

      {status ? (
        <p className="shrink-0 text-[10px] text-[var(--orb-primary)]" role="status" data-orb-write-status>
          {status}
        </p>
      ) : null}
    </div>
  )
}

export { copyWorkingDocumentSectionText }
