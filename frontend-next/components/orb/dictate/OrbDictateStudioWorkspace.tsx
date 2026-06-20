'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { OrbDictateBrainPanel } from '@/components/orb/dictate/OrbDictateBrainPanel'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { useOrbDictatePanelLayout } from '@/components/orb/dictate/OrbDictatePanelLayoutControl'
import { OrbDictateSuggestedOutputs } from '@/components/orb/dictate/OrbDictateSuggestedOutputs'
import {
  OrbDictateTopBar,
  type OrbDictatePrimaryAction
} from '@/components/orb/dictate/OrbDictateTopBar'
import { OrbTranscriptPanel } from '@/components/orb/dictate/OrbTranscriptPanel'
import { OrbStudioShell } from '@/components/orb/premium'
import { ORB_RESIDENTIAL_DICTATE_COPY } from '@/lib/orb/orb-residential-copy'
import { ORB_DICTATE_RESPONSIBILITY, ORB_DICTATE_SUBTITLE, ORB_DICTATE_TITLE } from '@/lib/orb/orb-user-facing-names'
import { OrbResizableWorkspace } from '@/components/orb/resizable-panels/orb-resizable-workspace'
import {
  OrbDictateAudioUpload,
  OrbDictateGovernanceConsent,
  OrbDictateParticipantsPanel,
  consentReadyForGenerate
} from '@/components/orb-standalone/orb-dictate-station-extras'
import { OrbDictateDocumentReference } from '@/components/orb-standalone/orb-dictate-document-reference'
import {
  buildBrainAnalysisFromGenerate,
  type OrbDictateBrainAnalysis,
  type OrbDictateBrainSuggestion
} from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import { analyzeOrbDictateSession } from '@/lib/orb/dictate/orb-dictate-client'
import {
  readOrbDictateFocusMode,
  writeOrbDictateFocusMode
} from '@/lib/orb/dictate/orb-dictate-focus-mode'
import {
  recordTypeIdForStudioTemplate,
  type OrbDictateStudioTemplate
} from '@/lib/orb/dictate/orb-dictate-studio-templates'
import type { OrbDictateMode, OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'
import { suggestParticipantsFromText } from '@/lib/orb/dictate/orb-dictate-speaker'
import { writeOrbSidebarCollapsed } from '@/lib/orb/orb-sidebar-preference'
import type { OrbDictateGenerateResult, OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'

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
  canGenerate: boolean
  output: OrbDictateGenerateResult | null
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
}

function OrbDictateAdvancedOptions(props: OrbDictateStudioWorkspaceProps & { effectiveText: string }) {
  return (
    <details
      className="text-[10px] text-[var(--orb-muted)]"
      data-orb-dictate-advanced-options
    >
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
        <OrbDictateAudioUpload
          onFile={props.onAudioUpload}
          uploading={props.uploadingAudio}
          fileLabel={props.uploadFileLabel}
          error={props.uploadError}
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
  const [focusMode, setFocusMode] = useState(false)
  const { layout: panelLayout, updateLayout: updatePanelLayout } = useOrbDictatePanelLayout()

  const effectiveText = props.liveTranscript.trim() || props.transcript.trim()
  const hasTranscript = effectiveText.length > 0
  const hasDraft = Boolean(props.output)
  const hasAnalysis = Boolean(brainAnalysis) && !brainLoading
  const recordTypeId = recordTypeIdForStudioTemplate(props.selectedTemplateId)

  useEffect(() => {
    setFocusMode(readOrbDictateFocusMode())
  }, [])

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

  const primaryAction: OrbDictatePrimaryAction = useMemo(() => {
    if (!hasTranscript) return 'disabled'
    if (hasAnalysis || hasDraft) return 'generate'
    return 'analyse'
  }, [hasTranscript, hasDraft, hasAnalysis])

  const handlePrimaryAction = useCallback(() => {
    if (!hasTranscript) return
    if (primaryAction === 'analyse') {
      void runAnalysis()
      return
    }
    props.onGenerate()
  }, [hasTranscript, primaryAction, props, runAnalysis])

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev
      writeOrbDictateFocusMode(next)
      writeOrbSidebarCollapsed(next)
      return next
    })
  }, [])

  const governanceOk = consentReadyForGenerate(props.dictateMode, {
    authorityConsent: props.authorityConsent,
    draftReviewConfirmed: props.draftReviewConfirmed,
    participantsAwareConfirmed: props.participantsAware,
    noAutoSubmitConfirmed: props.noAutoSubmitConfirmed,
    investigationConfirmed: props.investigationConfirmed
  })

  const advancedFooter = <OrbDictateAdvancedOptions {...props} effectiveText={effectiveText} />

  return (
    <OrbStudioShell
      studioId="dictate"
      className="orb-dictate-studio-workspace orb-workspace orb-workspace--dictate flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-1 sm:px-2"
      data-orb-dictate-studio-workspace
      data-orb-workspace-dictate
      data-orb-dictate-focus-mode={focusMode ? 'true' : 'false'}
      data-orb-dictate-empty={!hasTranscript ? 'true' : undefined}
      style={{ minHeight: 'min(100dvh - 4.5rem, calc(100svh - 4.5rem))' }}
    >
      <header className="orb-dictate-hero-strip shrink-0 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/80 px-3 py-3 sm:px-4" data-orb-dictate-hero-strip>
        <div className="flex min-w-0 items-start gap-3">
          <GlassOrbMark size="sm" pulse className="shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--orb-foreground)]" data-orb-dictate-title>
              {ORB_DICTATE_TITLE === 'Dictate' ? 'ORB Dictate' : ORB_DICTATE_TITLE}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-subtitle-header>
              {ORB_DICTATE_SUBTITLE}
            </p>
          </div>
        </div>
      </header>

      <OrbDictateTopBar
        selectedTemplateId={props.selectedTemplateId}
        onTemplateChange={props.onTemplateChange}
        recordingActive={props.recordingActive}
        recordingPaused={props.recordingPaused}
        captureStarting={props.captureStarting}
        timerSec={props.timerSec}
        formatTimer={props.formatTimer}
        onStartRecording={props.onStartRecording}
        onPauseRecording={props.onPauseRecording}
        onResumeRecording={props.onResumeRecording}
        onStopRecording={props.onStopRecording}
        onPrimaryAction={handlePrimaryAction}
        onFinalise={props.onFinalise}
        generating={props.generating || brainLoading}
        hasTranscript={hasTranscript}
        hasAnalysis={hasAnalysis}
        hasDraft={hasDraft}
        primaryAction={primaryAction}
        speechStartDisabled={props.speechStartDisabled}
        focusMode={focusMode}
        onToggleFocusMode={toggleFocusMode}
        panelLayout={panelLayout}
        onPanelLayoutChange={updatePanelLayout}
      />

      <OrbResizableWorkspace
        hidePresetToolbar
        layout={panelLayout}
        onLayoutChange={updatePanelLayout}
        showPreview={false}
        minPanelHeight="min(74dvh, calc(100svh - 8.5rem))"
        left={
          <div className="flex min-h-0 flex-col gap-2" data-orb-dictate-capture-panel>
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]" data-orb-dictate-capture-label>
                Capture
              </p>
              <p className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-adult-review-reminder>
                {ORB_DICTATE_RESPONSIBILITY}
              </p>
            </div>
            <div
              className="orb-dictate-capture-affordances flex flex-wrap items-center gap-2 rounded-lg border border-[var(--orb-line)]/35 bg-[var(--orb-surface)]/50 px-3 py-2"
              data-orb-dictate-capture-affordances
            >
              <OrbDictateAudioUpload
                onFile={props.onAudioUpload}
                uploading={props.uploadingAudio}
                fileLabel={props.uploadFileLabel}
                error={props.uploadError}
              />
              <p className="text-[10px] text-[var(--orb-muted)]">Or paste notes in the transcript area below.</p>
            </div>
            <OrbTranscriptPanel
            liveTranscript={props.liveTranscript}
            transcript={props.transcript}
            onTranscriptChange={props.onTranscriptChange}
            segments={props.segments}
            participants={props.participants}
            onSegmentsChange={props.onSegmentsChange}
            onParticipantsChange={props.onParticipantsChange}
            recordingActive={props.recordingActive}
            recordingPaused={props.recordingPaused}
            timerSec={props.timerSec}
            formatTimer={props.formatTimer}
            micStatus={props.micStatus}
            onClearTranscript={props.onClearTranscript}
            interimText={props.interimText}
            footerSlot={advancedFooter}
            />
          </div>
        }
        right={
          <div className="flex min-h-0 flex-col gap-2" data-orb-dictate-review-panel>
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--orb-muted)]" data-orb-dictate-review-label>
              ORB Review
            </p>
            <OrbDictateBrainPanel
            analysis={brainAnalysis}
            loading={brainLoading}
            onSuggestionUpdate={updateSuggestion}
            studioTemplateId={props.selectedTemplateId}
            recordTypeId={recordTypeId}
            onAnalyse={handlePrimaryAction}
            hasTranscript={hasTranscript}
          />
          </div>
        }
      />

      {hasTranscript ? (
        <div
          className="orb-studio-action-rail shrink-0 px-1 py-1"
          data-orb-dictate-action-rail
        >
          <OrbDictateSuggestedOutputs
            variant="rail"
            activeNoteType={props.noteType}
            studioTemplateId={props.selectedTemplateId}
            generatedTypes={props.generatedTypes}
            onSelectOutput={props.onSelectOutputType}
            disabled={props.generating || !governanceOk}
          />
        </div>
      ) : null}
      <p className="orb-workspace-station-safety shrink-0 px-2 pb-2 text-center text-xs text-[var(--orb-muted)]" data-orb-dictate-safety-footer>
        {ORB_RESIDENTIAL_DICTATE_COPY.responsibility}
      </p>
    </OrbStudioShell>
  )
}
