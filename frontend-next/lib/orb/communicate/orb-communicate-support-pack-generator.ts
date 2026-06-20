/**
 * Local Communication Support Pack generator — no backend required.
 * Reuses existing Communicate workflow generators via adapters.
 */

import {
  createCommunicationPlan,
  safeguardingGuardrailLines,
  stripLeadingQuestionPhrases
} from './orb-communicate-plan.ts'
import {
  generateEasyReadLocal,
  generateReflectionRecordLocal,
  generateSocialStoryLocal,
  generateVisualBoardLocal
} from './orb-communicate-generators.ts'
import type {
  CommunicationSupportPackOutput,
  CommunicationSupportPackRequest,
  CommunicationSupportPackSection,
  CommunicationSupportPackSectionType,
  EasyReadContext,
  MyVoiceProfile
} from './orb-communicate-types.ts'

function sectionId(type: CommunicationSupportPackSectionType, index: number): string {
  return `${type}-${index}`
}

function defaultSectionActions(
  type: CommunicationSupportPackSectionType,
  includeVisualActions: boolean
): CommunicationSupportPackSection['actions'] {
  const base: CommunicationSupportPackSection['actions'] = [
    'copy_section',
    'edit_section',
    'regenerate_section'
  ]
  if (type === 'visual_cards' && includeVisualActions) {
    return [...base, 'create_image', 'replace_image', 'save_to_library', 'personalise_for_person']
  }
  return base
}

function profileHasContent(profile: MyVoiceProfile | null | undefined): boolean {
  if (!profile) return false
  return Boolean(
    profile.howICommunicate.trim() ||
      profile.wordsSignsOrSymbolsIUse.trim() ||
      profile.whatHelpsMeProcessInformation.trim()
  )
}

function profileAdaptationNote(profile: MyVoiceProfile): string {
  const parts: string[] = []
  if (profile.howICommunicate.trim()) {
    parts.push(`Communication style: ${profile.howICommunicate.trim()}`)
  }
  if (profile.howISayYes.trim() || profile.howISayNo.trim()) {
    parts.push(
      `Yes/no presentation: yes — ${profile.howISayYes.trim() || 'not recorded'}; no — ${profile.howISayNo.trim() || 'not recorded'}`
    )
  }
  if (profile.wordsSignsOrSymbolsIUse.trim()) {
    parts.push(`Preferred words, signs or symbols: ${profile.wordsSignsOrSymbolsIUse.trim()}`)
  }
  if (profile.preferredCommunicationFormat) {
    parts.push(`Format preference: ${profile.preferredCommunicationFormat.replace('_', ' ')}`)
  }
  if (profile.whatHelpsMeProcessInformation.trim()) {
    parts.push(`Processing support: ${profile.whatHelpsMeProcessInformation.trim()}`)
  }
  if (profile.sensoryNeeds.trim()) {
    parts.push(`Sensory needs: ${profile.sensoryNeeds.trim()}`)
  }
  if (profile.trustedAdults.trim()) {
    parts.push(`Trusted adults: ${profile.trustedAdults.trim()}`)
  }
  if (profile.thingsStaffShouldNotAssume.trim()) {
    parts.push(`Do not assume: ${profile.thingsStaffShouldNotAssume.trim()}`)
  }
  if (profile.howIShowAnxiety.trim() || profile.howIShowPain.trim()) {
    parts.push(
      `Distress or pain signals: ${[profile.howIShowAnxiety.trim(), profile.howIShowPain.trim()].filter(Boolean).join('; ')}`
    )
  }
  return parts.join('\n')
}

function easyReadContextForIntent(intent: CommunicationSupportPackOutput['intent']): EasyReadContext {
  switch (intent) {
    case 'contact_change':
      return 'contact'
    case 'hospital_appointment':
      return 'health'
    case 'safeguarding_disclosure':
      return 'safeguarding'
    case 'bedtime_worries':
    case 'feelings_expression':
      return 'behaviour_support'
    case 'new_staff_member':
      return 'transition'
    default:
      return 'routine'
  }
}

function buildEasyReadSection(
  request: CommunicationSupportPackRequest,
  plan: ReturnType<typeof createCommunicationPlan>,
  profileNote: string
): CommunicationSupportPackSection {
  const output = generateEasyReadLocal({
    ageGroup: plan.audience,
    whatNeedsExplaining: request.prompt,
    context: easyReadContextForIntent(plan.intent),
    outputLength: 'standard',
    communicationNeeds: profileNote || undefined,
    emotionalContext: plan.sensitivity === 'emotional' ? 'May feel worried or unsettled' : undefined
  })

  const content = [
    `What is happening\n${output.whatIsHappening}`,
    `\nWhy it is happening\n${output.whyItIsHappening}`,
    `\nWhat happens next\n${output.whatHappensNext}`,
    `\nWho can help\n${output.whoCanHelp}`,
    `\nHow I can say how I feel\n${output.howICanSayHowIFeel}`
  ].join('\n')

  return {
    id: sectionId('easy_read', 0),
    type: 'easy_read',
    heading: 'Easy read explanation',
    description: 'Plain-language explanation in short, accessible British English.',
    content: stripLeadingQuestionPhrases(content),
    actions: defaultSectionActions('easy_read', false)
  }
}

function buildVisualCardsSection(
  request: CommunicationSupportPackRequest,
  plan: ReturnType<typeof createCommunicationPlan>
): CommunicationSupportPackSection {
  const safeguarding = plan.safeguardingMode
  const output = generateVisualBoardLocal({
    boardPurpose: request.prompt.slice(0, 120) || 'Communication support',
    numberOfCards: 6,
    includeFeelings: true,
    includeYesNoHelpStop: true,
    includePeoplePlacesTime: plan.intent === 'contact_change' || plan.intent === 'new_staff_member',
    safeguardingSensitive: safeguarding
  })

  const content = [
    output.purpose,
    '',
    'Consistent accessible visuals that can be personalised around the way each person communicates.',
    '',
    output.staffNotes
  ].join('\n')

  return {
    id: sectionId('visual_cards', 0),
    type: 'visual_cards',
    heading: 'Visual support cards',
    description: 'Placeholder visual cards for feelings, choices and support — personalise before use.',
    content,
    visualCards: output.cards,
    actions: defaultSectionActions('visual_cards', true)
  }
}

function buildSocialStorySection(request: CommunicationSupportPackRequest): CommunicationSupportPackSection {
  const output = generateSocialStoryLocal({
    situation: request.prompt,
    tone: 'reassuring',
    whatMayFeelHard: 'things may feel different or unfamiliar',
    whatHelpsFeelSafe: 'trusted adults nearby and time to process',
    choicesPersonCanMake: 'ask for space, help or a break',
    whoCanHelp: 'key workers and on-shift staff'
  })

  return {
    id: sectionId('social_story', 0),
    type: 'social_story',
    heading: 'Social story',
    description: 'A respectful story to prepare, reassure or support understanding.',
    content: stripLeadingQuestionPhrases(output.story),
    actions: defaultSectionActions('social_story', false)
  }
}

function buildStaffGuidanceSection(
  request: CommunicationSupportPackRequest,
  plan: ReturnType<typeof createCommunicationPlan>,
  profileNote: string
): CommunicationSupportPackSection {
  const lines = [
    'Use plain British English. Keep sentences short and dignified.',
    'Distinguish what staff observed from what staff interpret.',
    'Offer choices and check understanding without leading questions.',
    'Use language such as “appeared to understand because…”, “communicated by…” and “staff observed…”.',
    'Avoid judgemental labels — describe observable behaviour instead.',
    profileNote ? `\nMy Voice Profile considerations:\n${profileNote}` : null,
    ...safeguardingGuardrailLines(plan.safeguardingMode)
  ].filter(Boolean)

  return {
    id: sectionId('staff_guidance', 0),
    type: 'staff_guidance',
    heading: 'Staff guidance',
    description: 'How to deliver this support safely and person-centred.',
    content: lines.join('\n'),
    actions: defaultSectionActions('staff_guidance', false)
  }
}

function buildRegulationSection(request: CommunicationSupportPackRequest): CommunicationSupportPackSection {
  const story = generateSocialStoryLocal({
    situation: request.prompt,
    tone: 'calm',
    whatHelpsFeelSafe: 'quiet space, predictable routines and co-regulation from trusted adults'
  })

  return {
    id: sectionId('regulation_support', 0),
    type: 'regulation_support',
    heading: 'Regulation support',
    description: 'Calm options to support emotional regulation before, during and after.',
    content: [
      'Offer a quiet space or regulated activity before and after communication support.',
      'Use now/next or visual timetable cues if helpful.',
      'Co-regulate — match pace and reduce demands where needed.',
      'Visuals should support understanding, dignity, choice and communication — not control, shame or punishment.',
      '',
      ...story.regulationSupportOptions.map((line) => `• ${line}`)
    ].join('\n'),
    actions: defaultSectionActions('regulation_support', false)
  }
}

function buildRecordingPromptsSection(
  request: CommunicationSupportPackRequest,
  plan: ReturnType<typeof createCommunicationPlan>
): CommunicationSupportPackSection {
  const easyRead = generateEasyReadLocal({
    ageGroup: plan.audience,
    whatNeedsExplaining: request.prompt,
    context: easyReadContextForIntent(plan.intent),
    outputLength: 'short'
  })

  const prompts = [...easyRead.recordingPrompts]
  if (plan.safeguardingMode) {
    prompts.push(
      'What exact words, signs or gestures did the person use — recorded factually?',
      'Who has been informed under local safeguarding policy?',
      'What manager or safeguarding lead review is needed before sharing further?'
    )
  }

  const safePrompts = prompts.map((line) => stripLeadingQuestionPhrases(line))

  return {
    id: sectionId('recording_prompts', 0),
    type: 'recording_prompts',
    heading: 'Recording prompts',
    description: 'Observation-based prompts for safer evidence after communication support.',
    content: safePrompts.map((line) => `• ${line}`).join('\n'),
    actions: defaultSectionActions('recording_prompts', false)
  }
}

function buildReflectionDraftSection(
  request: CommunicationSupportPackRequest,
  plan: ReturnType<typeof createCommunicationPlan>
): CommunicationSupportPackSection {
  const output = generateReflectionRecordLocal({
    whatWasExplained: request.prompt,
    communicationSupportUsed: 'accessible explanation and visual support from ORB Communicate',
    howDidPersonRespond: 'staff to record observable response after delivery',
    safeguardingHealthOrRiskConcern: plan.safeguardingMode
      ? 'Record factual concerns only. Follow local safeguarding procedures.'
      : undefined,
    whatShouldStaffDoNext: plan.safeguardingMode
      ? 'Share with manager or safeguarding lead under local policy. Do not investigate.'
      : 'Review with on-shift team and update records as appropriate.'
  })

  return {
    id: sectionId('reflection_draft', 0),
    type: 'reflection_draft',
    heading: 'Reflection draft',
    description: 'Starter wording for a factual communication reflection record.',
    content: stripLeadingQuestionPhrases(output.record),
    actions: defaultSectionActions('reflection_draft', false)
  }
}

function buildCustomNoteSection(notice: string): CommunicationSupportPackSection {
  return {
    id: sectionId('custom_note', 0),
    type: 'custom_note',
    heading: 'Support note',
    description: 'Additional context for this support pack.',
    content: notice,
    actions: defaultSectionActions('custom_note', false)
  }
}

const SECTION_BUILDERS: Record<
  CommunicationSupportPackSectionType,
  (
    request: CommunicationSupportPackRequest,
    plan: ReturnType<typeof createCommunicationPlan>,
    profileNote: string
  ) => CommunicationSupportPackSection
> = {
  easy_read: (request, plan, profileNote) => buildEasyReadSection(request, plan, profileNote),
  visual_cards: (request, plan) => buildVisualCardsSection(request, plan),
  social_story: (request) => buildSocialStorySection(request),
  staff_guidance: (request, plan, profileNote) => buildStaffGuidanceSection(request, plan, profileNote),
  regulation_support: (request) => buildRegulationSection(request),
  recording_prompts: (request, plan) => buildRecordingPromptsSection(request, plan),
  reflection_draft: (request, plan) => buildReflectionDraftSection(request, plan),
  custom_note: (_request, _plan, profileNote) =>
    buildCustomNoteSection(profileNote || 'Review this support pack before use with the person.')
}

const INTENT_TITLES: Record<CommunicationSupportPackOutput['intent'], string> = {
  contact_change: 'Contact change support pack',
  new_staff_member: 'New staff member support pack',
  hospital_appointment: 'Hospital appointment support pack',
  bedtime_worries: 'Bedtime worries support pack',
  feelings_expression: 'Feelings and expression support pack',
  safeguarding_disclosure: 'Safeguarding-sensitive support pack',
  visual_routine: 'Visual routine support pack',
  general: 'Communication support pack'
}

export function generateCommunicationSupportPack(
  request: CommunicationSupportPackRequest
): CommunicationSupportPackOutput {
  const plan = createCommunicationPlan(request)
  const useProfile = request.useMyVoiceProfile !== false
  const profile = useProfile ? request.myVoiceProfile ?? null : null
  const profileActive = profileHasContent(profile)
  const profileNote = profileActive && profile ? profileAdaptationNote(profile) : ''

  const sections = plan.sectionTypes.map((type, index) => {
    const built = SECTION_BUILDERS[type](request, plan, profileNote)
    return { ...built, id: sectionId(type, index) }
  })

  const safetyNotes = [
    'Review all wording before use. Adapt language to the person’s communication profile.',
    'Visuals support understanding and dignity — they must not shame, threaten, frighten, punish or control.',
    ...safeguardingGuardrailLines(plan.safeguardingMode)
  ]

  const suggestedActions = [
    'Deliver support at the person’s pace with choices offered throughout.',
    profileActive
      ? 'Use My Voice Profile cues when modelling language and recording responses.'
      : 'Consider creating or updating My Voice Profile for more tailored support.',
    plan.safeguardingMode
      ? 'Share safeguarding-sensitive material only with those authorised under local policy.'
      : 'Record observable responses after support using the recording prompts.',
    'Start Reflect & Record when wording is ready for adult review.'
  ]

  return {
    packTitle: INTENT_TITLES[plan.intent],
    intent: plan.intent,
    sensitivity: plan.sensitivity,
    audience: plan.audience,
    sections,
    suggestedActions,
    safetyNotes,
    myVoiceProfileUsed: profileActive,
    myVoiceProfileNotice: useProfile && !profileActive
      ? 'No My Voice Profile found yet. You can still create this support pack and add profile details later.'
      : undefined,
    createdAt: new Date().toISOString()
  }
}
