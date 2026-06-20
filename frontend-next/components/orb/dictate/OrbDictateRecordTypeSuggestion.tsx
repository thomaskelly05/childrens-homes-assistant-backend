'use client'

import {
  ORB_DICTATE_RECORD_TYPE_PROMPT,
  ORB_DICTATE_RECORD_TYPE_SUGGESTIONS
} from '@/lib/orb/dictate/orb-dictate-capture-copy'

export function OrbDictateRecordTypeSuggestion({
  selectedTemplateId,
  onSelectTemplate
}: {
  selectedTemplateId: string
  onSelectTemplate: (templateId: string) => void
}) {
  return (
    <section
      className="orb-dictate-record-type-suggestion rounded-2xl border border-[var(--orb-line)]/20 bg-[var(--orb-surface)]/50 p-4"
      data-orb-dictate-record-type-suggestion
    >
      <p className="text-xs font-medium text-[var(--orb-muted)]" data-orb-dictate-record-type-prompt>
        {ORB_DICTATE_RECORD_TYPE_PROMPT}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="list" aria-label="Suggested record types">
        {ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.map((option) => {
          const active = selectedTemplateId === option.templateId
          return (
            <button
              key={option.templateId}
              type="button"
              role="listitem"
              data-orb-dictate-record-type-option={option.templateId}
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
