'use client'

import type { RecordingStructuredFieldDefinition } from '@/lib/os-api/recording-templates'

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
  const label = (
    <label htmlFor={fieldId} className="text-sm font-black text-slate-900">
      {field.label}
      {field.required ? <span className="text-rose-600"> *</span> : null}
    </label>
  )

  if (field.field_type === 'boolean') {
    return (
      <div data-testid="structured-form-field" data-field-id={fieldId} className="space-y-1">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <input
            id={fieldId}
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(fieldId, event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span>{field.label}</span>
          {field.required ? <span className="text-rose-600">*</span> : null}
        </label>
        {field.guidance ? <p className="text-xs font-semibold text-slate-500">{field.guidance}</p> : null}
        {missing ? <p className="text-xs font-black text-rose-800">Required field</p> : null}
      </div>
    )
  }

  const commonClass =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100'

  return (
    <div data-testid="structured-form-field" data-field-id={fieldId} className="space-y-1">
      {label}
      {field.guidance ? <p className="text-xs font-semibold text-slate-500">{field.guidance}</p> : null}
      {field.field_type === 'textarea' ? (
        <textarea
          id={fieldId}
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
          type={field.field_type === 'datetime' ? 'datetime-local' : field.field_type === 'date' ? 'date' : field.field_type === 'time' ? 'time' : 'text'}
          value={String(value ?? '')}
          placeholder={field.placeholder ?? undefined}
          onChange={(event) => onChange(fieldId, event.target.value)}
          className={commonClass}
        />
      )}
      {field.privacy_sensitive ? (
        <p className="text-[10px] font-semibold text-amber-800">Privacy-sensitive — avoid unnecessary identifiers.</p>
      ) : null}
      {missing ? <p className="text-xs font-black text-rose-800">Required field</p> : null}
    </div>
  )
}
