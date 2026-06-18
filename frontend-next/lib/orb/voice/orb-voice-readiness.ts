/** Client-side voice readiness — safe to import from tests without React. */

export type OrbMicAccessContext = {
  subscriptionActive: boolean
  isAdminUser?: boolean
  isDeveloperMode?: boolean
  isTestMode?: boolean
}

export function isOrbTestMode(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function canUseLiveVoice(ctx: OrbMicAccessContext): boolean {
  return Boolean(
    ctx.subscriptionActive ||
      ctx.isAdminUser ||
      ctx.isDeveloperMode ||
      ctx.isTestMode
  )
}

/** Dictate mic capture is not subscription-gated — only browser / permission limits apply. */
export function canUseDictateMic(options?: { browserMicUnsupported?: boolean }): boolean {
  if (options?.browserMicUnsupported) return false
  if (typeof window === 'undefined') return true
  return (
    detectSpeechRecognitionSupported() ||
    detectMediaRecorderSupported() ||
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}

/** Composer mic always routes to Voice or Dictate. */
export function canUseComposerMic(): boolean {
  return true
}

export function orbMicDevLog(message: string, detail?: string) {
  if (process.env.NODE_ENV !== 'development') return
  if (detail) console.debug(`[orb-mic] ${message}`, detail)
  else console.debug(`[orb-mic] ${message}`)
}

export type MicrophonePermissionState = 'granted' | 'prompt' | 'denied' | 'unknown'

export type OrbVoiceReadiness = {
  microphone_permission: MicrophonePermissionState
  browser_supported: boolean
  realtime_service_available: boolean | 'unknown'
  secure_context: boolean
  can_record_audio: boolean
  can_use_realtime_voice: boolean
  /** Live ORB Voice may use browser SpeechRecognition (not MediaRecorder). */
  speech_recognition_available: boolean
  /** @deprecated Use speech_recognition_available — kept for callers migrating off MediaRecorder-as-voice. */
  fallback_available: boolean
}

export type OrbVoiceReadinessUiState =
  | 'ready'
  | 'needs_permission'
  | 'microphone_blocked'
  | 'browser_unsupported'
  | 'service_unavailable'
  | 'subscription_inactive'
  | 'unknown'

export type OrbVoiceReadinessPresentation = {
  state: OrbVoiceReadinessUiState
  headline: string
  detail: string
  primaryAction: 'start' | 'allow_microphone' | 'test_microphone' | 'none'
  showTestMicrophone: boolean
  showAllowMicrophone: boolean
  showOpenDictate: boolean
  showTypeInstead: boolean
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')
}

export function isFirefoxBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  return /firefox/i.test(navigator.userAgent)
}

export function detectSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as Window & {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function detectMediaRecorderSupported(): boolean {
  if (typeof window === 'undefined') return false
  return typeof MediaRecorder !== 'undefined'
}

export async function probeMicrophonePermission(): Promise<MicrophonePermissionState> {
  if (typeof navigator === 'undefined') return 'unknown'
  try {
    const permissions = navigator.permissions
    if (permissions?.query) {
      const status = await permissions.query({ name: 'microphone' as PermissionName })
      if (status.state === 'granted') return 'granted'
      if (status.state === 'denied') return 'denied'
      if (status.state === 'prompt') return 'prompt'
    }
  } catch {
    /* Permissions API unavailable (e.g. Safari) */
  }
  return 'unknown'
}

export function assessOrbVoiceReadiness(input: {
  recognitionAvailable?: boolean
  synthesisAvailable?: boolean
  permissionDenied?: boolean
  realtimeServiceAvailable?: boolean | 'unknown'
  subscriptionActive?: boolean
  micAccess?: OrbMicAccessContext
}): OrbVoiceReadiness {
  const secure_context = typeof window !== 'undefined' ? window.isSecureContext : true
  const browser_supported =
    detectSpeechRecognitionSupported() || detectMediaRecorderSupported() || Boolean(input.synthesisAvailable)
  const microphone_permission: MicrophonePermissionState = input.permissionDenied
    ? 'denied'
    : 'unknown'
  const can_record_audio =
    secure_context && browser_supported && microphone_permission !== 'denied' && detectMediaRecorderSupported()
  const speech_recognition_available =
    detectSpeechRecognitionSupported() || Boolean(input.recognitionAvailable)
  const realtime =
    input.realtimeServiceAvailable === undefined ? 'unknown' : input.realtimeServiceAvailable
  const liveVoiceAllowed = input.micAccess
    ? canUseLiveVoice(input.micAccess)
    : input.subscriptionActive !== false
  const can_use_realtime_voice =
    speech_recognition_available &&
    secure_context &&
    microphone_permission !== 'denied' &&
    realtime !== false &&
    liveVoiceAllowed

  return {
    microphone_permission,
    browser_supported,
    realtime_service_available: realtime,
    secure_context,
    can_record_audio,
    can_use_realtime_voice,
    speech_recognition_available,
    fallback_available: speech_recognition_available
  }
}

export function orbVoiceReadinessPresentation(
  readiness: OrbVoiceReadiness,
  options?: {
    subscriptionActive?: boolean
    canUseLiveVoice?: boolean
    sessionActive?: boolean
    captureActive?: boolean
  }
): OrbVoiceReadinessPresentation {
  const liveVoiceAllowed = options?.canUseLiveVoice ?? options?.subscriptionActive !== false

  if (!liveVoiceAllowed) {
    return {
      state: 'subscription_inactive',
      headline: 'Voice is included in ORB Residential once active',
      detail: 'Subscribe to start live voice, or use Dictate and typing in the meantime.',
      primaryAction: 'none',
      showTestMicrophone: false,
      showAllowMicrophone: false,
      showOpenDictate: true,
      showTypeInstead: true
    }
  }

  if (!readiness.secure_context) {
    return {
      state: 'browser_unsupported',
      headline: 'Voice needs a secure connection',
      detail: 'Open ORB over HTTPS to use the microphone, or use Dictate or type instead.',
      primaryAction: 'none',
      showTestMicrophone: false,
      showAllowMicrophone: false,
      showOpenDictate: true,
      showTypeInstead: true
    }
  }

  if (readiness.microphone_permission === 'denied') {
    return {
      state: 'microphone_blocked',
      headline: 'Microphone blocked in browser settings',
      detail: 'Allow microphone access for this site in your browser, then try again.',
      primaryAction: 'none',
      showTestMicrophone: true,
      showAllowMicrophone: false,
      showOpenDictate: true,
      showTypeInstead: true
    }
  }

  if (!readiness.speech_recognition_available && !readiness.can_record_audio) {
    return {
      state: 'browser_unsupported',
      headline: 'Live voice is not available in this browser',
      detail: 'Open Dictate to record or paste notes, or type in chat.',
      primaryAction: 'none',
      showTestMicrophone: false,
      showAllowMicrophone: false,
      showOpenDictate: true,
      showTypeInstead: true
    }
  }

  if (!readiness.speech_recognition_available) {
    return {
      state: 'browser_unsupported',
      headline: 'Live voice is not available in this browser',
      detail: 'Open Dictate to record or paste notes. Audio recording does not replace live conversation.',
      primaryAction: 'none',
      showTestMicrophone: readiness.can_record_audio,
      showAllowMicrophone: false,
      showOpenDictate: true,
      showTypeInstead: true
    }
  }

  if (!readiness.browser_supported) {
    return {
      state: 'browser_unsupported',
      headline: 'Voice is limited in this browser; use Dictate or type',
      detail: 'Safari and some mobile browsers work best with ORB Dictate for recording notes.',
      primaryAction: 'none',
      showTestMicrophone: false,
      showAllowMicrophone: false,
      showOpenDictate: true,
      showTypeInstead: true
    }
  }

  if (readiness.realtime_service_available === false) {
    return {
      state: 'service_unavailable',
      headline: 'Live voice is temporarily unavailable; Dictate still works',
      detail: 'You can record or paste a transcript in ORB Dictate while we restore live voice.',
      primaryAction: readiness.speech_recognition_available ? 'start' : 'none',
      showTestMicrophone: true,
      showAllowMicrophone: true,
      showOpenDictate: true,
      showTypeInstead: true
    }
  }

  if (readiness.microphone_permission === 'prompt' || readiness.microphone_permission === 'unknown') {
    if (options?.sessionActive && options?.captureActive) {
      return {
        state: 'ready',
        headline: 'Listening…',
        detail: 'Speak naturally. ORB will respond when you pause.',
        primaryAction: 'start',
        showTestMicrophone: true,
        showAllowMicrophone: true,
        showOpenDictate: true,
        showTypeInstead: true
      }
    }
    if (options?.sessionActive && !options?.captureActive) {
      return {
        state: 'needs_permission',
        headline: 'Microphone not active yet',
        detail: 'Allow microphone access or use Dictate to record a note.',
        primaryAction: 'allow_microphone',
        showTestMicrophone: true,
        showAllowMicrophone: true,
        showOpenDictate: true,
        showTypeInstead: true
      }
    }
    return {
      state: 'needs_permission',
      headline: 'Allow microphone',
      detail: 'Start conversation to allow microphone access for this session.',
      primaryAction: 'allow_microphone',
      showTestMicrophone: true,
      showAllowMicrophone: true,
      showOpenDictate: true,
      showTypeInstead: true
    }
  }

  if (
    readiness.speech_recognition_available ||
    readiness.realtime_service_available === true ||
    readiness.realtime_service_available === 'unknown'
  ) {
    const sessionHeadline = options?.sessionActive
      ? options?.captureActive
        ? 'Voice session active'
        : 'Connecting voice…'
      : 'Start conversation'
    return {
      state: 'ready',
      headline: sessionHeadline,
      detail: options?.sessionActive
        ? options?.captureActive
          ? 'Push-to-talk or hands-free depending on your voice settings.'
          : 'Waiting for microphone capture to start.'
        : 'ORB will ask for microphone access when you start.',
      primaryAction: 'start',
      showTestMicrophone: true,
      showAllowMicrophone: readiness.microphone_permission !== 'granted',
      showOpenDictate: true,
      showTypeInstead: true
    }
  }

  return {
    state: 'unknown',
    headline: 'Checking voice readiness…',
    detail: 'You can type or open Dictate while ORB checks your browser.',
    primaryAction: 'test_microphone',
    showTestMicrophone: true,
    showAllowMicrophone: true,
    showOpenDictate: true,
    showTypeInstead: true
  }
}

async function probeMicrophonePermissionOnly(): Promise<{ ok: boolean; permission: MicrophonePermissionState }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, permission: 'unknown' }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => {
      try {
        track.stop()
      } catch {
        /* ignore */
      }
    })
    return { ok: true, permission: 'granted' }
  } catch (error) {
    const name = error instanceof DOMException ? error.name : ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return { ok: false, permission: 'denied' }
    }
    return { ok: false, permission: 'unknown' }
  }
}

/** Permission probe only — does not leave the microphone active. */
export async function requestMicrophoneAccess(): Promise<{ ok: boolean; permission: MicrophonePermissionState }> {
  const access = await probeMicrophonePermissionOnly()
  return { ok: access.ok, permission: access.permission }
}

export async function testMicrophoneLevel(): Promise<{ ok: boolean; message: string }> {
  const access = await probeMicrophonePermissionOnly()
  if (!access.ok) {
    return {
      ok: false,
      message:
        access.permission === 'denied'
          ? 'Microphone blocked — check browser site settings.'
          : 'Microphone test could not start.'
    }
  }
  return { ok: true, message: 'Microphone is working. You can start a voice conversation.' }
}
