export type OrbDictateFindMatch = {
  index: number
  length: number
}

export type OrbDictateFindReplaceOptions = {
  matchCase?: boolean
  protectDirectQuotes?: boolean
}

const DIRECT_QUOTE_PATTERN = /"[^"]{3,}"/g

export function findOrbDictateMatches(
  text: string,
  query: string,
  options: OrbDictateFindReplaceOptions = {}
): OrbDictateFindMatch[] {
  const needle = query.trim()
  if (!needle) return []
  const matches: OrbDictateFindMatch[] = []
  const flags = options.matchCase ? 'g' : 'gi'
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(escaped, flags)
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (options.protectDirectQuotes && isInsideDirectQuote(text, match.index)) continue
    matches.push({ index: match.index, length: match[0].length })
    if (match.index === re.lastIndex) re.lastIndex++
  }
  return matches
}

function isInsideDirectQuote(text: string, index: number): boolean {
  DIRECT_QUOTE_PATTERN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = DIRECT_QUOTE_PATTERN.exec(text)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (index >= start && index < end) return true
  }
  return false
}

export function replaceOrbDictateAll(
  text: string,
  query: string,
  replacement: string,
  options: OrbDictateFindReplaceOptions = {}
): { text: string; replaced: number; skippedInQuotes: number } {
  const matches = findOrbDictateMatches(text, query, options)
  if (!matches.length) return { text, replaced: 0, skippedInQuotes: 0 }
  let replaced = 0
  let skippedInQuotes = 0
  let next = text
  for (let i = matches.length - 1; i >= 0; i--) {
    const { index, length } = matches[i]
    if (options.protectDirectQuotes && isInsideDirectQuote(text, index)) {
      skippedInQuotes++
      continue
    }
    next = next.slice(0, index) + replacement + next.slice(index + length)
    replaced++
  }
  return { text: next, replaced, skippedInQuotes }
}

export function replaceOrbDictateAt(
  text: string,
  match: OrbDictateFindMatch,
  replacement: string
): string {
  return text.slice(0, match.index) + replacement + text.slice(match.index + match.length)
}
