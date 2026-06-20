'use client'

import {
  ORB_DICTATE_RECORD_TYPE_SUGGESTIONS,
  ORB_DICTATE_WRITE_TEMPLATE_SUPPORTING,
  ORB_DICTATE_WRITE_TEMPLATE_TITLE
} from '@/lib/orb/dictate/orb-dictate-capture-copy'

export function OrbDictateWriteTemplateSelector({
  selectedTemplateId,
  onSelectTemplate
}: {
  selectedTemplateId: string
  onSelectTemplate: (templateId: string) => void
}) {
  return (
    <section
      className="orb-dictate-write-template-selector rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/50 p-4"
      data-orb-dictate-write-template-section
    >
      <h4 className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-write-template-title>
        {ORB_DICTATE_WRITE_TEMPLATE_TITLE}
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-write-template-supporting>
        {ORB_DICTATE_WRITE_TEMPLATE_SUPPORTING}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="list" aria-label="ORB Write templates">
        {ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.map((option) => {
          const active = selectedTemplateId === option.templateId
          return (
            <button
              key={option.templateId}
              type="button"
              role="listitem"
              data-orb-dictate-write-template-option={option.templateId}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                active
                  ? 'border-[var(--orb-primary)]/45 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                  : 'border-[var(--orb-line)]/35 bg-white/80 text-[var(--orb-muted)] hover:border-[var(--orb-primary)]/25 hover:text-[var(--orb-foreground)]'
              }`}
              onClick={() => onSelectTemplate(option.templateId)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
