'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, List, X } from 'lucide-react'

import type { OrbWriteMobileSection } from '@/lib/orb/write/orb-write-mobile-sections'

export function OrbWriteMobileDocumentSummaryBar({
  documentTitle,
  recordTypeLabel,
  wordCount,
  status,
  onUseTemplate
}: {
  documentTitle: string
  recordTypeLabel: string
  wordCount: number
  status: 'draft' | 'review' | 'finalised'
  onUseTemplate?: () => void
}) {
  const statusLabel = status === 'finalised' ? 'Finalised' : status === 'review' ? 'Review' : 'Draft'
  const statusClass =
    status === 'finalised'
      ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-800'
      : status === 'review'
        ? 'border-amber-300/40 bg-amber-500/10 text-amber-900'
        : 'border-slate-300/50 bg-slate-100 text-slate-700'

  return (
    <div
      className="flex shrink-0 flex-col gap-1.5 border-b border-[var(--orb-line)]/30 px-3 py-2"
      data-orb-write-mobile-summary-bar
    >
      <div className="flex min-w-0 items-center gap-2">
        <p
          className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--orb-foreground)]"
          data-orb-write-mobile-document-title
        >
          {documentTitle || recordTypeLabel}
        </p>
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}
          data-orb-write-mobile-status-badge
        >
          {statusLabel}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--orb-muted)]">
        <span className="truncate" data-orb-write-mobile-record-type-label>
          {recordTypeLabel}
        </span>
        <span aria-hidden>·</span>
        <span data-orb-write-word-count-display>{wordCount} words</span>
        {onUseTemplate ? (
          <>
            <span className="ml-auto" aria-hidden />
            <button
              type="button"
              onClick={onUseTemplate}
              className="shrink-0 text-[11px] font-medium text-[var(--orb-primary)] underline-offset-2 hover:underline"
              data-orb-write-use-template
              data-orb-write-use-template-secondary
            >
              Use a template
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function OrbWriteMobileCompactHeader({
  recordTypeLabel
}: {
  recordTypeLabel?: string
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/25 px-3 py-1.5"
      data-orb-write-mobile-compact-header
    >
      <h2 className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-write-studio-title>
        ORB Write
      </h2>
      {recordTypeLabel ? (
        <span
          className="truncate rounded-full border border-[var(--orb-line)]/50 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
          data-orb-write-mobile-header-record-type
        >
          {recordTypeLabel}
        </span>
      ) : null}
    </div>
  )
}

export function OrbWriteMobileActiveSection({
  sectionIndex,
  sectionCount,
  section,
  readOnly,
  onBodyChange,
  askOrbAction
}: {
  sectionIndex: number
  sectionCount: number
  section: OrbWriteMobileSection
  readOnly?: boolean
  onBodyChange: (body: string) => void
  askOrbAction?: React.ReactNode
}) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      data-orb-write-mobile-active-section
      data-orb-write-mobile-section-index={sectionIndex + 1}
      data-orb-write-mobile-section-total={sectionCount}
    >
      <div className="shrink-0 px-3 pt-2">
        <p className="text-[11px] font-medium text-[var(--orb-muted)]" data-orb-write-mobile-section-counter>
          Section {sectionIndex + 1} of {sectionCount}
        </p>
        <h3
          className="mt-0.5 text-base font-semibold text-[var(--orb-foreground)]"
          data-orb-write-mobile-section-title
        >
          {section.title}
        </h3>
        {section.hint ? (
          <p
            className="mt-1 text-[13px] leading-relaxed text-[var(--orb-foreground)]/80"
            data-orb-write-mobile-section-hint
          >
            {section.hint}
          </p>
        ) : null}
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2"
        data-orb-write-mobile-section-scroll
      >
        <textarea
          value={section.body}
          onChange={(e) => onBodyChange(e.target.value)}
          readOnly={readOnly}
          rows={8}
          placeholder="Type here…"
          className="min-h-[10rem] w-full resize-none rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] px-3 py-3 text-[15px] leading-[1.6] text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--orb-primary)]/30 disabled:opacity-70"
          data-orb-write-mobile-section-body
          data-orb-write-section-body={section.id}
          aria-label={`${section.title} content`}
        />
        {askOrbAction ? (
          <div className="mt-2" data-orb-write-mobile-section-ask-orb>
            {askOrbAction}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function OrbWriteMobileSectionNav({
  sectionIndex,
  sectionCount,
  onPrevious,
  onNext,
  onOpenSections
}: {
  sectionIndex: number
  sectionCount: number
  onPrevious: () => void
  onNext: () => void
  onOpenSections: () => void
}) {
  const atStart = sectionIndex <= 0
  const atEnd = sectionIndex >= sectionCount - 1

  return (
    <nav
      className="flex shrink-0 items-center gap-2 border-t border-[var(--orb-line)]/30 px-3 py-2"
      data-orb-write-mobile-section-nav
      aria-label="Section navigation"
    >
      <button
        type="button"
        disabled={atStart}
        onClick={onPrevious}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-3 text-xs font-semibold disabled:opacity-40"
        data-orb-write-mobile-section-prev
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Previous
      </button>
      <button
        type="button"
        onClick={onOpenSections}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-3 text-xs font-semibold"
        data-orb-write-mobile-sections-toggle
        aria-label="Open section list"
      >
        <List className="h-4 w-4" aria-hidden />
        Sections
      </button>
      <button
        type="button"
        disabled={atEnd}
        onClick={onNext}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-3 text-xs font-semibold disabled:opacity-40"
        data-orb-write-mobile-section-next
      >
        Next
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  )
}

export function OrbWriteMobileSectionsSheet({
  open,
  sections,
  activeIndex,
  onSelect,
  onClose
}: {
  open: boolean
  sections: OrbWriteMobileSection[]
  activeIndex: number
  onSelect: (index: number) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[65] flex flex-col justify-end bg-black/40"
      data-orb-write-mobile-sections-sheet
      onClick={onClose}
    >
      <div
        className="max-h-[70dvh] rounded-t-2xl border-t bg-[var(--orb-surface-elevated)] pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Section list"
      >
        <div className="flex items-center justify-between border-b border-[var(--orb-line)]/40 px-4 py-3">
          <p className="text-sm font-semibold">Sections</p>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="max-h-[min(50dvh,20rem)] overflow-y-auto p-2" data-orb-write-section-outline>
          {sections.map((section, index) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(index)
                  onClose()
                }}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                  index === activeIndex
                    ? 'bg-[var(--orb-primary-soft)] font-semibold text-[var(--orb-primary)]'
                    : 'text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]'
                }`}
                data-orb-write-outline-section={section.id}
              >
                <span className="text-[11px] text-[var(--orb-muted)]">Section {index + 1}</span>
                <span className="mt-0.5 block">{section.title}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function OrbWriteMobileReviewSheet({
  open,
  onClose,
  children
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[68] flex flex-col justify-end bg-black/40"
      data-orb-write-mobile-review-sheet
      onClick={onClose}
    >
      <div
        className="max-h-[75dvh] overflow-hidden rounded-t-2xl border-t bg-[var(--orb-surface-elevated)] pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="ORB Review"
      >
        <div className="flex items-center justify-between border-b border-[var(--orb-line)]/40 px-4 py-3">
          <p className="text-sm font-semibold">Review this record</p>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full" aria-label="Close review">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div
          className="max-h-[min(60dvh,24rem)] overflow-y-auto p-3"
          data-orb-write-review-panel
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export function useOrbWriteMobileSectionState(sectionCount: number) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [sectionsSheetOpen, setSectionsSheetOpen] = useState(false)

  const clampedIndex = Math.min(Math.max(0, activeIndex), Math.max(0, sectionCount - 1))

  return {
    activeIndex: clampedIndex,
    setActiveIndex,
    sectionsSheetOpen,
    setSectionsSheetOpen,
    goPrevious: () => setActiveIndex((i) => Math.max(0, i - 1)),
    goNext: () => setActiveIndex((i) => Math.min(sectionCount - 1, i + 1)),
    openSections: () => setSectionsSheetOpen(true),
    closeSections: () => setSectionsSheetOpen(false)
  }
}
