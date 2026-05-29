const GREETING_RE =
  /^(hi|hello|hey|yo|thanks|thank you|thankyou|good morning|good afternoon|good evening)(\s+there|\s+orb)?[!?.]*$/i

const PRODUCT_QUESTION_RE =
  /^(what can you do|what do you do|how can you help|help|what are you|what is orb|about orb|what is indicare)\??$/i

/** Patterns that warrant the urgent top-of-chat safeguarding banner. */
const URGENT_PATTERNS: RegExp[] = [
  /\b(disclosed|disclosure).{0,48}\babuse\b/i,
  /\babuse\b.{0,48}\b(disclosed|disclosure)\b/i,
  /\bsexual(ly)?\s+(harm|abuse|assault|exploitation)\b/i,
  /\b(self[- ]?harm|suicide|suicidal|took an overdose|overdose)\b/i,
  /\b(missing from care|absconded|absconding|went missing|run away from the home)\b/i,
  /\b(unknown adult|strange man|strange woman|unfamiliar adult|unknown vehicle|white van|suspicious car)\b/i,
  /\b(allegation against|alleged abuse|staff member (touched|hit|assaulted))\b/i,
  /\b(serious injury|unconscious|not breathing|life[- ]?threatening)\b/i,
  /\b(knife|weapon|threatened to stab|threatened to kill)\b/i,
  /\b(immediate danger|immediate risk|right now.{0,20}(unsafe|danger)|child is not safe)\b/i,
  /\b(exploitation|county lines|cuckooing|groomed)\b/i
]

const RESTRAINT_ONLY_RE = /\b(restraint|physical intervention|held down|restrictive)\b/i
const CURRENT_RISK_IN_RESTRAINT_RE =
  /\b(injury|injured|hurt|bleeding|unwell|can't breathe|not safe|immediate|emergency)\b/i

export type SafeguardingUrgency = 'none' | 'moderate' | 'urgent'

export const URGENT_SAFEGUARDING_BANNER_COPY =
  'Safeguarding risk: follow your home’s safeguarding procedure now. If there is immediate danger, contact emergency services and local safeguarding arrangements. ORB does not replace escalation.'

export function isCasualGreetingOrProductChat(text: string): boolean {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return true
  if (GREETING_RE.test(clean)) return true
  if (PRODUCT_QUESTION_RE.test(clean.toLowerCase())) return true
  if (/^(what is|tell me about)\s+(orb|indicare)/i.test(clean)) return true
  return false
}

export function classifySafeguardingUrgency(text: string, mode?: string | null): SafeguardingUrgency {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean || isCasualGreetingOrProductChat(clean)) return 'none'

  const lower = clean.toLowerCase()
  const modeLower = String(mode || '').toLowerCase()

  if (URGENT_PATTERNS.some((pattern) => pattern.test(clean))) {
    return 'urgent'
  }

  if (RESTRAINT_ONLY_RE.test(lower) && !CURRENT_RISK_IN_RESTRAINT_RE.test(lower)) {
    return 'none'
  }

  if (modeLower.includes('safeguarding')) {
    if (/\b(concern|disclosure|allegation|risk|harm|unsafe)\b/i.test(clean)) {
      return 'urgent'
    }
    return 'moderate'
  }

  if (/\b(safeguarding|lado|mash|social worker referral)\b/i.test(lower)) {
    return 'moderate'
  }

  return 'none'
}

export function shouldShowUrgentSafeguardingBanner(text: string, mode?: string | null): boolean {
  return classifySafeguardingUrgency(text, mode) === 'urgent'
}

/** Latest user message in thread used for banner (not composer draft). */
export function safeguardingBannerTextFromMessages(
  messages: Array<{ role: string; content: string }>,
  mode?: string | null
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const entry = messages[index]
    if (entry?.role === 'user' && entry.content.trim()) {
      return shouldShowUrgentSafeguardingBanner(entry.content, mode) ? entry.content : null
    }
  }
  return null
}
