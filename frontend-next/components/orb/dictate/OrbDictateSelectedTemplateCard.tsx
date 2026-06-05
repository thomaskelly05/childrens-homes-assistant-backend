'use client'

import { ChevronDown, FileText, Shield } from 'lucide-react'
import { useState } from 'react'

import {
  orbRecordingChecksSummary,
  orbRecordingSuggestedOutputs,
  resolveOrbRecordingRecordType
} from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordTypeId } from '@/lib/orb/recording/orb-recording-types'
import { ORB_DICTATE_GOVERNANCE_COPY } from '@/lib/orb/dictate/orb-dictate-types'

export function OrbDictateSelectedTemplateCard({
  studioTemplateId,
  recordTypeId
}: {
  studioTemplateId: string
  recordTypeId?: OrbRecordingRecordTypeId | string
}) {
  const [expanded, setExpanded] = useState(false)
  const recordType = resolveOrbRecordingRecordType({
    recordTypeId,
    studioTemplateId
  })
  const orbChecks = orbRecordingChecksSummary(recordType)
  const outputs = orbRecordingSuggestedOutputs(recordType.id)

  return (
    <section
      className="shrink-0 rounded-xl border border-[var(--orb-primary)]/25 bg-[var(--orb-primary-soft)]/40 px-3 py-2.5"
      data-orb-dictate-selected-template-card
      data-orb-dictate-record-type={recordType.id}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
            Selected template
          </p>
          <p className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-template-label>
            {recordType.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-template-purpose>
            {recordType.when_to_use}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse template details' : 'Expand template details'}
          data-orb-dictate-template-expand
        >
          <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5" data-orb-dictate-orb-checks>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--orb-line)]/50 bg-[var(--orb-surface)]/80 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]">
          <Shield className="h-3 w-3" aria-hidden />
          ORB will check
        </span>
        {orbChecks.slice(0, 4).map((check) => (
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
        <div className="mt-2 space-y-2 border-t border-[var(--orb-line)]/30 pt-2 text-xs text-[var(--orb-muted)]">
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
    </section>
  )
}
