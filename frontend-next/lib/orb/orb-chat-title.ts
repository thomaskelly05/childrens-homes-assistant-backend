import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export type OrbChatTitleContext = {
  mode?: StandaloneOrbMode | string | null
  documentLens?: 'policy' | 'reg44' | 'explain' | 'summary' | 'actions' | string | null
  documentTitle?: string | null
}

const GREETING_RE =
  /^(hi|hello|hey|yo|thanks|thank you|thankyou|good morning|good afternoon|good evening)(\s+there|\s+orb)?[!?.]*$/i

function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function isGreeting(text: string): boolean {
  return GREETING_RE.test(normalise(text))
}

function capTitle(title: string, max = 48): string {
  const clean = normalise(title)
  if (!clean) return 'New chat'
  if (clean.length <= max) return clean
  const slice = clean.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace > max * 0.55) return `${slice.slice(0, lastSpace).trim()}…`
  return `${slice.trim()}…`
}

/** British-English chat titles from first meaningful user message and context. */
export function generateOrbChatTitle(message: string, context?: OrbChatTitleContext): string {
  const text = normalise(message)
  const lower = text.toLowerCase()
  const mode = String(context?.mode || '').toLowerCase()

  const lens = String(context?.documentLens || '').toLowerCase()
  const docTitle = normalise(context?.documentTitle || '')

  if (lens === 'reg44' || lens === 'reg45' || /reg\s*44|reg\s*45/.test(lower)) {
    if (lens === 'reg45') return docTitle ? capTitle(`Reg 45 Evidence Review — ${docTitle}`, 52) : 'Reg 45 Evidence Review'
    return docTitle ? capTitle(`Reg 44 Review — ${docTitle}`, 52) : 'Reg 44 Review'
  }

  if (lens === 'policy_card' || lens === 'policy' || /\bpolicy\s+card\b/.test(lower)) {
    if (docTitle) return capTitle(`Policy Card — ${docTitle}`, 52)
    return 'Policy Card'
  }

  if (lens === 'actions' || lens === 'action_plan') {
    return docTitle ? capTitle(`Action Plan — ${docTitle}`, 52) : 'Action Plan'
  }

  if (lens === 'safeguarding') {
    return docTitle ? capTitle(`Safeguarding Lens — ${docTitle}`, 52) : 'Safeguarding Lens'
  }

  if (lens === 'ofsted') {
    return docTitle ? capTitle(`Ofsted Lens — ${docTitle}`, 52) : 'Ofsted Lens'
  }

  if (lens === 'staff_briefing') {
    return docTitle ? capTitle(`Staff Briefing — ${docTitle}`, 52) : 'Staff Briefing'
  }

  if (
    /\b(disclosed|disclosure).{0,40}\babuse\b|\babuse\b.{0,40}\b(disclosed|disclosure)\b|\bsafeguarding\s+disclosure\b/i.test(
      text
    )
  ) {
    return 'Safeguarding disclosure'
  }

  if (/\bbuild\b.{0,24}\bshift\s+plan\b|\bshift\s+plan\b/i.test(lower)) {
    return 'Shift plan'
  }

  if (/\b(record|recording).{0,30}\b(restraint|physical intervention)\b|\bwhat\b.{0,20}\brecord\b.{0,30}\brestraint\b/i.test(
    lower
  )) {
    return 'Recording after restraint'
  }

  if (/\brestraint\b|\bphysical intervention\b/.test(lower) && /\brecord/i.test(lower)) {
    return 'Recording after restraint'
  }

  if (mode.includes('safeguarding')) {
    if (/\ballegation\b/i.test(lower)) return 'Safeguarding allegation'
    if (/\bmissing\b/i.test(lower)) return 'Missing from care'
    return capTitle(text || 'Safeguarding thinking', 48)
  }

  if (mode.includes('record')) {
    return capTitle(text || 'Recording support', 48)
  }

  if (mode.includes('ofsted') || mode.includes('reg 44')) {
    return capTitle(text || 'Inspection readiness', 48)
  }

  if (mode.includes('staff coach') || mode.includes('therapeutic')) {
    return capTitle(text || 'Reflective practice', 48)
  }

  if (isGreeting(text)) {
    return 'Hello'
  }

  if (!text || text === '[Image attachment]') {
    return 'Image conversation'
  }

  return capTitle(text)
}

/** @deprecated Use generateOrbChatTitle — kept for existing imports. */
export function titleFromFirstMessage(message: string, context?: OrbChatTitleContext): string {
  return generateOrbChatTitle(message, context)
}
