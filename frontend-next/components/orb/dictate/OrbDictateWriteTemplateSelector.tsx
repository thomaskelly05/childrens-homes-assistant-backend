'use client'

import {
  ORB_DICTATE_RECORD_TYPE_SUGGESTIONS,
  ORB_DICTATE_WRITE_TEMPLATE_SUPPORTING,
  ORB_DICTATE_WRITE_TEMPLATE_TITLE
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import { OrbResidentialSecondaryActionChips, OrbResidentialTemplateActionChip } from '@/components/orb-residential/orb-residential-station-ui'

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
      <div className="block">
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
        <OrbResidentialSecondaryActionChips className="mt-3" label={compact ? undefined : 'Record type'}>
          {ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.map((option) => {
            const resolvedId = option.templateId === 'general_note' ? 'general' : option.templateId
            const selected = selectedTemplateId === resolvedId || (option.templateId === 'general_note' && selectedTemplateId === 'general')
            return (
              <OrbResidentialTemplateActionChip
                key={option.templateId}
                label={option.label}
                active={selected}
                onClick={() => onSelectTemplate(resolvedId)}
              />
            )
          })}
        </OrbResidentialSecondaryActionChips>
        <select
          id="orb-dictate-template-select"
          value={selectedTemplateId}
          onChange={(e) => onSelectTemplate(e.target.value)}
          className="sr-only"
          data-orb-dictate-template-select
          data-orb-dictate-write-template-select
          aria-label={ORB_DICTATE_WRITE_TEMPLATE_TITLE}
        >
          {ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.map((option) => {
            const resolvedId = option.templateId === 'general_note' ? 'general' : option.templateId
            return (
              <option
                key={option.templateId}
                value={resolvedId}
                data-orb-dictate-write-template-option={option.templateId}
              >
                {option.label}
              </option>
            )
          })}
        </select>
      </div>
    </section>
  )
}
