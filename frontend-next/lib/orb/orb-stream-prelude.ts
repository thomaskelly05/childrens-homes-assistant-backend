/** Instant/prelude line handling for ORB SSE streaming — separate from model answer tokens. */

export type OrbStreamPrelude = {
  text: string
  kind?: string
  category?: string
}

function normalizePreludeForDedup(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/\bthe adult\b/g, 'staff')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripDuplicatePreludeFromAnswer(answer: string, prelude: string): string {
  let body = (answer || '').trim()
  const instant = (prelude || '').trim()
  if (!body || !instant) return body

  const instantNorm = normalizePreludeForDedup(instant)
  const firstLine = instant.split('\n', 1)[0]?.trim() ?? ''

  const stripOnce = (text: string): string => {
    if (text.toLowerCase().startsWith(instant.toLowerCase())) {
      return text.slice(instant.length).replace(/^\s*\n+/, '').trimStart()
    }
    if (firstLine && text.toLowerCase().startsWith(firstLine.toLowerCase())) {
      return text.slice(firstLine.length).replace(/^[\s.\n]+/, '').trimStart()
    }
    const probe = text.slice(0, Math.max(instant.length + 80, firstLine.length + 40))
    if (normalizePreludeForDedup(probe).startsWith(instantNorm)) {
      const lines = text.split('\n')
      const instantLineCount = instant.split('\n').length
      if (instantLineCount > 0 && lines.length >= instantLineCount) {
        const joined = lines.slice(0, instantLineCount).join('\n')
        if (normalizePreludeForDedup(joined) === instantNorm) {
          return lines.slice(instantLineCount).join('\n').replace(/^\s*\n+/, '').trimStart()
        }
      }
      if (firstLine && lines[0] && normalizePreludeForDedup(lines[0]) === normalizePreludeForDedup(firstLine)) {
        return lines.slice(1).join('\n').replace(/^\s*\n+/, '').trimStart()
      }
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
