'use client'

import type { ReactNode } from 'react'

import type { RecordingFormDefinition } from '@/lib/record/recording-form-registry'
import type { RecordingFormRecordMetadata } from '@/lib/record/recording-form-metadata'
import { RecordingFormMetadataBar } from '@/components/indicare/record/recording-form-metadata-bar'
import { RecordingFormPlanImpactCheck } from '@/components/indicare/record/recording-form-plan-impact-check'
import { RecordingFormTherapeuticGuidance } from '@/components/indicare/record/recording-form-therapeutic-guidance'
import {
  ACTIONS_FOLLOW_UP_PROMPT,
  ADULT_RESPONSE_SECTION_PROMPT,
  CHILD_VOICE_SECTION_PROMPT
} from '@/lib/record/recording-form-therapeutic-defaults'

export function RecordingFormShell({
  form,
  formMetadata,
  childName,
  homeLabel,
  lastSavedAt,
  onEventDateChange,
  planImpactChecked,
  onPlanImpactChange,
  readOnly = false,
  actions,
  children
}: {
  form: RecordingFormDefinition
  formMetadata: RecordingFormRecordMetadata
  childName?: string
  homeLabel?: string
  lastSavedAt?: string
  onEventDateChange?: (value: string) => void
  planImpactChecked?: boolean
  onPlanImpactChange?: (value: boolean) => void
  readOnly?: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section data-testid="recording-form-shell" className="space-y-4">
      <RecordingFormMetadataBar
        form={form}
        formMetadata={formMetadata}
        childName={childName}
        homeLabel={homeLabel}
        lastSavedAt={lastSavedAt}
        onEventDateChange={onEventDateChange}
        readOnly={readOnly}
      />

      <RecordingFormTherapeuticGuidance form={form} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          data-testid="recording-child-voice-section"
          className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-800">Child voice</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-cyan-950">
            {formMetadata.therapeutic_flags.child_voice_prompt || CHILD_VOICE_SECTION_PROMPT}
          </p>
        </section>
        <section
          data-testid="recording-adult-response-section"
          className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4"
        >
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-800">Adult response</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-indigo-950">
            {formMetadata.therapeutic_flags.adult_response_prompt || ADULT_RESPONSE_SECTION_PROMPT}
          </p>
        </section>
      </div>

      <section
        data-testid="recording-actions-follow-up-section"
        className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4"
      >
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-800">Actions / follow-up</p>
        <p className="mt-2 text-xs font-semibold leading-5 text-amber-950">
          {formMetadata.therapeutic_flags.actions_follow_up_prompt || ACTIONS_FOLLOW_UP_PROMPT}
        </p>
      </section>

      <RecordingFormPlanImpactCheck
        lifecycle={formMetadata.lifecycle}
        checked={planImpactChecked}
        onChange={onPlanImpactChange}
        readOnly={readOnly}
      />

      {formMetadata.formal_route_warning ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950"
          data-testid="recording-formal-route-warning"
        >
          {formMetadata.formal_route_warning}
        </p>
      ) : null}

      {children}

      {actions ? <div data-testid="recording-form-shell-actions">{actions}</div> : null}
    </section>
  )
}
