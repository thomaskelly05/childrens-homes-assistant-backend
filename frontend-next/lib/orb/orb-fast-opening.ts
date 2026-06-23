/** Fast-opening placeholder detection — mirrors services/orb_fast_opening_service.py */

const FAST_OPENING_PLACEHOLDERS = [
  'Start with what is safest and most practical right now — the full guidance is on the way.',
  "First, check immediate safety and follow your local safeguarding procedure. I'm preparing the full steps now.",
  "I'll help you draft a factual incident report from what you've shared — checking immediate safety first, then building the record structure."
] as const

const JOINED_OPENING_BUG_PATTERNS: RegExp[] = [
  /(on the way\.)(Immediate)/i,
  /(provided\.)(Immediate)/i,
  /(on the way\.)(###)/i,
  /(provided\.)(###)/i,
  /(on the way\.)(First,)/i,
  /(provided\.)(First,)/
]

export const ORB_STREAM_INCOMPLETE_FALLBACK_HINT =
  'ORB could not finish generating the full answer after the opening preview.'

export function ensureFastOpeningSpacing(text: string, fastOpening?: string | null): string {
  let cleaned = (text || '').trim()
  if (!cleaned) return cleaned

  for (const pattern of JOINED_OPENING_BUG_PATTERNS) {
    cleaned = cleaned.replace(pattern, '$1\n\n$2')
  }

  const opening = (fastOpening || '').trim()
  if (opening && cleaned.startsWith(opening) && cleaned.length > opening.length) {
    const remainder = cleaned.slice(opening.length)
    if (remainder && !/^\s/.test(remainder)) {
      cleaned = `${opening}\n\n${remainder.trimStart()}`
    }
  }

  return cleaned
}

export function isOrbFastOpeningPlaceholder(text: string): boolean {
  const cleaned = (text || '').trim()
  if (!cleaned) return false
  if (FAST_OPENING_PLACEHOLDERS.includes(cleaned as (typeof FAST_OPENING_PLACEHOLDERS)[number])) {
    return true
  }
  for (const placeholder of FAST_OPENING_PLACEHOLDERS) {
    if (!cleaned.startsWith(placeholder)) continue
    const remainder = cleaned.slice(placeholder.length).trim().replace(/^[-—\s]+/, '')
    if (!remainder || remainder.length < 40) return true
  }
  return false
}

export function resolveOrbStreamedAnswer(
  responseAnswer: string | undefined,
  streamedPartial: string,
  options?: {
    errorDetail?: string | null
    fastOpening?: string | null
    answerRepaired?: boolean | null
  }
): string {
  const partial = ensureFastOpeningSpacing(streamedPartial || '', options?.fastOpening)
  const metadataAnswer = ensureFastOpeningSpacing(responseAnswer || '', options?.fastOpening)

  // Post-stream server finalisation (repair + record discipline) wins when present and non-empty.
  if (metadataAnswer && (options?.answerRepaired || !options?.errorDetail)) {
    if (metadataAnswer.trim() || !partial.trim()) {
      return metadataAnswer
    }
  }

  if (metadataAnswer && partial) {
    if (partial.length > metadataAnswer.length && partial.startsWith(metadataAnswer)) {
      return partial
    }
    if (metadataAnswer.length > partial.length && metadataAnswer.startsWith(partial)) {
      return metadataAnswer
    }
    if (partial.includes(metadataAnswer) && partial.length > metadataAnswer.length) {
      return partial
    }
  }

  const chosen = metadataAnswer || partial
  if (options?.errorDetail && isOrbFastOpeningPlaceholder(chosen)) {
    return chosen
  }
  return chosen
}

export function isOrbFastOpeningOnlyCompletion(
  answer: string,
  options?: { errorDetail?: string | null; streamedPartial?: string; fastOpening?: string | null }
): boolean {
  const resolved = resolveOrbStreamedAnswer(answer, options?.streamedPartial || '', {
    fastOpening: options?.fastOpening
  })
  if (options?.errorDetail) {
    return isOrbFastOpeningPlaceholder(resolved)
  }
  return isOrbFastOpeningPlaceholder(resolved)
}
