/**
 * Inspects natural-language requests and decides which support pack sections to include.
 */

import type {
  CommunicationAudience,
  CommunicationOutputPreference,
  CommunicationPlan,
  CommunicationSupportPackRequest,
  CommunicationSupportPackSectionType,
  CommunicationSupportPackSensitivity,
  CommunicateRequestIntent
} from './orb-communicate-types.ts'

const LEADING_QUESTION_PATTERNS = [
  /\bwhy did you\b/i,
  /\bwhy do you\b/i,
  /\bdid you do\b/i,
  /\bdid he\b/i,
  /\bdid she\b/i,
  /\bdid they\b/i,
  /\bwhat really happened\b/i,
  /\btell me the truth\b/i
]

export const ORB_COMMUNICATE_COMPACT_SAFETY =
  'ORB Communicate supports accessible communication. Adults remain responsible for review, judgement and local safeguarding procedures.'

export const ORB_COMMUNICATE_FULL_SAFETY =
  'ORB Communicate supports accessible communication and safer recording. It does not replace professional judgement, safeguarding procedures, SALT, PBS, clinical advice or local policy.'

const INTENT_SECTIONS: Record<CommunicateRequestIntent, CommunicationSupportPackSectionType[]> = {
  contact_change: [
    'easy_read',
    'visual_cards',
    'regulation_support',
    'staff_guidance',
    'recording_prompts'
  ],
  new_staff_member: ['social_story', 'visual_cards', 'staff_guidance'],
  hospital_appointment: ['easy_read', 'visual_cards', 'staff_guidance', 'recording_prompts'],
  bedtime_worries: ['visual_cards', 'regulation_support', 'social_story', 'recording_prompts'],
  feelings_expression: ['visual_cards', 'staff_guidance', 'recording_prompts'],
  safeguarding_disclosure: [
    'visual_cards',
    'staff_guidance',
    'recording_prompts',
    'reflection_draft'
  ],
  visual_routine: ['visual_cards', 'staff_guidance', 'recording_prompts'],
  general: ['easy_read', 'visual_cards', 'staff_guidance', 'recording_prompts']
}

function normalisePrompt(prompt: string): string {
  return prompt.trim().toLowerCase()
}

function detectIntent(prompt: string): CommunicateRequestIntent {
  const text = normalisePrompt(prompt)
  if (
    /\b(safeguard|disclosure|told me|worried about|abuse|hurt|scared to tell|something happened|kept secret)\b/.test(
      text
    )
  ) {
    return 'safeguarding_disclosure'
  }
  if (/\b(contact|mum|dad|parent|visit|visiting|changed today|contact has changed)\b/.test(text)) {
    return 'contact_change'
  }
  if (/\b(new staff|new worker|someone new|meet.*staff|starting.*shift)\b/.test(text)) {
    return 'new_staff_member'
  }
  if (/\b(hospital|appointment|clinic|doctor|a&e|ae)\b/.test(text)) {
    return 'hospital_appointment'
  }
  if (/\b(bedtime|sleep|night|can't sleep|cant sleep|bed time)\b/.test(text)) {
    return 'bedtime_worries'
  }
  if (/\b(how (they|he|she|I) feel|say how I feel|express.*feel|feelings|communicate.*feel)\b/.test(text)) {
    return 'feelings_expression'
  }
  if (/\b(visual routine|routine board|now.?next|timetable|visual support)\b/.test(text)) {
    return 'visual_routine'
  }
  return 'general'
}

function detectSensitivity(
  prompt: string,
  intent: CommunicateRequestIntent,
  requested?: CommunicationSupportPackSensitivity
): CommunicationSupportPackSensitivity {
  if (requested && requested !== 'routine') return requested
  if (intent === 'safeguarding_disclosure') return 'safeguarding_sensitive'
  const text = normalisePrompt(prompt)
  if (/\b(hospital|health|medication|pain|doctor)\b/.test(text)) return 'health'
  if (/\b(worried|anxious|upset|distress|bedtime|feelings)\b/.test(text)) return 'emotional'
  return requested ?? 'routine'
}

function applyOutputPreference(
  sections: CommunicationSupportPackSectionType[],
  preference: CommunicationOutputPreference
): CommunicationSupportPackSectionType[] {
  switch (preference) {
    case 'easy_read_only':
      return sections.filter((s) => s === 'easy_read' || s === 'staff_guidance' || s === 'recording_prompts')
    case 'visual_support':
      return sections.filter(
        (s) =>
          s === 'visual_cards' ||
          s === 'staff_guidance' ||
          s === 'regulation_support' ||
          s === 'recording_prompts'
      )
    case 'social_story':
      return sections.filter(
        (s) =>
          s === 'social_story' ||
          s === 'staff_guidance' ||
          s === 'regulation_support' ||
          s === 'recording_prompts'
      )
    case 'full_support_pack':
      return sections
    case 'let_orb_choose':
    default:
      return sections
  }
}

function filterOptionalSections(
  sections: CommunicationSupportPackSectionType[],
  request: CommunicationSupportPackRequest
): CommunicationSupportPackSectionType[] {
  let filtered = [...sections]
  if (request.includeVisuals === false) {
    filtered = filtered.filter((s) => s !== 'visual_cards')
  }
  if (request.includeRecordingPrompts === false) {
    filtered = filtered.filter((s) => s !== 'recording_prompts' && s !== 'reflection_draft')
  }
  return filtered.length ? filtered : ['staff_guidance', 'custom_note']
}

export function createCommunicationPlan(request: CommunicationSupportPackRequest): CommunicationPlan {
  const prompt = request.prompt.trim()
  const intent = detectIntent(prompt)
  const sensitivity = detectSensitivity(prompt, intent, request.sensitivity)
  const audience: CommunicationAudience = request.audience ?? 'young_person'
  const safeguardingMode = sensitivity === 'safeguarding_sensitive' || intent === 'safeguarding_disclosure'

  let sectionTypes = [...INTENT_SECTIONS[intent]]
  sectionTypes = applyOutputPreference(sectionTypes, request.outputPreference ?? 'let_orb_choose')
  sectionTypes = filterOptionalSections(sectionTypes, request)

  if (safeguardingMode && !sectionTypes.includes('staff_guidance')) {
    sectionTypes.unshift('staff_guidance')
  }

  return {
    intent,
    sensitivity,
    audience,
    sectionTypes: [...new Set(sectionTypes)],
    safeguardingMode
  }
}

export function safeguardingGuardrailLines(safeguardingMode: boolean): string[] {
  if (!safeguardingMode) return []
  return [
    'Use calm, non-alarming language. Separate observation from interpretation.',
    'Avoid leading or investigative questions. Do not ask “why” where it may suggest blame.',
    'Record exact words, signs, gestures and observable responses — not assumptions.',
    'Prompt escalation under local safeguarding policy and manager review where indicated.',
    'ORB supports preparation and recording. It does not make findings or replace professional judgement.'
  ]
}

export function textContainsLeadingQuestions(text: string): boolean {
  return LEADING_QUESTION_PATTERNS.some((pattern) => pattern.test(text))
}

export function stripLeadingQuestionPhrases(text: string): string {
  let result = text
  for (const pattern of LEADING_QUESTION_PATTERNS) {
    result = result.replace(pattern, 'staff observed')
  }
  return result
}
