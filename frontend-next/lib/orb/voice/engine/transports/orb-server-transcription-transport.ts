/**
 * Server transcription transport — record-and-upload only (no realtime WebRTC).
 */

import {
  acquireMicrophoneStream,
  releaseMicrophoneStream,
  startMediaRecorderCaptureConfirmed,
  type MediaRecorderCapture
} from '@/lib/orb/voice/orb-voice-capture'
import { patchOrbVoiceBrowserDiagnostics } from '@/lib/orb/voice/orb-voice-browser-diagnostics'
import { transcribeOrbVoiceAudioBlob } from '@/lib/orb/voice/orb-voice-server-transcription'

export type OrbServerTranscriptionTransportCallbacks = {
  onPartialTranscript: (text: string) => void
  onFinalTranscript: (text: string) => void
  onStateChange: (state: 'listening' | 'capturing' | 'transcribing') => void
  onError: (message: string) => void
}

export class OrbServerTranscriptionTransport {
  private mode: 'record_upload' | null = null
  private transcript = ''
  private mediaStream: MediaStream | null = null
  private recorderCapture: MediaRecorderCapture | null = null

  async start(callbacks: OrbServerTranscriptionTransportCallbacks): Promise<boolean> {
    this.transcript = ''
    patchOrbVoiceBrowserDiagnostics({
      serverTranscriptionAttempted: true,
      serverTranscriptionError: null,
      mediaRecorderStarted: false,
      mediaRecorderStopped: false,
      recordedAudioSizeBytes: 0
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
        serverTranscriptionError: message
      })
      callbacks.onError(message)
      return false
    }
    this.mediaStream = access.stream
    const capture = await startMediaRecorderCaptureConfirmed(access.stream)
    if (!capture) {
      releaseMicrophoneStream(this.mediaStream)
      this.mediaStream = null
      const message = 'Could not start audio recording.'
      patchOrbVoiceBrowserDiagnostics({
        serverTranscriptionStatus: 'capture_failed',
        serverTranscriptionError: message
      })
      callbacks.onError(message)
      return false
    }
    this.recorderCapture = capture
    patchOrbVoiceBrowserDiagnostics({
      getUserMediaAttempted: true,
      getUserMediaSuccess: true,
      mediaRecorderStarted: true,
      serverTranscriptionStatus: 'recording'
    })
    return true
  }

  async stop(): Promise<string> {
    if (this.mode !== 'record_upload') {
      return this.transcript.trim()
    }

    patchOrbVoiceBrowserDiagnostics({
      serverTranscriptionStatus: 'uploading',
      mediaRecorderStopped: true
    })
    const capture = this.recorderCapture
    this.recorderCapture = null
    const result = capture ? await capture.stop() : null
    releaseMicrophoneStream(this.mediaStream)
    this.mediaStream = null
    this.mode = null

    const size = result?.blob?.size ?? 0
    patchOrbVoiceBrowserDiagnostics({ recordedAudioSizeBytes: size })

    if (!result?.blob || size === 0) {
      patchOrbVoiceBrowserDiagnostics({
        serverTranscriptionStatus: 'empty_recording',
        serverTranscriptionError: 'empty_recording',
        noTranscriptReason: 'empty_recording'
      })
      return ''
    }

    try {
      const filename = result.mimeType.includes('wav') ? 'voice.wav' : 'voice.webm'
      const text = await transcribeOrbVoiceAudioBlob(result.blob, filename)
      this.transcript = text
      patchOrbVoiceBrowserDiagnostics({
        serverTranscriptionStatus: 'upload_complete',
        serverTranscriptionError: null,
        finalTranscriptLength: text.length,
        resolvedTranscriptLength: text.length,
        lastTranscriptPreview: text.slice(0, 80)
      })
      return text
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Transcription failed'
      patchOrbVoiceBrowserDiagnostics({
        serverTranscriptionStatus: 'upload_error',
        serverTranscriptionError: message
      })
      throw new Error(message)
    }
  }

  cancel(): void {
    this.recorderCapture?.cancel()
    this.recorderCapture = null
    releaseMicrophoneStream(this.mediaStream)
    this.mediaStream = null
    this.mode = null
    this.transcript = ''
    patchOrbVoiceBrowserDiagnostics({
      serverTranscriptionStatus: 'cancelled',
      mediaRecorderStopped: true
    })
  }
}
