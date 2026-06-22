/** Phase 5L — wake phrase detection inside an active Voice session only. */

const WAKE_RE = /\b(hey\s+orb|okay\s+orb|ok\s+orb|^orb\b)\b/i

export function detectOrbWakePhrase(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  return WAKE_RE.test(trimmed)
}

export function stripOrbWakePhrase(text: string): string {
  return text.replace(WAKE_RE, '').replace(/^\s*[,.!?-]+\s*/, '').trim()
}
