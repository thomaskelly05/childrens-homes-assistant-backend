'use client'

import {
  routeStatusLabel,
  routeStatusMicrocopy,
  recordingFormByWorkspaceType
} from '@/lib/record/recording-form-registry'
import {
  RECORDING_WORKSPACE_TYPES,
  type RecordingWorkspaceType,
  recordingTypeVisibleForAbout
} from '@/lib/record/recording-types'
import type { RecordAboutContext } from '@/lib/record/recording-hub'

function statusBadgeClass(form: ReturnType<typeof recordingFormByWorkspaceType>) {
  if (!form) return 'bg-slate-100 text-slate-700'
  if (form.safeguardingSensitive) return 'bg-rose-100 text-rose-900'
  if (form.requiresManagerReview) return 'bg-amber-100 text-amber-900'
  if (form.routeKind === 'draft_workspace') return 'bg-blue-100 text-blue-900'
  return 'bg-emerald-100 text-emerald-900'
}

export function RecordingTypeSelector({
  value,
  onChange,
  about
}: {
  value: RecordingWorkspaceType
  onChange: (next: RecordingWorkspaceType) => void
  about: RecordAboutContext
}) {
  const options = RECORDING_WORKSPACE_TYPES.filter((option) => recordingTypeVisibleForAbout(option.id, about))
  const selectedForm = recordingFormByWorkspaceType(value)

  return (
    <fieldset data-testid="recording-type-selector" className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <legend className="px-1 text-lg font-black tracking-[-0.03em] text-slate-950">Recording type</legend>
      {selectedForm ? (
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
          <span className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${statusBadgeClass(selectedForm)}`}>
            {routeStatusLabel(selectedForm.routeKind)}
          </span>
          {selectedForm.safeguardingSensitive ? 'Safeguarding sensitive · ' : ''}
          {selectedForm.requiresManagerReview ? 'Manager review likely · ' : ''}
          {routeStatusMicrocopy(selectedForm.routeKind) || selectedForm.description}
        </p>
      ) : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const selected = value === option.id
          const form = option.form || recordingFormByWorkspaceType(option.id)
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer flex-col rounded-2xl border px-4 py-3 transition focus-within:ring-2 focus-within:ring-blue-200 ${selected ? 'border-blue-300 bg-blue-50/70 ring-1 ring-blue-200' : 'border-slate-100 bg-slate-50/60 hover:border-blue-100'}`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="recording-type"
                  value={option.id}
                  checked={selected}
                  onChange={() => onChange(option.id)}
                  className="mt-1 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                  aria-label={option.label}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="block text-sm font-black text-slate-950">{option.label}</span>
                    {form ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${statusBadgeClass(form)}`}
                      >
                        {form.priority}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{option.description}</span>
                  {form ? (
                    <span className="mt-1 block text-[10px] font-bold text-slate-500">{routeStatusLabel(form.routeKind)}</span>
                  ) : null}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
