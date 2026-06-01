/**
 * Confirmed SpeechRecognition start — waits for onstart before reporting success.
 * Safe to import from tests without React.
 */

export const RECOGNITION_START_TIMEOUT_MS = 2500

export type OrbSpeechRecognitionLike = {
  onstart: (() => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
}

/**
 * Call recognition.start() and resolve only after onstart fires.
 * Resolves false on onerror before start, onend before onstart, start() throw, or timeout.
 */
export function confirmSpeechRecognitionStart(
  recognition: OrbSpeechRecognitionLike,
  options?: { timeoutMs?: number }
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? RECOGNITION_START_TIMEOUT_MS

  return new Promise((resolve) => {
    let settled = false
    let started = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const priorOnstart = recognition.onstart
    const priorOnerror = recognition.onerror
    const priorOnend = recognition.onend

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      if (timeoutId) clearTimeout(timeoutId)
      resolve(ok)
    }

    recognition.onstart = () => {
      started = true
      try {
        priorOnstart?.()
      } catch {
        /* ignore handler errors */
      }
      finish(true)
    }

    recognition.onerror = () => {
      try {
        priorOnerror?.()
      } catch {
        /* ignore */
      }
      finish(false)
    }

    recognition.onend = () => {
      try {
        priorOnend?.()
      } catch {
        /* ignore */
      }
      if (!started) finish(false)
    }

    timeoutId = setTimeout(() => finish(false), timeoutMs)

    try {
      recognition.start()
    } catch {
      finish(false)
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
