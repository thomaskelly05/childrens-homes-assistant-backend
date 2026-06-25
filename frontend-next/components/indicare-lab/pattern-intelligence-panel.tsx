'use client'

import { Check, FileQuestion, FileText, ListPlus, Scale, X } from 'lucide-react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { PriorityBadge, RiskBadge } from '@/components/indicare-lab/lab-shared'
import { formatLabDate } from '@/lib/indicare-lab/build-brief'
import { suggestBenchmarkScenariosForPattern } from '@/lib/indicare-lab/evaluations/evaluation-actions'
import {
  isPatternApprovalEligible,
  LAB_PATTERN_AREA_LABELS,
  LAB_PATTERN_STATUS_LABELS,
  type LabPattern,
  type LabPatternStatus
} from '@/lib/indicare-lab/patterns/types'
import {
  REVIEW_SOURCE_LABELS,
  REVIEW_TASK_TYPE_LABELS
} from '@/lib/indicare-lab/review-events/types'

type PatternIntelligencePanelProps = {
  patterns: LabPattern[]
  analysedEventCount: number
  onCreateBuildBrief: (pattern: LabPattern) => void
  onAddToApprovalQueue: (pattern: LabPattern) => void
  onUpdatePatternStatus: (patternId: string, status: LabPatternStatus) => void
  onNavigateToBenchmarks?: (scenarioId?: string) => void
}

export function PatternIntelligencePanel({
  patterns,
  analysedEventCount,
  onCreateBuildBrief,
  onAddToApprovalQueue,
  onUpdatePatternStatus,
  onNavigateToBenchmarks
}: PatternIntelligencePanelProps) {
  return (
    <LabSectionCard
      id="pattern-intelligence"
      eyebrow="Phase 4"
      title="Pattern intelligence"
      description="Recurring weaknesses detected across review events. Patterns support founder-controlled improvement proposals — not expert validation or compliance guarantees."
      action={
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
          Internal evaluation · {analysedEventCount} event{analysedEventCount === 1 ? '' : 's'} analysed
        </div>
      }
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-violet-400/20 bg-violet-500/5 px-3 py-2 text-xs text-violet-100/90">
        <p>
          Patterns are derived from development-mode and shadow review events. Evidence may be redacted.
          No live ORB output is blocked or rewritten. Production prompts are not changed automatically.
        </p>
      </div>

      <div className="space-y-4">
        {patterns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            No recurring patterns detected yet. Run internal review tests or accumulate shadow review events.
          </div>
        ) : (
          patterns.map((pattern) => (
            <PatternCard
              key={pattern.id}
              pattern={pattern}
              onCreateBuildBrief={onCreateBuildBrief}
              onAddToApprovalQueue={onAddToApprovalQueue}
              onUpdatePatternStatus={onUpdatePatternStatus}
              onNavigateToBenchmarks={onNavigateToBenchmarks}
            />
          ))
        )}
      </div>
    </LabSectionCard>
  )
}

function PatternCard({
  pattern,
  onCreateBuildBrief,
  onAddToApprovalQueue,
  onUpdatePatternStatus,
  onNavigateToBenchmarks
}: {
  pattern: LabPattern
  onCreateBuildBrief: (pattern: LabPattern) => void
  onAddToApprovalQueue: (pattern: LabPattern) => void
  onUpdatePatternStatus: (patternId: string, status: LabPatternStatus) => void
  onNavigateToBenchmarks?: (scenarioId?: string) => void
}) {
  const approvalEligible = isPatternApprovalEligible(pattern)
  const suggestedBenchmarks = suggestBenchmarkScenariosForPattern(pattern.id)

  return (
    <article
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      data-testid={`lab-pattern-${pattern.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {LAB_PATTERN_AREA_LABELS[pattern.area]}
            </p>
            {pattern.isDevelopment ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200">
                Development mode
              </span>
            ) : null}
            <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-200">
              Internal evaluation
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-white">{pattern.title}</h3>
          <p className="mt-1 text-xs text-slate-500">Detected {formatLabDate(pattern.detectedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RiskBadge level={pattern.riskLevel} />
          <PriorityBadge priority={pattern.priority} />
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">
            {LAB_PATTERN_STATUS_LABELS[pattern.founderDecisionStatus]}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-300">{pattern.description}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PatternStat label="Frequency" value={String(pattern.frequency)} />
        <PatternStat
          label="Affected station"
          value={
            pattern.affectedSources.length === 1
              ? REVIEW_SOURCE_LABELS[pattern.affectedSources[0]!]
              : `${pattern.affectedSources.length} stations`
          }
        />
        <PatternStat
          label="Affected task type"
          value={
            pattern.affectedTaskTypes.length === 1
              ? REVIEW_TASK_TYPE_LABELS[pattern.affectedTaskTypes[0]!]
              : `${pattern.affectedTaskTypes.length} types`
          }
        />
        <PatternStat label="Linked events" value={String(pattern.relatedEventIds.length)} />
      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Evidence summary</p>
        <p className="mt-1 text-xs text-slate-400">{pattern.evidenceSummary}</p>
      </div>

      {pattern.evidence.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-slate-400">
          {pattern.evidence.slice(0, 4).map((ev) => (
            <li key={`${ev.eventId}-${ev.flag}`} className="flex gap-2">
              <span className="text-cyan-400/60">·</span>
              <span>
                <span className="text-slate-500">{ev.eventId}</span> — {ev.agentLabel}: {ev.flag}
                {ev.isRedacted ? ' (redacted)' : ''}
              </span>
            </li>
          ))}
          {pattern.evidence.length > 4 ? (
            <li className="text-slate-500">+ {pattern.evidence.length - 4} more evidence items</li>
          ) : null}
        </ul>
      ) : null}

      <p className="mt-3 text-xs text-slate-500">
        <span className="font-semibold text-slate-400">Recommended action:</span> {pattern.recommendedAction}
      </p>

      {suggestedBenchmarks.length > 0 ? (
        <div className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300">
            Suggested benchmark scenarios
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-400">
            {suggestedBenchmarks.map((scenario) => (
              <li key={scenario.id} className="flex items-center justify-between gap-2">
                <span>{scenario.title}</span>
                {onNavigateToBenchmarks ? (
                  <button
                    type="button"
                    onClick={() => onNavigateToBenchmarks(scenario.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-200 transition hover:bg-cyan-500/20"
                  >
                    <Scale className="h-3 w-3" aria-hidden />
                    Run benchmark
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            onCreateBuildBrief(pattern)
            onUpdatePatternStatus(pattern.id, 'build-brief-created')
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/20"
          data-testid={`pattern-create-brief-${pattern.id}`}
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Create build brief
        </button>
        {approvalEligible ? (
          <button
            type="button"
            onClick={() => {
              onAddToApprovalQueue(pattern)
              onUpdatePatternStatus(pattern.id, 'in-approval-queue')
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/20"
            data-testid={`pattern-add-approval-${pattern.id}`}
          >
            <ListPlus className="h-3.5 w-3.5" aria-hidden />
            Add to approval queue
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onUpdatePatternStatus(pattern.id, 'accepted')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          Mark accepted
        </button>
        <button
          type="button"
          onClick={() => onUpdatePatternStatus(pattern.id, 'dismissed')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Dismiss
        </button>
        <button
          type="button"
          onClick={() => onUpdatePatternStatus(pattern.id, 'needs-expert-review')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200 transition hover:bg-violet-500/20"
        >
          <FileQuestion className="h-3.5 w-3.5" aria-hidden />
          Needs expert review
        </button>
      </div>
    </article>
  )
}

function PatternStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  )
}
