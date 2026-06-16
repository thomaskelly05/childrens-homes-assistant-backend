/**
 * Therapeutic / person-centred writing metadata for core recording templates.
 * Merged into canonical `orb-recording-framework` at load time — not a duplicate template source.
 *
 * Developer note: Dictate, Write, Chat and Voice all consume this via
 * `orb-recording-framework.ts` → `buildOrbRecordingBrainContext`. Section scaffolds live in
 * `orb-recording-section-prompts.ts`. Backend mirror: `services/orb_therapeutic_language_contract_service.py`.
 */

import type { OrbRecordingRecordTypeId } from '@/lib/orb/recording/orb-recording-types'

export type OrbTherapeuticWritingFramework = {
  writing_guidance: string
  therapeutic_prompts: string[]
  person_centred_prompts: string[]
  child_voice_prompts: string[]
  trauma_informed_prompts: string[]
  neutral_factual_prompts: string[]
  what_to_avoid: string[]
  quality_checks: string[]
  safeguarding_checks: string[]
  manager_oversight_checks: string[]
  spelling_grammar_reminder: string
  writing_style_ids: string[]
}

/** Deterministic avoid → prefer map for residential record language (not robotic sanitisation). */
export const ORB_THERAPEUTIC_LANGUAGE_MAP: ReadonlyArray<{
  avoid: string
  prefer: string
  note?: string
}> = [
  { avoid: 'manipulative', prefer: 'behaviour that may have communicated an unmet need' },
  { avoid: 'attention-seeking', prefer: 'communicating distress or an unmet need' },
  { avoid: 'attention seeking', prefer: 'communicating distress or an unmet need' },
  { avoid: 'kicked off', prefer: 'became distressed / presented as dysregulated' },
  { avoid: 'refused for no reason', prefer: 'was not ready to / found it difficult to' },
  {
    avoid: 'aggressive',
    prefer: 'showed behaviour that staff observed and responded to',
    note: 'Use only when clearly observable and necessary for safeguarding accuracy'
  },
  { avoid: 'non-compliant', prefer: 'found it difficult to follow the request at that time' },
  { avoid: 'absconded', prefer: 'went missing from the home / left the home', note: 'Use contextually accurate wording' },
  { avoid: 'chose to behave', prefer: 'behaviour occurred / may have been communicating' },
  { avoid: 'deliberately caused', prefer: 'it is not clear from the information provided' },
  { avoid: 'bad behaviour', prefer: 'behaviour that staff supported / observed behaviour' },
  { avoid: 'lying', prefer: "the child's account differed from… / it is not clear from the information provided", note: 'Unless directly quoting with context' },
  { avoid: 'making allegations', prefer: 'shared concerns / disclosed', note: 'Unless contextually appropriate for safeguarding records' },
  {
    avoid: 'no safeguarding concern',
    prefer: 'no immediate safeguarding indicators reported — responsible adult to review',
    note: 'ORB does not determine safeguarding thresholds'
  },
  {
    avoid: 'no further action needed',
    prefer: 'follow-up to be confirmed by responsible adult',
    note: 'Do not close safeguarding pathways without management review'
  }
]

export const ORB_STRUCTURED_OUTPUT_GUIDANCE = {
  useTablesFor: [
    'action plans',
    'chronologies',
    'comparison reviews',
    'audit findings',
    'evidence matrices',
    'Regulation 44/45 preparation',
    'task/risk handovers where useful',
    'management oversight actions'
  ],
  useNarrativeFor: [
    'daily records',
    'incident reflections',
    'key-work summaries',
    'behaviour reflections',
    'safeguarding reflections (unless an action/escalation table is needed)'
  ],
  useChecklistsFor: [
    'missing information',
    'review questions',
    'manager follow-up',
    'preparation tasks'
  ],
  useChartsOnlyWhen:
    'numerical data exists, the user asks for trends/counts, or a chart would clarify — never invent data'
} as const

export const ORB_MISSING_INFORMATION_GUIDANCE = {
  tone: 'calm, professional, supportive — not judgemental',
  placeholders: ['not provided', 'not clear from the information given', 'to be confirmed'],
  reflectivePrompts: [
    'What happened before?',
    'What did the child say or communicate?',
    'What did adults do first to support, reassure or de-escalate?',
    'How did adults preserve dignity, safety and relationship?',
    'Was anyone informed?',
    'Is follow-up or management oversight needed?'
  ],
  rules: [
    'If details are missing, say what may need checking — do not invent missing details.',
    'Preserve uncertainty where information is missing.',
    'Separate known facts from interpretation and from gaps.',
    'Record behaviour as communication where appropriate.',
    'Name adult actions specifically — how staff listened, what was offered, de-escalation and repair.',
    'Avoid vague “staff supported”, “staff managed” or “staff dealt with it” unless specific actions follow.',
    'If adult response is missing, prompt for it rather than fabricating actions.',
    'Reframe judgemental rough-note wording into observable, respectful language.',
    'Avoid labels such as manipulative, attention-seeking or kicked off.',
    'Include outcome and next steps where known.'
  ]
} as const

const SHARED_PROMPTS = {
  child_voice: [
    'What did the child say, show or communicate?',
    "Is the child's voice and presentation visible?",
    'What was the child\'s experience before, during and after adult support?',
    'Were wishes, feelings or views known, unknown or still to be sought?',
    'What was the impact for the child?'
  ],
  therapeutic: [
    'What might this behaviour be communicating?',
    'What did adults do to help the child feel safe?',
    'What did adults do first — listening, reassurance, space, choice or repair?',
    'Have we avoided blame, shame or judgemental wording?'
  ],
  factual: [
    'Have we recorded observable facts before interpretation?',
    'Are times, dates and adults named where known?'
  ],
  follow_up: ['What follow-up is needed?'],
  quality: [
    'Have we checked spelling, names, times and dates before finalising?',
    'Would this record stand up to inspection and safeguarding review?'
  ],
  avoid: [
    'Blame, shame or judgemental labels',
    'Speculation presented as fact',
    'Changing direct quotes without adult approval',
    'Manipulative, attention-seeking, kicked off, non-compliant, bad behaviour',
    'Vague staff supported / staff managed / staff dealt with it without specific adult actions',
    'No safeguarding concern / no further action needed without responsible adult review',
    'ORB making safeguarding or compliance decisions',
    'Diagnosis unless from an appropriate professional source',
    'Claims of compliance or Inspection evidence preparation'
  ],
  spelling: 'Before finalising, ORB will help check spelling, grammar, names, times and dates.'
}

function framework(
  partial: Partial<OrbTherapeuticWritingFramework> & Pick<OrbTherapeuticWritingFramework, 'writing_guidance'>
): OrbTherapeuticWritingFramework {
  return {
    therapeutic_prompts: SHARED_PROMPTS.therapeutic,
    person_centred_prompts: [
      'What matters to the child in this situation?',
      'How did we preserve dignity and respect?'
    ],
    child_voice_prompts: SHARED_PROMPTS.child_voice,
    trauma_informed_prompts: [
      'What might past trauma be communicating through this presentation?',
      'Did we respond in a way that helps the child feel safe and regulated?'
    ],
    neutral_factual_prompts: SHARED_PROMPTS.factual,
    what_to_avoid: SHARED_PROMPTS.avoid,
    quality_checks: SHARED_PROMPTS.quality,
    safeguarding_checks: ['Are safeguarding implications clear and escalated if needed?'],
    manager_oversight_checks: ['Is manager oversight and follow-up documented?'],
    spelling_grammar_reminder: SHARED_PROMPTS.spelling,
    writing_style_ids: ['child_centred', 'therapeutic', 'factual', 'professional', 'safeguarding_aware'],
    ...partial
  }
}

export const ORB_THERAPEUTIC_WRITING_BY_RECORD_TYPE: Partial<
  Record<
    OrbRecordingRecordTypeId | 'action_plan' | 'policy_change_summary' | 'statement_of_purpose_review',
    OrbTherapeuticWritingFramework
  >
> = {
  general_dictation: framework({
    writing_guidance:
      'Turn rough notes into clear professional language — observable facts, respectful tone, child impact where relevant.',
    therapeutic_prompts: [...SHARED_PROMPTS.therapeutic, 'Is professional judgement visible without over-interpreting?'],
    writing_style_ids: ['professional', 'factual', 'child_centred', 'concise']
  }),
  daily_record: framework({
    writing_guidance:
      'Child-centred shift record — presentation, voice, staff response and outcome with times and observable facts.',
    person_centred_prompts: [
      'How was the child feeling and presenting?',
      'What went well for the child today?'
    ],
    quality_checks: [
      "Child's presentation documented?",
      'Meaningful interactions and routines included?',
      "Child's voice, wishes or feelings present?",
      'Positives and concerns balanced?',
      'Follow-up for next shift clear?'
    ],
    writing_style_ids: ['child_centred', 'therapeutic', 'factual', 'professional']
  }),
  incident_report: framework({
    writing_guidance:
      'Chronological, factual incident reflection — context, child voice, de-escalation, harm, notifications, repair. Non-blaming.',
    trauma_informed_prompts: [
      'What might dysregulation have been communicating?',
      'What helped the child return to safety?'
    ],
    quality_checks: [
      'Context before incident recorded?',
      'Observable behaviour separated from interpretation?',
      'Adult response and de-escalation documented?',
      'Harm, injury or damage stated factually?',
      'Notifications and management oversight clear?'
    ],
    safeguarding_checks: [
      'Safeguarding meaning documented?',
      'Notifications and manager oversight clear?'
    ],
    writing_style_ids: ['factual', 'safeguarding_aware', 'therapeutic', 'professional']
  }),
  missing_from_home_record: framework({
    writing_guidance:
      'Factual timeline, return conversation, contextual safeguarding — non-judgemental, exploitation-aware.',
    trauma_informed_prompts: [
      'How did we welcome the child back without shame?',
      'What contextual safeguarding indicators are present?'
    ],
    writing_style_ids: ['factual', 'safeguarding_aware', 'therapeutic', 'child_centred']
  }),
  safeguarding_concern: framework({
    writing_guidance:
      'Facts-led safeguarding reflection — child words in quotes, immediate safety, decision rationale, escalation pathway.',
    quality_checks: [
      'Factual concern without minimisation?',
      'Immediate safety and what is known/unknown separated?',
      "Child's voice recorded respectfully?",
      'Policy actions and who was informed documented?',
      'Further escalation or management oversight identified?'
    ],
    safeguarding_checks: [
      'Immediate safety actions documented?',
      'DSL / manager informed?',
      'Decision rationale clear?'
    ],
    what_to_avoid: [...SHARED_PROMPTS.avoid, 'Leading questions or conclusions before investigation', 'Minimising or downplaying concern'],
    writing_style_ids: ['factual', 'safeguarding_aware', 'child_centred']
  }),
  physical_intervention: framework({
    writing_guidance:
      'Objective sequence, least-restrictive language, injury check, debrief, notifications — proportionality clear.',
    trauma_informed_prompts: [
      'How did we repair relationship after the intervention?',
      'Was debrief offered and documented?'
    ],
    writing_style_ids: ['factual', 'safeguarding_aware', 'professional']
  }),
  key_work_session: framework({
    writing_guidance:
      'Strengths-based, child-led direct work — purpose, engagement, outcomes, plan link.',
    therapeutic_prompts: [
      'What strengths did the child show?',
      'How did the child participate in the session?'
    ],
    writing_style_ids: ['therapeutic', 'child_centred', 'factual']
  }),
  manager_summary: framework({
    writing_guidance:
      'Fact-led manager oversight — professional curiosity, child experience, clear actions with owners and dates.',
    manager_oversight_checks: [
      'Actions have owners and timescales?',
      'Child experience reflected in oversight?'
    ],
    writing_style_ids: ['manager_summary', 'professional', 'inspection_ready']
  }),
  chronology_entry: framework({
    writing_guidance: 'Concise, dated, significance and child impact explicit — chronology-worthy events only.',
    writing_style_ids: ['factual', 'concise', 'child_centred']
  }),
  handover: framework({
    writing_guidance: 'Concise risk-focused handover — presentation, risks, actions for incoming team.',
    quality_checks: [
      "Child's current presentation clear?",
      'Risks or vulnerabilities highlighted without alarm?',
      'What helped and what to avoid/monitor included?',
      'Safeguarding or management notes passed on?'
    ],
    writing_style_ids: ['concise', 'professional', 'safeguarding_aware']
  }),
  action_plan: framework({
    writing_guidance: 'Practical actions with owners, timescales, review dates — linked to evidence from records or comparison.',
    quality_checks: [
      'Each action has a responsible person?',
      'Timescale and evidence of completion defined?',
      'Review date included?',
      'Desired outcome for the child linked?'
    ],
    manager_oversight_checks: ['Each action has an owner and review point?'],
    writing_style_ids: ['professional', 'manager_summary', 'concise']
  }),
  behaviour_reflection: framework({
    writing_guidance:
      'Reflect on behaviour as possible communication — context, adult response, learning. Non-blaming, trauma-informed.',
    therapeutic_prompts: [
      'What might this behaviour have been communicating?',
      'What unmet need may have been present?',
      'How did adults respond to help the child feel safe?'
    ],
    quality_checks: [
      'Behaviour described observably without labels?',
      'Context and possible unmet need explored?',
      'Adult response and what helped/escalated recorded?',
      'Outcome and learning for future support included?'
    ],
    trauma_informed_prompts: [
      'What context or triggers preceded the behaviour?',
      'What helped regulation or repair afterwards?'
    ],
    writing_style_ids: ['therapeutic', 'child_centred', 'factual', 'professional']
  }),
  supervision_preparation: framework({
    writing_guidance:
      'Honest preparation for supervision — practice reflection, child-centred concerns, support needed.',
    person_centred_prompts: [
      'Which child-centred concerns need supervisor attention?',
      'What support do you need to practise safely?'
    ],
    writing_style_ids: ['therapeutic', 'professional', 'reflective']
  }),
  reg_44_evidence_summary: framework({
    writing_guidance: 'Balanced evidence summary — child experience, strengths, development areas, actions from visit.',
    writing_style_ids: ['inspection_ready', 'child_centred', 'professional']
  }),
  reg_45_reflection: framework({
    writing_guidance: 'Reflective learning — what went well, improvements, child impact, non-defensive tone.',
    therapeutic_prompts: ['What will we do differently for children as a result?'],
    writing_style_ids: ['therapeutic', 'inspection_ready', 'manager_summary']
  }),
  statement_of_purpose_review: framework({
    writing_guidance:
      'Summarise Statement of Purpose intent, practice alignment, gaps and actions — based only on provided text.',
    writing_style_ids: ['inspection_ready', 'professional', 'factual']
  }),
  policy_change_summary: framework({
    writing_guidance:
      'Summarise policy changes in plain English — what changed, practice impact, staff briefing points, actions.',
    writing_style_ids: ['easy_read_briefing', 'professional', 'factual', 'safeguarding_aware']
  })
}

export function therapeuticWritingForRecordType(
  recordTypeId: string
): OrbTherapeuticWritingFramework | undefined {
  return ORB_THERAPEUTIC_WRITING_BY_RECORD_TYPE[recordTypeId as OrbRecordingRecordTypeId]
}

export function allTherapeuticPrompts(recordTypeId: string): string[] {
  const fw = therapeuticWritingForRecordType(recordTypeId)
  if (!fw) return [...SHARED_PROMPTS.child_voice, ...SHARED_PROMPTS.therapeutic, ...SHARED_PROMPTS.factual]
  return [
    ...fw.person_centred_prompts,
    ...fw.child_voice_prompts,
    ...fw.therapeutic_prompts,
    ...fw.neutral_factual_prompts,
    ...fw.trauma_informed_prompts
  ]
}

/** Compact prompt block for ORB brain — therapeutic language, gaps and format rules. */
export function buildTherapeuticWritingPromptBlock(recordTypeId: string): string {
  const fw = therapeuticWritingForRecordType(recordTypeId)
  const lines = [
    'Therapeutic recording guidance:',
    fw?.writing_guidance ?? 'Child-centred, factual, respectful residential recording.',
    '',
    'Language — avoid → prefer:',
    ...ORB_THERAPEUTIC_LANGUAGE_MAP.slice(0, 8).map((row) => `• ${row.avoid} → ${row.prefer}`),
    '',
    'Missing information:',
    ...ORB_MISSING_INFORMATION_GUIDANCE.rules.map((rule) => `• ${rule}`),
    'Reflective prompts if gaps remain:',
    ...ORB_MISSING_INFORMATION_GUIDANCE.reflectivePrompts.map((prompt) => `• ${prompt}`)
  ]
  if (fw?.what_to_avoid?.length) {
    lines.push('', 'What to avoid in final records:', ...fw.what_to_avoid.map((item) => `• ${item}`))
  }
  if (fw?.safeguarding_checks?.length) {
    lines.push('', 'Safeguarding checks for this record type:', ...fw.safeguarding_checks.map((item) => `• ${item}`))
  }
  return lines.join('\n').trim()
}

export function structuredFormatHintForRecordType(recordTypeId: string): 'table' | 'narrative' | 'mixed' {
  switch (recordTypeId) {
    case 'action_plan':
    case 'chronology_entry':
    case 'reg_44_evidence_summary':
    case 'reg_45_reflection':
      return 'table'
    case 'handover':
    case 'manager_summary':
    case 'safeguarding_concern':
      return 'mixed'
    default:
      return 'narrative'
  }
}
