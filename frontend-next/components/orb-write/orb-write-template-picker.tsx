'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, FileText, Search, X } from 'lucide-react'

import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import {
  ORB_WRITE_TEMPLATE_PICKER_GROUPS,
  orbWriteTemplatePickerRecordTypes,
  resolveOrbRecordingRecordType,
  structureOrbWriteDocumentBody
} from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'
import { allTherapeuticPrompts } from '@/lib/orb/recording/orb-therapeutic-writing'
import {
  ORB_SPELLING_GRAMMAR_REMINDER,
  templateWritingStylesForSurface
} from '@/lib/orb/recording/orb-template-writing-styles'

export type OrbWriteTemplateApplyMode =
  | 'full'
  | 'headings_only'
  | 'style_guidance'
  | 'replace'
  | 'merge'

function TemplateDetail({
  selected,
  styleChips,
  prompts
}: {
  selected: OrbRecordingRecordType
  styleChips: ReturnType<typeof templateWritingStylesForSurface>
  prompts: string[]
}) {
  return (
    <>
      <div>
        <p className="text-xs font-semibold text-[var(--orb-foreground)]">{selected.label}</p>
        <p className="mt-1 text-[10px] text-[var(--orb-muted)]">
          {selected.writing_framework?.writing_guidance ?? selected.professional_language_guidance}
        </p>
      </div>
      <div data-orb-write-template-style-chips>
        <p className="text-[10px] font-semibold uppercase text-[var(--orb-muted)]">Writing style</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {styleChips.map((chip) => (
            <span
              key={chip.id}
              className="rounded-full border border-[var(--orb-line)]/60 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
              data-orb-template-writing-style={chip.id}
            >
              {chip.chipLabel}
            </span>
          ))}
        </div>
      </div>
      <ul className="space-y-1 text-[10px] text-[var(--orb-muted)]" data-orb-write-template-prompts>
        {prompts.slice(0, 6).map((p) => (
          <li key={p}>• {p}</li>
        ))}
      </ul>
      <p className="text-[10px] text-[var(--orb-muted)]" data-orb-write-spelling-reminder>
        {selected.writing_framework?.spelling_grammar_reminder ?? ORB_SPELLING_GRAMMAR_REMINDER}
      </p>
    </>
  )
}

export function OrbWriteTemplatePicker({
  open,
  currentRecordTypeId,
  hasExistingContent,
  onClose,
  onApply
}: {
  open: boolean
  currentRecordTypeId: string
  hasExistingContent: boolean
  onClose: () => void
  onApply: (opts: {
    recordType: OrbRecordingRecordType
    mode: OrbWriteTemplateApplyMode
    structuredBody?: string
  }) => void
}) {
  const { isMobile } = useOrbResponsiveMode()
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('recording')
  const [selected, setSelected] = useState<OrbRecordingRecordType | null>(null)
  const [pendingMode, setPendingMode] = useState<OrbWriteTemplateApplyMode | null>(null)

  const filtered = useMemo(() => {
    const rows = orbWriteTemplatePickerRecordTypes(search)
    const groupMeta = ORB_WRITE_TEMPLATE_PICKER_GROUPS.find((g) => g.id === group)
    if (!groupMeta) return rows
    return rows.filter((r) => groupMeta.categories.includes(r.category))
  }, [group, search])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.setAttribute('data-orb-write-template-picker-open', 'true')
    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.removeAttribute('data-orb-write-template-picker-open')
    }
  }, [open])

  if (!open) return null

  function requestApply(mode: OrbWriteTemplateApplyMode) {
    if (!selected) return
    if (hasExistingContent && (mode === 'replace' || mode === 'full')) {
      setPendingMode(mode)
      return
    }
    confirmApply(mode)
  }

  function confirmApply(mode: OrbWriteTemplateApplyMode) {
    if (!selected) return
    const structuredBody =
      mode === 'headings_only' || mode === 'full' || mode === 'replace'
        ? structureOrbWriteDocumentBody({ recordType: selected, body: '' })
        : undefined
    onApply({ recordType: selected, mode, structuredBody })
    setPendingMode(null)
    onClose()
  }

  const styleChips = templateWritingStylesForSurface('templates')
  const prompts = selected ? allTherapeuticPrompts(selected.id) : []

  return (
    <div
      className={`fixed inset-0 z-[80] flex bg-black/40 ${
        isMobile ? 'items-end justify-stretch p-0' : 'items-center justify-center p-4'
      }`}
      role="dialog"
      aria-modal
      aria-label="Choose template"
      data-orb-write-template-picker
      data-orb-write-template-picker-mobile={isMobile ? 'true' : undefined}
    >
      <div
        className={`flex w-full flex-col overflow-hidden border border-[var(--orb-line)] bg-[var(--orb-surface)] shadow-xl ${
          isMobile
            ? 'max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top,0px)-0.25rem))] rounded-t-2xl rounded-b-none border-b-0'
            : 'max-h-[90vh] max-w-2xl rounded-2xl'
        }`}
        data-orb-write-template-picker-sheet
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--orb-line)]/50 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
            <h2 className="text-sm font-semibold text-[var(--orb-foreground)]">Choose record type</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[2.75rem] min-w-[2.75rem] rounded-lg p-1 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-[var(--orb-line)]/40 px-4 py-2" data-orb-write-template-picker-toolbar>
          <label className="flex items-center gap-2 rounded-lg border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-[var(--orb-muted)]" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="min-w-0 flex-1 bg-transparent text-xs focus:outline-none"
              data-orb-write-template-search
            />
          </label>
          <div
            className={`mt-2 flex gap-1 ${isMobile ? 'overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]' : 'flex-wrap'}`}
            data-orb-write-template-groups
          >
            {ORB_WRITE_TEMPLATE_PICKER_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                  group === g.id
                    ? 'border-sky-400/40 bg-sky-500/10 text-[var(--orb-foreground)]'
                    : 'border-[var(--orb-line)] text-[var(--orb-muted)]'
                }`}
                data-orb-write-template-group={g.id}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden ${isMobile ? '' : 'gap-3 p-4 sm:grid sm:grid-cols-2'}`}
          data-orb-write-template-picker-body
        >
          <ul
            className={`min-h-0 space-y-2 overflow-y-auto overscroll-contain ${
              isMobile ? 'flex-1 px-4 py-3' : ''
            }`}
            data-orb-write-template-list
          >
            {filtered.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelected(resolveOrbRecordingRecordType({ recordTypeId: row.id }))}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                    selected?.id === row.id
                      ? 'border-sky-400/50 bg-sky-500/10'
                      : 'border-[var(--orb-line)] hover:bg-[var(--orb-surface-hover)]'
                  }`}
                  data-orb-write-template-option={row.id}
                >
                  <p className="text-xs font-semibold text-[var(--orb-foreground)]">{row.label}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--orb-muted)]">{row.purpose}</p>
                </button>
              </li>
            ))}
          </ul>

          <div
            className={`min-h-0 overflow-y-auto overscroll-contain space-y-3 ${
              isMobile
                ? 'max-h-[38%] shrink-0 border-t border-[var(--orb-line)]/40 px-4 py-3'
                : ''
            }`}
            data-orb-write-template-detail
          >
            {selected ? (
              <TemplateDetail selected={selected} styleChips={styleChips} prompts={prompts} />
            ) : (
              <p className="text-xs text-[var(--orb-muted)]">Select a template to preview checks and writing guidance.</p>
            )}
          </div>
        </div>

        {pendingMode ? (
          <div
            className="shrink-0 border-t border-amber-400/30 bg-amber-500/10 px-4 py-3"
            data-orb-write-template-replace-confirm
          >
            <p className="text-xs text-[var(--orb-foreground)]">
              This document already has content. Replace everything, or merge headings with your draft?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => confirmApply('replace')}
                className="min-h-[2.75rem] rounded-lg bg-amber-600 px-3 py-1.5 text-[10px] font-semibold text-white"
                data-orb-write-template-confirm-replace
              >
                Replace document
              </button>
              <button
                type="button"
                onClick={() => confirmApply('merge')}
                className="min-h-[2.75rem] rounded-lg border px-3 py-1.5 text-[10px] font-semibold"
                data-orb-write-template-confirm-merge
              >
                Merge with current draft
              </button>
              <button
                type="button"
                onClick={() => setPendingMode(null)}
                className="min-h-[2.75rem] rounded-lg px-3 py-1.5 text-[10px] text-[var(--orb-muted)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <footer
          className="sticky bottom-0 z-10 flex shrink-0 flex-wrap gap-2 border-t border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
          data-orb-write-template-picker-footer
        >
          <button
            type="button"
            disabled={!selected}
            onClick={() => requestApply('full')}
            className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-lg bg-[var(--orb-primary)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            data-orb-write-template-use
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Use this template
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => requestApply('headings_only')}
            className="min-h-[2.75rem] rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            data-orb-write-template-headings-only
          >
            Apply headings only
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => requestApply('style_guidance')}
            className="min-h-[2.75rem] rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            data-orb-write-template-style-only
          >
            Apply style guidance
          </button>
        </footer>
      </div>
    </div>
  )
}
