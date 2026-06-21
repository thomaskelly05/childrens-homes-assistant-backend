'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { OrbDictateBrainPanel } from '@/components/orb/dictate/OrbDictateBrainPanel'
import { OrbDictateMissingInfoReview } from '@/components/orb/dictate/OrbDictateMissingInfoReview'
import { OrbDictateCaptureStation } from '@/components/orb/dictate/OrbDictateCaptureStation'
import { OrbDictateDocumentWorkspace } from '@/components/orb/dictate/OrbDictateDocumentWorkspace'
import { OrbDictateProcessingStages } from '@/components/orb/dictate/OrbDictateProcessingStages'
import { OrbDictateReviewChecklist } from '@/components/orb/dictate/OrbDictateReviewChecklist'
import { OrbDictateSaferDraftPanel } from '@/components/orb/dictate/OrbDictateSaferDraftPanel'
import { type OrbDictateCaptureSource } from '@/components/orb/dictate/OrbDictateTranscriptWorkspace'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import { OrbStudioShell } from '@/components/orb/premium'
import {
  ORB_DICTATE_ADULT_RESPONSIBILITY,
  ORB_DICTATE_CAPTURE_BOUNDARY,
  ORB_DICTATE_CAPTURE_HEADLINE,
  ORB_DICTATE_CAPTURE_JOURNEY,
  ORB_DICTATE_CAPTURE_SUBTITLE,
  ORB_DICTATE_DOCUMENT_WORKSPACE_TITLE,
  ORB_DICTATE_DOCUMENT_STRUCTURE_UPDATED,
  ORB_DICTATE_CREATE_SAFER_DRAFT,
  ORB_DICTATE_EDIT_OFFLINE_NOTE,
  ORB_DICTATE_EDIT_ROUGH_CAPTURE,
  ORB_DICTATE_RECORDING_LABEL,
  ORB_DICTATE_RECORDING_NOT_RECORD,
  ORB_DICTATE_REVIEW_SUPPORTING,
  ORB_DICTATE_REVIEW_TITLE,
  ORB_DICTATE_STORY_LINE,
  ORB_DICTATE_WORKING_DOC_PARTIAL,
  ORB_DICTATE_WORKING_DOC_UPDATED,
  type OrbDictateContentSource,
  type OrbDictateProcessingStageId
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import {
  buildBrainAnalysisFromGenerate,
  type OrbDictateBrainAnalysis,
  type OrbDictateBrainSuggestion
} from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import {
  analyzeOrbDictateSession,
  type GenerateOrbDictatePayload
} from '@/lib/orb/dictate/orb-dictate-client'
import {
  applyDictateIntelligenceEdit,
  buildDictateIntelligenceRequest,
  ORB_DICTATE_INTELLIGENCE_SLOW_MESSAGE,
  requestWorkingDocumentFromOrb,
  type OrbDictateIntelligenceRequest
} from '@/lib/orb/dictate/orb-dictate-intelligence'
import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'
import {
  recordTypeIdForStudioTemplate,
  templateById,
  type OrbDictateStudioTemplate
} from '@/lib/orb/dictate/orb-dictate-studio-templates'
import type { OrbDictateMode, OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'
import { suggestParticipantsFromText } from '@/lib/orb/dictate/orb-dictate-speaker'
import type { OrbDictateGenerateResult, OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import {
  buildInitialWorkingDocument,
  isWorkingDocumentUnmappedScaffold,
  reshapeWorkingDocument,
  workingDocumentTypeLabel
} from '@/lib/orb/dictate/orb-dictate-working-document'
import type { OrbDictateRecordingMedia } from '@/lib/orb/dictate/orb-dictate-recording-media'
import type { OrbDictateTranscriptBundle } from '@/lib/orb/dictate/orb-dictate-transcript-privacy'
import type { OrbDictatePersonConfirmItem } from '@/lib/orb/dictate/orb-dictate-people-identification'
import {
  OrbDictateGovernanceConsent,
  OrbDictateParticipantsPanel
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
  onGenerate: (overrides?: Partial<GenerateOrbDictatePayload>) => void
  onFinalise: () => void
  onCopy: () => void
  onSave: () => void
  onEditedNoteChange?: (text: string) => void
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
  recordingMedia?: OrbDictateRecordingMedia | null
  contentSource?: OrbDictateContentSource
  onClearRecording?: () => void
  onContentSourceChange?: (source: OrbDictateContentSource) => void
  processingStage?: OrbDictateProcessingStageId | null
  peopleToConfirm?: OrbDictatePersonConfirmItem[]
  onPeopleToConfirmChange?: (items: OrbDictatePersonConfirmItem[]) => void
  transcriptBundle?: OrbDictateTranscriptBundle | null
}

type CaptureMethod = 'speak' | 'paste' | 'upload'

type DictateStage = 'capture-station' | 'recording' | 'transcript-workspace' | 'orb-review' | 'safer-draft'

const DEFAULT_IMPROVE_INSTRUCTION =
  'Improve and structure this capture for an adult-reviewed residential childcare record.'

function editModeForInstruction(instruction: string): OrbDictateEditMode | undefined {
  const lower = instruction.toLowerCase()
  if (lower.includes('missing')) return 'missing_information'
  if (lower.includes('child-centred') || lower.includes('child centred')) return 'child_voice'
  if (lower.includes('judgemental') || lower.includes('judgmental')) return 'less_judgemental'
  if (lower.includes('professional')) return 'professional_language'
  if (lower.includes('daily record')) return 'professional_language'
  if (lower.includes('incident')) return 'professional_language'
  if (lower.includes('missing from home')) return 'professional_language'
  return undefined
}

function templateIdFromInstruction(instruction: string): string | null {
  const lower = instruction.toLowerCase()
  if (lower.includes('missing from home')) return 'missing'
  if (lower.includes('change this into a daily record') || lower.includes('daily record')) return 'daily_record'
  if (lower.includes('incident')) return 'incident'
  if (lower.includes('key-work') || lower.includes('keywork')) return 'keywork'
  if (lower.includes('safeguarding')) return 'safeguarding'
  if (lower.includes('handover')) return 'handover'
  if (lower.includes('supervision')) return 'supervision_prep'
  if (lower.includes('manager oversight') || lower.includes('manager')) return 'manager'
  return null
}

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
  const [captureSource, setCaptureSource] = useState<OrbDictateCaptureSource>('speak')
  const [pasteDraft, setPasteDraft] = useState('')
  const [orbInstruction, setOrbInstruction] = useState('')
  const [workingDocument, setWorkingDocument] = useState('')
  const [hasAdultEditedWorkingDocument, setHasAdultEditedWorkingDocument] = useState(false)
  const lastAutoDocumentRef = useRef('')
  const [applyingEdit, setApplyingEdit] = useState(false)
  const [structuringDocument, setStructuringDocument] = useState(false)
  const [structuringSlow, setStructuringSlow] = useState(false)
  const [editNote, setEditNote] = useState<string | null>(null)
  const [applyStatus, setApplyStatus] = useState<string | null>(null)

  const intelligenceRequest = useMemo(
    (): OrbDictateIntelligenceRequest =>
      buildDictateIntelligenceRequest({
        templateId: props.selectedTemplateId,
        transcript: props.transcript,
        transcriptBundle: props.transcriptBundle,
        workingDocument,
        adultInstruction: orbInstruction,
        peopleToConfirm: props.peopleToConfirm,
        recordingMedia: props.recordingMedia,
        contentSource: props.contentSource,
        noteType: props.noteType,
        segments: props.segments,
        participants: props.participants
      }),
    [
      orbInstruction,
      props.contentSource,
      props.noteType,
      props.participants,
      props.peopleToConfirm,
      props.recordingMedia,
      props.segments,
      props.selectedTemplateId,
      props.transcript,
      props.transcriptBundle,
      workingDocument
    ]
  )

  const committedText = props.transcript.trim()
  const isProcessingCapture = Boolean(props.processingStage) && props.processingStage !== 'ready'
  const hasCommittedCapture = committedText.length > 0 || isProcessingCapture
  const workingDocumentText = workingDocument.trim()
  const reviewInputText = workingDocumentText || committedText
  const effectiveText = committedText || props.liveTranscript.trim()
  const hasDraft = Boolean(props.output)
  const hasAnalysis = Boolean(brainAnalysis) && !brainLoading
  const recordTypeId = recordTypeIdForStudioTemplate(props.selectedTemplateId)
  const draftText = props.editedNote || props.output?.professional_note || workingDocumentText || ''
  const isRecording = props.recordingActive || props.captureStarting

  const stage = useMemo((): DictateStage => {
    if (hasDraft) return 'safer-draft'
    if (reviewRequested && hasCommittedCapture) return 'orb-review'
    if (isRecording) return 'recording'
    if (hasCommittedCapture) return 'transcript-workspace'
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

  useEffect(() => {
    if (!hasCommittedCapture) {
      setWorkingDocument('')
      setHasAdultEditedWorkingDocument(false)
      lastAutoDocumentRef.current = ''
      return
    }
    if (!committedText) return
    if (hasAdultEditedWorkingDocument) return

    const localNext = buildInitialWorkingDocument(committedText, props.selectedTemplateId)
    const shouldReplace =
      !workingDocument.trim() ||
      isWorkingDocumentUnmappedScaffold(workingDocument) ||
      workingDocument === lastAutoDocumentRef.current

    if (shouldReplace) {
      lastAutoDocumentRef.current = localNext
      setWorkingDocument(localNext)
    }

    let cancelled = false
    let slowTimer: number | undefined
    setStructuringDocument(true)
    setStructuringSlow(false)
    slowTimer = window.setTimeout(() => {
      if (!cancelled) setStructuringSlow(true)
    }, 4000)

    void requestWorkingDocumentFromOrb({
      ...buildDictateIntelligenceRequest({
        templateId: props.selectedTemplateId,
        transcript: props.transcript,
        transcriptBundle: props.transcriptBundle,
        peopleToConfirm: props.peopleToConfirm,
        recordingMedia: props.recordingMedia,
        contentSource: props.contentSource,
        noteType: props.noteType,
        segments: props.segments,
        participants: props.participants
      })
    }).then((result) => {
      if (cancelled || hasAdultEditedWorkingDocument) return
      if (result.workingDocument.trim()) {
        lastAutoDocumentRef.current = result.workingDocument
        setWorkingDocument(result.workingDocument)
      }
      if (result.usedFallback && result.offlineNote) setEditNote(result.offlineNote)
    }).finally(() => {
      if (!cancelled) {
        setStructuringDocument(false)
        setStructuringSlow(false)
      }
      if (slowTimer) window.clearTimeout(slowTimer)
    })

    return () => {
      cancelled = true
      if (slowTimer) window.clearTimeout(slowTimer)
    }
  }, [
    committedText,
    hasAdultEditedWorkingDocument,
    hasCommittedCapture,
    props.contentSource,
    props.noteType,
    props.participants,
    props.peopleToConfirm,
    props.recordingMedia,
    props.segments,
    props.selectedTemplateId,
    props.transcript,
    props.transcriptBundle
  ])

  const handleWorkingDocumentChange = useCallback((value: string) => {
    setWorkingDocument(value)
    if (value.trim() !== lastAutoDocumentRef.current.trim()) {
      setHasAdultEditedWorkingDocument(true)
    }
  }, [])

  useEffect(() => {
    if (workingDocumentText) {
      props.onEditedNoteChange?.(workingDocument)
    }
  }, [props.onEditedNoteChange, workingDocument, workingDocumentText])

  const runAnalysis = useCallback(async () => {
    if (!reviewInputText) return
    setBrainLoading(true)
    try {
      const result = await analyzeOrbDictateSession({
        input_text: reviewInputText,
        note_type: props.noteType,
        mode: props.dictateMode,
        template_id: props.selectedTemplateId,
        record_type_id: recordTypeId,
        adult_instruction: orbInstruction.trim() || undefined
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
          summary: orbInstruction.trim()
            ? `Adult instruction: ${orbInstruction.trim()}`
            : 'Review the working document for missing residential record detail.',
          actions: []
        })
      )
    } finally {
      setBrainLoading(false)
    }
  }, [orbInstruction, props.dictateMode, props.noteType, props.selectedTemplateId, recordTypeId, reviewInputText])

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
    if (!reviewInputText) {
      setBrainAnalysis(null)
      return
    }
    const timer = window.setTimeout(() => {
      void runAnalysis()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [reviewInputText, props.output, reviewRequested, runAnalysis, recordTypeId])

  const applyOrbChange = useCallback(
    async (instruction: string) => {
      const resolvedInstruction = instruction.trim() || DEFAULT_IMPROVE_INSTRUCTION
      if (!props.transcript.trim() && !workingDocumentText) return

      const templateHint = templateIdFromInstruction(resolvedInstruction)
      if (templateHint) {
        const template = templateById(templateHint)
        if (template) props.onTemplateChange(template)
      }

      setApplyingEdit(true)
      setEditNote(null)
      setApplyStatus(null)
      const mode = editModeForInstruction(resolvedInstruction)
      const request = buildDictateIntelligenceRequest({
        templateId: templateHint || props.selectedTemplateId,
        transcript: props.transcript,
        transcriptBundle: props.transcriptBundle,
        workingDocument,
        adultInstruction: resolvedInstruction,
        peopleToConfirm: props.peopleToConfirm,
        recordingMedia: props.recordingMedia,
        contentSource: props.contentSource,
        noteType: props.noteType,
        segments: props.segments,
        participants: props.participants
      })

      try {
        const result = await applyDictateIntelligenceEdit(request, resolvedInstruction, mode)
        setWorkingDocument(result.workingDocument)
        setApplyStatus(ORB_DICTATE_WORKING_DOC_UPDATED)
        if (result.usedFallback && result.offlineNote) setEditNote(result.offlineNote)
      } finally {
        setApplyingEdit(false)
      }
    },
    [props, workingDocument, workingDocumentText]
  )

  const handleCreateRoughCapture = useCallback(() => {
    const text = pasteDraft.trim()
    if (!text) return
    setCaptureSource('paste')
    props.onContentSourceChange?.('paste')
    props.onTranscriptChange(text)
    const next = buildInitialWorkingDocument(text, props.selectedTemplateId)
    lastAutoDocumentRef.current = next
    setHasAdultEditedWorkingDocument(false)
    setWorkingDocument(next)
    setPasteDraft('')
  }, [pasteDraft, props])

  const handleReviewWithOrb = useCallback(() => {
    setReviewRequested(true)
  }, [])

  const handleApplyOrbChange = useCallback(() => {
    void applyOrbChange(orbInstruction)
  }, [applyOrbChange, orbInstruction])

  const handleCreateDraft = useCallback(() => {
    const text = workingDocumentText || committedText
    props.onEditedNoteChange?.(text)
    if (hasAnalysis || brainAnalysis) {
      props.onGenerate({ input_text: text })
      return
    }
    void runAnalysis().then(() => props.onGenerate({ input_text: text }))
  }, [brainAnalysis, committedText, hasAnalysis, props, runAnalysis, workingDocumentText])

  const handleCaptureAgain = useCallback(() => {
    props.onClearTranscript()
    setPasteDraft('')
    setOrbInstruction('')
    setWorkingDocument('')
    setHasAdultEditedWorkingDocument(false)
    lastAutoDocumentRef.current = ''
    setEditNote(null)
    setApplyStatus(null)
    setReviewRequested(false)
    setBrainAnalysis(null)
    setCaptureMethod('speak')
    setCaptureSource('speak')
    props.onClearRecording?.()
  }, [props])

  const handleEditTranscript = useCallback(() => {
    setReviewRequested(false)
    setBrainAnalysis(null)
  }, [])

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      const template = templateById(templateId)
      if (template) props.onTemplateChange(template)
      const next = hasAdultEditedWorkingDocument
        ? reshapeWorkingDocument(
            workingDocument || buildInitialWorkingDocument(committedText, templateId),
            templateId,
            committedText
          )
        : buildInitialWorkingDocument(committedText, templateId)
      lastAutoDocumentRef.current = next
      setWorkingDocument(next)
      setApplyStatus(ORB_DICTATE_DOCUMENT_STRUCTURE_UPDATED)
    },
    [committedText, hasAdultEditedWorkingDocument, props, workingDocument]
  )

  const handleStartRecording = useCallback(() => {
    setCaptureSource('speak')
    props.onStartRecording()
  }, [props])

  const showCaptureStation = stage === 'capture-station'
  const showRecording = stage === 'recording'
  const showDocumentWorkspace = stage === 'transcript-workspace' || stage === 'orb-review' || stage === 'safer-draft'
  const showProcessing = Boolean(props.processingStage) && props.processingStage !== 'ready'
  const showOrbReview = stage === 'orb-review' || (stage === 'safer-draft' && reviewRequested)
  const showSaferDraft = stage === 'safer-draft' && props.output

  return (
    <OrbStudioShell
      studioId="dictate"
      className="orb-dictate-studio-workspace orb-dictate-capture-workflow orb-dictate-staged-recording orb-dictate-transcript-workflow orb-dictate-working-document-flow orb-dictate-recording-media-flow orb-dictate-template-document-workspace orb-dictate-orb-write-convergence orb-workspace orb-workspace--dictate flex min-h-0 flex-1 flex-col overflow-hidden"
      data-orb-dictate-studio-workspace
      data-orb-dictate-capture-workflow
      data-orb-dictate-staged-recording
      data-orb-dictate-transcript-workflow
      data-orb-dictate-working-document-flow
      data-orb-dictate-recording-media-flow
      data-orb-dictate-template-document-workspace
      data-orb-dictate-orb-write-converged
      data-orb-workspace-dictate
      data-orb-dictate-sidebar-safe="true"
      data-orb-dictate-has-adult-edited-working-document={hasAdultEditedWorkingDocument ? 'true' : undefined}
      data-orb-dictate-empty={showCaptureStation ? 'true' : undefined}
      data-orb-dictate-active-stage={stage}
    >
      <div className="orb-dictate-capture-column mx-auto flex min-h-0 w-full max-w-[min(100%,72rem)] flex-1 flex-col gap-4 overflow-y-auto px-3 py-4 sm:px-4">
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
          {stage !== 'capture-station' ? (
            <p className="orb-dictate-stage-indicator mt-2 text-[11px] font-medium text-[var(--orb-primary)]" data-orb-dictate-stage-indicator={stage}>
              {stage === 'recording'
                ? ORB_DICTATE_RECORDING_LABEL
                : stage === 'transcript-workspace'
                  ? ORB_DICTATE_DOCUMENT_WORKSPACE_TITLE
                  : stage === 'orb-review'
                    ? ORB_DICTATE_REVIEW_TITLE
                    : stage === 'safer-draft'
                      ? 'Safer Draft'
                      : null}
            </p>
          ) : null}
        </header>

        {showCaptureStation ? (
          <OrbDictateCaptureStation
            selectedTemplateId={props.selectedTemplateId}
            onSelectTemplate={handleTemplateSelect}
            captureMethod={captureMethod}
            onCaptureMethodChange={setCaptureMethod}
            pasteDraft={pasteDraft}
            onPasteDraftChange={setPasteDraft}
            onCreateRoughCapture={handleCreateRoughCapture}
            onStartRecording={handleStartRecording}
            onAudioUpload={(file) => {
              setCaptureSource('upload')
              props.onAudioUpload(file)
            }}
            speechStartDisabled={props.speechStartDisabled}
            micStatus={props.micStatus}
            uploadingAudio={props.uploadingAudio}
            uploadFileLabel={props.uploadFileLabel}
            uploadError={props.uploadError}
            uploadReady={props.uploadReady}
          />
        ) : null}

        {showProcessing && props.processingStage ? (
          <OrbDictateProcessingStages stage={props.processingStage} />
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

        {showDocumentWorkspace ? (
          <OrbDictateDocumentWorkspace
            transcript={props.transcript}
            onTranscriptChange={props.onTranscriptChange}
            workingDocument={workingDocument}
            onWorkingDocumentChange={handleWorkingDocumentChange}
            templateLabel={workingDocumentTypeLabel(props.selectedTemplateId)}
            captureSource={captureSource}
            selectedTemplateId={props.selectedTemplateId}
            onSelectTemplate={handleTemplateSelect}
            orbInstruction={orbInstruction}
            onOrbInstructionChange={setOrbInstruction}
            onApplyOrbChange={handleApplyOrbChange}
            onReviewWithOrb={handleReviewWithOrb}
            onCaptureAgain={handleCaptureAgain}
            onCopy={props.onCopy}
            onSave={props.onSave}
            onOpenInWrite={props.onFinalise}
            applyingEdit={applyingEdit}
            structuringDocument={structuringDocument}
            structuringSlow={structuringSlow}
            editNote={editNote}
            applyStatus={applyStatus}
            interactive={stage === 'transcript-workspace'}
            recordingMedia={props.recordingMedia}
            contentSource={props.contentSource ?? captureSource}
            peopleToConfirm={props.peopleToConfirm}
            onPeopleToConfirmChange={props.onPeopleToConfirmChange}
          />
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
              <OrbDictateMissingInfoReview request={intelligenceRequest} />
            </div>

            <div className="mt-4">
              <OrbDictateReviewChecklist analysis={brainAnalysis} hasTranscript={Boolean(reviewInputText)} loading={brainLoading} />
            </div>

            {structuringSlow ? (
              <p className="mt-3 text-xs text-[var(--orb-muted)]" data-orb-dictate-intelligence-slow>
                {ORB_DICTATE_INTELLIGENCE_SLOW_MESSAGE}
              </p>
            ) : null}

            {!hasDraft ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-orb-dictate-create-draft-action
                  disabled={props.generating || !reviewInputText}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-45"
                  onClick={handleCreateDraft}
                >
                  {props.generating ? 'Creating draft…' : ORB_DICTATE_CREATE_SAFER_DRAFT}
                </button>
                <button
                  type="button"
                  data-orb-dictate-edit-rough-capture
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/30 bg-white/80 px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]"
                  onClick={handleEditTranscript}
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
                  hasTranscript={Boolean(reviewInputText)}
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
            recordingMedia={props.recordingMedia}
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
        <span data-orb-dictate-stage="transcript-workspace" data-orb-dictate-journey-step="rough-capture">
          Transcript Workspace
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
