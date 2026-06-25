'use client'

import { Check, ClipboardList, FileText, ListPlus } from 'lucide-react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { ReviewRiskBadge, ReviewStatusBadge } from '@/components/indicare-lab/review-event-badges'
import { formatLabDate } from '@/lib/indicare-lab/build-brief'
import {
  FOUNDER_ACTION_ELIGIBLE_STATUSES,
  REVIEW_SOURCE_LABELS,
  REVIEW_TASK_TYPE_LABELS,
  type ReviewEvent,
  type ReviewEventSummary
} from '@/lib/indicare-lab/review-events/types'

type ReviewEventsPanelProps = {
  events: ReviewEvent[]
  summary: ReviewEventSummary
  onCreateBuildBrief: (event: ReviewEvent) => void
  onAddToApprovalQueue: (event: ReviewEvent) => void
  onMarkReviewed: (eventId: string) => void
}

export function ReviewEventsPanel({
  events,
  summary,
  onCreateBuildBrief,
  onAddToApprovalQueue,
  onMarkReviewed
}: ReviewEventsPanelProps) {
  return (
    <LabSectionCard
      id="review-events"
      eyebrow="Runtime review"
      title="Review events feed"
      description="Live and development-mode ORB review events. AI-modelled agent perspectives flag issues and support founder review — not compliance validation."
      action={
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Internal evaluation · {summary.developmentModeCount} development-mode event
          {summary.developmentModeCount === 1 ? '' : 's'}
        </div>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Total events" value={String(summary.total)} />
        <SummaryStat label="Needs founder attention" value={String(summary.needsFounderAttention)} />
        <SummaryStat label="Blocked" value={String(summary.byStatus.blocked)} />
        <SummaryStat label="Rewrite recommended" value={String(summary.byStatus.rewrite)} />
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            No review events yet. Seeded development events or internal review tests will appear here.
          </div>
        ) : (
          events.map((event) => (
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

  return (
    <article
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      data-testid={`review-event-${event.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {REVIEW_SOURCE_LABELS[event.source]} · {REVIEW_TASK_TYPE_LABELS[event.taskType]}
            </p>
            {event.isDevelopment ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200">
                Development mode
              </span>
            ) : null}
            {event.isInternalEvaluation ? (
              <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-200">
                Internal evaluation
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
            {event.prompt ? <p><span className="font-bold text-slate-400">Prompt:</span> {event.prompt}</p> : null}
            <p><span className="font-bold text-slate-400">Draft:</span> {event.draftAnswer}</p>
          </div>
        </details>
      ) : null}
    </article>
  )
}
