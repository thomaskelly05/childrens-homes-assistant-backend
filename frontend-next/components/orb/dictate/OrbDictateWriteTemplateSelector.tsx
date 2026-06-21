'use client'

import {
  ORB_DICTATE_RECORD_TYPE_SUGGESTIONS,
  ORB_DICTATE_WRITE_TEMPLATE_SUPPORTING,
  ORB_DICTATE_WRITE_TEMPLATE_TITLE
} from '@/lib/orb/dictate/orb-dictate-capture-copy'

export function OrbDictateWriteTemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  compact = false,
  label = ORB_DICTATE_WRITE_TEMPLATE_TITLE
}: {
  selectedTemplateId: string
  onSelectTemplate: (templateId: string) => void
  compact?: boolean
  label?: string
}) {
  return (
    <section
      className={`orb-dictate-write-template-selector ${compact ? 'p-0' : 'rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/50 p-4'}`}
      data-orb-dictate-write-template-section
    >
      <label className="block" htmlFor="orb-dictate-template-select">
        <span
          className={`font-semibold text-[var(--orb-foreground)] ${compact ? 'text-xs' : 'text-sm'}`}
          data-orb-dictate-write-template-title
        >
          {label}
        </span>
        {!compact ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-write-template-supporting>
            {ORB_DICTATE_WRITE_TEMPLATE_SUPPORTING}
          </p>
        ) : null}
        <select
          id="orb-dictate-template-select"
          value={selectedTemplateId}
          onChange={(e) => onSelectTemplate(e.target.value)}
          className="orb-dictate-template-select mt-2 w-full rounded-xl border border-[var(--orb-line)]/25 bg-white px-3 py-2.5 text-sm font-medium text-[var(--orb-foreground)] outline-none focus:border-[var(--orb-primary)]/35 focus:ring-2 focus:ring-[var(--orb-primary)]/10"
          data-orb-dictate-template-select
          data-orb-dictate-write-template-select
          aria-label={ORB_DICTATE_WRITE_TEMPLATE_TITLE}
        >
          {ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.map((option) => (
            <option
              key={option.templateId}
              value={option.templateId}
              data-orb-dictate-write-template-option={option.templateId}
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}
