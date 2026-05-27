'use client'

import type { RecordingFormDefinition } from '@/lib/record/recording-form-registry'
import { EVENT_DATE_GUIDANCE } from '@/lib/record/recording-form-therapeutic-defaults'
import type { RecordingFormRecordMetadata } from '@/lib/record/recording-form-metadata'
import { RecordingFormReviewStatus } from '@/components/indicare/record/recording-form-review-status'

export function RecordingFormMetadataBar({
  form,
  formMetadata,
  childName,
  homeLabel,
  lastSavedAt,
  onEventDateChange,
  readOnly = false
}: {
  form: RecordingFormDefinition
  formMetadata: RecordingFormRecordMetadata
  childName?: string
  homeLabel?: string
  lastSavedAt?: string
  onEventDateChange?: (value: string) => void
  readOnly?: boolean
}) {
  const writtenBy = formMetadata.written_by_name || 'Current user'
  const role = formMetadata.written_by_role

  return (
    <section
      data-testid="recording-form-metadata-bar"
      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Care record context</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{form.title}</h3>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            {childName ? `Child: ${childName}` : 'No child selected'}
            {homeLabel ? ` · Home: ${homeLabel}` : ''}
            {form.category ? ` · ${form.category.replace(/_/g, ' ')}` : ''}
          </p>
        </div>
        <RecordingFormReviewStatus
          reviewStatus={formMetadata.review_status}
          managerReviewRequired={formMetadata.manager_review_required}
          safeguardingReviewRequired={formMetadata.safeguarding_review_required}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="text-xs font-black text-slate-800">Event date</span>
          <input
            type="date"
            data-testid="recording-event-date"
            value={formMetadata.event_date}
            disabled={readOnly || !onEventDateChange}
            onChange={(event) => onEventDateChange?.(event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70"
          />
          <span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-500">{EVENT_DATE_GUIDANCE}</span>
        </label>

        <div>
          <span className="text-xs font-black text-slate-800">Written by</span>
          <p className="mt-1 text-sm font-semibold text-slate-900" data-testid="recording-written-by">
            {writtenBy}
          </p>
          {role ? (
            <p className="text-xs font-semibold text-slate-500" data-testid="recording-written-by-role">
              Role: {role}
            </p>
          ) : null}
        </div>

        <div>
          <span className="text-xs font-black text-slate-800">Record date</span>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formMetadata.record_date}</p>
        </div>

        <div>
          <span className="text-xs font-black text-slate-800">Last saved</span>
          <p className="mt-1 text-sm font-semibold text-slate-900" data-testid="recording-metadata-updated">
            {lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'Not saved yet'}
          </p>
        </div>
      </div>

      {!formMetadata.is_editable && formMetadata.editability_note ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-950"
          data-testid="recording-signed-off-readonly"
        >
          {formMetadata.editability_note}
        </p>
      ) : null}
    </section>
  )
}
