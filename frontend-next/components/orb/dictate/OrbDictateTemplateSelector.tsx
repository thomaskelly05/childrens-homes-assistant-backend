'use client'

import {
  ORB_DICTATE_STUDIO_TEMPLATES,
  type OrbDictateStudioTemplate
} from '@/lib/orb/dictate/orb-dictate-studio-templates'

export function OrbDictateTemplateSelector({
  selectedTemplateId,
  onTemplateChange
}: {
  selectedTemplateId: string
  onTemplateChange: (template: OrbDictateStudioTemplate) => void
}) {
  return (
    <div className="orb-dictate-template-selector shrink-0" data-orb-dictate-template-selector>
      <div className="flex items-center gap-2">
        <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)] sm:inline">
          Template
        </span>
        <div
          className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="listbox"
          aria-label="Dictate templates"
        >
          {ORB_DICTATE_STUDIO_TEMPLATES.map((template) => {
            const selected = selectedTemplateId === template.id
            return (
              <button
                key={template.id}
                type="button"
                role="option"
                aria-selected={selected}
                data-orb-dictate-template={template.id}
                aria-pressed={selected}
                title={template.description}
                className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                  selected
                    ? 'border-[var(--orb-primary)]/60 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)] shadow-sm'
                    : 'border-[var(--orb-line)]/45 text-[var(--orb-muted)] hover:border-[var(--orb-primary)]/25 hover:text-[var(--orb-foreground)]'
                }`}
                onClick={() => onTemplateChange(template)}
              >
                {template.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
