/**
 * Safe deterministic local generators for ORB Communicate workflows.
 * Used when backend endpoints are not yet available.
 */

import { INDICARE_SYMBOL_SEED, symbolsForCategories } from './indicare-symbol-seed.ts'
import type {
  CommunicationReflectionOutput,
  CommunicationReflectionRequest,
  EasyReadContext,
  EasyReadOutput,
  EasyReadRequest,
  SocialStoryOutput,
  SocialStoryRequest,
  VisualBoardOutput,
  VisualBoardRequest,
  VisualSymbol
} from './orb-communicate-types.ts'

const CONTEXT_LABELS: Record<EasyReadContext, string> = {
  contact: 'contact with someone important',
  health: 'health and wellbeing',
  safety: 'safety and feeling secure',
  routine: 'daily routine',
  transition: 'a change or transition',
  house_meeting: 'a house meeting',
  complaint: 'raising a concern or complaint',
  safeguarding: 'keeping safe and being listened to',
  behaviour_support: 'support when things feel difficult',
  other: 'something important'
}

const AGE_LABELS = {
  child: 'child',
  young_person: 'young person',
  adult: 'adult'
} as const

function personLabel(request: { personNameOrInitials?: string }, ageGroup?: string): string {
  if (request.personNameOrInitials?.trim()) return request.personNameOrInitials.trim()
  if (ageGroup) return `the ${AGE_LABELS[ageGroup as keyof typeof AGE_LABELS] ?? 'person'}`
  return 'the person'
}

function trimSentence(text: string, maxLen: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLen) return trimmed
  return `${trimmed.slice(0, maxLen - 1).trim()}…`
}

export function generateEasyReadLocal(request: EasyReadRequest): EasyReadOutput {
  const who = personLabel(request, request.ageGroup)
  const topic = request.whatNeedsExplaining.trim() || 'something that needs explaining'
  const contextLabel = CONTEXT_LABELS[request.context]
  const length = request.outputLength

  const commNeeds = request.communicationNeeds?.trim()
  const sensory = request.sensoryConsiderations?.trim()
  const emotional = request.emotionalContext?.trim()

  const detailLevel =
    length === 'short' ? 1 : length === 'detailed' ? 3 : 2

  const whatIsHappening = [
    `This easy-read is about ${contextLabel}.`,
    `${who.charAt(0).toUpperCase() + who.slice(1)} needs to understand: ${topic}.`,
    detailLevel >= 2 && emotional
      ? `It may feel: ${emotional}.`
      : detailLevel >= 2
        ? 'It is okay to have questions.'
        : null
  ]
    .filter(Boolean)
    .join(' ')

  const whyItIsHappening = [
    'Adults want everyone to understand what is happening.',
    detailLevel >= 2 ? `This matters because it affects ${who} and the people who support them.` : null,
    detailLevel >= 3 && commNeeds
      ? `Communication support will be offered in a way that works for ${who}: ${commNeeds}.`
      : detailLevel >= 3
        ? 'Support will be offered at a pace that works for the person.'
        : null
  ]
    .filter(Boolean)
    .join(' ')

  const whatHappensNext = [
    'A trusted adult will explain step by step.',
    detailLevel >= 2 ? 'There will be time to ask questions or take a break.' : null,
    detailLevel >= 3 && sensory
      ? `Sensory needs will be considered: ${sensory}.`
      : detailLevel >= 3
        ? 'Sensory needs will be considered where shared.'
        : null
  ]
    .filter(Boolean)
    .join(' ')

  const whoCanHelp = [
    'Key workers, on-shift staff and trusted adults named in the care plan can help.',
    detailLevel >= 2
      ? 'If something feels unclear, the person can ask again or use their communication support.'
      : null
  ]
    .filter(Boolean)
    .join(' ')

  const howICanSayHowIFeel = [
    'I can use words, signs, symbols or gestures that work for me.',
    'I can ask for space, help or a break.',
    'I can use a card or board to show how I feel.'
  ].slice(0, detailLevel + 1).join(' ')

  const suggestedVisualSymbols = [
    'Help',
    'Wait',
    'Quiet Space',
    request.context === 'transition' || request.context === 'routine' ? 'Change' : 'Yes',
    request.emotionalContext ? 'Worried' : 'Happy'
  ]

  const staffGuidance = [
    'Use plain British English. Keep sentences short.',
    'Distinguish what you observed from what you interpret.',
    'Offer choices and check understanding without leading questions.',
    commNeeds ? `Respect stated communication needs: ${commNeeds}.` : null,
    sensory ? `Consider sensory environment: ${sensory}.` : null,
    request.context === 'safeguarding'
      ? 'Follow local safeguarding procedures. ORB supports preparation; it does not replace professional judgement.'
      : null
  ]
    .filter(Boolean)
    .join(' ')

  const recordingPrompts = [
    'What exact words, signs or gestures did the person use?',
    'What support was offered and what did the person choose?',
    'What appeared to help or not help — based on observable responses?',
    'What will staff do next and who needs to know?'
  ]

  return {
    title: trimSentence(`Easy read: ${topic}`, 80),
    whatIsHappening,
    whyItIsHappening,
    whatHappensNext,
    whoCanHelp,
    howICanSayHowIFeel,
    suggestedVisualSymbols,
    staffGuidance,
    recordingPrompts
  }
}

function pickSymbolsForBoard(request: VisualBoardRequest): VisualSymbol[] {
  const categories: VisualSymbol['category'][] = []
  if (request.includeFeelings) categories.push('feeling')
  if (request.includeYesNoHelpStop) {
    categories.push('response', 'action')
  }
  if (request.includePeoplePlacesTime) {
    categories.push('person', 'place', 'time')
  }
  if (!categories.length) categories.push('support', 'other')

  const pool = symbolsForCategories(categories, {
    safeguardingSensitive: request.safeguardingSensitive ? undefined : false
  })

  const count = request.numberOfCards
  const selected: VisualSymbol[] = []
  const used = new Set<string>()

  for (const symbol of pool) {
    if (selected.length >= count) break
    if (used.has(symbol.id)) continue
    used.add(symbol.id)
    selected.push({
      ...symbol,
      staffNote:
        request.safeguardingSensitive && symbol.safeguardingSensitive
          ? 'Handle with care — follow local safeguarding guidance.'
          : undefined
    })
  }

  while (selected.length < count) {
    const fallback = INDICARE_SYMBOL_SEED[selected.length % INDICARE_SYMBOL_SEED.length]
    if (!used.has(fallback.id)) {
      used.add(fallback.id)
      selected.push({ ...fallback })
    } else {
      break
    }
  }

  return selected
}

export function generateVisualBoardLocal(request: VisualBoardRequest): VisualBoardOutput {
  const purpose = request.boardPurpose.trim() || 'Communication support'
  const cards = pickSymbolsForBoard(request)

  return {
    title: `Visual board: ${trimSentence(purpose, 60)}`,
    purpose,
    cards,
    staffNotes: [
      'These are IndiCare placeholder symbols — not Widgit, Makaton or third-party assets.',
      'Introduce cards at the person’s pace. Model language without pressure.',
      request.safeguardingSensitive
        ? 'Safeguarding-sensitive board — store and share according to local policy.'
        : 'Review regularly with the person and update labels in plain language.'
    ].join(' ')
  }
}

const TONE_INTROS: Record<SocialStoryRequest['tone'], string> = {
  calm: 'This story is written in a calm, steady way.',
  reassuring: 'This story is written to offer reassurance.',
  preparation: 'This story helps prepare for what may happen.',
  repair: 'This story supports understanding after something difficult.'
}

export function generateSocialStoryLocal(request: SocialStoryRequest): SocialStoryOutput {
  const situation = request.situation.trim() || 'a situation that matters'
  const hard = request.whatMayFeelHard?.trim()
  const safe = request.whatHelpsFeelSafe?.trim()
  const choices = request.choicesPersonCanMake?.trim()
  const helpers = request.whoCanHelp?.trim()

  const paragraphs = [
    TONE_INTROS[request.tone],
    `Sometimes ${situation.toLowerCase().startsWith('when') ? situation : `when ${situation}`} things can feel different.`,
    hard ? `It may feel hard because ${hard}.` : 'It is okay if this feels hard sometimes.',
    'Adults will help me understand what is happening.',
    safe ? `What helps me feel safer: ${safe}.` : 'I can ask for help from a trusted adult.',
    choices ? `Choices I can make: ${choices}.` : 'I can ask for space or use my communication support.',
    'I can use my card to say how I feel.',
    helpers ? `People who can help: ${helpers}.` : 'Trusted adults are nearby to help.'
  ]

  return {
    title: trimSentence(`Social story: ${situation}`, 70),
    story: paragraphs.join('\n\n'),
    suggestedSymbols: ['Help', 'Wait', 'Quiet Space', hard ? 'Worried' : 'Happy', 'Finished'],
    staffDeliveryGuidance: [
      'Read in a warm, unhurried voice. Pause between sections.',
      'Avoid compliance-led language such as “I must behave”.',
      'Check understanding with open, non-leading questions.',
      'Record exact words, signs or gestures the person uses in response.'
    ].join(' '),
    regulationSupportOptions: [
      'Offer a quiet space or regulated activity before and after.',
      'Use a visual timetable or now/next board if helpful.',
      'Co-regulate — match pace and reduce demands where needed.'
    ],
    followUpReflectionPrompts: [
      'What appeared to help the person feel understood?',
      'What communication support did they choose?',
      'What should be shared with the wider team?'
    ]
  }
}

export function generateReflectionRecordLocal(
  request: CommunicationReflectionRequest
): CommunicationReflectionOutput {
  const explained = request.whatWasExplained.trim() || 'information shared with the person'
  const support = request.communicationSupportUsed?.trim()
  const response = request.howDidPersonRespond?.trim()
  const exact = request.exactWordsSignsOrGestures?.trim()
  const choices = request.choicesOffered?.trim()
  const helped = request.whatHelped?.trim()
  const notHelped = request.whatDidNotHelp?.trim()
  const concern = request.safeguardingHealthOrRiskConcern?.trim()
  const next = request.whatShouldStaffDoNext?.trim()

  const observationHighlights: string[] = []
  if (response) observationHighlights.push(`Staff observed: ${response}`)
  if (exact) observationHighlights.push(`The person communicated by: ${exact}`)
  if (helped) observationHighlights.push(`What appeared to help: ${helped}`)
  if (notHelped) observationHighlights.push(`What did not appear to help: ${notHelped}`)

  const recordParts = [
    `Staff offered accessible explanation about ${explained}.`,
    support ? `Communication support used: ${support}.` : null,
    response ? `The person appeared to respond by ${response.toLowerCase().replace(/^the person /, '')}.` : null,
    exact ? `They communicated using: “${exact}”.` : null,
    choices ? `Staff offered these choices: ${choices}.` : null,
    helped ? `Support that appeared to help: ${helped}.` : null,
    notHelped ? `Support that did not appear to help: ${notHelped}.` : null,
    concern ? `Safeguarding, health or risk note (factual): ${concern}.` : null,
    next ? `Next steps: ${next}.` : 'The team will review and follow local procedures as needed.'
  ].filter(Boolean)

  return {
    title: 'Communication reflection record',
    record: recordParts.join('\n\n'),
    observationHighlights,
    staffSupportSummary: [
      'Recording is observation-based and person-centred.',
      support ? `Support offered: ${support}.` : 'Support was tailored to the person’s communication preferences where known.'
    ].join(' '),
    nextSteps: next || 'Continue to monitor wellbeing and share relevant information with the on-shift team.',
    recordingReminders: [
      'Distinguish observation from interpretation.',
      'Avoid judgemental labels — describe observable behaviour.',
      'Follow safeguarding and clinical escalation routes where indicated.'
    ]
  }
}

export const EMPTY_MY_VOICE_PROFILE = {
  howICommunicate: '',
  howISayYes: '',
  howISayNo: '',
  howIShowPain: '',
  howIShowAnxiety: '',
  wordsSignsOrSymbolsIUse: '',
  whatIUnderstandWell: '',
  whatIFindHardToUnderstand: '',
  whatHelpsMeProcessInformation: '',
  whatMakesCommunicationHarder: '',
  sensoryNeeds: '',
  trustedAdults: '',
  thingsStaffShouldNotAssume: '',
  preferredCommunicationFormat: 'symbols' as const,
  preferredCommunicationFormatOther: '',
  recordingGuidance: ''
}
