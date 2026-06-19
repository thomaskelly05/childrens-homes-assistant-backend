'use client'

import { useState, type ReactNode } from 'react'
import { Loader2, PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react'

import type { OrbDictateBrainAnalysis, OrbDictateBrainSuggestion } from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import { ORB_RESIDENTIAL_DICTATE_COPY, orbResidentialReviewChecks } from '@/lib/orb/orb-residential-copy'
import {
  orbRecordingSuggestedOutputs,
  resolveOrbRecordingRecordType
} from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordTypeId } from '@/lib/orb/recording/orb-recording-types'

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

function BrainEmptyState({
  studioTemplateId,
  recordTypeId,
  onAnalyse,
  analysing
}: {
  studioTemplateId: string
  recordTypeId: OrbRecordingRecordTypeId | string
  onAnalyse?: () => void
  analysing?: boolean
}) {
  const recordType = resolveOrbRecordingRecordType({ studioTemplateId, recordTypeId })
  const orbChecks = orbResidentialReviewChecks(recordType.id)
  const outputs = orbRecordingSuggestedOutputs(recordType.id)

  return (
    <div data-orb-brain-empty>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Selected record type</p>
      <p className="mt-1 text-sm font-semibold text-[var(--orb-foreground)]" data-orb-brain-record-type-empty>
        {recordType.label}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]">{recordType.when_to_use}</p>

      <section className="mt-4" data-orb-brain-empty-orb-checks>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
          What ORB will help you check
        </h4>
        <ul className="mt-1.5 space-y-1.5 text-xs text-[var(--orb-foreground)]">
          {orbChecks.map((check) => (
            <li key={check} data-orb-brain-orb-check-empty data-orb-brain-check-item>
              {check}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4" data-orb-brain-empty-outputs>
        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
          Suggested outputs
        </h4>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {outputs.map((o) => (
            <li
              key={o.id}
              className="rounded-full border border-[var(--orb-line)]/40 px-2 py-0.5 text-[10px] text-[var(--orb-muted)]"
              data-orb-brain-suggested-output-empty
            >
              {o.label}
            </li>
          ))}
        </ul>
      </section>

      {onAnalyse ? (
        <button
          type="button"
          data-orb-brain-analyse-cta
          disabled={analysing}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--orb-primary)]/45 bg-[var(--orb-primary-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--orb-foreground)] disabled:opacity-50"
          onClick={onAnalyse}
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          {analysing ? 'Reviewing…' : 'Review with ORB'}
        </button>
      ) : (
        <p className="mt-4 text-xs text-[var(--orb-muted)]">
          Add speech or notes, then choose Review with ORB in the top bar.
        </p>
      )}
    </div>
  )
}

export function OrbDictateBrainPanel({
  analysis,
  loading,
  onSuggestionUpdate,
  studioTemplateId,
  recordTypeId,
  onAnalyse,
  hasTranscript
}: {
  analysis: OrbDictateBrainAnalysis | null
  loading?: boolean
  onSuggestionUpdate: (id: string, status: OrbDictateBrainSuggestion['status']) => void
  studioTemplateId?: string
  recordTypeId?: OrbRecordingRecordTypeId | string
  onAnalyse?: () => void
  hasTranscript?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--orb-line)]/25 bg-[var(--orb-surface)]/70"
      data-orb-dictate-brain-panel
      data-orb-dictate-side-panel
      data-orb-dictate-brain-collapsed={collapsed ? 'true' : 'false'}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/25 px-3 py-2">
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--orb-foreground)]">ORB Review</h3>
          {!collapsed ? (
            <p className="truncate text-[10px] text-[var(--orb-muted)]">
              {ORB_RESIDENTIAL_DICTATE_COPY.reviewHint} You remain responsible for the final record.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
          onClick={() => setCollapsed((open) => !open)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Show ORB analysis panel' : 'Hide ORB analysis panel'}
          data-orb-dictate-brain-collapse-toggle
        >
          {collapsed ? <PanelRightOpen className="h-4 w-4" aria-hidden /> : <PanelRightClose className="h-4 w-4" aria-hidden />}
        </button>
      </header>

      {!collapsed ? (
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--orb-muted)]" data-orb-brain-loading>
            <Loader2 className="h-4 w-4 animate-spin" />
            Reviewing with ORB…
          </div>
        ) : !analysis ? (
          studioTemplateId && recordTypeId ? (
            <BrainEmptyState
              studioTemplateId={studioTemplateId}
              recordTypeId={recordTypeId}
              onAnalyse={hasTranscript ? onAnalyse : undefined}
              analysing={loading}
            />
          ) : (
            <div data-orb-brain-empty>
              <p className="text-sm text-[var(--orb-muted)]">
                Add speech or notes, then review with ORB before creating a draft record.
              </p>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <AnalysisSection title="Record type" dataAttr="record-type">
              <p data-orb-brain-record-type>{analysis.detected_record_type}</p>
            </AnalysisSection>

            {analysis.required_sections?.length ? (
              <AnalysisSection title="Required sections" dataAttr="required-sections">
                <ul className="list-disc space-y-1 pl-4 text-xs">
                  {analysis.required_sections.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </AnalysisSection>
            ) : null}

            {analysis.orb_will_check?.length ? (
              <AnalysisSection title="What ORB will help you check" dataAttr="orb-checks">
                <ul className="space-y-1.5 text-xs">
                  {analysis.orb_will_check.map((c) => (
                    <li key={c} data-orb-brain-orb-check data-orb-brain-check-item>
                      {c}
                    </li>
                  ))}
                </ul>
              </AnalysisSection>
            ) : null}

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
              <AnalysisSection title="Suggested next actions" dataAttr="actions">
                <ul className="list-disc space-y-1 pl-4 text-xs">
                  {analysis.recommended_next_actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </AnalysisSection>
            ) : null}

            {analysis.possible_outputs.length ? (
              <AnalysisSection title="Suggested outputs" dataAttr="outputs">
                <ul className="flex flex-wrap gap-1.5">
                  {analysis.possible_outputs.map((o) => (
                    <li
                      key={o}
                      className="rounded-full border border-[var(--orb-line)]/40 px-2 py-0.5 text-[10px]"
                      data-orb-brain-suggested-output
                    >
                      {o}
                    </li>
                  ))}
                </ul>
              </AnalysisSection>
            ) : null}

            {analysis.recording_quality_guidance ? (
              <AnalysisSection title="Recording guidance" dataAttr="guidance">
                <p className="text-xs leading-relaxed" data-orb-brain-quality-guidance>
                  {analysis.recording_quality_guidance}
                </p>
              </AnalysisSection>
            ) : null}
          </div>
        )}
      </div>
      ) : null}
    </div>
  )
}
