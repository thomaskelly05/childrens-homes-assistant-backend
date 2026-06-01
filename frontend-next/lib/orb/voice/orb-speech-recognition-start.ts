/**
 * Confirmed SpeechRecognition start — waits for onstart (and minimum hold) before reporting success.
 * Safe to import from tests without React.
 */

export const RECOGNITION_START_TIMEOUT_MS = 2500
export const SPEECH_RECOGNITION_MINIMUM_HOLD_MS = 500

export type OrbSpeechRecognitionStartFailureReason =
  | 'timeout'
  | 'onend_before_onstart'
  | 'onerror_before_onstart'
  | 'speech_recognition_ended_immediately'
  | 'start_throw'

export type OrbSpeechRecognitionStartResult = {
  ok: boolean
  reason?: OrbSpeechRecognitionStartFailureReason
}

export type OrbSpeechRecognitionLike = {
  onstart: (() => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  onresult?: ((...args: never[]) => void) | null
  start: () => void
}

/**
 * Call recognition.start() and resolve only after confirmed active capture.
 * Success requires onstart plus either minimumHoldMs without onend/onerror, or an onresult event.
 */
export function confirmSpeechRecognitionStart(
  recognition: OrbSpeechRecognitionLike,
  options?: { timeoutMs?: number; minimumHoldMs?: number }
): Promise<OrbSpeechRecognitionStartResult> {
  const timeoutMs = options?.timeoutMs ?? RECOGNITION_START_TIMEOUT_MS
  const minimumHoldMs = options?.minimumHoldMs ?? SPEECH_RECOGNITION_MINIMUM_HOLD_MS

  return new Promise((resolve) => {
    let settled = false
    let started = false
    let holdTimerId: ReturnType<typeof setTimeout> | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const priorOnstart = recognition.onstart
    const priorOnerror = recognition.onerror
    const priorOnend = recognition.onend
    const priorOnresult = recognition.onresult

    const finish = (result: OrbSpeechRecognitionStartResult) => {
      if (settled) return
      settled = true
      if (timeoutId) clearTimeout(timeoutId)
      if (holdTimerId) clearTimeout(holdTimerId)
      resolve(result)
    }

    const confirmSuccess = () => {
      finish({ ok: true })
    }

    recognition.onresult = (event) => {
      try {
        priorOnresult?.(event)
      } catch {
        /* ignore handler errors */
      }
      if (started) confirmSuccess()
    }

    recognition.onstart = () => {
      started = true
      try {
        priorOnstart?.()
      } catch {
        /* ignore handler errors */
      }
      holdTimerId = setTimeout(() => {
        if (!settled) confirmSuccess()
      }, minimumHoldMs)
    }

    recognition.onerror = () => {
      try {
        priorOnerror?.()
      } catch {
        /* ignore */
      }
      finish({
        ok: false,
        reason: started ? 'speech_recognition_ended_immediately' : 'onerror_before_onstart'
      })
    }

    recognition.onend = () => {
      try {
        priorOnend?.()
      } catch {
        /* ignore */
      }
      if (!started) {
        finish({ ok: false, reason: 'onend_before_onstart' })
        return
      }
      if (holdTimerId) {
        clearTimeout(holdTimerId)
        holdTimerId = null
      }
      finish({ ok: false, reason: 'speech_recognition_ended_immediately' })
    }

    timeoutId = setTimeout(() => finish({ ok: false, reason: 'timeout' }), timeoutMs)

    try {
      recognition.start()
    } catch {
      finish({ ok: false, reason: 'start_throw' })
    }
  })
}

/** Wait for MediaRecorder 'start' event (fires after recorder.start()). */
export function confirmMediaRecorderStart(
  recorder: MediaRecorder,
  options?: { timeoutMs?: number }
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? RECOGNITION_START_TIMEOUT_MS

  if (recorder.state === 'recording') return Promise.resolve(true)

  return new Promise((resolve) => {
    let settled = false
    const timeoutId = setTimeout(() => {
      if (settled) return
      settled = true
      resolve(false)
    }, timeoutMs)

    const onStart = () => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      recorder.removeEventListener('start', onStart)
      resolve(true)
    }

    recorder.addEventListener('start', onStart, { once: true })

    if (recorder.state === 'recording') {
      onStart()
    }
  })
}
