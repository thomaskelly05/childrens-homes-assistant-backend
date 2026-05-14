export type OrbAudioRecoveryReason =
  | 'microphone_request'
  | 'track_ended'
  | 'device_change'
  | 'browser_wake'
  | 'playback_resume'
  | 'interrupt'
  | 'logout'

export type OrbAudioRecoveryCallbacks = {
  onRecovery?: (reason: OrbAudioRecoveryReason, detail?: Record<string, unknown>) => void
  onError?: (message: string, detail?: Record<string, unknown>) => void
}

const MOBILE_USER_AGENT = /iphone|ipad|ipod|android/i

export function isMobileOrbBrowser() {
  if (typeof navigator === 'undefined') return false
  return MOBILE_USER_AGENT.test(navigator.userAgent)
}

export function prefersLowBandwidthMode() {
  if (typeof navigator === 'undefined') return false
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return Boolean(connection?.saveData || connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g')
}

export function triggerOrbHaptic(kind: 'tap' | 'interrupt' | 'reconnect' | 'success' = 'tap') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  const pattern = kind === 'interrupt' ? [12, 24, 12] : kind === 'reconnect' ? [18] : kind === 'success' ? [8, 20, 8] : [8]
  try {
    navigator.vibrate(pattern)
  } catch {
    // Haptics are best-effort and intentionally silent on unsupported browsers.
  }
}

export function createOrbAudioElement(stream: MediaStream) {
  const audio = new Audio()
  audio.autoplay = true
  audio.setAttribute('playsinline', 'true')
  audio.srcObject = stream
  return audio
}

export async function resumeOrbAudioElement(audio: HTMLAudioElement | null) {
  if (!audio) return false
  try {
    await audio.play()
    return true
  } catch {
    return false
  }
}

export function stopOrbAudioElement(audio: HTMLAudioElement | null) {
  if (!audio) return
  try {
    audio.pause()
    audio.srcObject = null
  } catch {
    // Device switches and tab sleep can make media elements throw.
  }
}

export class OrbAudioRecovery {
  private stream: MediaStream | null = null
  private cleanupFns: Array<() => void> = []

  constructor(private callbacks: OrbAudioRecoveryCallbacks = {}) {}

  currentStream() {
    return this.stream
  }

  async requestMicrophone(existing?: MediaStream | null) {
    if (existing && this.streamHealthy(existing)) {
      this.stream = existing
      return existing
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.callbacks.onError?.('Microphone capture is not supported in this browser.', { reason: 'unsupported' })
      return null
    }
    this.stopStream(existing || this.stream, 'microphone_request')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      this.stream = stream
      this.attachTrackRecovery(stream)
      this.callbacks.onRecovery?.('microphone_request', { tracks: stream.getAudioTracks().length })
      return stream
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Microphone permission was denied.', { reason: 'permission_denied' })
      return null
    }
  }

  async recoverMicrophone(reason: OrbAudioRecoveryReason = 'browser_wake') {
    const stream = await this.requestMicrophone(this.stream)
    this.callbacks.onRecovery?.(reason, { recovered: Boolean(stream) })
    return stream
  }

  attachBrowserRecovery() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined
    const onWake = () => {
      if (document.visibilityState === 'visible') void this.recoverMicrophone('browser_wake')
    }
    const onPageShow = () => void this.recoverMicrophone('browser_wake')
    const onDeviceChange = () => void this.recoverMicrophone('device_change')
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('pageshow', onPageShow)
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange)
    const cleanup = () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('pageshow', onPageShow)
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange)
    }
    this.cleanupFns.push(cleanup)
    return cleanup
  }

  stopAll(reason: OrbAudioRecoveryReason = 'logout') {
    this.stopStream(this.stream, reason)
    this.stream = null
    this.cleanupFns.splice(0).forEach((cleanup) => cleanup())
  }

  private attachTrackRecovery(stream: MediaStream) {
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => void this.recoverMicrophone('track_ended')
      track.onmute = () => this.callbacks.onRecovery?.('track_ended', { muted: true })
    })
  }

  private streamHealthy(stream: MediaStream) {
    return stream.active && stream.getAudioTracks().some((track) => track.readyState === 'live' && !track.muted)
  }

  private stopStream(stream: MediaStream | null | undefined, reason: OrbAudioRecoveryReason) {
    stream?.getTracks().forEach((track) => track.stop())
    this.callbacks.onRecovery?.(reason, { stopped: true })
  }
}
