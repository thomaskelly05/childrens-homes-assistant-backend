'use client'

import { Loader2, Sparkles } from 'lucide-react'

import type { OrbDictateBrainAnalysis, OrbDictateBrainSuggestion } from '@/lib/orb/dictate/orb-dictate-brain-analysis'

function SuggestionRow({
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
  const resolved = suggestion.status === 'accepted' || suggestion.status === 'rejected' || suggestion.status === 'applied'
  return (
    <li
      className="rounded-lg border border-[var(--orb-line)]/40 bg-[var(--orb-surface)] p-2"
      data-orb-brain-suggestion={suggestion.id}
      data-orb-brain-suggestion-status={suggestion.status}
    >
      <p className="text-xs font-medium text-[var(--orb-foreground)]">{suggestion.label}</p>
      <p className="mt-0.5 text-[11px] text-[var(--orb-muted)]">{suggestion.detail}</p>
      {!resolved ? (
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            data-orb-brain-accept
            className="rounded-md border border-emerald-400/30 px-2 py-0.5 text-[10px] text-emerald-200"
            onClick={onAccept}
          >
            Accept
          </button>
          <button
            type="button"
            data-orb-brain-reject
            className="rounded-md border border-[var(--orb-line)]/50 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
            onClick={onReject}
          >
            Reject
          </button>
          <button
            type="button"
            data-orb-brain-apply
            className="rounded-md border border-sky-400/30 px-2 py-0.5 text-[10px] text-sky-200"
            onClick={onApply}
          >
            Apply
          </button>
        </div>
      ) : (
        <p className="mt-1 text-[10px] capitalize text-[var(--orb-muted)]">{suggestion.status}</p>
      )}
    </li>
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
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/40 px-3 py-2">
        <Sparkles className="h-4 w-4 text-[var(--orb-primary)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
          IndiCare Brain Analysis
        </h3>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--orb-muted)]" data-orb-brain-loading>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analysing transcript…
          </div>
        ) : !analysis ? (
          <p className="text-[var(--orb-muted)]" data-orb-brain-empty>
            Record or paste a transcript, then generate to see analysis and suggestions.
          </p>
        ) : (
          <div className="space-y-4">
            <section data-orb-brain-record-type>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Detected record type</h4>
              <p className="mt-1 text-[var(--orb-foreground)]">{analysis.detected_record_type}</p>
            </section>

            <section data-orb-brain-quality>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Recording quality</h4>
              <p className="mt-1 text-[var(--orb-foreground)]">
                {analysis.recording_quality_score === 'good' ? 'Good — review before finalising' : 'Needs review — check facts and gaps'}
              </p>
            </section>

            <section data-orb-brain-child-voice>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Child voice check</h4>
              <p className="mt-1 text-xs text-[var(--orb-foreground)]">{analysis.child_voice_check}</p>
            </section>

            {analysis.safeguarding_concerns.length ? (
              <section data-orb-brain-safeguarding>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Safeguarding concerns</h4>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-amber-200/90">
                  {analysis.safeguarding_concerns.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {analysis.missing_information.length ? (
              <section data-orb-brain-missing>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Missing information</h4>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[var(--orb-foreground)]">
                  {analysis.missing_information.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {analysis.manager_oversight_note ? (
              <section data-orb-brain-manager>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Manager oversight</h4>
                <p className="mt-1 text-xs text-[var(--orb-foreground)]">{analysis.manager_oversight_note}</p>
              </section>
            ) : null}

            {analysis.ofsted_evidence_check ? (
              <section data-orb-brain-ofsted>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Ofsted / regulatory evidence</h4>
                <p className="mt-1 text-xs text-[var(--orb-foreground)]">{analysis.ofsted_evidence_check}</p>
              </section>
            ) : null}

            {analysis.professional_wording_suggestions.length ? (
              <section data-orb-brain-suggestions>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
                  Professional wording suggestions
                </h4>
                <ul className="mt-2 space-y-2">
                  {analysis.professional_wording_suggestions.map((s) => (
                    <SuggestionRow
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
              <section data-orb-brain-actions>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Recommended next actions</h4>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[var(--orb-foreground)]">
                  {analysis.recommended_next_actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
