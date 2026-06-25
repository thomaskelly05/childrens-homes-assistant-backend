'use client'

import { Check, FileText, ListPlus, Search, X } from 'lucide-react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { RiskBadge } from '@/components/indicare-lab/lab-shared'
import {
  EVIDENCE_SOURCE_TYPE_LABELS,
  EVIDENCE_STRENGTH_LABELS,
  SUGGESTION_CATEGORY_LABELS,
  SUGGESTION_CONFIDENCE_LABELS,
  SUGGESTION_STATUS_LABELS,
  type LabSuggestion,
  type SuggestionStatus
} from '@/lib/indicare-lab/suggestions/types'
import { REVIEW_SOURCE_LABELS, REVIEW_TASK_TYPE_LABELS } from '@/lib/indicare-lab/review-events/types'

type RealSuggestionsPanelProps = {
  suggestions: LabSuggestion[]
  realSuggestions: LabSuggestion[]
  onCreateBuildBrief: (suggestion: LabSuggestion) => void
  onAddToApprovalQueue: (suggestion: LabSuggestion) => void
  onUpdateStatus: (suggestionId: string, status: SuggestionStatus) => void
}

export function RealSuggestionsPanel({
  suggestions,
  realSuggestions,
  onCreateBuildBrief,
  onAddToApprovalQueue,
  onUpdateStatus
}: RealSuggestionsPanelProps) {
  return (
    <LabSectionCard
      id="real-suggestions"
      eyebrow="Evidence engine"
      title="Real suggestions"
      description="Suggestions generated only from evidence: shadow review events, detected patterns, benchmark failures, comparison regressions, and founder actions. No suggestions from seeded demo data alone."
      action={
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
          {realSuggestions.length} real · {suggestions.length - realSuggestions.length} synthetic
        </div>
      }
    >
      {realSuggestions.length === 0 && suggestions.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500"
          data-testid="real-suggestions-empty"
        >
          No real suggestions yet. IndiCare Lab needs shadow review events, benchmark failures or founder
          actions before it can recommend changes.
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onCreateBuildBrief={onCreateBuildBrief}
              onAddToApprovalQueue={onAddToApprovalQueue}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </LabSectionCard>
  )
}

function SuggestionCard({
  suggestion,
  onCreateBuildBrief,
  onAddToApprovalQueue,
  onUpdateStatus
}: {
  suggestion: LabSuggestion
  onCreateBuildBrief: (suggestion: LabSuggestion) => void
  onAddToApprovalQueue: (suggestion: LabSuggestion) => void
  onUpdateStatus: (suggestionId: string, status: SuggestionStatus) => void
}) {
  return (
    <article
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      data-testid={`suggestion-${suggestion.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-200">
              {SUGGESTION_CATEGORY_LABELS[suggestion.category]}
            </span>
            {suggestion.isSyntheticEvidence ? (
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200">
                Synthetic benchmark evidence
              </span>
            ) : (
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-200">
                Real evidence
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
              {SUGGESTION_STATUS_LABELS[suggestion.status]}
            </span>
          </div>
          <h3 className="mt-2 text-base font-bold text-white">{suggestion.title}</h3>
        </div>
        <RiskBadge level={suggestion.riskLevel} />
      </div>

      <p className="mt-3 text-sm text-slate-300">{suggestion.description}</p>
      <p className="mt-2 text-xs text-slate-500">{suggestion.whyItMatters}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestion.evidenceSources.map((source) => (
          <span
            key={`${source.type}-${source.id}`}
            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] ${
              source.isSynthetic
                ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
            }`}
          >
            {EVIDENCE_SOURCE_TYPE_LABELS[source.type]}: {source.label}
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
        <span>
          Strength: <span className="font-bold text-slate-200">{EVIDENCE_STRENGTH_LABELS[suggestion.evidenceStrength]}</span>
        </span>
        <span>
          Confidence: <span className="font-bold text-slate-200">{SUGGESTION_CONFIDENCE_LABELS[suggestion.confidence]}</span>
        </span>
        <span>
          Approval: <span className="font-bold text-slate-200">{suggestion.approvalRequirement}</span>
        </span>
      </div>

      {suggestion.affectedOrbStations.length > 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          Stations:{' '}
          {suggestion.affectedOrbStations.map((s) => REVIEW_SOURCE_LABELS[s]).join(', ')}
          {suggestion.affectedTaskTypes.length > 0
            ? ` · Tasks: ${suggestion.affectedTaskTypes.map((t) => REVIEW_TASK_TYPE_LABELS[t]).join(', ')}`
            : ''}
        </p>
      ) : null}

      <p className="mt-2 text-xs text-cyan-300/70">{suggestion.recommendedAction}</p>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
        <ActionButton icon={FileText} label="Create Build Brief" onClick={() => onCreateBuildBrief(suggestion)} />
        <ActionButton icon={ListPlus} label="Add to Approval Queue" onClick={() => onAddToApprovalQueue(suggestion)} />
        <ActionButton icon={Check} label="Mark Accepted" onClick={() => onUpdateStatus(suggestion.id, 'accepted')} />
        <ActionButton icon={Search} label="Needs More Evidence" onClick={() => onUpdateStatus(suggestion.id, 'needs-evidence')} />
        <ActionButton icon={FileText} label="Send to Expert Review" onClick={() => onUpdateStatus(suggestion.id, 'sent-to-expert-review')} />
        <ActionButton icon={X} label="Dismiss" onClick={() => onUpdateStatus(suggestion.id, 'dismissed')} />
      </div>
    </article>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof FileText
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-white/20 hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  )
}
