'use client'

import type { RecordingStructuredFieldDefinition } from '@/lib/os-api/recording-templates'

function defaultGuidanceForField(field: RecordingStructuredFieldDefinition) {
  if (field.guidance?.trim()) return field.guidance
  if (field.field_type === 'boolean') return 'Tick this only when it applies to this record.'
  if (field.field_type === 'select') return 'Choose the closest option. Add extra detail in the main record if needed.'
  if (field.field_type === 'date' || field.field_type === 'time' || field.field_type === 'datetime') return 'Use the best known date or time. Add context in the record if needed.'
  if (field.field_type === 'textarea') return 'Write clearly. Include what happened, what adults did, what changed and what needs follow-up.'
  return 'Complete this field clearly so the record can be understood and reviewed later.'
}

function fieldContainerClass(missing?: boolean) {
  return `space-y-2 rounded-2xl border p-4 ${missing ? 'border-rose-200 bg-rose-50/50' : 'border-slate-100 bg-white/80'}`
}

export function StructuredFormField({
  field,
  value,
  onChange,
  missing
}: {
  field: RecordingStructuredFieldDefinition
  value: unknown
  onChange: (fieldId: string, next: unknown) => void
  missing?: boolean
}) {
  const fieldId = field.id
  const guidance = defaultGuidanceForField(field)
  const label = (
    <label htmlFor={fieldId} className="text-sm font-black text-slate-900">
      {field.label}
      {field.required ? <span className="text-rose-600"> *</span> : null}
    </label>
  )
  const guidanceBlock = (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">Guidance</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-blue-950">{guidance}</p>
    </div>
  )

  if (field.field_type === 'boolean') {
    return (
      <div data-testid="structured-form-field" data-field-id={fieldId} className={fieldContainerClass(missing)}>
        <label className="flex items-start gap-2 text-sm font-semibold text-slate-800">
          <input
            id={fieldId}
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(fieldId, event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="font-black text-slate-900">{field.label}</span>
            {field.required ? <span className="text-rose-600"> *</span> : null}
          </span>
        </label>
        {guidanceBlock}
        {field.privacy_sensitive ? (
          <p className="text-[10px] font-semibold text-amber-800">Privacy-sensitive — keep this relevant and necessary.</p>
        ) : null}
        {missing ? <p className="text-xs font-black text-rose-800">Required field</p> : null}
      </div>
    )
  }

  const commonClass =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div data-testid="structured-form-field" data-field-id={fieldId} className={fieldContainerClass(missing)}>
      {label}
      {guidanceBlock}
      {field.field_type === 'textarea' ? (
        <textarea
          id={fieldId}
          spellCheck
          rows={3}
          value={String(value ?? '')}
          placeholder={field.placeholder ?? undefined}
          onChange={(event) => onChange(fieldId, event.target.value)}
          className={commonClass}
        />
      ) : field.field_type === 'select' && field.options?.length ? (
        <select
          id={fieldId}
          value={String(value ?? '')}
          onChange={(event) => onChange(fieldId, event.target.value)}
          className={commonClass}
        >
          <option value="">Select…</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={fieldId}
          spellCheck={field.field_type === 'text'}
          type={field.field_type === 'datetime' ? 'datetime-local' : field.field_type === 'date' ? 'date' : field.field_type === 'time' ? 'time' : 'text'}
          value={String(value ?? '')}
          placeholder={field.placeholder ?? undefined}
          onChange={(event) => onChange(fieldId, event.target.value)}
          className={commonClass}
        />
      )}
      {field.privacy_sensitive ? (
        <p className="text-[10px] font-semibold text-amber-800">Privacy-sensitive — keep this relevant and necessary.</p>
      ) : null}
      {missing ? <p className="text-xs font-black text-rose-800">Required field</p> : null}
    </div>
  )
}
