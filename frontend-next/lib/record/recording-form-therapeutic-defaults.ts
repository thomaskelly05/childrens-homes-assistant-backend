/** Universal therapeutic / child-centred prompts for every recording form. */

export const UNIVERSAL_THERAPEUTIC_PROMPTS = [
  'What happened?',
  'What was the child communicating?',
  'What did adults notice?',
  'What did adults do to help?',
  'What helped?',
  'What did not help?',
  'What does the child say / feel / want?',
  'What is the follow-up?',
  'Does this affect a plan or risk assessment?',
  'Does this need manager or safeguarding review?'
] as const

export const THERAPEUTIC_LANGUAGE_GUIDANCE = [
  'Use factual, non-judgemental language',
  'Describe behaviour and context — avoid blame',
  'Include the adult response and repair/restoration where relevant',
  'Trauma-informed and child-centred wording',
  'Separate facts from adult interpretation'
] as const

export const CHILD_VOICE_SECTION_PROMPT =
  'What did the child say, show, communicate or express? Include wishes and feelings where known.'

export const ADULT_RESPONSE_SECTION_PROMPT =
  'What did adults notice and do to help? Include de-escalation, co-regulation, procedures followed and repair.'

export const ACTIONS_FOLLOW_UP_PROMPT =
  'What follow-up, actions or notifications are needed? Who is responsible and by when?'

export const PLAN_IMPACT_CHECK_PROMPT =
  'Does this affect a care plan, risk assessment, behaviour support plan, health or education plan?'

export const EVENT_DATE_GUIDANCE =
  'Record the date the event happened, not just the date you are writing it.'

export function therapeuticPromptsForForm(formId: string, formTitle: string): string[] {
  const base = [...UNIVERSAL_THERAPEUTIC_PROMPTS]
  const specific = FORM_SPECIFIC_PROMPTS[formId]
  if (specific?.length) {
    return [...specific.slice(0, 4), ...base.slice(0, 6)]
  }
  return [
    `What should this ${formTitle.toLowerCase()} capture?`,
    ...base.slice(0, 8)
  ]
}

const FORM_SPECIFIC_PROMPTS: Record<string, string[]> = {
  'daily-note': [
    'What did the young person experience today?',
    'What support did adults offer?',
    'What strengths or progress can be noted?'
  ],
  incident: ['What was seen or heard?', 'How did adults respond?', 'What repair or follow-up is needed?'],
  'safeguarding-concern': [
    'What was noticed, said, seen or disclosed?',
    'Who was informed?',
    'What immediate safety action was taken?'
  ],
  'physical-intervention': [
    'What de-escalation was attempted?',
    'How long did the intervention last?',
    'Was debrief and repair offered?'
  ],
  'missing-episode': ['When was absence first noticed?', 'Who was informed?', 'What happened on return?'],
  'return-conversation': [
    'Was return interview offered?',
    'What did the young person say about return?',
    'What support was agreed?'
  ],
  'medication-error': [
    'What medication activity took place?',
    'Any error, refusal or missed dose?',
    'Who was informed and what follow-up?'
  ],
  'reg44-evidence': [
    'Which quality theme does this support?',
    'What improvement action is needed?'
  ],
  'reg45-evidence': [
    'What evidence does this provide about quality of care?',
    'Which standard does it support?'
  ]
}
