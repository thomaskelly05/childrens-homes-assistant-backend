'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ClipboardCopy,
  Download,
  FileText,
  Mic,
  MicOff,
  Pause,
  Play,
  Save,
  Sparkles,
  Square,
  Trash2
} from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { OrbDictateStudioWorkspace } from '@/components/orb/dictate/OrbDictateStudioWorkspace'
import { OrbWriteStation } from '@/components/orb-write/orb-write-station'
import { OrbDictateBoundaryCopy } from '@/components/orb-standalone/orb-dictate-boundary-copy'
import { OrbDictateMobileExperience } from '@/components/orb-standalone/orb-dictate-mobile-experience'
import { OrbDictateOutputTypeSelector } from '@/components/orb-standalone/orb-dictate-output-type-selector'
import { OrbDictateStudio } from '@/components/orb-standalone/orb-dictate-studio'
import { useOrbMobileViewport } from '@/components/orb-standalone/use-orb-mobile-viewport'
import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
import type { useStandaloneOrbVoice } from '@/components/orb-standalone/use-standalone-orb-voice'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import {
  OrbDictateAudioUpload,
  OrbDictateGovernanceConsent,
  OrbDictateModeSelect,
  OrbDictateParticipantsPanel,
  OrbDictateTranscriptSegmentsEditor,
  consentReadyForGenerate
} from '@/components/orb-standalone/orb-dictate-station-extras'
import type { OrbDictateBrainSuggestion } from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import { applyAcceptedSuggestionsToDraft } from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import {
  buildLocalDictateFallback,
  exportOrbDictateNote,
  finaliseOrbDictateDocument,
  generateOrbDictateNote,
  isAcceptedDictateAudio,
  readLatestOrbVoiceTranscript,
  readLatestOrbVoiceTurns,
  saveOrbDictateNote,
  transcribeOrbDictateAudio
} from '@/lib/orb/dictate/orb-dictate-client'
import {
  recordTypeIdForStudioTemplate,
  type OrbDictateStudioTemplate
} from '@/lib/orb/dictate/orb-dictate-studio-templates'
import { resolveOrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-framework'
import {
  handoffToOrbWriteDocument,
  saveOrbWriteHandoff,
  type OrbWriteHandoffPayload
} from '@/lib/orb/write/orb-write-handoff'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'
import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import { orbMicDevLog } from '@/lib/orb/voice/orb-mic-access'
import type { MediaRecorderCaptureSource } from '@/lib/orb/voice/orb-voice-capture'
import {
  detectMediaRecorderSupported,
  detectSpeechRecognitionSupported,
  isSafariBrowser
} from '@/lib/orb/voice/orb-voice-readiness'
import {
  anonymiseText,
  modeToNoteType,
  ORB_DICTATE_MODE_LABELS,
  segmentsToPlainText,
  SPEAKER_BOUNDARY_COPY,
  suggestParticipantsFromText,
  textToSegments,
  voiceTurnsToSegments,
  type OrbDictateMode,
  type OrbDictateParticipant,
  type OrbDictateTranscriptSegment
} from '@/lib/orb/dictate/orb-dictate-speaker'
import {
  generateFlagsForVoiceCommand,
  noteTypeForVoiceCommand,
  parseOrbDictateVoiceCommand,
  type OrbDictateVoiceCommandAction
} from '@/lib/orb/dictate/orb-dictate-voice-commands'
import {
  OrbDictateRealtimeTranscription,
  isOrbDictateRealtimeAvailable
} from '@/lib/orb/dictate/orb-dictate-realtime'
import { fetchOrbVoiceRealtimeStatus } from '@/lib/orb/voice/orb-realtime-availability'
import {
  DICTATE_AUDIO_FALLBACK_FAILED_MESSAGE,
  DICTATE_LISTENING_MESSAGE,
  DICTATE_NO_SPEECH_MESSAGE,
  DICTATE_READY_MESSAGE,
  DICTATE_REALTIME_LISTENING_MESSAGE,
  DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE,
  DICTATE_TRANSCRIPT_READY_MESSAGE,
  mapRecordingUiToDictateState,
  type DictateCaptureMode,
  type DictateStartSource
} from '@/lib/orb/dictate/orb-dictate-state'
import {
  ORB_DICTATE_GOVERNANCE_COPY,
  ORB_DICTATE_NOTE_TYPE_LABELS,
  ORB_DICTATE_PRODUCT_SUBTITLE,
  ORB_DICTATE_PRODUCT_TITLE,
  REFLECTIVE_DEBRIEF_QUESTIONS,
  type OrbDictateGenerateResult,
  type OrbDictateNoteType,
  type OrbDictateStartMode
} from '@/lib/orb/dictate/orb-dictate-types'
import { buildSavedOutputCreateBody } from '@/lib/orb/orb-saved-output-adapters'
import { orbGuidedDemoSaveStatusMessage, resolveOrbGuidedDemoSaveTitle } from '@/lib/orb/orb-guided-demo'
import { createOrbSavedOutput } from '@/lib/orb/standalone-client'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import { markOrbInteractionLatency } from '@/lib/orb/voice/latency'
import {
  dictateMobilePrimaryButton,
  dictateMobileShowsCapturedCard,
  dictateMobileStatusLine,
  isTechnicalDictateStatus,
  type DictateMobileAiActionId
} from '@/lib/orb/dictate/orb-dictate-mobile-copy'
import {
  ORB_DICTATE_RECORDING_START_FAILED,
  ORB_DICTATE_RECORDING_TRANSCRIPT_READY,
  ORB_DICTATE_RECORDING_TRANSCRIBING,
  ORB_DICTATE_RECORDING_TRANSCRIPTION_FAILED,
  ORB_DICTATE_RECORDING_UNSUPPORTED,
  ORB_DICTATE_WRITE_FROM_RECORDING_NOTE,
  ORB_DICTATE_WRITE_HANDOFF_SOURCE_NOTE,
  type OrbDictateContentSource,
  type OrbDictateProcessingStageId
} from '@/lib/orb/dictate/orb-dictate-capture-copy'
import { buildPeopleToConfirm, type OrbDictatePersonConfirmItem } from '@/lib/orb/dictate/orb-dictate-people-identification'
import { tryPersistDictateRecording } from '@/lib/orb/dictate/orb-dictate-media-persistence'
import { workingDocumentTypeLabel } from '@/lib/orb/dictate/orb-dictate-working-document'
import {
  beginOrbDictateRecording,
  cancelOrbDictateRecording,
  createOrbDictateRecordingMediaFromBlob,
  endOrbDictateRecording,
  isOrbDictateBrowserRecordingSupported,
  revokeOrbDictateRecordingMediaUrl,
  serializeOrbDictateRecordingMediaForSave,
  type OrbDictateRecordingMedia,
  type OrbDictateRecordingMediaSource
} from '@/lib/orb/dictate/orb-dictate-recording-media'

type VoiceApi = ReturnType<typeof useStandaloneOrbVoice>

type OutputTab = 'professional' | 'summary' | 'actions' | 'transcript' | 'evidence'

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export type OrbDictateRecordingUiState =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'stopping'
  | 'processing'
  | 'stopped'
  | 'error'

function extensionForAudioMime(mimeType: string): string {
  const lower = mimeType.toLowerCase()
  if (lower.includes('wav')) return '.wav'
  if (lower.includes('mp4') || lower.includes('m4a')) return '.mp4'
  if (lower.includes('mpeg') || lower.includes('mp3')) return '.mp3'
  return '.webm'
}

function captureSourceLabel(source: MediaRecorderCaptureSource): string {
  if (source === 'media_recorder') return 'Audio captured via browser recorder'
  if (source === 'web_audio_wav') return 'Audio captured via WAV fallback'
  return ''
}

export function OrbDictateStation({
  open,
  onClose,
  voice,
  onSendToChat,
  onOpenOrbVoice,
  onOpenTemplates,
  initialTranscript,
  initialNoteType,
  initialStudio,
  initialStudioTemplateId
}: {
  open: boolean
  onClose: () => void
  voice: VoiceApi
  onSendToChat: (text: string) => void | Promise<void>
  onOpenOrbVoice?: () => void
  onOpenTemplates?: () => void
  initialTranscript?: string
  initialNoteType?: OrbDictateNoteType
  initialStudio?: boolean
  initialStudioTemplateId?: string
}) {
  const [startMode, setStartMode] = useState<OrbDictateStartMode | null>(null)
  const [noteType, setNoteType] = useState<OrbDictateNoteType>(initialNoteType ?? 'daily_record')
  const [transcript, setTranscript] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [recordingUiState, setRecordingUiState] = useState<OrbDictateRecordingUiState>('idle')
  const [recordingPaused, setRecordingPaused] = useState(false)
  const [timerSec, setTimerSec] = useState(0)
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [dictateMode, setDictateMode] = useState<OrbDictateMode>('rough_note')
  const [participants, setParticipants] = useState<OrbDictateParticipant[]>([])
  const [segments, setSegments] = useState<OrbDictateTranscriptSegment[]>([])
  const [authorityConsent, setAuthorityConsent] = useState(false)
  const [participantsAware, setParticipantsAware] = useState(false)
  const [draftReviewConfirmed, setDraftReviewConfirmed] = useState(false)
  const [noAutoSubmitConfirmed, setNoAutoSubmitConfirmed] = useState(false)
  const [investigationConfirmed, setInvestigationConfirmed] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadFileLabel, setUploadFileLabel] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [output, setOutput] = useState<OrbDictateGenerateResult | null>(null)
  const [outputTab, setOutputTab] = useState<OutputTab>('professional')
  const [editedNote, setEditedNote] = useState('')
  const [generating, setGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [phase, setPhase] = useState<'capture' | 'studio' | 'write'>('capture')
  const [selectedTemplateId, setSelectedTemplateId] = useState('general')
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<OrbDictateBrainSuggestion[]>([])
  const [generatedTypes, setGeneratedTypes] = useState<OrbDictateNoteType[]>([])
  const [writeDocument, setWriteDocument] = useState<OrbWriteDocument | null>(null)
  const [finalising, setFinalising] = useState(false)
  const [reflectiveMode, setReflectiveMode] = useState(false)
  const [reflectiveIndex, setReflectiveIndex] = useState(0)
  const [reflectiveAnswers, setReflectiveAnswers] = useState<string[]>([])
  const [reflectiveDraft, setReflectiveDraft] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dictateStartInFlightRef = useRef(false)
  const recorderModeRef = useRef<'speech' | 'media' | null>(null)
  const [recorderMode, setRecorderMode] = useState<'speech' | 'media' | 'none'>('none')
  const transcriptBufferRef = useRef<string[]>([])
  const lastDictateTranscriptRef = useRef('')
  const [backendTranscriptionAvailable, setBackendTranscriptionAvailable] = useState<boolean | 'unknown'>(
    'unknown'
  )
  const [recordedAudioLabel, setRecordedAudioLabel] = useState<string | null>(null)
  const [lastCaptureSource, setLastCaptureSource] = useState<MediaRecorderCaptureSource>('none')
  const [lastAudioByteSize, setLastAudioByteSize] = useState(0)
  const [lastChunkCount, setLastChunkCount] = useState(0)
  const [lastSampleCount, setLastSampleCount] = useState(0)
  const [recordingMedia, setRecordingMedia] = useState<OrbDictateRecordingMedia | null>(null)
  const [processingStage, setProcessingStage] = useState<OrbDictateProcessingStageId | null>(null)
  const [peopleToConfirm, setPeopleToConfirm] = useState<OrbDictatePersonConfirmItem[]>([])
  const [contentSource, setContentSource] = useState<OrbDictateContentSource | undefined>()
  const dictateRecorderActiveRef = useRef(false)
  const [captureMode, setCaptureMode] = useState<DictateCaptureMode>('none')
  const [startSource, setStartSource] = useState<DictateStartSource>('none')
  const [speechRestartCount, setSpeechRestartCount] = useState(0)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [realtimeTranscriptionAvailable, setRealtimeTranscriptionAvailable] = useState<boolean | 'unknown'>(
    'unknown'
  )
  const [browserFallbackChosen, setBrowserFallbackChosen] = useState(false)
  const [realtimeInterim, setRealtimeInterim] = useState('')
  const [mobileRecordingOpen, setMobileRecordingOpen] = useState(false)
  const [mobileAdvancedOpen, setMobileAdvancedOpen] = useState(false)
  const [mobileOutputOpen, setMobileOutputOpen] = useState(false)
  const dictateRealtimeRef = useRef<OrbDictateRealtimeTranscription | null>(null)
  const developerMode = isOrbDeveloperMode()
  const isMobile = useOrbMobileViewport()

  const recordingActive = recordingUiState === 'recording'
  const safari = isSafariBrowser()
  const captureStarting = recordingUiState === 'starting'

  const needsConsent = startMode === 'record_debrief' || dictateMode !== 'rough_note'

  const speechRecognitionAvailable =
    voice.recognitionAvailable || detectSpeechRecognitionSupported()
  const mediaRecorderAvailable = voice.mediaRecorderAvailable || detectMediaRecorderSupported()

  const captureCapabilityLines = useMemo(() => {
    const lines: string[] = []
    if (realtimeTranscriptionAvailable === true) {
      lines.push('Server realtime transcription available')
    }
    if (!safari && speechRecognitionAvailable) lines.push('Browser speech recognition available (optional)')
    if (!safari && mediaRecorderAvailable) lines.push('Audio recording available (optional)')
    if (safari) lines.push('Safari: use server realtime transcription or paste/upload')
    if (realtimeTranscriptionAvailable === false) {
      return {
        primary: DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE,
        lines: ['Paste transcript or upload audio']
      }
    }
    if (!speechRecognitionAvailable && !mediaRecorderAvailable && realtimeTranscriptionAvailable !== true) {
      return { primary: 'Microphone unavailable — paste a transcript instead', lines: ['Paste transcript instead'] }
    }
    return {
      primary:
        realtimeTranscriptionAvailable === true
          ? 'Server realtime transcription (recommended)'
          : 'Paste or upload a transcript',
      lines
    }
  }, [speechRecognitionAvailable, mediaRecorderAvailable, realtimeTranscriptionAvailable, safari])

  const liveTranscript = useMemo(() => {
    if (!recordingActive) return transcript
    if (captureMode === 'realtime_transcription') {
      const buffered = transcriptBufferRef.current.length ? transcriptBufferRef.current.join('\n') : transcript
      const interim = realtimeInterim.trim()
      if (interim) return buffered ? `${buffered}\n${interim}` : interim
      return buffered
    }
    const interim = (voice.interimTranscript || '').trim()
    const buffered = transcriptBufferRef.current.length ? transcriptBufferRef.current.join('\n') : transcript
    if (interim) return buffered ? `${buffered}\n${interim}` : interim
    return buffered
  }, [transcript, recordingActive, captureMode, realtimeInterim, voice.interimTranscript, voice.transcript, voice.displayTranscript])

  const effectiveInputText = useMemo(() => {
    if (segments.length) return segmentsToPlainText(segments)
    return liveTranscript.trim() || pasteText.trim()
  }, [segments, liveTranscript, pasteText])

  useEffect(() => {
    if (dictateMode === 'rough_note') return
    setNoteType(modeToNoteType(dictateMode))
  }, [dictateMode])

  const resetRecording = useCallback(() => {
    setRecordingUiState('idle')
    setRecordingPaused(false)
    setTimerSec(0)
    recorderModeRef.current = null
    setRecorderMode('none')
    lastDictateTranscriptRef.current = ''
    setLastCaptureSource('none')
    setLastAudioByteSize(0)
    setLastChunkCount(0)
    setLastSampleCount(0)
    voice.endDictateSpeechCapture()
    voice.cancelListening()
    dictateRealtimeRef.current?.stop()
    dictateRealtimeRef.current = null
    setRealtimeInterim('')
    if (timerRef.current) clearInterval(timerRef.current)
  }, [voice])

  useEffect(() => {
    if (!open) {
      resetRecording()
      transcriptBufferRef.current = []
      lastDictateTranscriptRef.current = ''
      setStartMode(null)
      setReflectiveMode(false)
      setReflectiveIndex(0)
      setReflectiveAnswers([])
      setOutput(null)
      setStatusMessage(null)
      setPhase('capture')
      setWriteDocument(null)
      setAcceptedSuggestions([])
      setGeneratedTypes([])
      setSelectedTemplateId('general')
      setCaptureMode('none')
      setStartSource('none')
      setSpeechRestartCount(0)
      setSpeechError(null)
      setBrowserFallbackChosen(false)
      setRealtimeInterim('')
      dictateRealtimeRef.current = null
      return
    }
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_opened', detail: {} })
    void fetchOrbVoiceRealtimeStatus().then((status) => {
      setRealtimeTranscriptionAvailable(status.realtime_enabled)
      emitOrbClientDebug({
        area: 'dictate',
        event: 'realtime_status',
        detail: {
          realtime_enabled: status.realtime_enabled,
          provider: status.provider,
          reason: status.reason
        }
      })
    })
    setStatusMessage(DICTATE_READY_MESSAGE)
    if (initialTranscript) {
      setTranscript(initialTranscript)
      setStartMode('import_voice')
    }
    if (initialStudio || initialStudioTemplateId) setPhase('studio')
    if (initialStudioTemplateId) {
      setSelectedTemplateId(initialStudioTemplateId)
      const recordType = resolveOrbRecordingRecordType({ studioTemplateId: initialStudioTemplateId })
      setNoteType(recordType.dictate_note_type)
    } else if (initialNoteType) {
      setNoteType(initialNoteType)
    }
  }, [open, initialTranscript, initialStudio, initialStudioTemplateId, initialNoteType, resetRecording])

  useEffect(() => {
    if ((!recordingActive && !captureStarting) || recordingPaused) return
    timerRef.current = setInterval(() => setTimerSec((s) => s + 1), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [recordingActive, captureStarting, recordingPaused])

  useEffect(() => {
    if (!recordingActive || recordingPaused) return
    const finalChunk = (voice.transcript || '').trim()
    const display = (voice.displayTranscript || '').trim()
    const chunk = finalChunk || (voice.phase === 'transcript_ready' ? display : '')
    if (!chunk || chunk === lastDictateTranscriptRef.current) return
    lastDictateTranscriptRef.current = chunk
    if (!transcriptBufferRef.current.includes(chunk)) {
      transcriptBufferRef.current = [...transcriptBufferRef.current, chunk]
      const joined = transcriptBufferRef.current.join('\n')
      setTranscript(joined)
      setSegments(textToSegments(joined, 'live', participants))
    }
    const cmd = parseOrbDictateVoiceCommand(chunk)
    if (cmd) {
      void handleVoiceCommand(cmd.action)
      voice.clearTranscript()
      lastDictateTranscriptRef.current = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.transcript, voice.displayTranscript, voice.phase, recordingActive, recordingPaused])

  async function handleVoiceCommand(action: OrbDictateVoiceCommandAction) {
    const converted = noteTypeForVoiceCommand(action)
    if (converted) setNoteType(converted)
    if (action === 'save') return void (await handleSave())
    if (action === 'copy') return void (await handleCopy())
    if (action === 'export_pdf') return void (await handleExport('pdf'))
    if (action === 'send_chat') return void handleSendToChat()
    if (action === 'what_missing' && output) {
      setOutputTab('evidence')
      setStatusMessage('Review quality checks and evidence tab for gaps.')
      return
    }
    const flags = generateFlagsForVoiceCommand(action)
    await runGenerate({ ...flags, include_ofsted_lens: flags.include_ofsted_lens ?? action === 'ofsted_ready' })
  }

  const MIC_BLOCKED_MESSAGE = 'Microphone blocked — check Safari site settings and allow microphone for this site.'
  const SPEECH_START_FAILED_MESSAGE =
    'Speech transcript could not start. Check Safari microphone settings or use Chrome/Edge.'

  function consentBlocksStart(mode?: OrbDictateStartMode): boolean {
    const effectiveStartMode = mode ?? startMode
    const effectiveNeedsConsent = effectiveStartMode === 'record_debrief' || dictateMode !== 'rough_note'
    if (effectiveNeedsConsent && !consentConfirmed) {
      setStatusMessage('Please confirm consent before recording a conversation or debrief.')
      return true
    }
    return false
  }

  function clearDictateRecordingMedia() {
    setRecordingMedia((current) => {
      revokeOrbDictateRecordingMediaUrl(current)
      return null
    })
    cancelOrbDictateRecording()
    dictateRecorderActiveRef.current = false
    setContentSource(undefined)
    setProcessingStage(null)
    setPeopleToConfirm([])
  }

  async function pauseForProcessingStage(ms = 120) {
    await new Promise((resolve) => window.setTimeout(resolve, ms))
  }

  async function attachAndTranscribeRecording(
    blob: Blob,
    mimeType: string,
    durationMs: number,
    source: OrbDictateRecordingMediaSource = 'microphone'
  ) {
    const effectiveNeedsConsent = startMode === 'record_debrief' || dictateMode !== 'rough_note'
    let media = createOrbDictateRecordingMediaFromBlob(blob, {
      durationMs,
      source,
      status: 'transcribing'
    })
    setRecordingMedia(media)
    setRecordingUiState('processing')
    setUploadingAudio(true)
    setProcessingStage('saving_audio')
    setStatusMessage(ORB_DICTATE_RECORDING_TRANSCRIBING)
    setContentSource(source === 'upload' ? 'upload' : 'recording')
    try {
      await pauseForProcessingStage()
      setProcessingStage('transcribing')
      const ext = extensionForAudioMime(mimeType)
      const file = new File([blob], `dictate-recording-${Date.now()}${ext}`, { type: mimeType })
      const result = await transcribeOrbDictateAudio(file, {
        conversation_consent_confirmed: effectiveNeedsConsent ? authorityConsent && consentConfirmed : undefined
      })
      setBackendTranscriptionAvailable(true)
      const merged = result.transcript.trim()
      const segs = result.segments ?? textToSegments(result.transcript, 'upload', result.participants ?? [])
      setProcessingStage('identifying_people')
      const people = buildPeopleToConfirm(merged, result.participants ?? participants, segs)
      setPeopleToConfirm(people)
      if (result.participants?.length) setParticipants(result.participants)
      setProcessingStage('structuring_document')
      const persistResult = await tryPersistDictateRecording(blob, media)
      media = {
        ...media,
        status: 'transcribed',
        persistenceStatus: persistResult.status,
        persistenceMessage: persistResult.message,
        storageMode: persistResult.storageMode
      }
      setRecordingMedia(media)
      transcriptBufferRef.current = merged ? [merged] : []
      setTranscript(merged)
      setSegments(segs)
      setStartMode('paste')
      setOutputTab('transcript')
      setRecordingUiState('stopped')
      setProcessingStage('ready')
      setStatusMessage(ORB_DICTATE_RECORDING_TRANSCRIPT_READY)
      emitOrbClientDebug({
        area: 'dictate',
        event: 'dictate_transcript_ready',
        detail: { transcriptLength: merged.length, mode: 'dictate_media' }
      })
      await pauseForProcessingStage(350)
      setProcessingStage(null)
    } catch {
      setBackendTranscriptionAvailable(false)
      media = {
        ...media,
        status: 'failed',
        transcriptionNotice: ORB_DICTATE_RECORDING_TRANSCRIPTION_FAILED
      }
      setRecordingMedia(media)
      setRecordingUiState('stopped')
      setProcessingStage(null)
      setStatusMessage(ORB_DICTATE_RECORDING_TRANSCRIPTION_FAILED)
      setUploadError(ORB_DICTATE_RECORDING_TRANSCRIPTION_FAILED)
      emitOrbClientDebug({
        area: 'dictate',
        event: 'dictate_transcription_failed',
        detail: { mode: 'dictate_media', preservedAudio: true }
      })
    } finally {
      setUploadingAudio(false)
    }
  }

  useEffect(() => {
    return () => {
      revokeOrbDictateRecordingMediaUrl(recordingMedia)
      cancelOrbDictateRecording()
    }
  }, [recordingMedia])

  useEffect(() => {
    const text = transcript.trim()
    if (!text) {
      if (!processingStage) setPeopleToConfirm([])
      return
    }
    if (processingStage && processingStage !== 'ready') return
    const segs = segments.length ? segments : textToSegments(text, 'paste', participants)
    setPeopleToConfirm(buildPeopleToConfirm(text, participants, segs))
  }, [transcript, participants, segments, processingStage])

  async function handleStartDictateRecording() {
    if (dictateStartInFlightRef.current || recordingUiState === 'starting' || recordingUiState === 'recording') {
      return
    }
    dictateStartInFlightRef.current = true
    markOrbInteractionLatency('dictate_tap')
    orbMicDevLog('dictate recording start clicked')
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_recording_start_clicked', detail: {} })
    if (consentBlocksStart()) {
      dictateStartInFlightRef.current = false
      return
    }

    if (!isOrbDictateBrowserRecordingSupported() && !mediaRecorderAvailable) {
      setRecordingUiState('error')
      setStatusMessage(ORB_DICTATE_RECORDING_UNSUPPORTED)
      setSpeechError(ORB_DICTATE_RECORDING_UNSUPPORTED)
      dictateStartInFlightRef.current = false
      return
    }

    setStartSource('user_click')
    setSpeechError(null)
    setUploadError(null)
    transcriptBufferRef.current = transcript.trim() ? [transcript.trim()] : []
    lastDictateTranscriptRef.current = ''
    setRecordingUiState('starting')
    setTimerSec(0)
    markOrbInteractionLatency('dictate_permission_requested')
    setRecordingPaused(false)
    clearDictateRecordingMedia()
    recorderModeRef.current = 'media'
    setRecorderMode('media')
    setCaptureMode('audio_fallback')
    dictateRecorderActiveRef.current = true

    const result = await beginOrbDictateRecording()
    if (!result.ok) {
      dictateRecorderActiveRef.current = false
      recorderModeRef.current = null
      setRecorderMode('none')
      setCaptureMode('none')
      setRecordingUiState('error')
      if (result.error === 'unsupported') {
        setStatusMessage(ORB_DICTATE_RECORDING_UNSUPPORTED)
        setSpeechError(ORB_DICTATE_RECORDING_UNSUPPORTED)
      } else {
        setStatusMessage(ORB_DICTATE_RECORDING_START_FAILED)
        setSpeechError(
          result.error === 'permission_denied' ? MIC_BLOCKED_MESSAGE : ORB_DICTATE_RECORDING_START_FAILED
        )
      }
      emitOrbClientDebug({
        area: 'dictate',
        event: 'dictate_recording_start_failed',
        detail: { error: result.error }
      })
      dictateStartInFlightRef.current = false
      return
    }

    setRecordingUiState('recording')
    setContentSource('recording')
    setStatusMessage(DICTATE_LISTENING_MESSAGE)
    emitOrbClientDebug({ area: 'dictate', event: 'record_started', detail: { mode: 'dictate_media' } })
    dictateStartInFlightRef.current = false
  }

  async function startBrowserSpeechTranscript(mode?: OrbDictateStartMode) {
    if (!speechRecognitionAvailable) {
      setStatusMessage('Speech transcript is unavailable in this browser — paste or upload instead.')
      setRecordingUiState('error')
      return
    }
    if (mode) setStartMode(mode)
    recorderModeRef.current = 'speech'
    setRecorderMode('speech')
    setCaptureMode('speech')
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_speech_start_requested', detail: { startSource: 'user_click' } })
    const ok = await voice.beginDictateSpeechCapture()
    if (ok) {
      setRecordingUiState('recording')
      markOrbInteractionLatency('dictate_stream_ready')
      setStatusMessage(DICTATE_LISTENING_MESSAGE)
      orbMicDevLog('speech capture started')
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_speech_started', detail: {} })
      emitOrbClientDebug({ area: 'dictate', event: 'record_started', detail: { mode: 'speech' } })
      return
    }
    setRecordingUiState('error')
    setCaptureMode('none')
    const denied = voice.error?.toLowerCase().includes('microphone')
    const message = denied ? MIC_BLOCKED_MESSAGE : voice.error || SPEECH_START_FAILED_MESSAGE
    setSpeechError(message)
    setStatusMessage(message)
    orbMicDevLog('speech capture failed', voice.error ?? 'unknown')
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_speech_failed', detail: { mode: 'speech', error: voice.error } })
  }

  async function handleStartSpeechTranscript(mode?: OrbDictateStartMode) {
    const effectiveStartMode = mode ?? startMode
    if (dictateStartInFlightRef.current || recordingUiState === 'starting' || recordingUiState === 'recording') {
      return
    }
    dictateStartInFlightRef.current = true
    markOrbInteractionLatency('dictate_tap')
    orbMicDevLog('dictate speech start clicked', effectiveStartMode ?? 'unknown')
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_speech_start_clicked', detail: { mode: effectiveStartMode } })
    if (consentBlocksStart(mode)) {
      dictateStartInFlightRef.current = false
      return
    }
    try {
    if (mode) setStartMode(mode)
    setStartSource('user_click')
    setSpeechError(null)
    transcriptBufferRef.current = transcript.trim() ? [transcript.trim()] : []
    lastDictateTranscriptRef.current = ''
    setRecordingUiState('starting')
    setTimerSec(0)
    markOrbInteractionLatency('dictate_permission_requested')
    setRecordingPaused(false)
    setRecordedAudioLabel(null)
    setLastCaptureSource('none')
    setLastAudioByteSize(0)

    const realtimeReady =
      realtimeTranscriptionAvailable === true || (await isOrbDictateRealtimeAvailable())
    if (realtimeReady) {
      setRealtimeTranscriptionAvailable(true)
      setCaptureMode('realtime_transcription')
      recorderModeRef.current = null
      setRecorderMode('none')
      const session = new OrbDictateRealtimeTranscription()
      dictateRealtimeRef.current = session
      const ok = await session.start({
        onPartialTranscript: (text) => setRealtimeInterim(text),
        onFinalTranscript: (text) => {
          if (!text.trim()) return
          if (!transcriptBufferRef.current.includes(text)) {
            transcriptBufferRef.current = [...transcriptBufferRef.current, text]
            const joined = transcriptBufferRef.current.join('\n')
            setTranscript(joined)
            setSegments(textToSegments(joined, 'live', participants))
          }
          setRealtimeInterim('')
        },
        onError: (message) => {
          setSpeechError(message)
          setStatusMessage(message)
        }
      })
      if (ok) {
        setRecordingUiState('recording')
        markOrbInteractionLatency('dictate_stream_ready')
        setStatusMessage(DICTATE_REALTIME_LISTENING_MESSAGE)
        emitOrbClientDebug({ area: 'dictate', event: 'record_started', detail: { mode: 'realtime_transcription' } })
        return
      }
      dictateRealtimeRef.current = null
      setCaptureMode('none')
      setRecordingUiState('idle')
      setStatusMessage(DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE)
      return
    }

    setRealtimeTranscriptionAvailable(false)

    if (safari && !browserFallbackChosen) {
      setRecordingUiState('idle')
      setCaptureMode('none')
      setStatusMessage(DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE)
      return
    }

    if (!browserFallbackChosen && !speechRecognitionAvailable) {
      setRecordingUiState('idle')
      setCaptureMode('none')
      setStatusMessage(DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE)
      return
    }

    if (!browserFallbackChosen && safari) {
      setRecordingUiState('idle')
      setStatusMessage(DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE)
      return
    }

    await startBrowserSpeechTranscript(mode)
    } finally {
      dictateStartInFlightRef.current = false
    }
  }

  async function handleBrowserSpeechFallbackClick() {
    emitOrbClientDebug({ area: 'dictate', event: 'browser_fallback_chosen', detail: { target: 'speech' } })
    setBrowserFallbackChosen(true)
    if (consentBlocksStart()) return
    setStartSource('user_click')
    setSpeechError(null)
    transcriptBufferRef.current = transcript.trim() ? [transcript.trim()] : []
    setRecordingUiState('starting')
    await startBrowserSpeechTranscript()
  }

  async function handleAudioFallbackClick() {
    orbMicDevLog('dictate audio fallback clicked')
    emitOrbClientDebug({ area: 'dictate', event: 'browser_fallback_chosen', detail: { target: 'media' } })
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_audio_fallback_clicked', detail: {} })
    setBrowserFallbackChosen(true)
    if (consentBlocksStart()) return
    if (safari) {
      setStatusMessage(DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE)
      return
    }
    if (!mediaRecorderAvailable) {
      setStatusMessage('Audio recording is unavailable — use speech transcript, upload, or paste.')
      return
    }
    setStartSource('user_click')
    transcriptBufferRef.current = transcript.trim() ? [transcript.trim()] : []
    setRecordingUiState('starting')
    setRecordingPaused(false)
    recorderModeRef.current = 'media'
    setRecorderMode('media')
    setCaptureMode('audio_fallback')
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_media_fallback_started', detail: { explicit: true } })
    const ok = await voice.beginMediaRecorderCapture()
    if (!ok) {
      setRecordingUiState('error')
      setCaptureMode(transcript.trim() ? 'speech' : 'none')
      const denied = voice.error?.toLowerCase().includes('microphone')
      const message = denied ? MIC_BLOCKED_MESSAGE : voice.error || 'Audio fallback could not start.'
      setSpeechError(message)
      setStatusMessage(message)
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_audio_fallback_failed', detail: { error: voice.error } })
      return
    }
    setRecordingUiState('recording')
    setStatusMessage('Recording audio. Automatic transcription depends on backend availability.')
    emitOrbClientDebug({ area: 'dictate', event: 'record_started', detail: { mode: 'media', explicit: true } })
  }

  function handleSelectStartMode(id: OrbDictateStartMode) {
    setStartMode(id)
    if (id === 'import_voice') importFromOrbVoice()
    if (id === 'template') onOpenTemplates?.()
    if (id === 'paste') {
      setPasteText(transcript)
      setOutputTab('transcript')
      setCaptureMode('paste')
      setStartSource('paste')
    }
    if (id === 'record_debrief') setReflectiveMode(false)
    if (id === 'record_note' || id === 'record_debrief') {
      setStatusMessage(DICTATE_READY_MESSAGE)
    }
  }

  function handlePauseRecording() {
    if (captureMode === 'realtime_transcription') {
      setStatusMessage('Pause is not supported for realtime transcription — use Stop when finished.')
      return
    }
    if (recorderModeRef.current === 'media' || dictateRecorderActiveRef.current) {
      setStatusMessage('Pause is not supported for audio recording — use Stop when finished.')
      return
    }
    setRecordingPaused(true)
    if (recorderModeRef.current === 'speech') voice.endDictateSpeechCapture()
  }

  async function handleResumeRecording() {
    if (captureMode === 'realtime_transcription') {
      setStatusMessage('Resume is not supported for realtime transcription — stop and start again.')
      return
    }
    if (recorderModeRef.current === 'media') {
      setStatusMessage('Resume is not supported for audio-only recording — stop and start a new recording.')
      return
    }
    setRecordingPaused(false)
    setRecordingUiState('starting')
    if (recorderModeRef.current === 'speech') {
      setSpeechRestartCount((c) => c + 1)
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_speech_restart', detail: { count: speechRestartCount + 1 } })
      const ok = await voice.beginDictateSpeechCapture()
      if (!ok) {
        setRecordingUiState(transcript.trim() ? 'stopped' : 'error')
        setStatusMessage(
          transcript.trim()
            ? 'Speech paused. Review the transcript captured so far.'
            : voice.error || SPEECH_START_FAILED_MESSAGE
        )
        return
      }
      setRecordingUiState('recording')
      setStatusMessage(DICTATE_LISTENING_MESSAGE)
    }
  }

  async function handleStopRecording() {
    const effectiveNeedsConsent = startMode === 'record_debrief' || dictateMode !== 'rough_note'
    if (captureMode === 'realtime_transcription' && dictateRealtimeRef.current) {
      setRecordingUiState('stopping')
      setRecordingPaused(false)
      if (timerRef.current) clearInterval(timerRef.current)
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_stop_clicked', detail: { mode: 'realtime_transcription' } })
      const tail = dictateRealtimeRef.current.stop()
      dictateRealtimeRef.current = null
      if (tail && !transcriptBufferRef.current.includes(tail)) {
        transcriptBufferRef.current = [...transcriptBufferRef.current, tail]
      }
      setRealtimeInterim('')
      const joined = transcriptBufferRef.current.join('\n').trim()
      if (joined) {
        setTranscript(joined)
        setSegments(textToSegments(joined, 'live', participants))
        setStartMode((current) => current ?? 'paste')
        setOutputTab('transcript')
        setRecordingUiState('stopped')
        setCaptureMode('realtime_transcription')
        setStatusMessage(DICTATE_TRANSCRIPT_READY_MESSAGE)
        emitOrbClientDebug({
          area: 'dictate',
          event: 'dictate_transcript_ready',
          detail: { transcriptLength: joined.length, mode: 'realtime_transcription' }
        })
      } else {
        setRecordingUiState('error')
        setCaptureMode('none')
        setStatusMessage(DICTATE_NO_SPEECH_MESSAGE)
        emitOrbClientDebug({
          area: 'dictate',
          event: 'dictate_capture_failed',
          detail: { mode: 'realtime_transcription', reason: 'no_transcript' }
        })
      }
      return
    }
    if (recorderModeRef.current === 'media') {
      setRecordingUiState('stopping')
      setRecordingPaused(false)
      setStatusMessage('Stopping recording…')
      if (timerRef.current) clearInterval(timerRef.current)
      emitOrbClientDebug({ area: 'dictate', event: 'record_stop_requested', detail: { mode: 'media' } })

      const captureEnd = dictateRecorderActiveRef.current
        ? await endOrbDictateRecording(timerSec * 1000)
        : { captureResult: await voice.endMediaRecorderCapture(), durationMs: timerSec * 1000 }
      const captureResult = captureEnd.captureResult
      const durationMs = captureEnd.durationMs
      dictateRecorderActiveRef.current = false
      const blob = captureResult?.blob ?? null
      const source = captureResult?.source ?? 'none'
      const byteSize = captureResult?.size ?? blob?.size ?? 0

      setLastCaptureSource(source)
      setLastAudioByteSize(byteSize)
      setLastChunkCount(captureResult?.chunkCount ?? 0)
      setLastSampleCount(captureResult?.sampleCount ?? 0)
      emitOrbClientDebug({
        area: 'dictate',
        event: 'dictate_media_fallback_stopped',
        detail: {
          source,
          size: byteSize,
          chunkCount: captureResult?.chunkCount,
          sampleCount: captureResult?.sampleCount,
          recorderMimeType: captureResult?.recorderMimeType
        }
      })
      emitOrbClientDebug({
        area: 'dictate',
        event: 'record_stopped',
        detail: {
          source,
          size: byteSize,
          chunkCount: captureResult?.chunkCount,
          sampleCount: captureResult?.sampleCount,
          recorderMimeType: captureResult?.recorderMimeType
        }
      })

      const existingSpeechTranscript = transcriptBufferRef.current.join('\n').trim() || transcript.trim()

      if (blob && byteSize > 0) {
        const mime = blob.type || captureResult?.mimeType || 'audio/webm'
        const sourceLabel = captureSourceLabel(source)
        setRecordedAudioLabel(sourceLabel || 'Recorded note')
        setUploadFileLabel(sourceLabel || 'Recorded note')
        await attachAndTranscribeRecording(blob, mime, durationMs, 'microphone')
      } else if (existingSpeechTranscript) {
        setTranscript(existingSpeechTranscript)
        setSegments(textToSegments(existingSpeechTranscript, 'live', participants))
        setRecordingUiState('stopped')
        setStatusMessage('Speech transcript captured — review before generating.')
        emitOrbClientDebug({
          area: 'dictate',
          event: 'dictate_capture_failed',
          detail: { mode: 'media', source, size: byteSize, preservedSpeechTranscript: true }
        })
      } else {
        setRecordingUiState('error')
        setStatusMessage(DICTATE_AUDIO_FALLBACK_FAILED_MESSAGE)
        emitOrbClientDebug({ area: 'dictate', event: 'dictate_audio_fallback_failed', detail: { source, size: byteSize } })
        emitOrbClientDebug({
          area: 'dictate',
          event: 'dictate_capture_failed',
          detail: { mode: 'media', source, size: byteSize, chunkCount: captureResult?.chunkCount, sampleCount: captureResult?.sampleCount }
        })
      }
      recorderModeRef.current = null
      setRecorderMode('none')
      lastDictateTranscriptRef.current = ''
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    setRecordingUiState('stopping')
    setRecordingPaused(false)
    if (timerRef.current) clearInterval(timerRef.current)
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_stop_clicked', detail: {} })
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_speech_end', detail: {} })

    const live = (voice.transcript || voice.displayTranscript || voice.interimTranscript || '').trim()
    if (live && !transcriptBufferRef.current.includes(live)) transcriptBufferRef.current = [...transcriptBufferRef.current, live]
    const joined = transcriptBufferRef.current.join('\n').trim()
    voice.endDictateSpeechCapture()
    if (joined) {
      setTranscript(joined)
      setSegments(textToSegments(joined, 'live', participants))
      setStartMode((current) => current ?? 'paste')
      setOutputTab('transcript')
      setRecordingUiState('stopped')
      recorderModeRef.current = null
      setRecorderMode('none')
      setCaptureMode('speech')
      setStatusMessage(DICTATE_TRANSCRIPT_READY_MESSAGE)
      emitOrbClientDebug({
        area: 'dictate',
        event: 'dictate_speech_result',
        detail: { final: true, textLength: joined.length }
      })
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_transcript_ready', detail: { transcriptLength: joined.length } })
    } else {
      setRecordingUiState('error')
      setCaptureMode('none')
      recorderModeRef.current = null
      setRecorderMode('none')
      setStatusMessage(DICTATE_NO_SPEECH_MESSAGE)
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_capture_failed', detail: { mode: 'speech', reason: 'no_transcript' } })
    }
    voice.clearTranscript()
    lastDictateTranscriptRef.current = ''
  }

  function handleClearTranscript() {
    setTranscript('')
    setPasteText('')
    transcriptBufferRef.current = []
    lastDictateTranscriptRef.current = ''
    setRecordedAudioLabel(null)
    setPeopleToConfirm([])
    setProcessingStage(null)
    clearDictateRecordingMedia()
    voice.clearTranscript()
  }

  function applyPaste() {
    const text = pasteText.trim()
    if (!text) return
    transcriptBufferRef.current = [text]
    syncSegmentsFromText(text, 'paste')
    setStartMode('paste')
    setCaptureMode('paste')
    setContentSource('paste')
    setStartSource('paste')
    setOutputTab('transcript')
    setStatusMessage('Transcript added — review before generating.')
  }

  function runSpeakerAction(action: string) {
    const input = effectiveInputText
    if (!input) {
      setStatusMessage('Add a transcript first.')
      return
    }
    if (action === 'anonymise') {
      const next = anonymiseText(editedNote || output?.professional_note || input, participants)
      setEditedNote(next)
      setStatusMessage('Names replaced with roles where possible.')
      return
    }
    const promptMap: Record<string, Partial<Parameters<typeof generateOrbDictateNote>[0]>> = {
      summarise_by_speaker: { include_child_voice: true },
      action_list: { include_actions: true },
      meeting_minutes: { mode: 'team_meeting', note_type: 'team_meeting' },
      investigation_note: { mode: 'investigation_meeting', note_type: 'investigation_meeting' },
      manager_oversight: { include_manager_oversight: true, note_type: 'manager_oversight_note' },
      supervision_reflection: { mode: 'reflective_supervision', note_type: 'supervision_reflection' },
      safeguarding_summary: { include_safeguarding: true, note_type: 'safeguarding_concern_record' }
    }
    void runGenerate(promptMap[action] ?? {})
  }

  function importFromOrbVoice() {
    const turns = readLatestOrbVoiceTurns()
    if (!turns.length) {
      setStatusMessage('No saved ORB Voice transcript found. Save a conversation in ORB Voice first.')
      return
    }
    const segs = voiceTurnsToSegments(turns)
    setSegments(segs)
    setTranscript(segmentsToPlainText(segs))
    setStartMode('import_voice')
    setStatusMessage('Imported from ORB Voice — relabel speakers as needed.')
  }

  function syncSegmentsFromText(text: string, source: OrbDictateTranscriptSegment['source'] = 'paste') {
    const segs = textToSegments(text, source, participants)
    setSegments(segs)
    setTranscript(text)
  }

  async function handleAudioUpload(file: File) {
    setUploadError(null)
    if (!isAcceptedDictateAudio(file)) {
      setUploadError('Unsupported file type. Use webm, mp3, wav or m4a — or paste a transcript instead.')
      return
    }
    setUploadingAudio(true)
    setUploadFileLabel(file.name)
    let durationMs = 0
    try {
      const durationHint = typeof document !== 'undefined'
        ? await new Promise<string | null>((resolve) => {
            const url = URL.createObjectURL(file)
            const audio = new Audio(url)
            audio.addEventListener('loadedmetadata', () => {
              const sec = Math.round(audio.duration)
              durationMs = Number.isFinite(sec) ? sec * 1000 : 0
              URL.revokeObjectURL(url)
              resolve(Number.isFinite(sec) ? `Duration ~${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}` : null)
            })
            audio.addEventListener('error', () => {
              URL.revokeObjectURL(url)
              resolve(null)
            })
          })
        : null
      setUploadFileLabel(durationHint ? `${file.name} · ${durationHint}` : file.name)
      setCaptureMode('upload')
      setStartSource('upload')
      await attachAndTranscribeRecording(file, file.type || 'audio/webm', durationMs, 'upload')
    } catch {
      setBackendTranscriptionAvailable(false)
      setUploadError(ORB_DICTATE_RECORDING_TRANSCRIPTION_FAILED)
    } finally {
      setUploadingAudio(false)
    }
  }

  function handleTemplateChange(template: OrbDictateStudioTemplate) {
    setSelectedTemplateId(template.id)
    setNoteType(template.noteType)
    if (template.mode) setDictateMode(template.mode)
  }

  function dictateHandoffMetadata() {
    const workingDoc = editedNote.trim()
    return {
      dictate_capture_source: contentSource,
      recording_media: recordingMedia ? serializeOrbDictateRecordingMediaForSave(recordingMedia) : undefined,
      dictate_source_note: ORB_DICTATE_WRITE_HANDOFF_SOURCE_NOTE,
      working_document: workingDoc || undefined,
      people_to_confirm: peopleToConfirm.length ? peopleToConfirm : undefined
    }
  }

  async function handleFinalise() {
    const input = effectiveInputText
    if (!input) {
      setStatusMessage('Add a transcript before finalising.')
      return
    }
    setFinalising(true)
    setStatusMessage('Preparing document for ORB Write…')
    try {
      const segs = segments.length ? segments : textToSegments(input, 'paste', participants)
      const recordTypeId = recordTypeIdForStudioTemplate(selectedTemplateId)
      const result = await finaliseOrbDictateDocument({
        input_text: input,
        note_type: noteType,
        mode: dictateMode,
        template_id: selectedTemplateId,
        record_type_id: recordTypeId,
        transcript: input,
        accepted_suggestions: acceptedSuggestions,
        adult_edits: editedNote || output?.professional_note,
        participants,
        segments: segs,
        consent_confirmed: needsConsent ? consentConfirmed || authorityConsent : undefined,
        investigation_boundary_confirmed: dictateMode === 'investigation_meeting' ? investigationConfirmed : undefined
      })
      const generateResult = output ?? buildLocalDictateFallback(input, noteType)
      const handoff: OrbWriteHandoffPayload = {
        transcript: input,
        template_id: selectedTemplateId,
        note_type: result.note_type,
        record_type_id: result.record_type_id ?? recordTypeId,
        accepted_suggestions: acceptedSuggestions,
        adult_edits: result.professional_note,
        timestamp: result.timestamp,
        generate_result: {
          ...generateResult,
          professional_note: applyAcceptedSuggestionsToDraft(result.professional_note, acceptedSuggestions),
          note_type: result.note_type,
          title: result.title,
          summary: result.summary,
          quality_checks: result.quality_checks
        },
        participants,
        segments: segs,
        ...dictateHandoffMetadata()
      }
      saveOrbWriteHandoff(handoff)
      setWriteDocument(handoffToOrbWriteDocument(handoff))
      setPhase('write')
      setStatusMessage('Document opened in ORB Write — review before saving or exporting.')
    } catch {
      const fallback = output ?? buildLocalDictateFallback(input, noteType)
      const body = applyAcceptedSuggestionsToDraft(editedNote || fallback.professional_note, acceptedSuggestions)
      const handoff: OrbWriteHandoffPayload = {
        transcript: input,
        template_id: selectedTemplateId,
        note_type: noteType,
        record_type_id: recordTypeIdForStudioTemplate(selectedTemplateId),
        accepted_suggestions: acceptedSuggestions,
        adult_edits: body,
        timestamp: new Date().toISOString(),
        generate_result: { ...fallback, professional_note: body },
        participants,
        segments: segments.length ? segments : textToSegments(input, 'paste', participants),
        ...dictateHandoffMetadata()
      }
      saveOrbWriteHandoff(handoff)
      setWriteDocument(handoffToOrbWriteDocument(handoff))
      setPhase('write')
      setStatusMessage('Opened local draft in ORB Write — reconnect to refine with ORB intelligence.')
    } finally {
      setFinalising(false)
    }
  }

  async function runGenerate(overrides?: Partial<Parameters<typeof generateOrbDictateNote>[0]>) {
    const input = effectiveInputText
    if (!input) {
      setStatusMessage('Add a transcript before generating.')
      return
    }
    const governanceOk = consentReadyForGenerate(dictateMode, {
      authorityConsent,
      draftReviewConfirmed,
      participantsAwareConfirmed: participantsAware,
      noAutoSubmitConfirmed,
      investigationConfirmed
    })
    if (needsConsent && !governanceOk && dictateMode !== 'rough_note') {
      setStatusMessage('Complete consent and governance confirmations before generating.')
      return
    }
    if (needsConsent && startMode === 'record_debrief' && !consentConfirmed) {
      setStatusMessage('Please confirm consent before recording a conversation or debrief.')
      return
    }
    const segs = segments.length ? segments : textToSegments(input, startMode === 'import_voice' ? 'orb_voice' : 'paste', participants)
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_generate_clicked', detail: { inputLength: input.length } })
    setGenerating(true)
    setStatusMessage('Generating professional note…')
    try {
      const result = await generateOrbDictateNote({
        input_text: input,
        note_type: noteType,
        mode: dictateMode,
        include_child_voice: true,
        include_safeguarding: true,
        include_manager_oversight: true,
        include_actions: true,
        include_ofsted_lens: outputTab === 'evidence',
        source: startMode === 'import_voice' ? 'orb_voice' : startMode === 'paste' ? 'paste' : 'dictation',
        conversation_consent_confirmed: needsConsent ? consentConfirmed || authorityConsent : undefined,
        consent_confirmed: dictateMode !== 'rough_note' ? governanceOk : needsConsent ? consentConfirmed : undefined,
        investigation_boundary_confirmed: dictateMode === 'investigation_meeting' ? investigationConfirmed : undefined,
        participants,
        segments: segs,
        ...overrides
      })
      setOutput(result)
      setEditedNote(result.professional_note)
      if (result.participants?.length) setParticipants(result.participants as OrbDictateParticipant[])
      if (result.segments?.length) setSegments(result.segments as OrbDictateTranscriptSegment[])
      setGeneratedTypes((prev) => (prev.includes(result.note_type) ? prev : [...prev, result.note_type]))
      setOutputTab('professional')
      setStatusMessage('Professional note ready — open in ORB Write when you are ready.')
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_generate_success', detail: { noteType: result.note_type } })
    } catch {
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_generate_failed', detail: {} })
      const fallback = buildLocalDictateFallback(input, noteType)
      setOutput(fallback)
      setEditedNote(fallback.professional_note)
      setGeneratedTypes((prev) => (prev.includes(fallback.note_type) ? prev : [...prev, fallback.note_type]))
      setOutputTab('professional')
      setStatusMessage('Generation service unavailable — local draft created.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    const text = editedNote || output?.professional_note
    if (!text) return
    const ok = await copyTextToClipboard(text)
    setStatusMessage(ok ? 'Copied to clipboard.' : 'Copy failed — select and copy manually.')
  }

  async function handleSave() {
    const workingDoc = editedNote.trim()
    const transcriptText = transcript.trim()
    const text = workingDoc || output?.professional_note
    if (!text) return
    const title = resolveOrbGuidedDemoSaveTitle(
      output?.title ?? workingDocumentTypeLabel(selectedTemplateId)
    )
    const saveExtras = {
      source_feature: 'dictate' as const,
      brain_metadata: output?.brain_metadata,
      source_text: transcriptText || text,
      template_id: selectedTemplateId,
      working_document: workingDoc || undefined,
      people_to_confirm: peopleToConfirm.length ? peopleToConfirm : undefined,
      dictate_source_note: ORB_DICTATE_WRITE_HANDOFF_SOURCE_NOTE,
      recording_media: recordingMedia
        ? (serializeOrbDictateRecordingMediaForSave(recordingMedia) as Record<string, unknown>)
        : undefined,
      dictate_capture_source: contentSource
    }
    try {
      if (output) {
        const saved = await saveOrbDictateNote({
          title,
          note_type: output.note_type,
          professional_note: text,
          summary: output.summary,
          transcript: transcriptText || output.transcript,
          actions: output.actions
        })
        setStatusMessage(orbGuidedDemoSaveStatusMessage(saved.message || 'Saved to Records & Drafts.'))
        return
      }
      await createOrbSavedOutput(
        buildSavedOutputCreateBody({
          title,
          type: 'recording_rewrite',
          summary: workingDocumentTypeLabel(selectedTemplateId),
          content_markdown: text,
          tags: ['orb-dictate', noteType, selectedTemplateId],
          created_from: 'dictate',
          extras: saveExtras
        })
      )
      setStatusMessage(orbGuidedDemoSaveStatusMessage('Saved to Records & Drafts.'))
    } catch {
      try {
        await createOrbSavedOutput(
          buildSavedOutputCreateBody({
            title,
            type: 'recording_rewrite',
            summary: workingDocumentTypeLabel(selectedTemplateId),
            content_markdown: text,
            tags: ['orb-dictate', noteType, selectedTemplateId],
            created_from: 'dictate',
            extras: saveExtras
          })
        )
        setStatusMessage(orbGuidedDemoSaveStatusMessage('Saved to Records & Drafts.'))
      } catch {
        setStatusMessage('Save unavailable — use copy to keep your wording.')
      }
    }
  }

  async function handleExport(format: 'pdf' | 'docx') {
    const text = editedNote || output?.professional_note
    if (!text || !output) return
    try {
      const blob = await exportOrbDictateNote({ title: output.title, professional_note: text, format, note_type: output.note_type })
      if ('content' in blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${output.title}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      setStatusMessage(`Exported ${format.toUpperCase()}.`)
    } catch {
      setStatusMessage('Export unavailable — use copy instead.')
    }
  }

  function handleSendToChat() {
    const text = editedNote || output?.professional_note
    if (!text) return
    void Promise.resolve(onSendToChat(text))
    setStatusMessage('Sent to chat for further refinement.')
    onClose()
  }

  function handleAskOrbImprove() {
    const text = editedNote || output?.professional_note
    if (!text) return
    const label = ORB_DICTATE_NOTE_TYPE_LABELS[noteType]
    void Promise.resolve(
      onSendToChat(
        `Please improve this ${label} draft from ORB Dictate. Keep facts unchanged and strengthen child-centred, professional residential wording:\n\n${text}`
      )
    )
    setStatusMessage('Sent to ORB chat to improve this draft.')
    onClose()
  }

  function advanceReflective() {
    const answer = reflectiveDraft.trim()
    if (!answer) return
    const nextAnswers = [...reflectiveAnswers, answer]
    setReflectiveAnswers(nextAnswers)
    setReflectiveDraft('')
    if (reflectiveIndex + 1 >= REFLECTIVE_DEBRIEF_QUESTIONS.length) {
      const combined = REFLECTIVE_DEBRIEF_QUESTIONS.map((q, i) => `${q}\n${nextAnswers[i] || ''}`).join('\n\n')
      setTranscript(combined)
      setReflectiveMode(false)
      setNoteType('staff_debrief')
      setStatusMessage('Reflective debrief complete. Generate your professional note when ready.')
      return
    }
    setReflectiveIndex((i) => i + 1)
  }

  const speechStartAvailable =
    isOrbDictateBrowserRecordingSupported() || mediaRecorderAvailable || speechRecognitionAvailable

  const showBrowserSpeechFallback =
    !safari &&
    realtimeTranscriptionAvailable === false &&
    speechRecognitionAvailable &&
    !browserFallbackChosen

  const showMediaFallback =
    !safari && mediaRecorderAvailable && browserFallbackChosen

  const dictateState = mapRecordingUiToDictateState({
    recordingUiState,
    recordingPaused,
    generating,
    hasGeneratedOutput: Boolean(output),
    hasTranscript: effectiveInputText.length > 0
  })

  const userFacingStatus =
    statusMessage && !isTechnicalDictateStatus(statusMessage) ? statusMessage : null

  const micStatus = captureStarting
    ? 'Preparing microphone…'
    : uploadingAudio
      ? 'Processing audio…'
      : recordingActive
        ? recordingPaused
          ? 'Paused'
          : DICTATE_LISTENING_MESSAGE
        : statusMessage?.toLowerCase().includes('microphone blocked')
          ? 'Microphone blocked'
          : !speechRecognitionAvailable && !mediaRecorderAvailable && !isOrbDictateBrowserRecordingSupported()
            ? 'Paste transcript instead'
            : dictateState === 'transcript_ready'
              ? DICTATE_TRANSCRIPT_READY_MESSAGE
              : userFacingStatus || DICTATE_READY_MESSAGE

  const mobilePrimaryLabel = dictateMobilePrimaryButton({
    dictateState,
    recordingUiState,
    hasTranscript: effectiveInputText.length > 0
  })

  const mobileStatusLine = dictateMobileStatusLine({
    dictateState,
    recordingUiState,
    hasTranscript: effectiveInputText.length > 0,
    hasGeneratedOutput: Boolean(output),
    speechError,
    userStatus: userFacingStatus,
    listening: recordingActive && !recordingPaused,
    permissionPending: captureStarting
  })

  const showMobileCapturedCard = dictateMobileShowsCapturedCard({
    hasTranscript: effectiveInputText.length > 0,
    dictateState
  })

  const orbClass = recordingActive && !recordingPaused ? 'glass-orb-mark--listening glass-orb-mark--voice' : 'glass-orb-mark--voice glass-orb-mark--idle'

  function handleMobilePrimaryAction() {
    if (recordingActive || captureStarting) {
      void handleStopRecording()
      return
    }
    if (dictateState === 'error' || recordingUiState === 'error') {
      setRecordingUiState('idle')
      setSpeechError(null)
      if (!effectiveInputText.trim()) {
        setStartMode('paste')
        setPasteText('')
        setStatusMessage('Paste your transcript below.')
        return
      }
      void handleStartSpeechTranscript()
      return
    }
    void handleStartSpeechTranscript()
  }

  function handleMobileAiAction(action: DictateMobileAiActionId) {
    switch (action) {
      case 'improve_wording':
      case 'make_professional':
        void runGenerate()
        return
      case 'daily_record':
        setNoteType('daily_record')
        void runGenerate()
        return
      case 'incident_note':
        setNoteType('incident_record')
        void runGenerate()
        return
      case 'reflective_note':
        setNoteType('staff_debrief')
        void runGenerate()
        return
      case 'safeguarding_lens':
        void runGenerate({ include_safeguarding: true })
        return
      case 'ofsted_lens':
        void runGenerate({ include_ofsted_lens: true })
        return
      default:
        void runGenerate()
    }
  }

  if (phase === 'write' && writeDocument) {
    return (
      <OrbWriteStation
        open={open}
        onClose={onClose}
        onBack={() => setPhase('capture')}
        initialDocument={writeDocument}
      />
    )
  }

  return (
    <OrbAppModal
      open={open}
      title={phase === 'studio' ? 'Dictate Studio' : ORB_DICTATE_PRODUCT_TITLE}
      subtitle={
        phase === 'studio'
          ? 'Refine your draft with ORB side-by-side'
          : ORB_DICTATE_PRODUCT_SUBTITLE
      }
      onClose={onClose}
      panelId="orb-dictate"
      size="xlarge"
      ariaLabel={phase === 'studio' ? 'Dictate Studio' : ORB_DICTATE_PRODUCT_TITLE}
      presentation="workspace"
      compactChrome
    >
      <div
        className="orb-dictate pointer-events-auto flex min-h-0 flex-1 flex-col"
        data-orb-dictate-station
        data-orb-dictate-magic-notes
        data-orb-dictate-title={ORB_DICTATE_PRODUCT_TITLE}
        data-orb-dictate-subtitle={ORB_DICTATE_PRODUCT_SUBTITLE}
        data-orb-dictate-layout={
          phase === 'studio' ? undefined : isMobile ? 'mobile-runtime' : 'desktop-runtime'
        }
        data-orb-dictate-state={dictateState}
        data-orb-dictate-capture-mode={captureMode}
        data-orb-dictate-start-source={startSource}
        data-orb-dictate-recording-state={recordingUiState}
        data-orb-dictate-recorder-mode={recorderMode}
        data-orb-dictate-transcript-length={String(effectiveInputText.length)}
        data-orb-dictate-audio-size={lastAudioByteSize > 0 ? String(lastAudioByteSize) : undefined}
        data-orb-dictate-capture-source={lastCaptureSource !== 'none' ? lastCaptureSource : undefined}
        data-orb-dictate-chunk-count={lastChunkCount > 0 ? String(lastChunkCount) : undefined}
        data-orb-dictate-sample-count={lastSampleCount > 0 ? String(lastSampleCount) : undefined}
        data-orb-dictate-status={(statusMessage ?? dictateState).slice(0, 120)}
        data-orb-dictate-speech-error={speechError ?? undefined}
        data-orb-dictate-restart-count={speechRestartCount > 0 ? String(speechRestartCount) : undefined}
      >
        {phase === 'studio' && output ? (
          <OrbDictateStudio output={output} participants={participants} segments={segments} onBack={() => setPhase('capture')} onSendToChat={onSendToChat} onOpenOrbVoice={onOpenOrbVoice} onStatusMessage={setStatusMessage} />
        ) : isMobile ? (
          <div data-orb-mobile-branch="active" data-orb-responsive-mode="mobile" className="flex min-h-0 flex-1 flex-col">
        <OrbDictateMobileExperience
          orbClass={orbClass}
          mobileStatusLine={mobileStatusLine}
          mobilePrimaryLabel={mobilePrimaryLabel}
          captureStarting={captureStarting}
          recordingActive={recordingActive && !recordingPaused}
          timerSec={timerSec}
          formatTimer={formatTimer}
          showRealtimeReadyHint={realtimeTranscriptionAvailable === true}
          uploadingAudio={uploadingAudio}
          needsConsent={needsConsent}
          consentConfirmed={consentConfirmed}
          onPrimaryAction={handleMobilePrimaryAction}
          showCapturedCard={showMobileCapturedCard}
          liveTranscript={liveTranscript}
          effectiveInputText={effectiveInputText}
          onTranscriptChange={(value) => {
            setTranscript(value)
            setSegments(textToSegments(value, 'paste', participants))
          }}
          segments={segments}
          participants={participants}
          onSegmentsChange={(next) => {
            setSegments(next)
            setTranscript(segmentsToPlainText(next))
          }}
          onParticipantsChange={setParticipants}
          onImportParticipants={() => {
            const suggested = suggestParticipantsFromText(effectiveInputText)
            setParticipants(suggested)
          }}
          mobileAdvancedOpen={mobileAdvancedOpen}
          onToggleAdvanced={() => setMobileAdvancedOpen((o) => !o)}
          onClearTranscript={handleClearTranscript}
          onPasteTranscript={() => {
            setStartMode('paste')
            setMobileRecordingOpen(true)
            setStatusMessage('Paste your transcript below.')
          }}
          onAudioUpload={(file) => void handleAudioUpload(file)}
          generating={generating}
          onAiAction={handleMobileAiAction}
          onGenerate={() => void runGenerate()}
          mobileRecordingOpen={mobileRecordingOpen}
          onToggleRecordingOptions={() => setMobileRecordingOpen((o) => !o)}
          selectedTemplateId={selectedTemplateId}
          onTemplateChange={handleTemplateChange}
          dictateMode={dictateMode}
          onDictateModeChange={setDictateMode}
          noteType={noteType}
          onNoteTypeChange={setNoteType}
          startMode={startMode}
          onSelectStartMode={handleSelectStartMode}
          pasteText={pasteText}
          onPasteTextChange={setPasteText}
          onApplyPaste={applyPaste}
          output={output}
          outputTab={outputTab}
          onOutputTabChange={setOutputTab}
          editedNote={editedNote}
          onEditedNoteChange={setEditedNote}
          mobileOutputOpen={mobileOutputOpen}
          onToggleOutputPreview={() => setMobileOutputOpen((o) => !o)}
          onAskOrbImprove={output ? handleAskOrbImprove : undefined}
          developerMode={developerMode}
          dictateState={dictateState}
          recordingUiState={recordingUiState}
        />

        {output ? <button type="button" data-orb-dictate-open-studio className="mt-2 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] py-2 text-sm font-medium text-[var(--orb-primary)]" onClick={() => setPhase('studio')}>Open Dictate Studio</button> : null}
          </div>
        ) : (
          <div data-orb-desktop-branch="active" data-orb-responsive-mode="desktop" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <OrbDictateStudioWorkspace
          selectedTemplateId={selectedTemplateId}
          onTemplateChange={handleTemplateChange}
          noteType={noteType}
          dictateMode={dictateMode}
          transcript={transcript}
          liveTranscript={liveTranscript}
          onTranscriptChange={(value) => {
            setTranscript(value)
            setSegments(textToSegments(value, 'paste', participants))
          }}
          segments={segments}
          onSegmentsChange={(next) => {
            setSegments(next)
            setTranscript(segmentsToPlainText(next))
          }}
          participants={participants}
          onParticipantsChange={setParticipants}
          recordingActive={recordingActive}
          recordingPaused={recordingPaused}
          captureStarting={captureStarting}
          timerSec={timerSec}
          formatTimer={formatTimer}
          micStatus={micStatus}
          orbClass={orbClass}
          onStartRecording={() => void handleStartDictateRecording()}
          onPauseRecording={handlePauseRecording}
          onResumeRecording={handleResumeRecording}
          onStopRecording={handleStopRecording}
          onClearTranscript={handleClearTranscript}
          speechStartDisabled={(needsConsent && !consentConfirmed) || !speechStartAvailable || uploadingAudio || finalising}
          interimText={realtimeInterim || voice.interimTranscript}
          generating={generating || finalising}
          onGenerate={(overrides) => void runGenerate(overrides)}
          onFinalise={() => void handleFinalise()}
          onCopy={() => void handleCopy()}
          onSave={() => void handleSave()}
          onEditedNoteChange={setEditedNote}
          editedNote={editedNote}
          canGenerate={effectiveInputText.trim().length > 0}
          output={output}
          generatedTypes={generatedTypes}
          onSelectOutputType={(type) => {
            setNoteType(type)
            void runGenerate({ note_type: type })
          }}
          onSuggestionsChange={setAcceptedSuggestions}
          authorityConsent={authorityConsent}
          investigationConfirmed={investigationConfirmed}
          draftReviewConfirmed={draftReviewConfirmed}
          participantsAware={participantsAware}
          noAutoSubmitConfirmed={noAutoSubmitConfirmed}
          onAuthorityConsentChange={setAuthorityConsent}
          onInvestigationChange={setInvestigationConfirmed}
          onDraftReviewChange={setDraftReviewConfirmed}
          onParticipantsAwareChange={setParticipantsAware}
          onNoAutoSubmitChange={setNoAutoSubmitConfirmed}
          onAudioUpload={(file) => void handleAudioUpload(file)}
          uploadingAudio={uploadingAudio}
          uploadFileLabel={uploadFileLabel}
          uploadError={uploadError}
          recordingMedia={recordingMedia}
          contentSource={contentSource}
          onClearRecording={clearDictateRecordingMedia}
          onContentSourceChange={setContentSource}
          processingStage={processingStage}
          peopleToConfirm={peopleToConfirm}
        />
        {output ? (
          <div className="mt-2 flex shrink-0 flex-wrap gap-2">
            <button type="button" data-orb-dictate-open-studio className="rounded-xl border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--orb-primary)]" onClick={() => setPhase('studio')}>
              Open legacy Dictate Studio
            </button>
            {onOpenOrbVoice ? (
              <button type="button" className="text-xs text-sky-400/90 hover:text-sky-300" onClick={onOpenOrbVoice}>
                Continue with ORB Voice
              </button>
            ) : null}
          </div>
        ) : null}
        {statusMessage ? <p className="mt-2 shrink-0 text-xs text-[var(--orb-primary)]" role="status">{statusMessage}</p> : null}
          </div>
        )}
      </div>
    </OrbAppModal>
  )
}
