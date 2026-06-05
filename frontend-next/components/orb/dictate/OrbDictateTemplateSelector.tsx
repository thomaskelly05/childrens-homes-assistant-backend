'use client'

import { ChevronDown, FileText, Info, Shield } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { OrbDictateSelectedTemplateDetails } from '@/components/orb/dictate/OrbDictateSelectedTemplateCard'
import {
  ORB_DICTATE_STUDIO_TEMPLATES,
  templateById,
  type OrbDictateStudioTemplate
} from '@/lib/orb/dictate/orb-dictate-studio-templates'
import { resolveOrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-framework'

export function OrbDictateTemplateSelector({
  selectedTemplateId,
  onTemplateChange,
  variant = 'compact'
}: {
  selectedTemplateId: string
  onTemplateChange: (template: OrbDictateStudioTemplate) => void
  variant?: 'compact' | 'chips'
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = templateById(selectedTemplateId)
  const recordType = resolveOrbRecordingRecordType({ studioTemplateId: selectedTemplateId })

  useEffect(() => {
    if (!menuOpen && !detailsOpen) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setMenuOpen(false)
        setDetailsOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen, detailsOpen])

  if (variant === 'chips') {
    return (
      <div className="orb-dictate-template-selector shrink-0" data-orb-dictate-template-selector>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ORB_DICTATE_STUDIO_TEMPLATES.map((template) => {
            const isSelected = selectedTemplateId === template.id
            return (
              <button
                key={template.id}
                type="button"
                data-orb-dictate-template={template.id}
                aria-pressed={isSelected}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  isSelected
                    ? 'border-[var(--orb-primary)]/60 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                    : 'border-[var(--orb-line)]/45 text-[var(--orb-muted)] hover:border-[var(--orb-primary)]/25'
                }`}
                onClick={() => onTemplateChange(template)}
              >
                {template.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="orb-dictate-template-selector relative min-w-0"
      data-orb-dictate-template-selector
      data-orb-dictate-template-selector-variant="compact"
    >
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          data-orb-dictate-template-dropdown
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          className="inline-flex min-w-0 max-w-[min(100%,14rem)] items-center gap-1 rounded-lg border border-[var(--orb-primary)]/35 bg-[var(--orb-primary-soft)]/50 px-2 py-1 text-left text-[11px] font-semibold text-[var(--orb-foreground)] transition hover:bg-[var(--orb-primary-soft)] sm:max-w-[16rem]"
          onClick={() => {
            setMenuOpen((v) => !v)
            setDetailsOpen(false)
          }}
        >
          <span className="truncate" data-orb-dictate-selected-template>
            {selected?.label ?? recordType.label}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition ${menuOpen ? 'rotate-180' : ''}`} aria-hidden />
        </button>
        <button
          type="button"
          data-orb-dictate-template-details-trigger
          aria-expanded={detailsOpen}
          title="Template details — what ORB checks"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--orb-line)]/45 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
          onClick={() => {
            setDetailsOpen((v) => !v)
            setMenuOpen(false)
          }}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <p
        className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-[var(--orb-muted)]"
        data-orb-dictate-template-purpose
      >
        {recordType.when_to_use}
      </p>

      {menuOpen ? (
        <div
          className="absolute left-0 top-full z-30 mt-1 max-h-[min(20rem,50dvh)] w-[min(100vw-2rem,18rem)] overflow-y-auto rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] p-1 shadow-lg"
          role="listbox"
          aria-label="Dictate templates"
          data-orb-dictate-template-menu
        >
          {ORB_DICTATE_STUDIO_TEMPLATES.map((template) => {
            const isSelected = selectedTemplateId === template.id
            return (
              <button
                key={template.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-orb-dictate-template={template.id}
                className={`flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition ${
                  isSelected
                    ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                    : 'text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]'
                }`}
                onClick={() => {
                  onTemplateChange(template)
                  setMenuOpen(false)
                }}
              >
                <span className="text-[11px] font-semibold">{template.label}</span>
                {template.description ? (
                  <span className="mt-0.5 line-clamp-1 text-[10px] opacity-80">{template.description}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {detailsOpen ? (
        <div
          className="absolute left-0 top-full z-30 mt-1 w-[min(100vw-2rem,20rem)] rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] p-2.5 shadow-lg"
          data-orb-dictate-template-details-popover
        >
          <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
            <Shield className="h-3 w-3" aria-hidden />
            What ORB checks
          </p>
          <OrbDictateSelectedTemplateDetails
            studioTemplateId={selectedTemplateId}
            recordTypeId={recordType.id}
          />
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated Large card — use compact selector + Brain empty state instead */
export function OrbDictateTemplateChipRow(props: {
  selectedTemplateId: string
  onTemplateChange: (template: OrbDictateStudioTemplate) => void
}) {
  return <OrbDictateTemplateSelector {...props} variant="chips" />
}
