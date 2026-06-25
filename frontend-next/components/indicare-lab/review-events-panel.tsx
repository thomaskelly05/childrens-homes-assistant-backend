'use client'

import { useMemo, useState } from 'react'
import { Check, ClipboardList, FileText, ListPlus } from 'lucide-react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { ReviewRiskBadge, ReviewStatusBadge } from '@/components/indicare-lab/review-event-badges'
import { formatLabDate } from '@/lib/indicare-lab/build-brief'
import {
  countRealShadowReviewEvents,
  getLabDataModeConfig,
  getVisibleReviewEvents,
  normalizeReviewEventOrigin
} from '@/lib/indicare-lab/lab-data-mode'
import {
  FOUNDER_ACTION_ELIGIBLE_STATUSES,
  REVIEW_ORIGIN_BADGE_TONE,
  REVIEW_ORIGIN_LABELS,
  REVIEW_SOURCE_LABELS,
  REVIEW_TASK_TYPE_LABELS,
  type ReviewEvent,
  type ReviewEventOrigin,
  type ReviewEventSummary
} from '@/lib/indicare-lab/review-events/types'

const ORIGIN_FILTER_OPTIONS: { value: ReviewEventOrigin | 'all'; label: string }[] = [
  { value: 'all', label: 'All visible' },
  { value: 'shadow-review', label: 'Shadow review' },
  { value: 'seeded-demo', label: 'Seeded demo' },
  { value: 'internal-review-test', label: 'Internal test' },
  { value: 'benchmark-generated', label: 'Benchmark generated' },
  { value: 'imported', label: 'Imported' }
]

type ReviewEventsPanelProps = {
  events: ReviewEvent[]
  summary: ReviewEventSummary
  investorSafeView?: boolean
  onCreateBuildBrief: (event: ReviewEvent) => void
  onAddToApprovalQueue: (event: ReviewEvent) => void
  onMarkReviewed: (eventId: string) => void
}

export function ReviewEventsPanel({
  events,
  investorSafeView,
  onCreateBuildBrief,
  onAddToApprovalQueue,
  onMarkReviewed
}: ReviewEventsPanelProps) {
  const [originFilter, setOriginFilter] = useState<ReviewEventOrigin | 'all'>('all')
  const dataConfig = getLabDataModeConfig({ investorSafeOverride: investorSafeView })

  const visibleEvents = useMemo(
    () =>
      getVisibleReviewEvents(events, {
        originFilter,
        config: dataConfig
      }),
    [events, originFilter, dataConfig]
  )

  const realShadowCount = countRealShadowReviewEvents(events)
  const visibleSummary = useMemo(() => {
    const byStatus = {
      pass: 0,
      rewrite: 0,
      blocked: 0,
      'needs-founder-review': 0,
      reviewed: 0
    }
    let needsFounderAttention = 0

    for (const event of visibleEvents) {
      byStatus[event.status] += 1
      if (FOUNDER_ACTION_ELIGIBLE_STATUSES.includes(event.status)) {
        needsFounderAttention += 1
      }
    }

    return {
      total: visibleEvents.length,
      needsFounderAttention,
      byStatus
    }
  }, [visibleEvents])

  const showRealEmptyState =
    realShadowCount === 0 &&
    (dataConfig.investorSafeView ||
      dataConfig.mode === 'real-shadow-review' ||
      originFilter === 'shadow-review')

  return (
    <LabSectionCard
      id="review-events"
      eyebrow="Runtime review"
      title="Review events feed"
      description="ORB review events with clear origin labels. Seeded demo events are hidden in real founder mode unless explicitly enabled."
      action={
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {realShadowCount} real shadow · {visibleEvents.length} visible
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {ORIGIN_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setOriginFilter(option.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
              originFilter === option.value
                ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Visible events" value={String(visibleSummary.total)} />
        <SummaryStat label="Needs founder attention" value={String(visibleSummary.needsFounderAttention)} />
        <SummaryStat label="Blocked" value={String(visibleSummary.byStatus.blocked)} />
        <SummaryStat label="Rewrite recommended" value={String(visibleSummary.byStatus.rewrite)} />
      </div>

      <div className="space-y-4">
        {showRealEmptyState && visibleEvents.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500"
            data-testid="review-events-real-empty"
          >
            No real ORB shadow review events captured yet. Shadow review is ready. Once enabled, redacted ORB
            outputs will appear here for founder review.
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            No review events match the current filter. Adjust the origin filter or enable demo data in
            development mode.
          </div>
        ) : (
          visibleEvents.map((event) => (
            <ReviewEventCard
              key={event.id}
              event={event}
              onCreateBuildBrief={onCreateBuildBrief}
              onAddToApprovalQueue={onAddToApprovalQueue}
              onMarkReviewed={onMarkReviewed}
            />
          ))
        )}
      </div>
    </LabSectionCard>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function ReviewEventCard({
  event,
  onCreateBuildBrief,
  onAddToApprovalQueue,
  onMarkReviewed
}: {
  event: ReviewEvent
  onCreateBuildBrief: (event: ReviewEvent) => void
  onAddToApprovalQueue: (event: ReviewEvent) => void
  onMarkReviewed: (eventId: string) => void
}) {
  const eligibleForActions = FOUNDER_ACTION_ELIGIBLE_STATUSES.includes(event.status)
  const origin = normalizeReviewEventOrigin(event.origin)

  return (
    <article
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      data-testid={`review-event-${event.id}`}
      data-event-origin={origin}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {REVIEW_SOURCE_LABELS[event.source]} · {REVIEW_TASK_TYPE_LABELS[event.taskType]}
            </p>
            {event.isDevelopment ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200">
                Development stage
              </span>
            ) : null}
            {event.isInternalEvaluation ? (
              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-200">
                Internal evaluation
              </span>
            ) : null}
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${REVIEW_ORIGIN_BADGE_TONE[origin]}`}
            >
              {REVIEW_ORIGIN_LABELS[origin]}
            </span>
            {origin === 'seeded-demo' ? (
              <span className="rounded-full border border-slate-400/30 bg-slate-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Demo data
              </span>
            ) : null}
            {event.isRedacted ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200">
                Redacted
              </span>
            ) : null}
            {!event.fullTextStored ? (
              <span className="rounded-full border border-slate-400/30 bg-slate-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Full text not stored
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">{formatLabDate(event.createdAt)} · {event.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReviewRiskBadge level={event.riskLevel} />
          <ReviewStatusBadge status={event.status} />
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-300">{event.reasonSummary}</p>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
        <span>
          <span className="font-bold text-emerald-300">{event.agentsPassed}</span> passed
        </span>
        <span>
          <span className="font-bold text-amber-300">{event.agentsRewrote}</span> rewrite
        </span>
        <span>
          <span className="font-bold text-rose-300">{event.agentsBlocked}</span> blocked
        </span>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-bold text-cyan-300/80 hover:text-cyan-200">
          Agent results ({event.agentResults.length})
        </summary>
        <ul className="mt-3 space-y-2">
          {event.agentResults.map((agent) => (
            <li
              key={agent.agent}
              className="rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-slate-400"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-300">{agent.agentLabel}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${
                    agent.decision === 'pass'
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                      : agent.decision === 'rewrite'
                        ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                        : 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {agent.decision}
                </span>
              </div>
              {agent.flags.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {agent.flags.map((flag) => (
                    <li key={flag}>· {flag}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-slate-500">No flags</p>
              )}
            </li>
          ))}
        </ul>
      </details>

      {eligibleForActions ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={() => onCreateBuildBrief(event)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Create Build Brief
          </button>
          <button
            type="button"
            onClick={() => onAddToApprovalQueue(event)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/20"
          >
            <ListPlus className="h-3.5 w-3.5" aria-hidden />
            Add to Approval Queue
          </button>
          <button
            type="button"
            onClick={() => onMarkReviewed(event.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Mark as Reviewed
          </button>
        </div>
      ) : null}

      {event.prompt ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-500 hover:text-slate-400">
            <ClipboardList className="mr-1 inline h-3 w-3" aria-hidden />
            Prompt & draft
          </summary>
          <div className="mt-2 space-y-2 text-xs text-slate-500">
            {event.prompt ? (
              <p>
                <span className="font-bold text-slate-400">Prompt:</span> {event.prompt}
              </p>
            ) : null}
            <p>
              <span className="font-bold text-slate-400">Draft:</span> {event.draftAnswer}
            </p>
          </div>
        </details>
      ) : null}
    </article>
  )
}
