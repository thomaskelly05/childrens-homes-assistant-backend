'use client'

import { StructuredFormField } from '@/components/indicare/record/structured-form-field'
import type { RecordingStructuredSection } from '@/lib/os-api/recording-templates'

export function StructuredFormSection({
  section,
  values,
  requiredMissing,
  onChange
}: {
  section: RecordingStructuredSection
  values: Record<string, unknown>
  requiredMissing: Set<string>
  onChange: (fieldId: string, next: unknown) => void
}) {
  return (
    <section data-testid="structured-form-section" data-section-id={section.id} className="space-y-4">
      <div>
        <h3 className="text-sm font-black text-slate-950">{section.title}</h3>
        {section.description ? (
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{section.description}</p>
        ) : null}
      </div>
      <div className="space-y-4">
        {section.fields.map((field) => (
          <StructuredFormField
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={onChange}
            missing={requiredMissing.has(field.id)}
          />
        ))}
      </div>
    </section>
  )
}
