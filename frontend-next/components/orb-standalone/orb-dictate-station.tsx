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
import { orbMicDevLog } from '@/lib/orb/voice/orb-mic-access'
import { detectMediaRecorderSupported, detectSpeechRecognitionSupported } from '@/lib/orb/voice/orb-voice-readiness'
import {
  anonymiseText,
  modeToNoteType,
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
  ORB_DICTATE_GOVERNANCE_COPY,
  ORB_DICTATE_NOTE_TYPE_LABELS,
  REFLECTIVE_DEBRIEF_QUESTIONS,
  type OrbDictateGenerateResult,
  type OrbDictateNoteType,
  type OrbDictateStartMode
} from '@/lib/orb/dictate/orb-dictate-types'
import { createOrbSavedOutput } from '@/lib/orb/standalone-client'

type VoiceApi = ReturnType<typeof useStandaloneOrbVoice>

type OutputTab = 'professional' | 'summary' | 'actions' | 'transcript' | 'evidence'

const NOTE_TYPES = Object.keys(ORB_DICTATE_NOTE_TYPE_LABELS) as OrbDictateNoteType[]

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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
  const [recordingActive, setRecordingActive] = useState(false)
  const [captureStarting, setCaptureStarting] = useState(false)
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
  const transcriptBufferRef = useRef<string[]>([])
  const lastDictateTranscriptRef = useRef('')
  const [backendTranscriptionAvailable, setBackendTranscriptionAvailable] = useState<boolean | 'unknown'>(
    'unknown'
  )
  const [recordedAudioLabel, setRecordedAudioLabel] = useState<string | null>(null)

  const needsConsent = startMode === 'record_debrief' || dictateMode !== 'rough_note'

  const speechRecognitionAvailable =
    voice.recognitionAvailable || detectSpeechRecognitionSupported()
  const mediaRecorderAvailable = voice.mediaRecorderAvailable || detectMediaRecorderSupported()

  const captureCapabilityLines = useMemo(() => {
    const lines: string[] = []
    if (speechRecognitionAvailable) {
      lines.push('Browser speech recognition available')
    }
    if (mediaRecorderAvailable) {
      lines.push('Audio recording available')
    }
    if (!speechRecognitionAvailable && !mediaRecorderAvailable) {
      return {
        primary: 'Microphone unavailable — paste a transcript instead',
        lines: ['Paste transcript instead']
      }
    }
    lines.push('Automatic transcription depends on backend availability')
    lines.push('Safari may require microphone permission in site settings')
    return {
      primary: speechRecognitionAvailable
        ? 'Browser speech recognition available'
        : 'Audio recording available',
      lines
    }
  }, [speechRecognitionAvailable, mediaRecorderAvailable])

  const liveTranscript = useMemo(() => {
    if (!recordingActive) return transcript
    const interim = (voice.interimTranscript || '').trim()
    const buffered = transcriptBufferRef.current.length
      ? transcriptBufferRef.current.join('\n')
      : transcript
    if (interim) return buffered ? `${buffered}\n${interim}` : interim
    return buffered
  }, [
    transcript,
    recordingActive,
    voice.interimTranscript,
    voice.transcript,
    voice.displayTranscript
  ])

  const effectiveInputText = useMemo(() => {
    if (segments.length) return segmentsToPlainText(segments)
    return liveTranscript.trim() || pasteText.trim()
  }, [segments, liveTranscript, pasteText])

  useEffect(() => {
    if (dictateMode === 'rough_note') return
    setNoteType(modeToNoteType(dictateMode))
  }, [dictateMode])

  const resetRecording = useCallback(() => {
    setRecordingActive(false)
    setCaptureStarting(false)
    setRecordingPaused(false)
    setTimerSec(0)
    recorderModeRef.current = null
    lastDictateTranscriptRef.current = ''
    voice.cancelListening()
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
      return
    }
    if (initialTranscript) {
      setTranscript(initialTranscript)
      setStartMode('import_voice')
    }
    if (initialStudio) {
      setPhase('studio')
    }
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
    const chunk =
      finalChunk || (voice.phase === 'transcript_ready' ? display : '')
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
  }, [
    voice.transcript,
    voice.displayTranscript,
    voice.phase,
    recordingActive,
    recordingPaused
  ])

  async function handleVoiceCommand(action: OrbDictateVoiceCommandAction) {
    const converted = noteTypeForVoiceCommand(action)
    if (converted) setNoteType(converted)
    if (action === 'save') {
      await handleSave()
      return
    }
    if (action === 'copy') {
      await handleCopy()
      return
    }
    if (action === 'export_pdf') {
      await handleExport('pdf')
      return
    }
    if (action === 'send_chat') {
      handleSendToChat()
      return
    }
    if (action === 'what_missing' && output) {
      setOutputTab('evidence')
      setStatusMessage('Review quality checks and evidence tab for gaps.')
      return
    }
    const flags = generateFlagsForVoiceCommand(action)
    await runGenerate({ ...flags, include_ofsted_lens: flags.include_ofsted_lens ?? action === 'ofsted_ready' })
  }

  const MIC_BLOCKED_MESSAGE =
    'Microphone blocked — check Safari site settings and allow microphone for this site.'

  const SPEECH_START_FAILED_MESSAGE =
    'Speech recognition could not start. Try recording audio, paste a transcript, or check Safari microphone settings.'

  async function handleStartRecording(mode?: OrbDictateStartMode) {
    const effectiveStartMode = mode ?? startMode
    orbMicDevLog('dictate record clicked', effectiveStartMode ?? 'unknown')
    const effectiveNeedsConsent =
      effectiveStartMode === 'record_debrief' || dictateMode !== 'rough_note'
    if (effectiveNeedsConsent && !consentConfirmed) {
      setStatusMessage('Please confirm consent before recording a conversation or debrief.')
      return
    }
    if (!speechRecognitionAvailable && !mediaRecorderAvailable) {
      setStatusMessage('Paste transcript instead — microphone capture is unavailable in this browser.')
      return
    }
    if (mode) setStartMode(mode)
    transcriptBufferRef.current = transcript.trim() ? [transcript.trim()] : []
    lastDictateTranscriptRef.current = ''
    setRecordingActive(false)
    setCaptureStarting(true)
    setRecordingPaused(false)
    setStatusMessage(null)
    setRecordedAudioLabel(null)

    const useSpeech = speechRecognitionAvailable
    if (useSpeech) {
      recorderModeRef.current = 'speech'
      const ok = await voice.beginUserVoiceCapture({ mode: 'continuous' })
      setCaptureStarting(false)
      if (!ok) {
        setRecordingActive(false)
        const denied = voice.error?.toLowerCase().includes('microphone')
        setStatusMessage(
          denied
            ? MIC_BLOCKED_MESSAGE
            : voice.error?.toLowerCase().includes('speech recognition')
              ? SPEECH_START_FAILED_MESSAGE
              : voice.error || SPEECH_START_FAILED_MESSAGE
        )
        orbMicDevLog('speech capture failed', voice.error ?? 'unknown')
        return
      }
      setRecordingActive(true)
      orbMicDevLog('speech capture started')
      return
    }

    recorderModeRef.current = 'media'
    const ok = await voice.beginMediaRecorderCapture()
    setCaptureStarting(false)
    if (!ok) {
      setRecordingActive(false)
      const denied = voice.error?.toLowerCase().includes('microphone')
      setStatusMessage(
        denied
          ? MIC_BLOCKED_MESSAGE
          : 'Audio capture is unavailable in this browser — paste or upload a transcript instead.'
      )
      orbMicDevLog('media recorder failed', voice.error ?? 'unknown')
      return
    }
    setRecordingActive(true)
    orbMicDevLog('media recorder started')
  }

  function handleSelectStartMode(id: OrbDictateStartMode) {
    setStartMode(id)
    if (id === 'import_voice') importFromOrbVoice()
    if (id === 'template') onOpenTemplates?.()
    if (id === 'paste') {
      setPasteText(transcript)
      setOutputTab('transcript')
    }
    if (id === 'record_debrief') setReflectiveMode(false)
    if (id === 'record_note' || id === 'record_debrief') {
      void handleStartRecording(id)
    }
  }

  function handlePauseRecording() {
    setRecordingPaused(true)
    if (recorderModeRef.current === 'speech') {
      voice.cancelListening()
    }
  }

  async function handleResumeRecording() {
    if (recorderModeRef.current === 'media') {
      setStatusMessage('Resume is not supported for audio-only recording — stop and start a new recording.')
      return
    }
    setRecordingPaused(false)
    setCaptureStarting(true)
    setRecordingActive(false)
    if (recorderModeRef.current === 'speech') {
      const ok = await voice.beginUserVoiceCapture({ mode: 'continuous' })
      setCaptureStarting(false)
      if (!ok) {
        setStatusMessage(voice.error || SPEECH_START_FAILED_MESSAGE)
        return
      }
      setRecordingActive(true)
    }
  }

  async function handleStopRecording() {
    const effectiveNeedsConsent = startMode === 'record_debrief' || dictateMode !== 'rough_note'
    if (recorderModeRef.current === 'media') {
      const blob = await voice.endMediaRecorderCapture()
      if (blob) {
        setUploadingAudio(true)
        setRecordedAudioLabel('Recorded note')
        setUploadFileLabel('Recorded note')
        try {
          const file = new File([blob], `dictate-recording-${Date.now()}.webm`, {
            type: blob.type || 'audio/webm'
          })
          const result = await transcribeOrbDictateAudio(file, {
            conversation_consent_confirmed: effectiveNeedsConsent
              ? authorityConsent && consentConfirmed
              : undefined
          })
          setBackendTranscriptionAvailable(true)
          const merged = result.transcript.trim()
          transcriptBufferRef.current = merged ? [merged] : []
          setTranscript(merged)
          setSegments(result.segments ?? textToSegments(result.transcript, 'upload', result.participants ?? []))
          if (result.participants?.length) setParticipants(result.participants)
          setStartMode('paste')
          setOutputTab('transcript')
          setStatusMessage('Recording transcribed — review before generating.')
        } catch {
          setBackendTranscriptionAvailable(false)
          const notice =
            'Audio captured. Automatic transcription is not available yet. Please paste the transcript or upload audio when transcription is enabled.'
          setUploadError(notice)
          setStatusMessage(notice)
        } finally {
          setUploadingAudio(false)
        }
      }
      resetRecording()
      return
    }

    const live = (voice.transcript || voice.displayTranscript || '').trim()
    if (live && !transcriptBufferRef.current.includes(live)) {
      transcriptBufferRef.current = [...transcriptBufferRef.current, live]
    }
    const joined = transcriptBufferRef.current.join('\n').trim()
    if (joined) {
      setTranscript(joined)
      setSegments(textToSegments(joined, 'live', participants))
    }
    setStartMode((current) => current ?? 'paste')
    setOutputTab('transcript')
    voice.clearTranscript()
    lastDictateTranscriptRef.current = ''
    resetRecording()
    if (joined) {
      setStatusMessage('Recording stopped — review your transcript before generating.')
    }
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
    setOutputTab('transcript')
    setStatusMessage('Transcript added.')
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
      const durationHint =
        typeof document !== 'undefined'
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
      setOutputTab('transcript')
      setStatusMessage('Audio transcribed — review speaker labels before generating.')
    } catch {
      setBackendTranscriptionAvailable(false)
      setUploadError(
        'Audio upload is ready, but transcription is not enabled yet. Paste the transcript to generate a note.'
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
        consent_confirmed:
          dictateMode !== 'rough_note'
            ? governanceOk
            : needsConsent
              ? consentConfirmed
              : undefined,
        investigation_boundary_confirmed:
          dictateMode === 'investigation_meeting' ? investigationConfirmed : undefined,
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
    } catch {
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
      const blob = await exportOrbDictateNote({
        title: output.title,
        professional_note: text,
        format,
        note_type: output.note_type
      })
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

  const micCaptureAvailable = speechRecognitionAvailable || mediaRecorderAvailable

  const micStatus = captureStarting
    ? 'Starting microphone…'
    : recordingActive
      ? recordingPaused
        ? 'Paused'
        : recorderModeRef.current === 'media'
          ? 'Recording audio…'
          : 'Listening…'
      : statusMessage?.toLowerCase().includes('speech recognition could not')
        ? 'Speech recognition failed'
        : statusMessage?.toLowerCase().includes('microphone blocked')
          ? 'Microphone blocked'
          : !micCaptureAvailable
            ? 'Paste transcript instead'
            : 'Ready'

  const orbClass = recordingActive && !recordingPaused ? 'glass-orb-mark--listening glass-orb-mark--voice' : 'glass-orb-mark--voice glass-orb-mark--idle'

  return (
    <OrbAppModal
      open={open}
      title={phase === 'studio' ? 'ORB Dictate Studio' : 'ORB Dictate'}
      subtitle={
        phase === 'studio'
          ? 'Refine your draft with ORB side-by-side'
          : 'Voice-to-recording companion for residential childcare'
      }
      onClose={onClose}
      panelId="orb-dictate"
      size={phase === 'studio' ? 'xlarge' : 'wide'}
      ariaLabel={phase === 'studio' ? 'ORB Dictate Studio' : 'ORB Dictate'}
    >
      <div className="orb-dictate pointer-events-auto flex min-h-0 flex-1 flex-col" data-orb-dictate-station>
        {phase === 'studio' && output ? (
          <OrbDictateStudio
            output={output}
            participants={participants}
            segments={segments}
            onBack={() => setPhase('capture')}
            onSendToChat={onSendToChat}
            onOpenOrbVoice={onOpenOrbVoice}
            onStatusMessage={setStatusMessage}
          />
        ) : (
          <>
        <p className="shrink-0 px-1 pb-3 text-sm text-[var(--orb-muted)]">
          Speak naturally. ORB will help turn rough notes, debriefs or conversations into structured professional
          wording.
        </p>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden md:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Start</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(
                  [
                    ['record_note', 'Record note', Mic],
                    ['record_debrief', 'Record debrief', Mic],
                    ['paste', 'Paste transcript', FileText],
                    ['import_voice', 'Import from ORB Voice', Sparkles],
                    ['template', 'Use template', FileText]
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    data-orb-dictate-start={id}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                      startMode === id
                        ? 'border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                        : 'border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] text-[var(--orb-foreground)] hover:border-[var(--orb-primary)]/30'
                    }`}
                    onClick={() => handleSelectStartMode(id)}
                  >
                    <Icon className="mb-1 h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 text-xs text-[var(--orb-primary)] hover:opacity-80"
                data-orb-dictate-reflective
                onClick={() => {
                  setReflectiveMode(true)
                  setReflectiveIndex(0)
                  setReflectiveAnswers([])
                  setReflectiveDraft('')
                  setStartMode('paste')
                }}
              >
                Guided reflective debrief (typed, one question at a time)
              </button>
            </section>

            {reflectiveMode ? (
              <section className="rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] p-3" data-orb-dictate-reflective-step>
                <p className="text-xs text-[var(--orb-muted)]">
                  Guided reflective debrief · question {reflectiveIndex + 1} of {REFLECTIVE_DEBRIEF_QUESTIONS.length}
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--orb-foreground)]">{REFLECTIVE_DEBRIEF_QUESTIONS[reflectiveIndex]}</p>
                <textarea
                  value={reflectiveDraft}
                  onChange={(e) => setReflectiveDraft(e.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
                  placeholder="Type your reflection — no microphone needed…"
                />
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-[var(--orb-primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--orb-foreground)]"
                  onClick={advanceReflective}
                >
                  Next
                </button>
              </section>
            ) : null}

            <OrbDictateModeSelect mode={dictateMode} onChange={setDictateMode} />

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Note type</h3>
              <select
                data-orb-dictate-note-type
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as OrbDictateNoteType)}
                className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ORB_DICTATE_NOTE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </section>

            <OrbDictateParticipantsPanel
              participants={participants}
              onChange={setParticipants}
              transcript={effectiveInputText}
              onImportFromTranscript={() => {
                const suggested = suggestParticipantsFromText(effectiveInputText)
                setParticipants(suggested)
                setStatusMessage(
                  suggested.length
                    ? `Imported ${suggested.length} suggested participant(s) — confirm names and roles.`
                    : 'No introductions detected — add participants manually.'
                )
              }}
            />

            <OrbDictateAudioUpload
              onFile={(file) => void handleAudioUpload(file)}
              uploading={uploadingAudio}
              fileLabel={uploadFileLabel}
              error={uploadError}
            />

            <OrbDictateGovernanceConsent
              mode={dictateMode}
              authorityConsent={authorityConsent}
              investigationConfirmed={investigationConfirmed}
              draftReviewConfirmed={draftReviewConfirmed}
              participantsAwareConfirmed={participantsAware}
              noAutoSubmitConfirmed={noAutoSubmitConfirmed}
              onAuthorityConsentChange={setAuthorityConsent}
              onInvestigationChange={setInvestigationConfirmed}
              onDraftReviewChange={setDraftReviewConfirmed}
              onParticipantsAwareChange={setParticipantsAware}
              onNoAutoSubmitChange={setNoAutoSubmitConfirmed}
            />

            {startMode === 'record_debrief' && dictateMode === 'rough_note' ? (
              <section
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-100/90"
                data-orb-dictate-consent
              >
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={consentConfirmed}
                    onChange={(e) => setConsentConfirmed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    I confirm I have authority/consent to record or dictate this note. I understand I must review the
                    output before using it as a formal record.
                  </span>
                </label>
              </section>
            ) : null}

            {startMode === 'paste' ? (
              <section>
                <textarea
                  data-orb-dictate-paste
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={4}
                  placeholder="Paste transcript…"
                  className="w-full rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
                />
                <button type="button" className="mt-2 text-xs text-sky-400" onClick={applyPaste}>
                  Use pasted text
                </button>
              </section>
            ) : null}

            <section className="rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface-elevated)] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <GlassOrbMark className={orbClass} size="sm" />
                  <div>
                    <p className="text-xs font-medium text-[var(--orb-foreground)]">{micStatus}</p>
                    <div className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-capture-capability>
                      {captureCapabilityLines.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                    {recordedAudioLabel ? (
                      <p className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-recorded-audio>
                        {recordedAudioLabel}
                      </p>
                    ) : null}
                    <p className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-timer>
                      {formatTimer(timerSec)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {!recordingActive ? (
                    <button
                      type="button"
                      data-orb-dictate-record-start
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--orb-primary-soft)] px-3 py-1.5 text-xs text-[var(--orb-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={(needsConsent && !consentConfirmed) || !micCaptureAvailable || captureStarting}
                      title={
                        !micCaptureAvailable
                          ? 'Paste a transcript instead'
                          : needsConsent && !consentConfirmed
                            ? 'Confirm consent before recording'
                            : 'Start microphone recording'
                      }
                      onClick={() => void handleStartRecording()}
                    >
                      <Mic className="h-3.5 w-3.5" /> Start
                    </button>
                  ) : (
                    <>
                      {recorderModeRef.current === 'speech' ? (
                        recordingPaused ? (
                          <button
                            type="button"
                            className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]"
                            onClick={handleResumeRecording}
                            aria-label="Resume"
                          >
                            <Play className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]"
                            onClick={handlePauseRecording}
                            aria-label="Pause"
                          >
                            <Pause className="h-4 w-4" />
                          </button>
                        )
                      ) : null}
                      <button
                        type="button"
                        className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]"
                        onClick={handleStopRecording}
                        aria-label="Stop"
                      >
                        <Square className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]"
                    onClick={handleClearTranscript}
                    aria-label="Clear"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-[var(--orb-line)]/40 bg-[var(--orb-surface)] p-2 text-sm text-[var(--orb-foreground)]"
                data-orb-dictate-live-transcript
              >
                {liveTranscript || <span className="text-[var(--orb-muted)]">Live transcript appears here…</span>}
              </div>
            </section>

            <OrbDictateTranscriptSegmentsEditor
              segments={segments}
              participants={participants}
              onChange={(next) => {
                setSegments(next)
                setTranscript(segmentsToPlainText(next))
              }}
            />

            <button
              type="button"
              data-orb-dictate-generate
              disabled={generating}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
              onClick={() => void runGenerate()}
            >
              {generating ? 'Generating…' : 'Generate professional note'}
            </button>

            {onOpenOrbVoice ? (
              <button type="button" className="text-xs text-sky-400/90 hover:text-sky-300" onClick={onOpenOrbVoice}>
                Continue with ORB Voice
              </button>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]">
            <div className="flex shrink-0 gap-1 border-b border-[var(--orb-line)]/40 p-2">
              {(
                [
                  ['professional', 'Professional note'],
                  ['summary', 'Summary'],
                  ['actions', 'Actions'],
                  ['transcript', 'Transcript'],
                  ['evidence', 'Evidence / Ofsted']
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  data-orb-dictate-tab={id}
                  className={`rounded-lg px-2 py-1 text-[10px] sm:text-xs ${
                    outputTab === id
                      ? 'bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                      : 'text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
                  }`}
                  onClick={() => setOutputTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!output ? (
                <div className="space-y-3 text-sm text-[var(--orb-muted)]" data-orb-dictate-output-empty>
                  <p>Start by recording, pasting a transcript, or uploading audio.</p>
                  <p>When ORB has your rough note, it will create professional recording wording here.</p>
                </div>
              ) : outputTab === 'professional' ? (
                <textarea
                  data-orb-dictate-output
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  rows={16}
                  className="h-full min-h-[12rem] w-full resize-none bg-transparent text-sm text-[var(--orb-foreground)] focus:outline-none"
                />
              ) : outputTab === 'summary' ? (
                <p className="text-sm text-[var(--orb-foreground)]">{output.summary}</p>
              ) : outputTab === 'actions' ? (
                <ul className="list-disc space-y-1 pl-4 text-sm text-[var(--orb-foreground)]">
                  {output.actions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ) : outputTab === 'transcript' ? (
                <p className="whitespace-pre-wrap text-sm text-[var(--orb-foreground)]">{output.transcript}</p>
              ) : (
                <div className="space-y-2 text-sm text-[var(--orb-foreground)]">
                  {output.ofsted_lens ? <p>{output.ofsted_lens}</p> : null}
                  <ul className="space-y-1 text-xs">
                    {Object.entries(output.quality_checks).map(([k, v]) => (
                      <li key={k}>
                        {k.replace(/_/g, ' ')}: <span className="text-sky-300">{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {output ? (
              <div className="flex shrink-0 flex-wrap gap-2 border-t border-[var(--orb-line)]/40 p-2">
                <button
                  type="button"
                  data-orb-dictate-copy
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => void handleCopy()}
                >
                  <ClipboardCopy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  type="button"
                  data-orb-dictate-save
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => void handleSave()}
                >
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
                <button
                  type="button"
                  data-orb-dictate-export-pdf
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => void handleExport('pdf')}
                >
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
                <button
                  type="button"
                  data-orb-dictate-export-docx
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => void handleExport('docx')}
                >
                  <FileText className="h-3.5 w-3.5" /> DOCX
                </button>
                <button
                  type="button"
                  data-orb-dictate-send-chat
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={handleSendToChat}
                >
                  Send to chat
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => void runGenerate({ include_child_voice: true })}
                >
                  Add child voice
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => void runGenerate({ include_manager_oversight: true })}
                >
                  Add manager oversight
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => void runGenerate({ include_safeguarding: true })}
                >
                  Add safeguarding
                </button>
                <button
                  type="button"
                  data-orb-dictate-action-anonymise
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => runSpeakerAction('anonymise')}
                >
                  Anonymise
                </button>
                <button
                  type="button"
                  data-orb-dictate-speaker-actions
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => runSpeakerAction('meeting_minutes')}
                >
                  Meeting minutes
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => runSpeakerAction('investigation_note')}
                >
                  Investigation note
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-2 py-1 text-xs text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
                  onClick={() => runSpeakerAction('summarise_by_speaker')}
                >
                  Summarise by speaker
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {output ? (
          <button
            type="button"
            data-orb-dictate-open-studio
            className="mt-2 w-full rounded-xl border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] py-2 text-sm font-medium text-[var(--orb-primary)]"
            onClick={() => setPhase('studio')}
          >
            Open ORB Dictate Studio
          </button>
        ) : null}
          </>
        )}

        <footer className="mt-3 shrink-0 space-y-1 border-t border-[var(--orb-line)]/30 pt-3 text-[10px] text-[var(--orb-muted)]">
          <p>{ORB_DICTATE_GOVERNANCE_COPY.draft}</p>
          <p>{ORB_DICTATE_GOVERNANCE_COPY.speaker}</p>
          <p data-orb-dictate-speaker-boundary>{SPEAKER_BOUNDARY_COPY}</p>
          <p>{ORB_DICTATE_GOVERNANCE_COPY.recording}</p>
          <p>{ORB_DICTATE_GOVERNANCE_COPY.boundary}</p>
          <p>{ORB_DICTATE_GOVERNANCE_COPY.saveWording}</p>
          <p>{ORB_DICTATE_GOVERNANCE_COPY.retention}</p>
          {statusMessage ? (
            <p className="text-xs text-[var(--orb-primary)]" role="status">
              {statusMessage}
            </p>
          ) : null}
        </footer>
      </div>
    </OrbAppModal>
  )
}
