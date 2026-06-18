/**
 * Server transcription transport — realtime WebRTC or record-and-upload.
 */

import {
  acquireMicrophoneStream,
  releaseMicrophoneStream,
  startMediaRecorderCaptureConfirmed,
  type MediaRecorderCapture
} from '@/lib/orb/voice/orb-voice-capture'
import { patchOrbVoiceBrowserDiagnostics } from '@/lib/orb/voice/orb-voice-browser-diagnostics'
import {
  isOrbVoiceServerTranscriptionRealtimeAvailable,
  OrbVoiceServerRealtimeTranscription,
  transcribeOrbVoiceAudioBlob
} from '@/lib/orb/voice/orb-voice-server-transcription'

export type OrbServerTranscriptionTransportCallbacks = {
  onPartialTranscript: (text: string) => void
  onFinalTranscript: (text: string) => void
  onStateChange: (state: 'listening' | 'capturing' | 'transcribing') => void
  onError: (message: string) => void
}

export class OrbServerTranscriptionTransport {
  private realtime: OrbVoiceServerRealtimeTranscription | null = null
  private mode: 'realtime' | 'record_upload' | null = null
  private transcript = ''
  private mediaStream: MediaStream | null = null
  private recorderCapture: MediaRecorderCapture | null = null

  async start(callbacks: OrbServerTranscriptionTransportCallbacks): Promise<boolean> {
    this.transcript = ''
    patchOrbVoiceBrowserDiagnostics({ serverTranscriptionAttempted: true })

    const realtimeAvailable = await isOrbVoiceServerTranscriptionRealtimeAvailable()
    if (realtimeAvailable) {
      this.mode = 'realtime'
      this.realtime = new OrbVoiceServerRealtimeTranscription()
      callbacks.onStateChange('listening')
      const started = await this.realtime.start({
        onPartialTranscript: (text) => {
          this.transcript = text
          callbacks.onPartialTranscript(text)
          patchOrbVoiceBrowserDiagnostics({
            interimTranscriptLength: text.length,
            serverTranscriptionStatus: 'streaming'
          })
        },
        onFinalTranscript: (text) => {
          this.transcript = this.transcript ? `${this.transcript}\n${text}`.trim() : text
          callbacks.onFinalTranscript(this.transcript)
          patchOrbVoiceBrowserDiagnostics({
            finalTranscriptLength: this.transcript.length,
            serverTranscriptionStatus: 'partial_final'
          })
        },
        onError: (message) => {
          patchOrbVoiceBrowserDiagnostics({ serverTranscriptionStatus: `error_${message.slice(0, 40)}` })
          callbacks.onError(message)
        }
      })
      if (started) {
        patchOrbVoiceBrowserDiagnostics({ serverTranscriptionStatus: 'realtime_active' })
        return true
      }
      this.realtime = null
      this.mode = null
    }

    this.mode = 'record_upload'
    callbacks.onStateChange('capturing')
    const access = await acquireMicrophoneStream()
    if (!access.ok || !access.stream) {
      patchOrbVoiceBrowserDiagnostics({
        getUserMediaAttempted: true,
        getUserMediaSuccess: false,
        microphonePermission: access.permission,
        serverTranscriptionStatus: 'mic_denied'
      })
      callbacks.onError('Microphone access is needed to record your voice.')
      return false
    }
    this.mediaStream = access.stream
    const capture = await startMediaRecorderCaptureConfirmed(access.stream)
    if (!capture) {
      releaseMicrophoneStream(this.mediaStream)
      this.mediaStream = null
      patchOrbVoiceBrowserDiagnostics({ serverTranscriptionStatus: 'capture_failed' })
      callbacks.onError('Could not start audio recording.')
      return false
    }
    this.recorderCapture = capture
    patchOrbVoiceBrowserDiagnostics({
      getUserMediaAttempted: true,
      getUserMediaSuccess: true,
      serverTranscriptionStatus: 'recording'
    })
    return true
  }

  async stop(): Promise<string> {
    if (this.mode === 'realtime' && this.realtime) {
      const text = this.realtime.stop()
      this.realtime = null
      this.mode = null
      patchOrbVoiceBrowserDiagnostics({
        serverTranscriptionStatus: text ? 'realtime_complete' : 'realtime_empty',
        finalTranscriptLength: text.length
      })
      return text
    }

    if (this.mode === 'record_upload') {
      patchOrbVoiceBrowserDiagnostics({ serverTranscriptionStatus: 'uploading' })
      const capture = this.recorderCapture
      this.recorderCapture = null
      const result = capture ? await capture.stop() : null
      releaseMicrophoneStream(this.mediaStream)
      this.mediaStream = null
      this.mode = null
      if (!result?.blob || result.blob.size === 0) {
        patchOrbVoiceBrowserDiagnostics({ serverTranscriptionStatus: 'empty_recording' })
        return ''
      }
      try {
        const filename = result.mimeType.includes('wav') ? 'voice.wav' : 'voice.webm'
        const text = await transcribeOrbVoiceAudioBlob(result.blob, filename)
        this.transcript = text
        patchOrbVoiceBrowserDiagnostics({
          serverTranscriptionStatus: 'upload_complete',
          finalTranscriptLength: text.length,
          lastTranscriptPreview: text.slice(0, 80)
        })
        return text
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Transcription failed'
        patchOrbVoiceBrowserDiagnostics({ serverTranscriptionStatus: `upload_error` })
        throw new Error(message)
      }
    }

    return this.transcript.trim()
  }

  cancel(): void {
    this.realtime?.stop()
    this.realtime = null
    this.recorderCapture?.cancel()
    this.recorderCapture = null
    releaseMicrophoneStream(this.mediaStream)
    this.mediaStream = null
    this.mode = null
    this.transcript = ''
    patchOrbVoiceBrowserDiagnostics({ serverTranscriptionStatus: 'cancelled' })
  }
}
