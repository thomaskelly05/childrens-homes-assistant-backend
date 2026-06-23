'use client'

import { useCallback, useState } from 'react'
import { HelpCircle, Home, Plus, Save, Sparkles } from 'lucide-react'

import {
  listTemplateHomeDocuments,
  requestSectionOrbHelp,
  saveWorkingDocumentToRecords
} from '@/lib/orb/template/orb-template-working-document-client'
import type {
  OrbTemplateSourceChip,
  OrbTemplateWorkingDocument,
  OrbTemplateWorkingDocumentSection
} from '@/lib/orb/template/orb-template-working-document-types'

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

function WorkingDocumentTable({
  table
}: {
  table: OrbTemplateWorkingDocument['tables'][number]
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--orb-line)]/50" data-orb-write-table={table.table_id}>
      <p className="border-b border-[var(--orb-line)]/40 px-3 py-1.5 text-[10px] font-semibold">{table.title}</p>
      <table className="w-full text-[10px]">
        <thead>
          <tr>
            {table.columns.map((col) => (
              <th key={col} className="border-b border-[var(--orb-line)]/30 px-2 py-1 text-left font-semibold">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.length ? (
            table.rows.map((row, idx) => (
              <tr key={idx}>
                {table.columns.map((col) => (
                  <td key={col} className="border-b border-[var(--orb-line)]/20 px-2 py-1">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={table.columns.length || 1} className="px-2 py-2 text-[var(--orb-muted)]">
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
  onChange,
  onOrbHelp
}: {
  section: OrbTemplateWorkingDocumentSection
  onChange: (body: string) => void
  onOrbHelp: () => void
}) {
  return (
    <section className="rounded-xl border border-[var(--orb-line)]/50 p-3" data-orb-write-section={section.section_id}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-[var(--orb-foreground)]">{section.heading}</h3>
          {section.guidance ? (
            <p className="mt-0.5 text-[10px] text-[var(--orb-muted)]">{section.guidance}</p>
          ) : null}
        </div>
        {section.orb_assist_enabled ? (
          <button
            type="button"
            onClick={onOrbHelp}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold"
            data-orb-write-section-orb-help={section.section_id}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            Ask ORB
          </button>
        ) : null}
      </div>
      <textarea
        value={section.body}
        onChange={(e) => onChange(e.target.value)}
        placeholder={section.prompt ?? 'Type here…'}
        rows={4}
        className="mt-2 w-full resize-y rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400/40"
        data-orb-write-section-body={section.section_id}
      />
    </section>
  )
}

export function OrbWriteWorkingDocumentEditor({
  document: initialDocument,
  onDocumentChange,
  onSaved
}: {
  document: OrbTemplateWorkingDocument
  onDocumentChange?: (doc: OrbTemplateWorkingDocument) => void
  onSaved?: (workspaceItemId: string) => void
}) {
  const [document, setDocument] = useState(initialDocument)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [homeNotice, setHomeNotice] = useState<string | null>(null)

  const updateDocument = useCallback(
    (next: OrbTemplateWorkingDocument) => {
      setDocument(next)
      onDocumentChange?.(next)
    },
    [onDocumentChange]
  )

  const updateSection = useCallback(
    (sectionId: string, body: string) => {
      const sections = document.sections.map((s) =>
        s.section_id === sectionId ? { ...s, body } : s
      )
      updateDocument({ ...document, sections, updated_at: new Date().toISOString() })
    },
    [document, updateDocument]
  )

  const handleOrbHelp = useCallback(
    async (section: OrbTemplateWorkingDocumentSection) => {
      try {
        const result = await requestSectionOrbHelp({
          document_id: document.document_id,
          section_id: section.section_id,
          instruction: `Help complete the section: ${section.heading}`,
          current_body: section.body
        })
        updateSection(section.section_id, result.suggested_body)
        setStatus('ORB suggestion added — review and edit before saving.')
      } catch {
        setStatus('ORB assist unavailable — continue typing manually.')
      }
    },
    [document.document_id, updateSection]
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
      setStatus(
        result.documents.length
          ? 'Home document chips linked — open or cite to view source text.'
          : 'No relevant home document is currently linked.'
      )
    } catch {
      setHomeNotice('No relevant home document is currently linked.')
    }
  }, [document, updateDocument])

  const handleSaveDraft = useCallback(async () => {
    setSaving(true)
    setStatus(null)
    try {
      const result = await saveWorkingDocumentToRecords(document)
      setStatus('Saved to My Drafts — adult review required before finalising.')
      onSaved?.(result.workspace_item_id)
    } catch {
      setStatus('Could not save — try again when connected.')
    } finally {
      setSaving(false)
    }
  }, [document, onSaved])

  const allChips = [...document.source_chips, ...document.home_document_chips]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-orb-write-working-document>
      <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2" data-orb-write-review-reminder>
        <p className="text-[10px] text-[var(--orb-foreground)]">{document.review_before_use_reminder}</p>
      </div>

      <SourceChips chips={allChips} />

      {homeNotice ? (
        <p className="text-[10px] text-[var(--orb-muted)]" data-orb-write-home-doc-notice>
          {homeNotice}
        </p>
      ) : null}

      {document.child_voice_prompts.length ? (
        <div className="rounded-lg border border-sky-400/20 bg-sky-500/5 px-3 py-2" data-orb-write-child-voice-prompt>
          <p className="text-[10px] font-semibold text-[var(--orb-foreground)]">Child voice</p>
          <p className="text-[10px] text-[var(--orb-muted)]">{document.child_voice_prompts[0]}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {document.home_document_context_allowed ? (
          <button
            type="button"
            onClick={() => void handleUseHomeDocuments()}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-semibold"
            data-orb-write-use-home-documents
          >
            <Home className="h-3 w-3" aria-hidden />
            Use home documents
          </button>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSaveDraft()}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--orb-primary)] px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
          data-orb-write-save-draft
        >
          <Save className="h-3 w-3" aria-hidden />
          {saving ? 'Saving…' : 'Save draft'}
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {document.sections.map((section) => (
          <SectionEditor
            key={section.section_id}
            section={section}
            onChange={(body) => updateSection(section.section_id, body)}
            onOrbHelp={() => void handleOrbHelp(section)}
          />
        ))}

        {document.tables.map((table) => (
          <WorkingDocumentTable key={table.table_id} table={table} />
        ))}

        {document.charts.map((chart) => (
          <div
            key={chart.chart_id}
            className="rounded-lg border border-dashed border-[var(--orb-line)] px-3 py-2"
            data-orb-write-chart={chart.chart_id}
          >
            <p className="text-[10px] font-semibold">{chart.title}</p>
            <p className="text-[10px] text-[var(--orb-muted)]">
              {chart.has_data ? `[Chart: ${chart.chart_type}]` : chart.empty_state_guidance}
            </p>
          </div>
        ))}
      </div>

      {status ? (
        <p className="text-[10px] text-[var(--orb-muted)]" data-orb-write-status>
          {status}
        </p>
      ) : null}

      <p className="flex items-start gap-1 text-[10px] text-[var(--orb-muted)]">
        <HelpCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        {document.compliance_disclaimer}
      </p>
    </div>
  )
}
