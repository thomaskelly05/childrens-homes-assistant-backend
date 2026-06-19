/**
 * Server transcription transport — record-and-upload only (no realtime WebRTC).
 */

import {
  acquireMicrophoneStream,
  releaseMicrophoneStream,
  startMediaRecorderCaptureConfirmed,
  type MediaRecorderCapture,
  type MediaRecorderStopResult
} from '@/lib/orb/voice/orb-voice-capture'
import { patchOrbVoiceBrowserDiagnostics } from '@/lib/orb/voice/orb-voice-browser-diagnostics'
import { ORB_VOICE_TRANSCRIPTION_FAILED_MESSAGE } from '@/lib/orb/voice/orb-voice-server-transcription-state'
import { ORB_VOICE_SERVER_NO_TRANSCRIPT_HEADLINE } from '@/lib/orb/voice/orb-voice-server-transcription-ui'
import { transcribeOrbVoiceAudioBlob } from '@/lib/orb/voice/orb-voice-server-transcription'

export type OrbServerTranscriptionTransportCallbacks = {
  onPartialTranscript: (text: string) => void
  onFinalTranscript: (text: string) => void
  onStateChange: (state: 'listening' | 'capturing' | 'transcribing') => void
  onError: (message: string) => void
}

function safeTranscriptionErrorCode(error: unknown): string {
  if (error instanceof Error) {
    const code = error.message.trim().slice(0, 80)
    return code || 'transcription_failed'
  }
  return 'transcription_failed'
}

export class OrbServerTranscriptionTransport {
  private mode: 'record_upload' | null = null
  private transcript = ''
  private mediaStream: MediaStream | null = null
  private recorderCapture: MediaRecorderCapture | null = null
  private stopInFlight = false

  isRecording(): boolean {
    return this.mode === 'record_upload' && Boolean(this.recorderCapture)
  }

  async start(callbacks: OrbServerTranscriptionTransportCallbacks): Promise<boolean> {
    this.transcript = ''
    this.stopInFlight = false
    patchOrbVoiceBrowserDiagnostics({
      serverTranscriptionAttempted: true,
      serverTranscriptionError: null,
      mediaRecorderStarted: false,
      mediaRecorderStopped: false,
      recordedAudioSizeBytes: 0,
      noTranscriptReason: null,
      resolvedTranscriptLength: 0
    })

    this.mode = 'record_upload'
    callbacks.onStateChange('capturing')
    const access = await acquireMicrophoneStream()
    if (!access.ok || !access.stream) {
      const message = 'Microphone access is needed to record your voice.'
      patchOrbVoiceBrowserDiagnostics({
        getUserMediaAttempted: true,
        getUserMediaSuccess: false,
        microphonePermission: access.permission,
        serverTranscriptionStatus: 'mic_denied',
        serverTranscriptionError: message,
        userFacingMessage: message
      })
      callbacks.onError(message)
      return false
    }
    this.mediaStream = access.stream
    const capture = await startMediaRecorderCaptureConfirmed(access.stream)
    if (!capture) {
      releaseMicrophoneStream(this.mediaStream)
      this.mediaStream = null
      this.mode = null
      const message = 'Could not start audio recording.'
      patchOrbVoiceBrowserDiagnostics({
        serverTranscriptionStatus: 'capture_failed',
        serverTranscriptionError: message,
        userFacingMessage: message
      })
      callbacks.onError(message)
      return false
    }
    this.recorderCapture = capture
    patchOrbVoiceBrowserDiagnostics({
      getUserMediaAttempted: true,
      getUserMediaSuccess: true,
      mediaRecorderStarted: true,
      mediaRecorderStopped: false,
      serverTranscriptionStatus: 'recording',
      userFacingMessage: 'Recording…'
    })
    return true
  }

  async stop(): Promise<string> {
    if (this.stopInFlight) {
      return this.transcript.trim()
    }
    if (this.mode !== 'record_upload') {
      return this.transcript.trim()
    }

    this.stopInFlight = true
    patchOrbVoiceBrowserDiagnostics({
      serverTranscriptionStatus: 'processing',
      serverTranscriptionError: null,
      userFacingMessage: 'Processing your voice…'
    })

    const capture = this.recorderCapture
    this.recorderCapture = null
    let result: MediaRecorderStopResult | null = null

    try {
      result = capture ? await capture.stop() : null
    } catch (error) {
      const code = safeTranscriptionErrorCode(error)
      patchOrbVoiceBrowserDiagnostics({
        mediaRecorderStopped: true,
        recordedAudioSizeBytes: 0,
        serverTranscriptionStatus: 'failed',
        serverTranscriptionError: code,
        userFacingMessage: ORB_VOICE_TRANSCRIPTION_FAILED_MESSAGE
      })
      this.mode = null
      releaseMicrophoneStream(this.mediaStream)
      this.mediaStream = null
      this.stopInFlight = false
      throw error instanceof Error ? error : new Error(ORB_VOICE_TRANSCRIPTION_FAILED_MESSAGE)
    } finally {
      releaseMicrophoneStream(this.mediaStream)
      this.mediaStream = null
      this.mode = null
      patchOrbVoiceBrowserDiagnostics({ mediaRecorderStopped: true })
    }

    const size = result?.blob?.size ?? 0
    patchOrbVoiceBrowserDiagnostics({ recordedAudioSizeBytes: size })

    if (!result?.blob || size === 0) {
      patchOrbVoiceBrowserDiagnostics({
        serverTranscriptionStatus: 'empty',
        serverTranscriptionError: null,
        noTranscriptReason: 'empty_audio_blob',
        resolvedTranscriptLength: 0,
        userFacingMessage: ORB_VOICE_SERVER_NO_TRANSCRIPT_HEADLINE
      })
      this.stopInFlight = false
      return ''
    }

    try {
      const filename = result.mimeType.includes('wav') ? 'voice.wav' : 'voice.webm'
      const text = await transcribeOrbVoiceAudioBlob(result.blob, filename)
      const trimmed = text.trim()
      if (!trimmed) {
        patchOrbVoiceBrowserDiagnostics({
          serverTranscriptionStatus: 'empty',
          serverTranscriptionError: null,
          noTranscriptReason: 'empty_transcript',
          resolvedTranscriptLength: 0,
          userFacingMessage: ORB_VOICE_SERVER_NO_TRANSCRIPT_HEADLINE
        })
        this.stopInFlight = false
        return ''
      }
      this.transcript = trimmed
      patchOrbVoiceBrowserDiagnostics({
        serverTranscriptionStatus: 'completed',
        serverTranscriptionError: null,
        finalTranscriptLength: trimmed.length,
        resolvedTranscriptLength: trimmed.length,
        lastTranscriptPreview: trimmed.slice(0, 80),
        voiceSubmitAttempted: true,
        voiceSubmitBlockedReason: null,
        noTranscriptReason: null,
        userFacingMessage: 'ORB is thinking…'
      })
      this.stopInFlight = false
      return trimmed
    } catch (error) {
      const code = safeTranscriptionErrorCode(error)
      patchOrbVoiceBrowserDiagnostics({
        serverTranscriptionStatus: 'failed',
        serverTranscriptionError: code,
        userFacingMessage: ORB_VOICE_TRANSCRIPTION_FAILED_MESSAGE
      })
      this.stopInFlight = false
      throw new Error(ORB_VOICE_TRANSCRIPTION_FAILED_MESSAGE)
    }
  }

  cancel(): void {
    this.recorderCapture?.cancel()
    this.recorderCapture = null
    releaseMicrophoneStream(this.mediaStream)
    this.mediaStream = null
    this.mode = null
    this.transcript = ''
    this.stopInFlight = false
    patchOrbVoiceBrowserDiagnostics({
      serverTranscriptionStatus: 'cancelled',
      mediaRecorderStopped: true,
      userFacingMessage: 'Ready to record'
    })
  }
}
