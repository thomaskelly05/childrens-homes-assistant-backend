/**
 * ORB Voice transport capability selection — browser-specific, honest.
 */

import { ORB_SAFARI_BROWSER_VOICE_DEV_OVERRIDE_KEY } from '@/lib/orb/voice/orb-browser-speech-capture'
import {
  detectMediaRecorderSupported,
  detectSpeechRecognitionSupported,
  isFirefoxBrowser,
  isSafariBrowser
} from '@/lib/orb/voice/orb-voice-readiness'
import { isOrbWebRealtimeVoiceEnabled } from '@/lib/orb/voice/orb-web-voice-config'

import type {
  OrbVoiceCapabilitySnapshot,
  OrbVoiceRejectedTransport,
  OrbVoiceTransportId,
  OrbVoiceTransportSelection
} from './orb-web-voice-engine-types'

export function detectBrowserFamily():
  | 'chrome'
  | 'safari'
  | 'firefox'
  | 'edge'
  | 'other'
  | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (isSafariBrowser()) return 'safari'
  if (isFirefoxBrowser()) return 'firefox'
  if (/edg\//i.test(ua)) return 'edge'
  if (/chrome|chromium/i.test(ua)) return 'chrome'
  return 'other'
}

export function detectBrowserName(): string {
  return detectBrowserFamily()
}

export function buildOrbVoiceCapabilitySnapshot(input: {
  serverTranscriptionRealtimeAvailable: boolean
  serverTranscriptionUploadAvailable?: boolean
}): OrbVoiceCapabilitySnapshot {
  const family = detectBrowserFamily()
  return {
    browserName: family,
    browserFamily: family,
    safariDetected: family === 'safari',
    firefoxDetected: family === 'firefox',
    chromeDetected: family === 'chrome' || family === 'edge',
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
    speechRecognitionSupported: detectSpeechRecognitionSupported(),
    mediaRecorderSupported: detectMediaRecorderSupported(),
    getUserMediaSupported:
      typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    serverTranscriptionRealtimeAvailable: input.serverTranscriptionRealtimeAvailable,
    serverTranscriptionUploadAvailable:
      input.serverTranscriptionUploadAvailable ?? detectMediaRecorderSupported()
  }
}

function safariBrowserSpeechDevOverride(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ORB_SAFARI_BROWSER_VOICE_DEV_OVERRIDE_KEY) === '1'
  } catch {
    return false
  }
}

export function selectOrbVoiceTransport(
  capabilities: OrbVoiceCapabilitySnapshot,
  options?: { preferServerAfterFailures?: number }
): OrbVoiceTransportSelection {
  const supported: OrbVoiceTransportId[] = []
  const rejected: OrbVoiceRejectedTransport[] = []
  const failures = options?.preferServerAfterFailures ?? 0

  if (isOrbWebRealtimeVoiceEnabled()) {
    supported.push('realtime_webrtc_dev_only')
  } else {
    rejected.push({
      id: 'realtime_webrtc_dev_only',
      reason: 'disabled_for_orb_residential_launch'
    })
  }

  const serverRealtime = capabilities.serverTranscriptionRealtimeAvailable
  const serverUpload =
    capabilities.serverTranscriptionUploadAvailable && capabilities.mediaRecorderSupported

  if (serverRealtime || serverUpload) {
    supported.push('server_transcription')
  } else {
    rejected.push({
      id: 'server_transcription',
      reason: 'server_transcription_unavailable'
    })
  }

  if (capabilities.speechRecognitionSupported) {
    if (capabilities.safariDetected && !safariBrowserSpeechDevOverride()) {
      rejected.push({
        id: 'browser_speech_recognition',
        reason: 'safari_browser_speech_unreliable'
      })
    } else if (capabilities.firefoxDetected) {
      rejected.push({
        id: 'browser_speech_recognition',
        reason: 'firefox_no_speech_recognition'
      })
    } else {
      supported.push('browser_speech_recognition')
    }
  } else {
    rejected.push({
      id: 'browser_speech_recognition',
      reason: 'speech_recognition_unsupported'
    })
  }

  let selected: OrbVoiceTransportId = 'unsupported'

  if (capabilities.safariDetected || capabilities.firefoxDetected) {
    if (serverRealtime || serverUpload) selected = 'server_transcription'
    else if (
      capabilities.chromeDetected &&
      capabilities.speechRecognitionSupported &&
      failures < 2
    ) {
      selected = 'browser_speech_recognition'
    }
  } else if (capabilities.chromeDetected || capabilities.browserFamily === 'edge') {
    if (failures >= 2 && (serverRealtime || serverUpload)) {
      selected = 'server_transcription'
    } else if (capabilities.speechRecognitionSupported) {
      selected = 'browser_speech_recognition'
    } else if (serverRealtime || serverUpload) {
      selected = 'server_transcription'
    }
  } else if (capabilities.speechRecognitionSupported && failures < 2) {
    selected = 'browser_speech_recognition'
  } else if (serverRealtime || serverUpload) {
    selected = 'server_transcription'
  }

  if (selected === 'unsupported' && supported.length > 0) {
    selected = supported[0]!
  }

  if (!capabilities.secureContext) {
    rejected.push({ id: 'browser_speech_recognition', reason: 'insecure_context' })
    rejected.push({ id: 'server_transcription', reason: 'insecure_context' })
    selected = 'unsupported'
  }

  if (selected === 'unsupported') {
    supported.push('unsupported')
  }

  return {
    selectedTransport: selected,
    supportedTransports: [...new Set(supported)],
    rejectedTransports: rejected
  }
}
