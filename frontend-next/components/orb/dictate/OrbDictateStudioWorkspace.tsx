'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Mic, Upload } from 'lucide-react'

import { OrbDictateBrainPanel } from '@/components/orb/dictate/OrbDictateBrainPanel'
import { OrbDictateRecordTypeSuggestion } from '@/components/orb/dictate/OrbDictateRecordTypeSuggestion'
import { OrbDictateReviewChecklist } from '@/components/orb/dictate/OrbDictateReviewChecklist'
import { OrbDictateSaferDraftPanel } from '@/components/orb/dictate/OrbDictateSaferDraftPanel'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbIcon } from '@/components/orb-residential/ui/orb-icon'
import { OrbStudioShell } from '@/components/orb/premium'
import {
  ORB_DICTATE_ADULT_RESPONSIBILITY,
  ORB_DICTATE_CAPTURE_BOUNDARY,
  ORB_DICTATE_CAPTURE_HEADLINE,
  ORB_DICTATE_CAPTURE_JOURNEY,
  ORB_DICTATE_CAPTURE_SUBTITLE,
  ORB_DICTATE_CAPTURE_SUPPORTING,
  ORB_DICTATE_CONSENT_REMINDER,
  ORB_DICTATE_PASTE_LABEL,
  ORB_DICTATE_PASTE_PLACEHOLDER,
  ORB_DICTATE_REVIEW_SUPPORTING,
  ORB_DICTATE_REVIEW_TITLE,
  ORB_DICTATE_REVIEW_WITH_ORB,
  ORB_DICTATE_SPEAK_GUIDANCE,
  ORB_DICTATE_SPEAK_LABEL,
  ORB_DICTATE_SPEAK_ROUGH_LABEL,
  ORB_DICTATE_STORY_LINE,
  ORB_DICTATE_UPLOAD_BOUNDARY,
  ORB_DICTATE_UPLOAD_LABEL,
  ORB_DICTATE_UPLOAD_PLACEHOLDER
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import {
  buildBrainAnalysisFromGenerate,
  type OrbDictateBrainAnalysis,
  type OrbDictateBrainSuggestion
} from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import { analyzeOrbDictateSession } from '@/lib/orb/dictate/orb-dictate-client'
import {
  recordTypeIdForStudioTemplate,
  templateById,
  type OrbDictateStudioTemplate
} from '@/lib/orb/dictate/orb-dictate-studio-templates'
import type { OrbDictateMode, OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'
import { suggestParticipantsFromText } from '@/lib/orb/dictate/orb-dictate-speaker'
import type { OrbDictateGenerateResult, OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import {
  OrbDictateAudioUpload,
  OrbDictateGovernanceConsent,
  OrbDictateParticipantsPanel,
  consentReadyForGenerate
} from '@/components/orb-standalone/orb-dictate-station-extras'
import { OrbDictateDocumentReference } from '@/components/orb-standalone/orb-dictate-document-reference'

export type OrbDictateStudioWorkspaceProps = {
  selectedTemplateId: string
  onTemplateChange: (template: OrbDictateStudioTemplate) => void
  noteType: OrbDictateNoteType
  dictateMode: OrbDictateMode
  transcript: string
  liveTranscript: string
  onTranscriptChange: (value: string) => void
  segments: OrbDictateTranscriptSegment[]
  onSegmentsChange: (segments: OrbDictateTranscriptSegment[]) => void
  participants: OrbDictateParticipant[]
  onParticipantsChange: (participants: OrbDictateParticipant[]) => void
  recordingActive: boolean
  recordingPaused: boolean
  captureStarting: boolean
  timerSec: number
  formatTimer: (s: number) => string
  micStatus: string
  orbClass: string
  onStartRecording: () => void
  onPauseRecording: () => void
  onResumeRecording: () => void
  onStopRecording: () => void
  onClearTranscript: () => void
  speechStartDisabled?: boolean
  interimText?: string
  generating: boolean
  onGenerate: () => void
  onFinalise: () => void
  onCopy: () => void
  onSave: () => void
  canGenerate: boolean
  output: OrbDictateGenerateResult | null
  editedNote?: string
  generatedTypes: OrbDictateNoteType[]
  onSelectOutputType: (noteType: OrbDictateNoteType) => void
  onSuggestionsChange: (suggestions: OrbDictateBrainSuggestion[]) => void
  authorityConsent: boolean
  investigationConfirmed: boolean
  draftReviewConfirmed: boolean
  participantsAware: boolean
  noAutoSubmitConfirmed: boolean
  onAuthorityConsentChange: (v: boolean) => void
  onInvestigationChange: (v: boolean) => void
  onDraftReviewChange: (v: boolean) => void
  onParticipantsAwareChange: (v: boolean) => void
  onNoAutoSubmitChange: (v: boolean) => void
  onAudioUpload: (file: File) => void
  uploadingAudio: boolean
  uploadFileLabel: string | null
  uploadError: string | null
  uploadReady?: boolean
}

type CaptureMethod = 'speak' | 'paste' | 'upload'

function OrbDictateAdvancedOptions(props: OrbDictateStudioWorkspaceProps & { effectiveText: string }) {
  return (
    <details className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-advanced-options>
      <summary className="cursor-pointer font-medium hover:text-[var(--orb-foreground)]">Advanced options</summary>
      <div className="mt-2 space-y-2">
        <OrbDictateParticipantsPanel
          participants={props.participants}
          onChange={props.onParticipantsChange}
          transcript={props.effectiveText}
          onImportFromTranscript={() => {
            props.onParticipantsChange(suggestParticipantsFromText(props.effectiveText))
          }}
        />
        <OrbDictateDocumentReference />
        <OrbDictateGovernanceConsent
          mode={props.dictateMode}
          authorityConsent={props.authorityConsent}
          investigationConfirmed={props.investigationConfirmed}
          draftReviewConfirmed={props.draftReviewConfirmed}
          participantsAwareConfirmed={props.participantsAware}
          noAutoSubmitConfirmed={props.noAutoSubmitConfirmed}
          onAuthorityConsentChange={props.onAuthorityConsentChange}
          onInvestigationChange={props.onInvestigationChange}
          onDraftReviewChange={props.onDraftReviewChange}
          onParticipantsAwareChange={props.onParticipantsAwareChange}
          onNoAutoSubmitChange={props.onNoAutoSubmitChange}
        />
      </div>
    </details>
  )
}

export function OrbDictateStudioWorkspace(props: OrbDictateStudioWorkspaceProps) {
  const [brainAnalysis, setBrainAnalysis] = useState<OrbDictateBrainAnalysis | null>(null)
  const [brainLoading, setBrainLoading] = useState(false)
  const [analysisRequested, setAnalysisRequested] = useState(false)
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('speak')
  const [pasteDraft, setPasteDraft] = useState('')

  const effectiveText = props.liveTranscript.trim() || props.transcript.trim() || pasteDraft.trim()
  const hasTranscript = effectiveText.length > 0
  const hasDraft = Boolean(props.output)
  const hasAnalysis = Boolean(brainAnalysis) && !brainLoading
  const recordTypeId = recordTypeIdForStudioTemplate(props.selectedTemplateId)
  const draftText = props.editedNote || props.output?.professional_note || ''

  const updateSuggestion = useCallback(
    (id: string, status: OrbDictateBrainSuggestion['status']) => {
      setBrainAnalysis((prev) => {
        if (!prev) return prev
        const nextSuggestions = prev.professional_wording_suggestions.map((s) =>
          s.id === id ? { ...s, status } : s
        )
        props.onSuggestionsChange(nextSuggestions)
        return { ...prev, professional_wording_suggestions: nextSuggestions }
      })
    },
    [props]
  )

  const runAnalysis = useCallback(async () => {
    if (!effectiveText) return
    setBrainLoading(true)
    setAnalysisRequested(true)
    try {
      const result = await analyzeOrbDictateSession({
        input_text: effectiveText,
        note_type: props.noteType,
        mode: props.dictateMode,
        template_id: props.selectedTemplateId,
        record_type_id: recordTypeId
      })
      setBrainAnalysis(result)
    } catch {
      setBrainAnalysis(
        buildBrainAnalysisFromGenerate({
          noteType: props.noteType,
          recordTypeId,
          qualityChecks: {
            child_voice: 'review',
            safeguarding: 'review',
            manager_oversight: 'missing',
            impact: 'weak',
            recording_quality: 'needs_review'
          },
          summary: '',
          actions: []
        })
      )
    } finally {
      setBrainLoading(false)
    }
  }, [effectiveText, props.noteType, props.dictateMode, props.selectedTemplateId, recordTypeId])

  useEffect(() => {
    if (props.output) {
      setBrainAnalysis(
        buildBrainAnalysisFromGenerate({
          noteType: props.output.note_type,
          recordTypeId,
          qualityChecks: props.output.quality_checks,
          summary: props.output.summary,
          actions: props.output.actions,
          ofstedLens: props.output.ofsted_lens
        })
      )
      return
    }
    if (!effectiveText || effectiveText.length < 20) {
      setBrainAnalysis(null)
      setAnalysisRequested(false)
      return
    }
    if (!analysisRequested) return
    const timer = window.setTimeout(() => {
      void runAnalysis()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [effectiveText, props.output, analysisRequested, runAnalysis, recordTypeId])

  const handleReviewWithOrb = useCallback(() => {
    if (captureMethod === 'paste' && pasteDraft.trim() && !props.transcript.trim()) {
      props.onTranscriptChange(pasteDraft.trim())
    }
    void runAnalysis()
  }, [captureMethod, pasteDraft, props, runAnalysis])

  const handleCreateDraft = useCallback(() => {
    if (hasAnalysis || brainAnalysis) {
      props.onGenerate()
      return
    }
    void runAnalysis().then(() => props.onGenerate())
  }, [brainAnalysis, hasAnalysis, props, runAnalysis])

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const template = templateById(templateId)
      if (template) props.onTemplateChange(template)
    },
    [props]
  )

  const governanceOk = consentReadyForGenerate(props.dictateMode, {
    authorityConsent: props.authorityConsent,
    draftReviewConfirmed: props.draftReviewConfirmed,
    participantsAwareConfirmed: props.participantsAware,
    noAutoSubmitConfirmed: props.noAutoSubmitConfirmed,
    investigationConfirmed: props.investigationConfirmed
  })

  const activeStage = useMemo(() => {
    if (hasDraft) return 'safer-draft'
    if (hasAnalysis || analysisRequested) return 'orb-review'
    return 'capture'
  }, [analysisRequested, hasAnalysis, hasDraft])

  const uploadPlaceholderOnly = props.uploadReady === false

  return (
    <OrbStudioShell
      studioId="dictate"
      className="orb-dictate-studio-workspace orb-dictate-capture-workflow orb-workspace orb-workspace--dictate flex min-h-0 flex-1 flex-col overflow-hidden"
      data-orb-dictate-studio-workspace
      data-orb-dictate-capture-workflow
      data-orb-workspace-dictate
      data-orb-dictate-empty={!hasTranscript ? 'true' : undefined}
      data-orb-dictate-active-stage={activeStage}
    >
      <div className="orb-dictate-capture-column mx-auto flex min-h-0 w-full max-w-[var(--orb-res-chat-column-max,47.5rem)] flex-1 flex-col gap-4 overflow-y-auto px-3 py-4 sm:px-4">
        <header className="orb-dictate-capture-hero text-center" data-orb-dictate-capture-hero>
          <div className="mx-auto mb-2 flex justify-center">
            <GlassOrbMark size="sm" pulse={props.recordingActive} aria-hidden />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-[var(--orb-foreground)]" data-orb-dictate-title>
            {ORB_DICTATE_CAPTURE_HEADLINE}
          </h2>
          <p className="mt-1 text-sm text-[var(--orb-muted)]" data-orb-dictate-subtitle-header>
            {ORB_DICTATE_CAPTURE_SUBTITLE}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-capture-supporting>
            {ORB_DICTATE_CAPTURE_SUPPORTING}
          </p>
          <nav
            className="orb-dictate-workflow orb-dictate-workflow--phase3l mt-3 inline-flex flex-wrap items-center justify-center gap-1 text-[11px] font-medium"
            aria-label="Dictate journey"
            data-orb-dictate-designed-workflow
            data-orb-dictate-journey={ORB_DICTATE_CAPTURE_JOURNEY}
          >
            <span data-orb-dictate-journey-step="capture" data-orb-dictate-stage="capture">
              Capture
            </span>
            <span aria-hidden className="text-[var(--orb-muted)]">→</span>
            <span data-orb-dictate-journey-step="orb-review" data-orb-dictate-stage="orb-review">
              ORB Review
            </span>
            <span aria-hidden className="text-[var(--orb-muted)]">→</span>
            <span data-orb-dictate-journey-step="safer-draft" data-orb-dictate-stage="safer-draft">
              Safer Draft
            </span>
          </nav>
        </header>

        <section
          className="orb-dictate-capture-card rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/80 p-4 shadow-sm"
          data-orb-dictate-capture-panel
          data-orb-dictate-capture-canvas
        >
          <div
            className="orb-dictate-capture-methods flex flex-wrap gap-2"
            role="tablist"
            aria-label="Capture methods"
            data-orb-dictate-capture-methods
          >
            {(
              [
                { id: 'speak' as const, label: ORB_DICTATE_SPEAK_LABEL, icon: Mic },
                { id: 'paste' as const, label: ORB_DICTATE_PASTE_LABEL, icon: null },
                { id: 'upload' as const, label: ORB_DICTATE_UPLOAD_LABEL, icon: Upload }
              ] as const
            ).map((method) => (
              <button
                key={method.id}
                type="button"
                role="tab"
                aria-selected={captureMethod === method.id}
                data-orb-dictate-capture-method={method.id}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  captureMethod === method.id
                    ? 'border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                    : 'border-[var(--orb-line)]/30 bg-white/80 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
                }`}
                onClick={() => setCaptureMethod(method.id)}
              >
                {method.icon ? <method.icon className="h-3.5 w-3.5" aria-hidden /> : null}
                {method.label}
              </button>
            ))}
          </div>

          {captureMethod === 'speak' ? (
            <div className="mt-4 text-center" data-orb-dictate-speak-panel>
              <p className="text-xs text-[var(--orb-muted)]" data-orb-dictate-speak-guidance>
                {ORB_DICTATE_SPEAK_GUIDANCE}
              </p>
              <p className="mt-1 text-[10px] font-medium text-[var(--orb-primary)]" data-orb-dictate-rough-capture-label>
                {ORB_DICTATE_SPEAK_ROUGH_LABEL}
              </p>
              <div className="mt-4 flex flex-col items-center gap-2">
                {!props.recordingActive && !props.captureStarting ? (
                  <button
                    type="button"
                    data-orb-dictate-top-record
                    disabled={props.speechStartDisabled}
                    className="orb-dictate-hero-record inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-105 disabled:opacity-50"
                    onClick={props.onStartRecording}
                    aria-label="Start recording"
                  >
                    <OrbIcon name="record" size="lg" className="text-white" />
                  </button>
                ) : props.captureStarting ? (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--orb-line)]/40">
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--orb-muted)]" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-orb-dictate-top-record
                      className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-700"
                      onClick={props.onStopRecording}
                    >
                      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden />
                      {props.formatTimer(props.timerSec)}
                    </button>
                    {props.recordingPaused ? (
                      <button type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={props.onResumeRecording}>
                        Resume
                      </button>
                    ) : (
                      <button type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={props.onPauseRecording}>
                        Pause
                      </button>
                    )}
                    <button type="button" className="rounded-lg border px-2 py-1 text-xs" onClick={props.onStopRecording}>
                      Stop
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-recording-status>
                  {props.recordingActive
                    ? props.recordingPaused
                      ? 'Paused'
                      : 'Recording'
                    : props.micStatus || 'Ready to capture'}
                </p>
              </div>
              {effectiveText ? (
                <div className="mt-4 rounded-xl border border-[var(--orb-line)]/15 bg-white/90 p-3 text-left text-sm leading-relaxed" data-orb-dictate-live-transcript>
                  <p className="whitespace-pre-wrap">{props.liveTranscript || props.transcript}</p>
                  {props.interimText ? (
                    <p className="mt-1 text-[var(--orb-muted)] opacity-80">{props.interimText}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {captureMethod === 'paste' ? (
            <div className="mt-4" data-orb-dictate-paste-panel>
              <textarea
                value={pasteDraft || props.transcript}
                onChange={(e) => {
                  setPasteDraft(e.target.value)
                  props.onTranscriptChange(e.target.value)
                }}
                rows={8}
                placeholder={ORB_DICTATE_PASTE_PLACEHOLDER}
                className="orb-dictate-paste-input w-full resize-y rounded-xl border border-[var(--orb-line)]/25 bg-white/95 px-3 py-3 text-sm leading-relaxed text-[var(--orb-foreground)] outline-none focus:border-[var(--orb-primary)]/35 focus:ring-2 focus:ring-[var(--orb-primary)]/10"
                data-orb-dictate-paste-notes
              />
              <button
                type="button"
                data-orb-dictate-review-with-orb
                disabled={!effectiveText.trim() || props.generating}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[var(--orb-primary)]/35 bg-[var(--orb-primary-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--orb-foreground)] disabled:opacity-45"
                onClick={handleReviewWithOrb}
              >
                {props.generating ? 'Reviewing…' : ORB_DICTATE_REVIEW_WITH_ORB}
              </button>
            </div>
          ) : null}

          {captureMethod === 'upload' ? (
            <div className="mt-4" data-orb-dictate-upload-panel>
              {uploadPlaceholderOnly ? (
                <p className="rounded-xl border border-dashed border-[var(--orb-line)]/35 bg-white/70 px-4 py-6 text-center text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-upload-placeholder>
                  {ORB_DICTATE_UPLOAD_PLACEHOLDER}
                </p>
              ) : (
                <>
                  <OrbDictateAudioUpload
                    variant="capture"
                    onFile={props.onAudioUpload}
                    uploading={props.uploadingAudio}
                    fileLabel={props.uploadFileLabel}
                    error={props.uploadError}
                  />
                  <p className="mt-2 text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-upload-boundary>
                    {ORB_DICTATE_UPLOAD_BOUNDARY}
                  </p>
                </>
              )}
            </div>
          ) : null}

          <p className="mt-4 text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-consent-reminder>
            {ORB_DICTATE_CONSENT_REMINDER}
          </p>
        </section>

        {hasTranscript ? (
          <OrbDictateRecordTypeSuggestion
            selectedTemplateId={props.selectedTemplateId}
            onSelectTemplate={handleTemplateSelect}
          />
        ) : null}

        <section
          className="orb-dictate-orb-review-stage rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/60 p-4"
          data-orb-dictate-review-panel
          data-orb-dictate-orb-review-stage
        >
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-review-label>
            {ORB_DICTATE_REVIEW_TITLE}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-review-supporting>
            {ORB_DICTATE_REVIEW_SUPPORTING}
          </p>

          <div className="mt-4">
            <OrbDictateReviewChecklist analysis={brainAnalysis} hasTranscript={hasTranscript} loading={brainLoading} />
          </div>

          {hasTranscript ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                data-orb-dictate-generate
                data-orb-dictate-review-with-orb
                disabled={props.generating || !hasTranscript}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-primary)]/35 bg-[var(--orb-primary-soft)] px-3 py-2 text-xs font-semibold disabled:opacity-45"
                onClick={handleReviewWithOrb}
              >
                {brainLoading ? 'Reviewing…' : ORB_DICTATE_REVIEW_WITH_ORB}
              </button>
              <button
                type="button"
                data-orb-dictate-create-draft-action
                disabled={props.generating || !governanceOk || !hasTranscript}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-45"
                onClick={handleCreateDraft}
              >
                {props.generating ? 'Creating draft…' : 'Create safer draft'}
              </button>
            </div>
          ) : null}

          {brainAnalysis ? (
            <div className="mt-4 border-t border-[var(--orb-line)]/15 pt-4">
              <OrbDictateBrainPanel
                analysis={brainAnalysis}
                loading={brainLoading}
                onSuggestionUpdate={updateSuggestion}
                studioTemplateId={props.selectedTemplateId}
                recordTypeId={recordTypeId}
                hasTranscript={hasTranscript}
                embedded
              />
            </div>
          ) : null}
        </section>

        {hasDraft && props.output ? (
          <OrbDictateSaferDraftPanel
            output={props.output}
            draftText={draftText}
            templateId={props.selectedTemplateId}
            onCopy={props.onCopy}
            onSave={props.onSave}
            onOpenInWrite={props.onFinalise}
            saving={props.generating}
          />
        ) : null}

        <footer className="orb-dictate-capture-footer space-y-2 pb-2 text-center" data-orb-dictate-safety-footer>
          <p className="text-[11px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-boundary-line>
            {ORB_DICTATE_CAPTURE_BOUNDARY}
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-adult-responsibility>
            {ORB_DICTATE_ADULT_RESPONSIBILITY}
          </p>
          <p className="text-[10px] italic text-[var(--orb-muted)]/90" data-orb-dictate-story-line>
            {ORB_DICTATE_STORY_LINE}
          </p>
          <OrbDictateAdvancedOptions {...props} effectiveText={effectiveText} />
        </footer>
      </div>

      <section
        className="orb-dictate-stage-map sr-only"
        aria-hidden
        data-orb-dictate-stage-interface
        data-orb-dictate-journey={ORB_DICTATE_CAPTURE_JOURNEY}
      >
        <span data-orb-dictate-stage="capture">Capture</span>
        <span data-orb-dictate-stage="orb-review">ORB Review</span>
        <span data-orb-dictate-stage="safer-draft">Safer Draft</span>
      </section>
    </OrbStudioShell>
  )
}
