'use client'

import { useCallback, useEffect, useState } from 'react'

import { OrbDictateBrainPanel } from '@/components/orb/dictate/OrbDictateBrainPanel'
import { OrbDictateSuggestedOutputs } from '@/components/orb/dictate/OrbDictateSuggestedOutputs'
import { OrbDictateTopBar } from '@/components/orb/dictate/OrbDictateTopBar'
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
import type { OrbDictateStudioTemplate } from '@/lib/orb/dictate/orb-dictate-studio-templates'
import type { OrbDictateMode, OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'
import { suggestParticipantsFromText } from '@/lib/orb/dictate/orb-dictate-speaker'
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
  const [showPreview, setShowPreview] = useState(false)

  const effectiveText = props.liveTranscript.trim() || props.transcript.trim()

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

  useEffect(() => {
    if (props.output) {
      setBrainAnalysis(
        buildBrainAnalysisFromGenerate({
          noteType: props.output.note_type,
          qualityChecks: props.output.quality_checks,
          summary: props.output.summary,
          actions: props.output.actions,
          ofstedLens: props.output.ofsted_lens
        })
      )
      setShowPreview(true)
      return
    }
    if (!effectiveText || effectiveText.length < 20) {
      setBrainAnalysis(null)
      return
    }
    const timer = window.setTimeout(() => {
      setBrainLoading(true)
      void analyzeOrbDictateSession({
        input_text: effectiveText,
        note_type: props.noteType,
        mode: props.dictateMode
      })
        .then((result) => setBrainAnalysis(result))
        .catch(() => {
          setBrainAnalysis(
            buildBrainAnalysisFromGenerate({
              noteType: props.noteType,
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
        })
        .finally(() => setBrainLoading(false))
    }, 800)
    return () => window.clearTimeout(timer)
  }, [effectiveText, props.output, props.noteType, props.dictateMode])

  const governanceOk = consentReadyForGenerate(props.dictateMode, {
    authorityConsent: props.authorityConsent,
    draftReviewConfirmed: props.draftReviewConfirmed,
    participantsAwareConfirmed: props.participantsAware,
    noAutoSubmitConfirmed: props.noAutoSubmitConfirmed,
    investigationConfirmed: props.investigationConfirmed
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden" data-orb-dictate-studio-workspace>
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
        onGenerate={props.onGenerate}
        onFinalise={props.onFinalise}
        generating={props.generating}
        canGenerate={props.canGenerate && governanceOk}
        canFinalise={Boolean(props.output)}
        speechStartDisabled={props.speechStartDisabled}
      />

      <OrbResizableWorkspace
        showPreview={showPreview}
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
            captureStarting={props.captureStarting}
            timerSec={props.timerSec}
            formatTimer={props.formatTimer}
            micStatus={props.micStatus}
            orbClass={props.orbClass}
            onStartRecording={props.onStartRecording}
            onPauseRecording={props.onPauseRecording}
            onResumeRecording={props.onResumeRecording}
            onStopRecording={props.onStopRecording}
            onClearTranscript={props.onClearTranscript}
            speechStartDisabled={props.speechStartDisabled}
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
        preview={
          <OrbDictateSuggestedOutputs
            activeNoteType={props.noteType}
            generatedTypes={props.generatedTypes}
            onSelectOutput={props.onSelectOutputType}
            disabled={props.generating}
          />
        }
      />

      <details className="shrink-0 rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)] p-2 text-xs">
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
