'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Mic, Upload } from 'lucide-react'

import { OrbDictateBrainPanel } from '@/components/orb/dictate/OrbDictateBrainPanel'
import { OrbDictateRecordTypeSuggestion } from '@/components/orb/dictate/OrbDictateRecordTypeSuggestion'
import { OrbDictateRecentCaptures } from '@/components/orb/dictate/OrbDictateRecentCaptures'
import { OrbDictateReviewChecklist } from '@/components/orb/dictate/OrbDictateReviewChecklist'
import { OrbDictateSaferDraftPanel } from '@/components/orb/dictate/OrbDictateSaferDraftPanel'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbIcon } from '@/components/orb-residential/ui/orb-icon'
import { OrbStudioShell } from '@/components/orb/premium'
import {
  ORB_DICTATE_ADULT_RESPONSIBILITY,
  ORB_DICTATE_CAPTURE_AGAIN,
  ORB_DICTATE_CAPTURE_BOUNDARY,
  ORB_DICTATE_CAPTURE_HEADLINE,
  ORB_DICTATE_CAPTURE_JOURNEY,
  ORB_DICTATE_CAPTURE_SUBTITLE,
  ORB_DICTATE_CONSENT_REMINDER,
  ORB_DICTATE_CREATE_ROUGH_CAPTURE,
  ORB_DICTATE_CREATE_SAFER_DRAFT,
  ORB_DICTATE_EDIT_ROUGH_CAPTURE,
  ORB_DICTATE_NOT_YET_RECORD,
  ORB_DICTATE_PASTE_LABEL,
  ORB_DICTATE_PASTE_PLACEHOLDER,
  ORB_DICTATE_READY_TO_CAPTURE,
  ORB_DICTATE_RECORDING_LABEL,
  ORB_DICTATE_RECORDING_NOT_RECORD,
  ORB_DICTATE_REVIEW_SUPPORTING,
  ORB_DICTATE_REVIEW_TITLE,
  ORB_DICTATE_REVIEW_WITH_ORB,
  ORB_DICTATE_ROUGH_CAPTURE_TITLE,
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

type DictateStage = 'capture-station' | 'recording' | 'rough-capture' | 'orb-review' | 'safer-draft'

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
  const [reviewRequested, setReviewRequested] = useState(false)
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('speak')
  const [pasteDraft, setPasteDraft] = useState('')

  const committedText = props.transcript.trim()
  const hasCommittedCapture = committedText.length > 0
  const effectiveText = committedText || props.liveTranscript.trim()
  const hasDraft = Boolean(props.output)
  const hasAnalysis = Boolean(brainAnalysis) && !brainLoading
  const recordTypeId = recordTypeIdForStudioTemplate(props.selectedTemplateId)
  const draftText = props.editedNote || props.output?.professional_note || ''
  const isRecording = props.recordingActive || props.captureStarting

  const stage = useMemo((): DictateStage => {
    if (hasDraft) return 'safer-draft'
    if (reviewRequested && hasCommittedCapture) return 'orb-review'
    if (isRecording) return 'recording'
    if (hasCommittedCapture) return 'rough-capture'
    return 'capture-station'
  }, [hasCommittedCapture, hasDraft, isRecording, reviewRequested])

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
  }, [effectiveText, props.dictateMode, props.noteType, props.selectedTemplateId, recordTypeId])

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
    if (!reviewRequested) return
    if (!effectiveText || effectiveText.length < 20) {
      setBrainAnalysis(null)
      return
    }
    const timer = window.setTimeout(() => {
      void runAnalysis()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [effectiveText, props.output, reviewRequested, runAnalysis, recordTypeId])

  const handleCreateRoughCapture = useCallback(() => {
    const text = pasteDraft.trim()
    if (!text) return
    props.onTranscriptChange(text)
  }, [pasteDraft, props])

  const handleReviewWithOrb = useCallback(() => {
    setReviewRequested(true)
  }, [])

  const handleCreateDraft = useCallback(() => {
    if (hasAnalysis || brainAnalysis) {
      props.onGenerate()
      return
    }
    void runAnalysis().then(() => props.onGenerate())
  }, [brainAnalysis, hasAnalysis, props, runAnalysis])

  const handleCaptureAgain = useCallback(() => {
    props.onClearTranscript()
    setPasteDraft('')
    setReviewRequested(false)
    setBrainAnalysis(null)
    setCaptureMethod('speak')
  }, [props])

  const handleEditRoughCapture = useCallback(() => {
    setReviewRequested(false)
    setBrainAnalysis(null)
  }, [])

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

  const uploadPlaceholderOnly = props.uploadReady === false
  const showCaptureStation = stage === 'capture-station'
  const showRecording = stage === 'recording'
  const showRoughCapture = stage === 'rough-capture' || stage === 'orb-review' || stage === 'safer-draft'
  const showOrbReview = stage === 'orb-review' || (stage === 'safer-draft' && reviewRequested)
  const showSaferDraft = stage === 'safer-draft' && props.output

  return (
    <OrbStudioShell
      studioId="dictate"
      className="orb-dictate-studio-workspace orb-dictate-capture-workflow orb-dictate-staged-recording orb-workspace orb-workspace--dictate flex min-h-0 flex-1 flex-col overflow-hidden"
      data-orb-dictate-studio-workspace
      data-orb-dictate-capture-workflow
      data-orb-dictate-staged-recording
      data-orb-workspace-dictate
      data-orb-dictate-empty={showCaptureStation ? 'true' : undefined}
      data-orb-dictate-active-stage={stage}
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
        </header>

        {showCaptureStation ? (
          <>
            <section
              className="orb-dictate-capture-card orb-dictate-capture-station rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/80 p-5 shadow-sm"
              data-orb-dictate-capture-panel
              data-orb-dictate-capture-station
              data-orb-dictate-capture-canvas
            >
              <div
                className="orb-dictate-capture-methods flex flex-wrap justify-center gap-2"
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
                <div className="mt-5 text-center" data-orb-dictate-speak-panel>
                  <p className="text-sm font-medium text-[var(--orb-foreground)]" data-orb-dictate-ready-to-capture>
                    {ORB_DICTATE_READY_TO_CAPTURE}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-[var(--orb-primary)]" data-orb-dictate-rough-capture-label>
                    {ORB_DICTATE_SPEAK_ROUGH_LABEL}
                  </p>
                  <div className="mt-5 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      data-orb-dictate-top-record
                      data-orb-dictate-hero-record
                      disabled={props.speechStartDisabled}
                      className="orb-dictate-hero-record inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-105 disabled:opacity-50"
                      onClick={props.onStartRecording}
                      aria-label="Start recording"
                    >
                      <OrbIcon name="record" size="lg" className="text-white" />
                    </button>
                    <p className="text-[11px] text-[var(--orb-muted)]" data-orb-dictate-recording-status>
                      {props.micStatus || ORB_DICTATE_READY_TO_CAPTURE}
                    </p>
                  </div>
                </div>
              ) : null}

              {captureMethod === 'paste' ? (
                <div className="mt-4" data-orb-dictate-paste-panel>
                  <textarea
                    value={pasteDraft}
                    onChange={(e) => setPasteDraft(e.target.value)}
                    rows={8}
                    placeholder={ORB_DICTATE_PASTE_PLACEHOLDER}
                    className="orb-dictate-paste-input w-full resize-y rounded-xl border border-[var(--orb-line)]/25 bg-white/95 px-3 py-3 text-sm leading-relaxed text-[var(--orb-foreground)] outline-none focus:border-[var(--orb-primary)]/35 focus:ring-2 focus:ring-[var(--orb-primary)]/10"
                    data-orb-dictate-paste-notes
                  />
                  <button
                    type="button"
                    data-orb-dictate-create-rough-capture
                    disabled={!pasteDraft.trim()}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[var(--orb-primary)]/35 bg-[var(--orb-primary-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--orb-foreground)] disabled:opacity-45"
                    onClick={handleCreateRoughCapture}
                  >
                    {ORB_DICTATE_CREATE_ROUGH_CAPTURE}
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

              <p className="mt-4 text-center text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-consent-reminder>
                {ORB_DICTATE_CONSENT_REMINDER}
              </p>
            </section>

            <OrbDictateRecentCaptures />
          </>
        ) : null}

        {showRecording ? (
          <section
            className="orb-dictate-recording-stage rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/80 p-5 shadow-sm"
            data-orb-dictate-recording-stage
          >
            <p className="text-center text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-recording-label>
              {ORB_DICTATE_RECORDING_LABEL}
            </p>
            <p className="mt-1 text-center text-[11px] text-[var(--orb-muted)]" data-orb-dictate-recording-not-record>
              {ORB_DICTATE_RECORDING_NOT_RECORD}
            </p>
            <div className="mt-5 flex flex-col items-center gap-3">
              {props.captureStarting ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--orb-line)]/40">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--orb-muted)]" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    data-orb-dictate-top-record
                    className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-700"
                    onClick={props.onStopRecording}
                  >
                    <span className="orb-dictate-recording-pulse inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-hidden />
                    {props.formatTimer(props.timerSec)}
                  </button>
                  <div className="flex items-center gap-2">
                    {props.recordingPaused ? (
                      <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={props.onResumeRecording}>
                        Resume
                      </button>
                    ) : (
                      <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={props.onPauseRecording}>
                        Pause
                      </button>
                    )}
                    <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={props.onStopRecording}>
                      Stop
                    </button>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-[var(--orb-muted)]" data-orb-dictate-recording-status>
                {props.recordingPaused ? 'Paused' : props.recordingActive ? 'Recording' : 'Starting…'}
              </p>
              {props.liveTranscript || props.interimText ? (
                <div className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/15 bg-white/90 p-3 text-left text-sm leading-relaxed" data-orb-dictate-live-transcript>
                  {props.liveTranscript ? <p className="whitespace-pre-wrap">{props.liveTranscript}</p> : null}
                  {props.interimText ? (
                    <p className="mt-1 text-[var(--orb-muted)] opacity-80">{props.interimText}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {showRoughCapture ? (
          <section
            className="orb-dictate-rough-capture-stage rounded-2xl border border-[var(--orb-line)]/15 bg-[var(--orb-surface)]/80 p-4 shadow-sm"
            data-orb-dictate-rough-capture-stage
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--orb-foreground)]" data-orb-dictate-rough-capture-title>
                  {ORB_DICTATE_ROUGH_CAPTURE_TITLE}
                </h3>
                <p className="mt-0.5 text-[11px] font-medium text-[var(--orb-primary)]" data-orb-dictate-not-yet-record>
                  {ORB_DICTATE_NOT_YET_RECORD}
                </p>
              </div>
            </div>
            <div
              className="mt-3 rounded-xl border border-[var(--orb-line)]/15 bg-white/95 p-3 text-sm leading-relaxed"
              data-orb-dictate-rough-capture-body
            >
              <textarea
                value={props.transcript}
                onChange={(e) => props.onTranscriptChange(e.target.value)}
                rows={6}
                className="w-full resize-y border-0 bg-transparent outline-none"
                aria-label="Rough capture text"
                data-orb-dictate-rough-capture-text
              />
            </div>

            {stage === 'rough-capture' ? (
              <>
                <div className="mt-4">
                  <OrbDictateRecordTypeSuggestion
                    selectedTemplateId={props.selectedTemplateId}
                    onSelectTemplate={handleTemplateSelect}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-orb-dictate-review-with-orb
                    disabled={!hasCommittedCapture || props.generating}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-45"
                    onClick={handleReviewWithOrb}
                  >
                    {ORB_DICTATE_REVIEW_WITH_ORB}
                  </button>
                  <button
                    type="button"
                    data-orb-dictate-capture-again
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/30 bg-white/80 px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
                    onClick={handleCaptureAgain}
                  >
                    {ORB_DICTATE_CAPTURE_AGAIN}
                  </button>
                </div>
              </>
            ) : null}
          </section>
        ) : null}

        {showOrbReview ? (
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
              <OrbDictateReviewChecklist analysis={brainAnalysis} hasTranscript={hasCommittedCapture} loading={brainLoading} />
            </div>

            {!hasDraft ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-orb-dictate-create-draft-action
                  disabled={props.generating || !governanceOk || !hasCommittedCapture}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-45"
                  onClick={handleCreateDraft}
                >
                  {props.generating ? 'Creating draft…' : ORB_DICTATE_CREATE_SAFER_DRAFT}
                </button>
                <button
                  type="button"
                  data-orb-dictate-edit-rough-capture
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/30 bg-white/80 px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
                  onClick={handleEditRoughCapture}
                >
                  {ORB_DICTATE_EDIT_ROUGH_CAPTURE}
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
                  hasTranscript={hasCommittedCapture}
                  embedded
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {showSaferDraft ? (
          <OrbDictateSaferDraftPanel
            output={props.output!}
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
        data-orb-dictate-designed-workflow
        data-orb-dictate-journey={ORB_DICTATE_CAPTURE_JOURNEY}
      >
        <span data-orb-dictate-stage="capture-station" data-orb-dictate-journey-step="capture">
          Capture Station
        </span>
        <span data-orb-dictate-stage="recording" data-orb-dictate-journey-step="recording">
          Recording
        </span>
        <span data-orb-dictate-stage="rough-capture" data-orb-dictate-journey-step="rough-capture">
          Rough Capture
        </span>
        <span data-orb-dictate-stage="orb-review" data-orb-dictate-journey-step="orb-review">
          ORB Review
        </span>
        <span data-orb-dictate-stage="safer-draft" data-orb-dictate-journey-step="safer-draft">
          Safer Draft
        </span>
      </section>
    </OrbStudioShell>
  )
}
