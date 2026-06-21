import {
  ORB_VOICE_V2_MIC_DENIED,
  ORB_VOICE_V2_MIC_NOT_FOUND,
  ORB_VOICE_V2_MIC_NOT_READABLE,
  ORB_VOICE_V2_MIC_TIMEOUT,
  ORB_VOICE_V2_MIC_UNAVAILABLE
} from './orb-voice-v2-copy.ts'
import { OrbVoiceV2CaptureError } from './orb-voice-v2-capture.ts'

/** Never leave requesting_microphone indefinitely. */
export const MICROPHONE_REQUEST_TIMEOUT_MS = 8000

/** Audio unlock runs in parallel; do not block mic request longer than this. */
export const AUDIO_UNLOCK_PARALLEL_TIMEOUT_MS = 1500

export function mapOrbVoiceV2MicError(error: unknown): { message: string; code: string } {
  if (error instanceof OrbVoiceV2CaptureError) {
    switch (error.code) {
      case 'not_allowed':
        return { code: 'not_allowed', message: ORB_VOICE_V2_MIC_DENIED }
      case 'not_found':
        return { code: 'not_found', message: ORB_VOICE_V2_MIC_NOT_FOUND }
      case 'not_readable':
        return { code: 'not_readable', message: ORB_VOICE_V2_MIC_NOT_READABLE }
      case 'security_error':
      case 'abort':
        return { code: error.code, message: ORB_VOICE_V2_MIC_UNAVAILABLE }
      case 'timeout':
        return { code: 'timeout', message: ORB_VOICE_V2_MIC_TIMEOUT }
      default:
        return { code: error.code, message: ORB_VOICE_V2_MIC_UNAVAILABLE }
    }
  }
  if (error && typeof error === 'object') {
    const name = 'name' in error ? String((error as { name?: string }).name) : ''
    if (name === 'NotAllowedError') {
      return { code: 'not_allowed', message: ORB_VOICE_V2_MIC_DENIED }
    }
    if (name === 'NotFoundError') {
      return { code: 'not_found', message: ORB_VOICE_V2_MIC_NOT_FOUND }
    }
    if (name === 'NotReadableError') {
      return { code: 'not_readable', message: ORB_VOICE_V2_MIC_NOT_READABLE }
    }
    if (name === 'AbortError' || name === 'SecurityError') {
      return { code: name, message: ORB_VOICE_V2_MIC_UNAVAILABLE }
    }
  }
  return { code: 'unknown', message: ORB_VOICE_V2_MIC_UNAVAILABLE }
}

export async function queryOrbVoiceV2MicPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown'
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
      return result.state
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(onTimeout())
    }, timeoutMs)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((error) => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
}
