'use client'

import Link from 'next/link'

import type { RecordingFormLifecycleConfig } from '@/lib/record/recording-form-lifecycle'

export type LifecycleOutcomeLinks = {
  archiveHref?: string
  chronologyHref?: string
  planImpactsHref?: string
  lifeechoHref?: string
  formalRecordId?: string
  chronologyEventId?: string
  archiveRecordId?: string
}

export function RecordingFormLifecycleOutcome({
  lifecycle,
  links,
  signOffSummary
}: {
  lifecycle: RecordingFormLifecycleConfig
  links?: LifecycleOutcomeLinks
  signOffSummary?: string
}) {
  return (
    <section
      data-testid="recording-form-lifecycle-outcome"
      className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-800">Sign-off / lifecycle outcome</p>
      {signOffSummary ? (
        <p className="text-sm font-semibold text-blue-950">{signOffSummary}</p>
      ) : (
        <p className="text-xs font-semibold text-slate-600">
          After manager sign-off, supported forms may create archive entries, chronology events, plan impact suggestions
          and LifeEcho memory suggestions — never automatically applied without review.
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs font-black">
        {lifecycle.archive_behaviour !== 'not_applicable' && links?.archiveHref ? (
          <Link
            href={links.archiveHref}
            data-testid="recording-lifecycle-archive-link"
            className="rounded-full bg-white px-3 py-1.5 text-blue-900 ring-1 ring-blue-200"
          >
            Archive
          </Link>
        ) : null}
        {lifecycle.chronology_behaviour !== 'not_applicable' && links?.chronologyHref ? (
          <Link
            href={links.chronologyHref}
            data-testid="recording-lifecycle-chronology-link"
            className="rounded-full bg-white px-3 py-1.5 text-blue-900 ring-1 ring-blue-200"
          >
            Chronology
          </Link>
        ) : null}
        {lifecycle.plan_impact_behaviour !== 'none' && links?.planImpactsHref ? (
          <Link
            href={links.planImpactsHref}
            data-testid="recording-lifecycle-plan-impacts-link"
            className="rounded-full bg-white px-3 py-1.5 text-blue-900 ring-1 ring-blue-200"
          >
            Plan impacts
          </Link>
        ) : null}
        {lifecycle.lifeecho_behaviour !== 'not_applicable' && links?.lifeechoHref ? (
          <Link
            href={links.lifeechoHref}
            data-testid="recording-lifecycle-lifeecho-link"
            className="rounded-full bg-white px-3 py-1.5 text-blue-900 ring-1 ring-blue-200"
          >
            LifeEcho
          </Link>
        ) : null}
      </div>

      {links?.formalRecordId ? (
        <p className="text-xs font-semibold text-emerald-900" data-testid="recording-formal-record-created">
          Formal record created: {links.formalRecordId}
        </p>
      ) : null}
    </section>
  )
}
