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
import { OrbDictateMobileExperience } from '@/components/orb-standalone/orb-dictate-mobile-experience'
import { OrbDictateStudio } from '@/components/orb-standalone/orb-dictate-studio'
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
import {
  buildLocalDictateFallback,
  exportOrbDictateNote,
  generateOrbDictateNote,
  isAcceptedDictateAudio,
  readLatestOrbVoiceTranscript,
  readLatestOrbVoiceTurns,
  saveOrbDictateNote,
  transcribeOrbDictateAudio
} from '@/lib/orb/dictate/orb-dictate-client'
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
  REFLECTIVE_DEBRIEF_QUESTIONS,
  type OrbDictateGenerateResult,
  type OrbDictateNoteType,
  type OrbDictateStartMode
} from '@/lib/orb/dictate/orb-dictate-types'
import { createOrbSavedOutput } from '@/lib/orb/standalone-client'
import { isOrbDeveloperMode } from '@/lib/orb/orb-developer-mode'
import {
  dictateMobilePrimaryButton,
  dictateMobileShowsCapturedCard,
  dictateMobileStatusLine,
  isTechnicalDictateStatus,
  type DictateMobileAiActionId
} from '@/lib/orb/dictate/orb-dictate-mobile-copy'

type VoiceApi = ReturnType<typeof useStandaloneOrbVoice>

type OutputTab = 'professional' | 'summary' | 'actions' | 'transcript' | 'evidence'

const NOTE_TYPES = Object.keys(ORB_DICTATE_NOTE_TYPE_LABELS) as OrbDictateNoteType[]

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
  initialStudio
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
  const [phase, setPhase] = useState<'capture' | 'studio'>('capture')
  const [reflectiveMode, setReflectiveMode] = useState(false)
  const [reflectiveIndex, setReflectiveIndex] = useState(0)
  const [reflectiveAnswers, setReflectiveAnswers] = useState<string[]>([])
  const [reflectiveDraft, setReflectiveDraft] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
    if (initialStudio) setPhase('studio')
  }, [open, initialTranscript, initialStudio, resetRecording])

  useEffect(() => {
    if (!recordingActive || recordingPaused) return
    timerRef.current = setInterval(() => setTimerSec((s) => s + 1), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [recordingActive, recordingPaused])

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
    orbMicDevLog('dictate speech start clicked', effectiveStartMode ?? 'unknown')
    emitOrbClientDebug({ area: 'dictate', event: 'dictate_speech_start_clicked', detail: { mode: effectiveStartMode } })
    if (consentBlocksStart(mode)) return
    if (mode) setStartMode(mode)
    setStartSource('user_click')
    setSpeechError(null)
    transcriptBufferRef.current = transcript.trim() ? [transcript.trim()] : []
    lastDictateTranscriptRef.current = ''
    setRecordingUiState('starting')
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

      const captureResult = await voice.endMediaRecorderCapture()
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
        setRecordingUiState('processing')
        setUploadingAudio(true)
        const sourceLabel = captureSourceLabel(source)
        setRecordedAudioLabel(sourceLabel || 'Recorded note')
        setUploadFileLabel(sourceLabel || 'Recorded note')
        setStatusMessage('Audio captured. Preparing transcription…')
        try {
          const mime = blob.type || captureResult?.mimeType || 'audio/webm'
          const ext = extensionForAudioMime(mime)
          const file = new File([blob], `dictate-recording-${Date.now()}${ext}`, { type: mime })
          const result = await transcribeOrbDictateAudio(file, {
            conversation_consent_confirmed: effectiveNeedsConsent ? authorityConsent && consentConfirmed : undefined
          })
          setBackendTranscriptionAvailable(true)
          const merged = result.transcript.trim()
          transcriptBufferRef.current = merged ? [merged] : []
          setTranscript(merged)
          setSegments(result.segments ?? textToSegments(result.transcript, 'upload', result.participants ?? []))
          if (result.participants?.length) setParticipants(result.participants)
          setStartMode('paste')
          setOutputTab('transcript')
          setRecordingUiState('stopped')
          setStatusMessage('Recording transcribed — review before generating.')
        } catch {
          setBackendTranscriptionAvailable(false)
          setRecordingUiState('stopped')
          const notice = `${captureSourceLabel(source) || 'Audio captured'}. Automatic transcription is not available yet. Paste a transcript to generate professional wording.`
          setUploadError(notice)
          setStatusMessage(notice)
        } finally {
          setUploadingAudio(false)
        }
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
    voice.clearTranscript()
  }

  function applyPaste() {
    const text = pasteText.trim()
    if (!text) return
    transcriptBufferRef.current = [text]
    syncSegmentsFromText(text, 'paste')
    setStartMode('paste')
    setCaptureMode('paste')
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
    try {
      const durationHint = typeof document !== 'undefined'
        ? await new Promise<string | null>((resolve) => {
            const url = URL.createObjectURL(file)
            const audio = new Audio(url)
            audio.addEventListener('loadedmetadata', () => {
              const sec = Math.round(audio.duration)
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
      const result = await transcribeOrbDictateAudio(file, {
        conversation_consent_confirmed: needsConsent ? authorityConsent && consentConfirmed : undefined
      })
      setTranscript(result.transcript)
      setSegments(result.segments ?? textToSegments(result.transcript, 'upload', result.participants ?? []))
      if (result.participants?.length) setParticipants(result.participants)
      setBackendTranscriptionAvailable(true)
      setStartMode('paste')
      setCaptureMode('upload')
      setStartSource('upload')
      setOutputTab('transcript')
      setStatusMessage('Audio transcribed — review speaker labels before generating.')
    } catch {
      setBackendTranscriptionAvailable(false)
      setUploadError(
        'Audio uploaded, but transcription is unavailable. Paste the transcript to generate a note.'
      )
    } finally {
      setUploadingAudio(false)
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
      setPhase('studio')
      setOutputTab('professional')
      setStatusMessage('Professional note ready.')
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_generate_success', detail: { noteType: result.note_type } })
    } catch {
      emitOrbClientDebug({ area: 'dictate', event: 'dictate_generate_failed', detail: {} })
      const fallback = buildLocalDictateFallback(input, noteType)
      setOutput(fallback)
      setEditedNote(fallback.professional_note)
      setPhase('studio')
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
    const text = editedNote || output?.professional_note
    if (!text || !output) return
    try {
      const saved = await saveOrbDictateNote({
        title: output.title,
        note_type: output.note_type,
        professional_note: text,
        summary: output.summary,
        transcript: output.transcript,
        actions: output.actions
      })
      setStatusMessage(saved.message || 'Saved to Saved Outputs.')
    } catch {
      try {
        await createOrbSavedOutput({
          title: output.title,
          type: 'recording_rewrite',
          summary: output.summary,
          content_markdown: text,
          tags: ['orb-dictate', output.note_type],
          created_from: 'manual'
        })
        setStatusMessage('Saved to Saved Outputs.')
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

  const speechStartAvailable = realtimeTranscriptionAvailable !== false

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
    ? 'Starting…'
    : uploadingAudio
      ? 'Processing audio…'
      : recordingActive
        ? recordingPaused
          ? 'Paused'
          : DICTATE_LISTENING_MESSAGE
        : statusMessage?.toLowerCase().includes('microphone blocked')
          ? 'Microphone blocked'
          : !speechRecognitionAvailable && !mediaRecorderAvailable && realtimeTranscriptionAvailable !== true
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
    speechError,
    userStatus: userFacingStatus,
    listening: recordingActive && !recordingPaused
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

  return (
    <OrbAppModal
      open={open}
      title={phase === 'studio' ? 'ORB Dictate Studio' : 'ORB Dictate'}
      subtitle={phase === 'studio' ? 'Refine your draft with ORB side-by-side' : 'Speak, review, generate.'}
      onClose={onClose}
      panelId="orb-dictate"
      size={phase === 'studio' ? 'xlarge' : 'wide'}
      ariaLabel={phase === 'studio' ? 'ORB Dictate Studio' : 'ORB Dictate'}
    >
      <div
        className="orb-dictate pointer-events-auto flex min-h-0 flex-1 flex-col"
        data-orb-dictate-station
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
        ) : (
          <>
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
          developerMode={developerMode}
          dictateState={dictateState}
          recordingUiState={recordingUiState}
        />

        <p className="hidden shrink-0 px-1 pb-3 text-sm text-[var(--orb-muted)] md:block">
          Speak naturally. ORB will help turn rough notes, debriefs or conversations into structured professional wording.
        </p>
        <div className="hidden min-h-0 flex-1 gap-4 overflow-hidden md:grid md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Start</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {([
                  ['record_note', 'Record note', Mic],
                  ['record_debrief', 'Record debrief', Mic],
                  ['paste', 'Paste transcript', FileText],
                  ['import_voice', 'Import from ORB Voice', Sparkles],
                  ['template', 'Use template', FileText]
                ] as const).map(([id, label, Icon]) => (
                  <button key={id} type="button" data-orb-dictate-start={id} className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${startMode === id ? 'border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]' : 'border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] text-[var(--orb-foreground)] hover:border-[var(--orb-primary)]/30'}`} onClick={() => handleSelectStartMode(id)}>
                    <Icon className="mb-1 h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" className="mt-2 text-xs text-[var(--orb-primary)] hover:opacity-80" data-orb-dictate-reflective onClick={() => { setReflectiveMode(true); setReflectiveIndex(0); setReflectiveAnswers([]); setReflectiveDraft(''); setStartMode('paste') }}>
                Guided reflective debrief (typed, one question at a time)
              </button>
            </section>

            {reflectiveMode ? (
              <section className="rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] p-3" data-orb-dictate-reflective-step>
                <p className="text-xs text-[var(--orb-muted)]">Guided reflective debrief · question {reflectiveIndex + 1} of {REFLECTIVE_DEBRIEF_QUESTIONS.length}</p>
                <p className="mt-1 text-sm font-medium text-[var(--orb-foreground)]">{REFLECTIVE_DEBRIEF_QUESTIONS[reflectiveIndex]}</p>
                <textarea value={reflectiveDraft} onChange={(e) => setReflectiveDraft(e.target.value)} rows={3} className="mt-2 w-full rounded-lg border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)]" placeholder="Type your reflection — no microphone needed…" />
                <button type="button" className="mt-2 rounded-lg bg-[var(--orb-primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--orb-foreground)]" onClick={advanceReflective}>Next</button>
              </section>
            ) : null}

            <OrbDictateModeSelect mode={dictateMode} onChange={setDictateMode} />
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Note type</h3>
              <select data-orb-dictate-note-type value={noteType} onChange={(e) => setNoteType(e.target.value as OrbDictateNoteType)} className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)]">
                {NOTE_TYPES.map((t) => <option key={t} value={t}>{ORB_DICTATE_NOTE_TYPE_LABELS[t]}</option>)}
              </select>
            </section>
            <OrbDictateParticipantsPanel participants={participants} onChange={setParticipants} transcript={effectiveInputText} onImportFromTranscript={() => { const suggested = suggestParticipantsFromText(effectiveInputText); setParticipants(suggested); setStatusMessage(suggested.length ? `Imported ${suggested.length} suggested participant(s) — confirm names and roles.` : 'No introductions detected — add participants manually.') }} />
            <OrbDictateAudioUpload onFile={(file) => void handleAudioUpload(file)} uploading={uploadingAudio} fileLabel={uploadFileLabel} error={uploadError} />
            <OrbDictateGovernanceConsent mode={dictateMode} authorityConsent={authorityConsent} investigationConfirmed={investigationConfirmed} draftReviewConfirmed={draftReviewConfirmed} participantsAwareConfirmed={participantsAware} noAutoSubmitConfirmed={noAutoSubmitConfirmed} onAuthorityConsentChange={setAuthorityConsent} onInvestigationChange={setInvestigationConfirmed} onDraftReviewChange={setDraftReviewConfirmed} onParticipantsAwareChange={setParticipantsAware} onNoAutoSubmitChange={setNoAutoSubmitConfirmed} />

            {startMode === 'record_debrief' && dictateMode === 'rough_note' ? (
              <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-100/90" data-orb-dictate-consent>
                <label className="flex cursor-pointer items-start gap-2"><input type="checkbox" checked={consentConfirmed} onChange={(e) => setConsentConfirmed(e.target.checked)} className="mt-0.5" /><span>I confirm I have authority/consent to record or dictate this note. I understand I must review the output before using it as a formal record.</span></label>
              </section>
            ) : null}

            {startMode === 'paste' ? (
              <section>
                <textarea data-orb-dictate-paste value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={4} placeholder="Paste transcript…" className="w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)]" />
                <button type="button" className="mt-2 text-xs text-sky-400" onClick={applyPaste}>Use pasted text</button>
              </section>
            ) : null}

            <section className="rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GlassOrbMark className={orbClass} size="sm" />
                  <div>
                    <p className="text-xs font-medium text-[var(--orb-foreground)]">{micStatus}</p>
                    {developerMode ? (
                      <div className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-capture-capability>
                        {captureCapabilityLines.lines.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    ) : null}
                    {recordedAudioLabel ? <p className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-recorded-audio>{recordedAudioLabel}</p> : null}
                    <p className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-timer>{formatTimer(timerSec)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!recordingActive && !captureStarting ? (
                    <>
                      <button
                        type="button"
                        data-orb-dictate-speech-start
                        data-orb-dictate-record-start
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--orb-primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--orb-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={(needsConsent && !consentConfirmed) || !speechStartAvailable || uploadingAudio}
                        title={
                          !speechStartAvailable
                            ? DICTATE_REALTIME_NOT_CONFIGURED_MESSAGE
                            : needsConsent && !consentConfirmed
                              ? 'Confirm consent before recording'
                              : 'Start recording'
                        }
                        onClick={() => void handleStartSpeechTranscript()}
                      >
                        <Mic className="h-3.5 w-3.5" /> Start recording
                      </button>
                      {showBrowserSpeechFallback ? (
                        <button
                          type="button"
                          data-orb-dictate-browser-speech-fallback
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--orb-line)]/60 px-3 py-1.5 text-xs text-[var(--orb-muted)] hover:text-[var(--orb-foreground)] disabled:opacity-50"
                          disabled={(needsConsent && !consentConfirmed) || uploadingAudio}
                          onClick={() => void handleBrowserSpeechFallbackClick()}
                        >
                          Use browser speech (non-Safari)
                        </button>
                      ) : null}
                      {showMediaFallback ? (
                        <button
                          type="button"
                          data-orb-dictate-audio-fallback
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--orb-line)]/60 px-3 py-1.5 text-xs text-[var(--orb-muted)] hover:text-[var(--orb-foreground)] disabled:opacity-50"
                          disabled={(needsConsent && !consentConfirmed) || uploadingAudio}
                          onClick={() => void handleAudioFallbackClick()}
                        >
                          Try audio recording fallback
                        </button>
                      ) : null}
                    </>
                  ) : captureStarting ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--orb-line)]/60 px-3 py-1.5 text-xs text-[var(--orb-muted)]" data-orb-dictate-capture-starting>
                      Starting…
                    </span>
                  ) : (
                    <>
                      {captureMode === 'realtime_transcription' || recorderModeRef.current === 'speech' ? (
                        recordingPaused ? <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={handleResumeRecording} aria-label="Resume"><Play className="h-4 w-4" /></button> : <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={handlePauseRecording} aria-label="Pause"><Pause className="h-4 w-4" /></button>
                      ) : null}
                      <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={handleStopRecording} aria-label="Stop"><Square className="h-4 w-4" /></button>
                    </>
                  )}
                  <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={handleClearTranscript} aria-label="Clear" disabled={uploadingAudio}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-[var(--orb-line)]/40 bg-[var(--orb-surface)] p-2 text-sm text-[var(--orb-foreground)]" data-orb-dictate-live-transcript>{liveTranscript || <span className="text-[var(--orb-muted)]">Live transcript appears here…</span>}</div>
            </section>

            <OrbDictateTranscriptSegmentsEditor segments={segments} participants={participants} onChange={(next) => { setSegments(next); setTranscript(segmentsToPlainText(next)) }} />
            <button type="button" data-orb-dictate-generate disabled={generating || !effectiveInputText.trim()} className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60" onClick={() => void runGenerate()}>{generating ? 'Generating…' : 'Generate professional note'}</button>
            {onOpenOrbVoice ? <button type="button" className="text-xs text-sky-400/90 hover:text-sky-300" onClick={onOpenOrbVoice}>Continue with ORB Voice</button> : null}
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]">
            <div className="flex shrink-0 gap-1 border-b border-[var(--orb-line)]/40 p-2">
              {([['professional', 'Professional note'], ['summary', 'Summary'], ['actions', 'Actions'], ['transcript', 'Transcript'], ['evidence', 'Evidence / Ofsted']] as const).map(([id, label]) => <button key={id} type="button" data-orb-dictate-tab={id} className={`rounded-lg px-2 py-1 text-[10px] sm:text-xs ${outputTab === id ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]' : 'text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'}`} onClick={() => setOutputTab(id)}>{label}</button>)}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!output ? <div className="space-y-3 text-sm text-[var(--orb-muted)]" data-orb-dictate-output-empty><p>Start by recording, pasting a transcript, or uploading audio.</p><p>When ORB has your rough note, it will create professional recording wording here.</p></div> : outputTab === 'professional' ? <textarea data-orb-dictate-output value={editedNote} onChange={(e) => setEditedNote(e.target.value)} rows={16} className="h-full min-h-[12rem] w-full resize-none bg-transparent text-sm text-[var(--orb-foreground)] focus:outline-none" /> : outputTab === 'summary' ? <p className="text-sm text-[var(--orb-foreground)]">{output.summary}</p> : outputTab === 'actions' ? <ul className="list-disc space-y-1 pl-4 text-sm text-[var(--orb-foreground)]">{output.actions.map((a) => <li key={a}>{a}</li>)}</ul> : outputTab === 'transcript' ? <p className="whitespace-pre-wrap text-sm text-[var(--orb-foreground)]">{output.transcript}</p> : <div className="space-y-2 text-sm text-[var(--orb-foreground)]">{output.ofsted_lens ? <p>{output.ofsted_lens}</p> : null}<ul className="space-y-1 text-xs">{Object.entries(output.quality_checks).map(([k, v]) => <li key={k}>{k.replace(/_/g, ' ')}: <span className="text-sky-300">{v}</span></li>)}</ul></div>}
            </div>
            {output ? <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--orb-line)]/40 p-2"><button type="button" data-orb-dictate-copy className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]" onClick={() => void handleCopy()}><ClipboardCopy className="h-3.5 w-3.5" /> Copy</button><button type="button" data-orb-dictate-save className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]" onClick={() => void handleSave()}><Save className="h-3.5 w-3.5" /> Save</button><button type="button" data-orb-dictate-export-pdf className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]" onClick={() => void handleExport('pdf')}><Download className="h-3.5 w-3.5" /> PDF</button><button type="button" data-orb-dictate-export-docx className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]" onClick={() => void handleExport('docx')}><FileText className="h-3.5 w-3.5" /> DOCX</button><button type="button" data-orb-dictate-send-chat className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]" onClick={handleSendToChat}>Send to chat</button></div> : null}
          </div>
        </div>

        {output ? <button type="button" data-orb-dictate-open-studio className="mt-2 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] py-2 text-sm font-medium text-[var(--orb-primary)]" onClick={() => setPhase('studio')}>Open ORB Dictate Studio</button> : null}
          </>
        )}
        <footer className="mt-3 hidden shrink-0 space-y-1 border-t border-[var(--orb-line)]/30 pt-3 text-[10px] text-[var(--orb-muted)] md:block">
          <p>{ORB_DICTATE_GOVERNANCE_COPY.draft}</p><p>{ORB_DICTATE_GOVERNANCE_COPY.speaker}</p><p data-orb-dictate-speaker-boundary>{SPEAKER_BOUNDARY_COPY}</p><p>{ORB_DICTATE_GOVERNANCE_COPY.recording}</p><p>{ORB_DICTATE_GOVERNANCE_COPY.boundary}</p><p>{ORB_DICTATE_GOVERNANCE_COPY.saveWording}</p><p>{ORB_DICTATE_GOVERNANCE_COPY.retention}</p>{statusMessage ? <p className="text-xs text-[var(--orb-primary)]" role="status">{statusMessage}</p> : null}
        </footer>
      </div>
    </OrbAppModal>
  )
}
