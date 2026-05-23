'use client'

import {
  RECORDING_WORKSPACE_TYPES,
  type RecordingWorkspaceType,
  recordingTypeVisibleForAbout
} from '@/lib/record/recording-types'
import type { RecordAboutContext } from '@/lib/record/recording-hub'

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

  return (
    <fieldset data-testid="recording-type-selector" className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <legend className="px-1 text-lg font-black tracking-[-0.03em] text-slate-950">Recording type</legend>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const selected = value === option.id
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
                <span>
                  <span className="block text-sm font-black text-slate-950">{option.label}</span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-600">{option.description}</span>
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
