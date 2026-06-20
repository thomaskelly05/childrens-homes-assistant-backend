'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { OrbDictateBrainPanel } from '@/components/orb/dictate/OrbDictateBrainPanel'
import { OrbDictatePrivacyStrip } from '@/components/orb/dictate/OrbDictatePrivacyStrip'
import { useOrbDictatePanelLayout } from '@/components/orb/dictate/OrbDictatePanelLayoutControl'
import { OrbDictateSuggestedOutputs } from '@/components/orb/dictate/OrbDictateSuggestedOutputs'
import {
  OrbDictateTopBar,
  type OrbDictatePrimaryAction
} from '@/components/orb/dictate/OrbDictateTopBar'
import { OrbTranscriptPanel } from '@/components/orb/dictate/OrbTranscriptPanel'
import { OrbStudioShell } from '@/components/orb/premium'
import { OrbWorkflowStrip, resolveDictateWorkflowStep } from '@/components/orb/premium/orb-workflow-strip'
import { ORB_RESIDENTIAL_DICTATE_COPY } from '@/lib/orb/orb-residential-copy'
import { ORB_DICTATE_SUBTITLE, ORB_DICTATE_TITLE } from '@/lib/orb/orb-user-facing-names'
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
      <header className="orb-flagship-page-header shrink-0 px-1 sm:px-0" data-orb-flagship-dictate-header>
        <h2 className="orb-flagship-page-title" data-orb-dictate-flagship-title>
          {ORB_DICTATE_TITLE}
        </h2>
        <p className="orb-flagship-page-lead" data-orb-dictate-flagship-subtitle>
          {ORB_DICTATE_SUBTITLE}
        </p>
      </header>
      <div className="shrink-0 px-1 sm:px-0">
        <OrbWorkflowStrip
          activeStep={resolveDictateWorkflowStep({ hasTranscript, hasAnalysis, hasDraft })}
        />
        <p
          className="mt-1 text-xs leading-relaxed text-[var(--orb-muted)]"
          data-orb-dictate-subtitle
        >
          {ORB_RESIDENTIAL_DICTATE_COPY.subtitle}
        </p>
        <p
          className="mt-1 text-[10px] leading-relaxed text-[var(--orb-muted)]"
          data-orb-dictate-responsibility-strip
        >
          {ORB_RESIDENTIAL_DICTATE_COPY.responsibility}
        </p>
      </div>

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

      <OrbDictatePrivacyStrip />

      <OrbResizableWorkspace
        hidePresetToolbar
        layout={panelLayout}
        onLayoutChange={updatePanelLayout}
        showPreview={false}
        minPanelHeight="min(74dvh, calc(100svh - 8.5rem))"
        left={
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
        }
        right={
          <OrbDictateBrainPanel
            analysis={brainAnalysis}
            loading={brainLoading}
            onSuggestionUpdate={updateSuggestion}
            studioTemplateId={props.selectedTemplateId}
            recordTypeId={recordTypeId}
            onAnalyse={handlePrimaryAction}
            hasTranscript={hasTranscript}
          />
        }
      />

      {hasTranscript ? (
        <div
          className="orb-studio-action-rail shrink-0 rounded-lg border border-[var(--orb-line)]/35 bg-[var(--orb-surface-elevated)]/60 px-2.5 py-1.5"
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
    </OrbStudioShell>
  )
}
