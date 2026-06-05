'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { OrbDictateBrainPanel } from '@/components/orb/dictate/OrbDictateBrainPanel'
import { OrbDictateSelectedTemplateCard } from '@/components/orb/dictate/OrbDictateSelectedTemplateCard'
import { OrbDictateSuggestedOutputs } from '@/components/orb/dictate/OrbDictateSuggestedOutputs'
import {
  OrbDictateTopBar,
  type OrbDictatePrimaryAction
} from '@/components/orb/dictate/OrbDictateTopBar'
import { OrbTranscriptPanel } from '@/components/orb/dictate/OrbTranscriptPanel'
import { OrbResizableWorkspace } from '@/components/orb/resizable-panels/orb-resizable-workspace'
import {
  OrbDictateAudioUpload,
  OrbDictateGovernanceConsent,
  OrbDictateParticipantsPanel,
  consentReadyForGenerate
} from '@/components/orb-standalone/orb-dictate-station-extras'
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

export function OrbDictateStudioWorkspace(props: OrbDictateStudioWorkspaceProps) {
  const [brainAnalysis, setBrainAnalysis] = useState<OrbDictateBrainAnalysis | null>(null)
  const [brainLoading, setBrainLoading] = useState(false)
  const [analysisRequested, setAnalysisRequested] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  const effectiveText = props.liveTranscript.trim() || props.transcript.trim()
  const hasTranscript = effectiveText.length > 0
  const hasDraft = Boolean(props.output)
  const hasAnalysis = Boolean(brainAnalysis) && !brainLoading

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
        record_type_id: recordTypeIdForStudioTemplate(props.selectedTemplateId)
      })
      setBrainAnalysis(result)
    } catch {
      setBrainAnalysis(
        buildBrainAnalysisFromGenerate({
          noteType: props.noteType,
          recordTypeId: recordTypeIdForStudioTemplate(props.selectedTemplateId),
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
  }, [effectiveText, props.noteType, props.dictateMode])

  useEffect(() => {
    if (props.output) {
      setBrainAnalysis(
        buildBrainAnalysisFromGenerate({
          noteType: props.output.note_type,
          recordTypeId: recordTypeIdForStudioTemplate(props.selectedTemplateId),
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
  }, [effectiveText, props.output, analysisRequested, runAnalysis])

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

  return (
    <div
      className="orb-dictate-studio-workspace flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-1 sm:px-2"
      data-orb-dictate-studio-workspace
      data-orb-dictate-focus-mode={focusMode ? 'true' : 'false'}
      style={{ minHeight: 'min(100dvh - 7rem, calc(100svh - 7rem))' }}
    >
      <OrbDictateSelectedTemplateCard
        studioTemplateId={props.selectedTemplateId}
        recordTypeId={recordTypeIdForStudioTemplate(props.selectedTemplateId)}
      />

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
      />

      <OrbResizableWorkspace
        compactPresets
        showPreview={false}
        left={
          <OrbTranscriptPanel
            liveTranscript={props.liveTranscript}
            transcript={props.transcript}
            onTranscriptChange={props.onTranscriptChange}
            segments={props.segments}
            participants={props.participants}
            onSegmentsChange={props.onSegmentsChange}
            recordingActive={props.recordingActive}
            recordingPaused={props.recordingPaused}
            timerSec={props.timerSec}
            formatTimer={props.formatTimer}
            micStatus={props.micStatus}
            onClearTranscript={props.onClearTranscript}
            interimText={props.interimText}
          />
        }
        right={
          <OrbDictateBrainPanel
            analysis={brainAnalysis}
            loading={brainLoading}
            onSuggestionUpdate={updateSuggestion}
          />
        }
      />

      {hasTranscript ? (
        <div
          className="shrink-0 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/80 px-3 py-2.5"
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

      <details
        className="shrink-0 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)] p-2 text-xs"
        data-orb-dictate-advanced-options
      >
        <summary className="cursor-pointer font-medium text-[var(--orb-muted)]">Advanced options</summary>
        <div className="mt-2 space-y-2">
          <OrbDictateParticipantsPanel
            participants={props.participants}
            onChange={props.onParticipantsChange}
            transcript={effectiveText}
            onImportFromTranscript={() => {
              props.onParticipantsChange(suggestParticipantsFromText(effectiveText))
            }}
          />
          <OrbDictateAudioUpload
            onFile={props.onAudioUpload}
            uploading={props.uploadingAudio}
            fileLabel={props.uploadFileLabel}
            error={props.uploadError}
          />
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
    </div>
  )
}
