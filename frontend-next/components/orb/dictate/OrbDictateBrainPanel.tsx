'use client'

import type { ReactNode } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

import type { OrbDictateBrainAnalysis, OrbDictateBrainSuggestion } from '@/lib/orb/dictate/orb-dictate-brain-analysis'

const PLACEHOLDER_CHIPS = [
  'Recording quality',
  'Missing information',
  'Safeguarding',
  'Child voice',
  'Manager oversight'
] as const

function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
  onApply
}: {
  suggestion: OrbDictateBrainSuggestion
  onAccept: () => void
  onReject: () => void
  onApply: () => void
}) {
  const resolved =
    suggestion.status === 'accepted' || suggestion.status === 'rejected' || suggestion.status === 'applied'

  return (
    <li
      className="rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface)] p-3 shadow-sm"
      data-orb-brain-suggestion={suggestion.id}
      data-orb-brain-suggestion-status={suggestion.status}
    >
      <p className="text-sm font-medium text-[var(--orb-foreground)]">{suggestion.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]">{suggestion.detail}</p>
      {!resolved ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-orb-brain-accept
            className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200"
            onClick={onAccept}
          >
            Accept
          </button>
          <button
            type="button"
            data-orb-brain-reject
            className="rounded-lg border border-[var(--orb-line)]/50 px-2.5 py-1 text-[11px] font-medium text-[var(--orb-muted)]"
            onClick={onReject}
          >
            Reject
          </button>
          <button
            type="button"
            data-orb-brain-apply
            className="rounded-lg border border-sky-400/35 bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-200"
            onClick={onApply}
          >
            Apply
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[10px] capitalize text-[var(--orb-muted)]">{suggestion.status}</p>
      )}
    </li>
  )
}

function AnalysisSection({
  title,
  children,
  dataAttr
}: {
  title: string
  children: ReactNode
  dataAttr?: string
}) {
  return (
    <section className="rounded-xl border border-[var(--orb-line)]/35 bg-[var(--orb-surface)]/60 p-3" data-orb-brain-section={dataAttr}>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">{title}</h4>
      <div className="mt-1.5 text-sm text-[var(--orb-foreground)]">{children}</div>
    </section>
  )
}

export function OrbDictateBrainPanel({
  analysis,
  loading,
  onSuggestionUpdate
}: {
  analysis: OrbDictateBrainAnalysis | null
  loading?: boolean
  onSuggestionUpdate: (id: string, status: OrbDictateBrainSuggestion['status']) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-orb-dictate-brain-panel>
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/40 px-4 py-3">
        <Sparkles className="h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">IndiCare Brain Analysis</h3>
          <p className="text-[11px] text-[var(--orb-muted)]">Professional review support — adult remains responsible</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--orb-muted)]" data-orb-brain-loading>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analysing transcript…
          </div>
        ) : !analysis ? (
          <div data-orb-brain-empty>
            <p className="text-sm text-[var(--orb-muted)]">
              Record or paste a transcript, then choose Analyse with ORB to review quality and safeguarding before drafting.
            </p>
            <div className="mt-4 flex flex-wrap gap-2" data-orb-brain-placeholder-chips>
              {PLACEHOLDER_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/80 px-2.5 py-1 text-[10px] text-[var(--orb-muted)]"
                  data-orb-brain-placeholder-chip={chip.toLowerCase().replace(/\s+/g, '-')}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnalysisSection title="Detected record type" dataAttr="record-type">
              <p data-orb-brain-record-type>{analysis.detected_record_type}</p>
            </AnalysisSection>

            <AnalysisSection title="Recording quality" dataAttr="quality">
              <p data-orb-brain-quality>
                {analysis.recording_quality_score === 'good'
                  ? 'Good — review before finalising'
                  : 'Needs review — check facts and gaps'}
              </p>
            </AnalysisSection>

            <AnalysisSection title="Child voice check" dataAttr="child-voice">
              <p className="text-xs leading-relaxed" data-orb-brain-child-voice>
                {analysis.child_voice_check}
              </p>
            </AnalysisSection>

            {analysis.safeguarding_concerns.length ? (
              <AnalysisSection title="Safeguarding concerns" dataAttr="safeguarding">
                <ul className="list-disc space-y-1 pl-4 text-xs text-amber-200/90">
                  {analysis.safeguarding_concerns.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </AnalysisSection>
            ) : null}

            {analysis.missing_information.length ? (
              <AnalysisSection title="Missing information" dataAttr="missing">
                <ul className="list-disc space-y-1 pl-4 text-xs">
                  {analysis.missing_information.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </AnalysisSection>
            ) : null}

            {analysis.manager_oversight_note ? (
              <AnalysisSection title="Manager oversight" dataAttr="manager">
                <p className="text-xs leading-relaxed">{analysis.manager_oversight_note}</p>
              </AnalysisSection>
            ) : null}

            {analysis.ofsted_evidence_check ? (
              <AnalysisSection title="Regulatory evidence" dataAttr="ofsted">
                <p className="text-xs leading-relaxed">{analysis.ofsted_evidence_check}</p>
              </AnalysisSection>
            ) : null}

            {analysis.professional_wording_suggestions.length ? (
              <section data-orb-brain-suggestions>
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
                  Professional wording suggestions
                </h4>
                <ul className="space-y-2">
                  {analysis.professional_wording_suggestions.map((s) => (
                    <SuggestionCard
                      key={s.id}
                      suggestion={s}
                      onAccept={() => onSuggestionUpdate(s.id, 'accepted')}
                      onReject={() => onSuggestionUpdate(s.id, 'rejected')}
                      onApply={() => onSuggestionUpdate(s.id, 'applied')}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {analysis.recommended_next_actions.length ? (
              <AnalysisSection title="Recommended next actions" dataAttr="actions">
                <ul className="list-disc space-y-1 pl-4 text-xs">
                  {analysis.recommended_next_actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </AnalysisSection>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
