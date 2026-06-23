/** Instant/prelude line handling for ORB SSE streaming — separate from model answer tokens. */

export type OrbStreamPrelude = {
  text: string
  kind?: string
  category?: string
}

export function stripDuplicatePreludeFromAnswer(answer: string, prelude: string): string {
  let body = (answer || '').trim()
  const instant = (prelude || '').trim()
  if (!body || !instant) return body

  const stripOnce = (text: string): string => {
    if (text.toLowerCase().startsWith(instant.toLowerCase())) {
      return text.slice(instant.length).replace(/^\s*\n+/, '').trimStart()
    }
    const firstLine = instant.split('\n', 1)[0]?.trim() ?? ''
    if (firstLine && text.toLowerCase().startsWith(firstLine.toLowerCase())) {
      return text.slice(firstLine.length).replace(/^[\s.\n]+/, '').trimStart()
    }
    return text
  }

  let previous = ''
  while (body !== previous) {
    previous = body
    body = stripOnce(body)
  }
  return body
}

export function mergePreludeWithAnswer(prelude: string, answer: string): string {
  const instant = (prelude || '').trim()
  const body = stripDuplicatePreludeFromAnswer(answer, prelude)
  if (!instant) return body
  if (!body) return instant
  return `${instant}\n\n${body}`
}
