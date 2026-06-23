/**
 * ORB Residential Chat — guided response pattern for specialist care support.
 * Used for local fallbacks and client-side response shaping hints.
 */

import type { StandaloneOrbMode } from '@/lib/orb/standalone-client'
import { sanitizeVisibleFinalAnswer } from '@/lib/orb/orb-visible-final-answer'

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
  /\b(safeguard|abuse|disclos|allegat|missing from care|exploit|county lines|self[- ]?harm|suicid|CSE|CCE|LADO|bullying)\b/i

const INCIDENT_RE =
  /\b(incident|restraint|physical intervention|abscond|missing episode|missing from|assault|fight|damage|injur|harm|behaviou?r incident)\b/i

const SUPERVISION_RE = /\b(supervision|reflective practice|management discussion|handover)\b/i

const WORDING_RE = /\b(wording|phrase|rewrite|tone|assumption|interpret)\b/i

const RECORD_RE = /\b(record|recording|daily record|write up|log|note|chronolog|key[- ]?work)\b/i

const BEHAVIOUR_RE = /\b(behaviou?r|meltdown|dysregulat|aggress|escalat)\b/i

const CONCERN_RE = /\b(concern|risk|worried|worry|escalat|complaint)\b/i

const MEDICATION_RE = /\b(medication|meds|prescription)\b/i

const POLICE_RE = /\b(police|999|101)\b/i

const OFSTED_RE = /\b(ofsted|inspection)\b/i

const REGULATION_RE = /\b(regulation 44|regulation 45|reg 44|reg 45)\b/i

const CARE_PLAN_RE = /\b(care plan|placement plan)\b/i

const CHILD_VOICE_RE = /\b(child('s)? voice|child('s)? experience|what the child said)\b/i

/** Detect the primary support type from the adult’s message. */
export function detectResidentialChatSupportType(
  message: string,
  mode?: StandaloneOrbMode | string | null
): ResidentialChatSupportType {
  const text = message.trim()
  const modeLower = String(mode || '').toLowerCase()

  if (modeLower.includes('safeguard') || SAFEGUARDING_RE.test(text)) return 'safeguarding_concern'
  if (POLICE_RE.test(text) || MEDICATION_RE.test(text)) return 'safeguarding_concern'
  if (INCIDENT_RE.test(text) || BEHAVIOUR_RE.test(text)) return 'incident_reflection'
  if (SUPERVISION_RE.test(text)) return 'supervision_prep'
  if (WORDING_RE.test(text)) return 'wording_support'
  if (RECORD_RE.test(text) || modeLower.includes('record')) return 'prepare_record'
  if (CONCERN_RE.test(text) || OFSTED_RE.test(text) || REGULATION_RE.test(text)) {
    return SAFEGUARDING_RE.test(text) ? 'safeguarding_concern' : 'think_through'
  }
  if (CARE_PLAN_RE.test(text) || CHILD_VOICE_RE.test(text)) return 'prepare_record'
  if (/\bthink|help me|what should|how do i|prepare\b/i.test(text)) return 'think_through'
  return 'general'
}

/** True when ORB should apply specialist guided shaping rather than generic chat. */
export function shouldApplyResidentialChatGuidance(
  message: string,
  mode?: StandaloneOrbMode | string | null
): boolean {
  return detectResidentialChatSupportType(message, mode) !== 'general'
}

const INCIDENT_SAFEGUARDING_QUESTIONS = [
  'What happened, in order?',
  'Who was present?',
  'What did the child say, show or communicate?',
  'What did adults observe?',
  'What did adults do to support, reassure or de-escalate?',
  'What was the outcome?',
  'What follow-up or management oversight is needed?'
] as const

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
  incident_reflection: [...INCIDENT_SAFEGUARDING_QUESTIONS],
  safeguarding_concern: [...INCIDENT_SAFEGUARDING_QUESTIONS],
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

const OUTPUT_OFFERS: Record<ResidentialChatSupportType, string> = {
  think_through:
    'a daily record, incident reflection, supervision note or safeguarding reflection',
  prepare_record: 'a daily record, incident reflection, handover note or chronology entry',
  incident_reflection: 'an incident record, safeguarding reflection or handover note',
  safeguarding_concern: 'a safeguarding reflection, incident record or handover note',
  supervision_prep: 'a supervision note, reflective summary or handover note',
  wording_support: 'safer record wording, incident reflection or daily record sections',
  general: 'a daily record, incident reflection, supervision note or safeguarding reflection'
}

function specialistGuidedOpening(): string {
  return `I can help you think this through.

First, make sure immediate safety and local safeguarding procedures are being followed.`
}

function boundaryFooter(): string {
  return `**Remember:** Separate observation from interpretation. ORB does not investigate, make findings or replace professional judgement. Follow local policy and seek manager or safeguarding lead oversight where needed.`
}

/** Build a guided local fallback when streaming is unavailable or for structured first response. */
export function buildResidentialGuidedChatFallback(
  message: string,
  mode?: StandaloneOrbMode | string | null
): string {
  const supportType = detectResidentialChatSupportType(message, mode)
  const questions = FOCUSED_QUESTIONS[supportType]
  const outputs = OUTPUT_OFFERS[supportType]

  if (supportType === 'safeguarding_concern' || supportType === 'incident_reflection') {
    return [
      specialistGuidedOpening(),
      '',
      'To help you record this safely, start with:',
      '',
      ...questions.map((q, i) => `${i + 1}. ${q}`),
      '',
      'When you are ready, I can help turn your notes into a factual, child-centred record for adult review.',
      '',
      boundaryFooter()
    ].join('\n')
  }

  const lines = [
    'I can help you think this through.',
    '',
    '**To move forward, it would help to know:**',
    ...questions.map((q) => `- ${q}`),
    '',
    `**I can turn this into:** ${outputs} — for your review before use.`,
    '',
    boundaryFooter()
  ]

  return lines.join('\n')
}

const RESIDENTIAL_SCENARIO_MARKERS_RE =
  /\b(child('s)? voice|immediate (safety|steps|action)|escalat|manager|LADO|DSL|safeguarding lead|designated|missing from care|return[- ]?home|observ|record|chronolog|welfare|de-escalat|contact|staff response|what (happened|to do)|boundaries|do not investigate|exact words|communicat|allegat|whistleblow|AAC|symbols|gestures)\b/i

const GENERIC_ESSAY_OPENERS_RE =
  /\b(it is important to note|in any safeguarding situation|safeguarding is everyone's responsibility|best practice suggests that|safeguarding is a shared responsibility)\b/i

/** True when the backend returned no usable answer body. */
export function isEmptyResidentialChatAnswer(content: string): boolean {
  const text = content.trim()
  if (!text) return true
  return /^I'm here, but I could not generate a full response/i.test(text)
}

/** True for deterministic safety/firewall fallback answers that must not be reshaped. */
export function isResidentialSafetyFallbackAnswer(content: string): boolean {
  const text = content.trim()
  return (
    /\b1\.\s*safety position\b/i.test(text) ||
    /\b9\.\s*boundary caveat\b/i.test(text) ||
    /\bsafety firewall|privacy block|cannot provide guidance on\b/i.test(text)
  )
}

/** Detect substantive scenario-specific backend answers that should remain primary. */
export function isStrongResidentialBackendAnswer(content: string): boolean {
  const text = content.trim()
  if (text.length < 150) return false

  const hasGenericOpen = GENERIC_ESSAY_OPENERS_RE.test(text)
  const lacksFocusedContent = !RESIDENTIAL_SCENARIO_MARKERS_RE.test(text)
  if (hasGenericOpen && lacksFocusedContent && text.length >= 700) return false

  const hasStructure =
    /^#{1,3}\s/m.test(text) ||
    /\n\*\*[A-Z][^*]+\*\*/m.test(text) ||
    /\n[-*•]\s+\S/m.test(text) ||
    /\n\d+\.\s+\S/m.test(text)

  return hasStructure && RESIDENTIAL_SCENARIO_MARKERS_RE.test(text)
}

/** True when an answer is too short or generic to surface without guided fallback. */
export function isLowValueResidentialAnswer(content: string): boolean {
  const text = content.trim()
  if (!text || text.length < 80) return true
  if (
    text.length < 200 &&
    /\b(I can help|happy to help|let me know|feel free)\b/i.test(text) &&
    !RESIDENTIAL_SCENARIO_MARKERS_RE.test(text)
  ) {
    return true
  }
  return false
}

/** Short support note appended when guidance helps but the answer should stay primary. */
export function buildResidentialChatSupportPrompt(
  userMessage: string,
  mode?: StandaloneOrbMode | string | null
): string {
  const supportType = detectResidentialChatSupportType(userMessage, mode)
  const outputs = OUTPUT_OFFERS[supportType]
  return `**Before you use this:** Review the wording, separate observation from interpretation, and follow local safeguarding procedures. I can also help turn your notes into ${outputs} if useful.`
}

/** Detect overly generic long safeguarding essays that should be reshaped. */
export function isGenericResidentialSafeguardingEssay(content: string): boolean {
  const text = content.trim()
  if (text.length < 700) return false
  if (isStrongResidentialBackendAnswer(text)) return false

  const sectionCount = (text.match(/\n#{1,3}\s|\n\*\*[A-Z]/g) || []).length
  const hasGenericOpen = GENERIC_ESSAY_OPENERS_RE.test(text)
  const lacksFocusedContent = !RESIDENTIAL_SCENARIO_MARKERS_RE.test(text)
  return (hasGenericOpen && sectionCount >= 3) || (text.length > 1400 && hasGenericOpen && lacksFocusedContent)
}

/** True when a streamed answer already follows the guided specialist pattern. */
export function answerLooksGuidedResidentialChat(content: string): boolean {
  const text = content.trim()
  if (text.length < 120) return false
  if (isStrongResidentialBackendAnswer(text)) return true

  const hasQuestions = /\?\s/m.test(text)
  const hasStructure =
    /^#{1,3}\s/m.test(text) || /\n[-*•]\s+\S/m.test(text) || /\n\d+\.\s+\S/m.test(text)
  const hasSafetyOrBoundary =
    /\b(immediate (risk|safety|steps)|local (safeguarding|policy|emergency)|professional judgement|observation from interpretation|child('s)? voice|observed|exact words|do not investigate)\b/i.test(
      text
    )
  const hasOutputOffer =
    /\b(daily record|incident reflection|supervision note|safeguarding reflection|handover note|for adult review|child-centred record)\b/i.test(
      text
    )

  if (hasStructure && hasSafetyOrBoundary) return true
  return hasQuestions && hasSafetyOrBoundary && hasOutputOffer
}

/** If a streamed answer looks like a generic essay, replace with guided fallback. */
export function reshapeGenericResidentialChatAnswer(content: string, userMessage: string, mode?: string): string {
  if (isStrongResidentialBackendAnswer(content)) return content
  if (!isGenericResidentialSafeguardingEssay(content)) return content
  return buildResidentialGuidedChatFallback(userMessage, mode)
}

/** Main residential chat shaping — preserve strong backend answers; fallback only when needed. */
export function reshapeResidentialChatAnswer(
  content: string,
  userMessage: string,
  mode?: StandaloneOrbMode | string | null
): string {
  const text = content.trim()

  if (!text || isEmptyResidentialChatAnswer(text)) {
    return buildResidentialGuidedChatFallback(userMessage, mode)
  }

  if (isResidentialSafetyFallbackAnswer(text)) {
    return text
  }

  if (isStrongResidentialBackendAnswer(text)) {
    return sanitizeVisibleFinalAnswer(text, userMessage)
  }

  if (answerLooksGuidedResidentialChat(text) && !isGenericResidentialSafeguardingEssay(text)) {
    return sanitizeVisibleFinalAnswer(text, userMessage)
  }

  if (!shouldApplyResidentialChatGuidance(userMessage, mode)) {
    return sanitizeVisibleFinalAnswer(
      reshapeGenericResidentialChatAnswer(text, userMessage, mode ?? undefined),
      userMessage
    )
  }

  if (isGenericResidentialSafeguardingEssay(text) || isLowValueResidentialAnswer(text)) {
    return buildResidentialGuidedChatFallback(userMessage, mode)
  }

  return sanitizeVisibleFinalAnswer(
    `${text}\n\n---\n\n${buildResidentialChatSupportPrompt(userMessage, mode)}`,
    userMessage
  )
}
