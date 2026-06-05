'use client'

import { FileText, Shield } from 'lucide-react'

import {
  orbRecordingChecksSummary,
  orbRecordingSuggestedOutputs,
  resolveOrbRecordingRecordType
} from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordTypeId } from '@/lib/orb/recording/orb-recording-types'
import { ORB_DICTATE_GOVERNANCE_COPY } from '@/lib/orb/dictate/orb-dictate-types'

/** Progressive-disclosure template detail (popover / drawer body). */
export function OrbDictateSelectedTemplateDetails({
  studioTemplateId,
  recordTypeId,
  expanded = true
}: {
  studioTemplateId: string
  recordTypeId?: OrbRecordingRecordTypeId | string
  expanded?: boolean
}) {
  const recordType = resolveOrbRecordingRecordType({
    recordTypeId,
    studioTemplateId
  })
  const orbChecks = orbRecordingChecksSummary(recordType)
  const outputs = orbRecordingSuggestedOutputs(recordType.id)

  return (
    <div
      className="text-xs text-[var(--orb-muted)]"
      data-orb-dictate-selected-template-details
      data-orb-dictate-record-type={recordType.id}
    >
      <p className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-template-label>
        {recordType.label}
      </p>
      <p className="mt-0.5 leading-relaxed" data-orb-dictate-template-purpose>
        {recordType.when_to_use}
      </p>

      <div className="mt-2 flex flex-wrap gap-1" data-orb-dictate-orb-checks>
        {orbChecks.slice(0, 6).map((check) => (
          <span
            key={check}
            className="rounded-full border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/60 px-2 py-0.5 text-[10px] text-[var(--orb-foreground)]"
            data-orb-dictate-orb-check-chip
          >
            {check}
          </span>
        ))}
      </div>

      {expanded ? (
        <div className="mt-2 space-y-2 border-t border-[var(--orb-line)]/30 pt-2">
          <p data-orb-dictate-template-when-not>
            <span className="font-medium text-[var(--orb-foreground)]">When not to use: </span>
            {recordType.when_not_to_use}
          </p>
          <div data-orb-dictate-template-outputs>
            <p className="mb-1 flex items-center gap-1 font-medium text-[var(--orb-foreground)]">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Output options
            </p>
            <ul className="flex flex-wrap gap-1">
              {outputs.map((o) => (
                <li key={o.id} className="rounded-md border border-[var(--orb-line)]/40 px-2 py-0.5 text-[10px]">
                  {o.label}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[10px] leading-relaxed" data-orb-dictate-template-privacy>
            {ORB_DICTATE_GOVERNANCE_COPY.retention} {ORB_DICTATE_GOVERNANCE_COPY.reviewBeforeShare}
          </p>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Legacy full-width card — not rendered in studio workspace by default.
 * Kept for progressive disclosure elsewhere and source-level tests.
 */
export function OrbDictateSelectedTemplateCard({
  studioTemplateId,
  recordTypeId
}: {
  studioTemplateId: string
  recordTypeId?: OrbRecordingRecordTypeId | string
}) {
  return (
    <section
      className="shrink-0 rounded-xl border border-[var(--orb-primary)]/25 bg-[var(--orb-primary-soft)]/40 px-3 py-2.5"
      data-orb-dictate-selected-template-card
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
        <Shield className="mr-1 inline h-3 w-3" aria-hidden />
        Selected template
      </p>
      <div className="mt-1">
        <OrbDictateSelectedTemplateDetails
          studioTemplateId={studioTemplateId}
          recordTypeId={recordTypeId}
        />
      </div>
    </section>
  )
}
