/** Client-side token cadence streaming when the API returns a full answer. */

export type StreamTextOptions = {
  text: string
  onChunk: (partial: string) => void
  signal?: AbortSignal
  /** Base delay between chunks in ms */
  baseDelayMs?: number
  /** Characters per chunk */
  chunkSize?: number
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true }
    )
  })
}

export async function streamTextIntoView({
  text,
  onChunk,
  signal,
  baseDelayMs = 14,
  chunkSize = 3
}: StreamTextOptions): Promise<void> {
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reducedMotion || text.length < 80) {
    onChunk(text)
    return
  }

  let cursor = 0
  while (cursor < text.length) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const next = Math.min(text.length, cursor + chunkSize)
    cursor = next
    onChunk(text.slice(0, cursor))
    const punctuationPause = /[.!?]\s*$/.test(text.slice(0, cursor)) ? baseDelayMs * 2.2 : baseDelayMs
    await delay(punctuationPause, signal)
  }
}
