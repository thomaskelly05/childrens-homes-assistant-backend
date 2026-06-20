/**
 * ORB Residential Chat — guided response pattern for specialist care support.
 * Used for local fallbacks and client-side response shaping hints.
 */

import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'

export const ORB_RESIDENTIAL_CHAT_RESPONSE_PATTERN = [
  'Acknowledge the adult’s purpose in one short sentence.',
  'Clarify what kind of support is needed: think it through, prepare a record, reflect after an incident, safeguarding concern, supervision preparation, or wording support.',
  'Ask two to four focused questions if information is missing.',
  'Offer a structured output option such as daily record, incident reflection, supervision note or safeguarding reflection.',
  'Keep safeguarding boundaries: immediate risk → follow local emergency/safeguarding procedures; do not investigate or make findings; record exact words and observations; manager or safeguarding lead oversight where needed.',
  'Separate observation from interpretation and prompt for the child’s voice where relevant.',
  'ORB supports professional judgement — adults review before use.'
] as const

export type ResidentialChatSupportType =
  | 'think_through'
  | 'prepare_record'
  | 'incident_reflection'
  | 'safeguarding_concern'
  | 'supervision_prep'
  | 'wording_support'
  | 'general'

const SAFEGUARDING_RE =
  /\b(safeguard|abuse|disclos|allegat|missing from care|exploit|county lines|self[- ]?harm|suicid|CSE|CCE)\b/i

const INCIDENT_RE =
  /\b(incident|restraint|physical intervention|abscond|missing|assault|fight|damage)\b/i

const SUPERVISION_RE = /\b(supervision|reflective practice|management discussion|handover)\b/i

const WORDING_RE = /\b(wording|phrase|rewrite|tone|assumption|interpret)\b/i

const RECORD_RE = /\b(record|recording|daily record|write up|log|note)\b/i

/** Detect the primary support type from the adult’s message. */
export function detectResidentialChatSupportType(
  message: string,
  mode?: StandaloneOrbMode | string | null
): ResidentialChatSupportType {
  const text = message.trim()
  const modeLower = String(mode || '').toLowerCase()

  if (modeLower.includes('safeguard') || SAFEGUARDING_RE.test(text)) return 'safeguarding_concern'
  if (INCIDENT_RE.test(text)) return 'incident_reflection'
  if (SUPERVISION_RE.test(text)) return 'supervision_prep'
  if (WORDING_RE.test(text)) return 'wording_support'
  if (RECORD_RE.test(text) || modeLower.includes('record')) return 'prepare_record'
  if (/\bthink|help me|what should|how do i|prepare\b/i.test(text)) return 'think_through'
  return 'general'
}

const SUPPORT_LABELS: Record<ResidentialChatSupportType, string> = {
  think_through: 'Think it through',
  prepare_record: 'Prepare a record',
  incident_reflection: 'Reflect after an incident',
  safeguarding_concern: 'Safeguarding concern',
  supervision_prep: 'Supervision preparation',
  wording_support: 'Wording support',
  general: 'Specialist care support'
}

const FOCUSED_QUESTIONS: Record<ResidentialChatSupportType, string[]> = {
  think_through: [
    'What happened, in observable terms?',
    'What might the child’s experience have been?',
    'What do you need help deciding or recording?'
  ],
  prepare_record: [
    'What type of record are you preparing (daily, incident, contact, safeguarding reflection, etc.)?',
    'What did the child say or show, in their own words where known?',
    'What was the adult response and follow-up?'
  ],
  incident_reflection: [
    'What happened first — times, sequence and who was present?',
    'What was observed versus interpreted?',
    'What helped or did not help for the child?'
  ],
  safeguarding_concern: [
    'What was observed or disclosed, in exact words where possible?',
    'Is there immediate risk requiring local emergency or safeguarding procedures now?',
    'Who has been informed or may need management or safeguarding lead oversight?'
  ],
  supervision_prep: [
    'What do you want to take to supervision?',
    'What felt difficult or unresolved?',
    'What might need follow-up for the child or the team?'
  ],
  wording_support: [
    'What wording are you unsure about?',
    'Are there assumptions or interpretation that should be separated from observation?',
    'How should the child’s voice stay visible?'
  ],
  general: [
    'What would be most helpful right now?',
    'What is missing that ORB should help you think through?',
    'Is this for thinking, recording, reflection or safeguarding preparation?'
  ]
}

/** Build a guided local fallback when streaming is unavailable or for structured first response. */
export function buildResidentialGuidedChatFallback(
  message: string,
  mode?: StandaloneOrbMode | string | null
): string {
  const supportType = detectResidentialChatSupportType(message, mode)
  const label = SUPPORT_LABELS[supportType]
  const questions = FOCUSED_QUESTIONS[supportType]

  const lines = [
    `I can help you with **${label.toLowerCase()}** — keeping the child’s experience central.`,
    '',
    '**To move forward, it would help to know:**',
    ...questions.map((q) => `- ${q}`),
    '',
    '**I can turn this into:** a daily record, incident reflection, supervision note or safeguarding reflection — for your review before use.',
    '',
    '**Safeguarding boundaries:** If there is immediate risk, follow your local emergency and safeguarding procedures now. ORB does not investigate, make findings or replace professional judgement. Record exact words and observations; seek manager or safeguarding lead oversight where needed.'
  ]

  return lines.join('\n')
}

/** Detect overly generic long safeguarding essays that should be reshaped. */
export function isGenericResidentialSafeguardingEssay(content: string): boolean {
  const text = content.trim()
  if (text.length < 900) return false
  const sectionCount = (text.match(/\n#{1,3}\s|\n\*\*[A-Z]/g) || []).length
  const hasGenericOpen =
    /\b(it is important to note|in any safeguarding situation|safeguarding is everyone's responsibility|best practice suggests that)\b/i.test(
      text
    )
  const lacksQuestions = !/\?\s/m.test(text.slice(0, 600))
  return hasGenericOpen && sectionCount >= 4 && lacksQuestions
}

/** If a streamed answer looks like a generic essay, prepend a shorter guided structure. */
export function reshapeGenericResidentialChatAnswer(content: string, userMessage: string, mode?: string): string {
  if (!isGenericResidentialSafeguardingEssay(content)) return content
  const guide = buildResidentialGuidedChatFallback(userMessage, mode)
  return `${guide}\n\n---\n\n**Additional context from ORB (review and edit before use):**\n\n${content.slice(0, 1200)}${content.length > 1200 ? '…' : ''}`
}
