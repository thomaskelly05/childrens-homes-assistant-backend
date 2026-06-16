/**
 * Internal ORB Residential output quality audit — realistic scenarios and structural checks.
 * Tests prompt/rule construction deterministically; does not require live LLM calls.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ORB_RECORD_TYPE_QUALITY_EXPECTATIONS,
  buildSectionPromptBody,
  sectionPromptsForRecordType
} from './orb-recording-section-prompts.ts'
import {
  ORB_THERAPEUTIC_LANGUAGE_MAP,
  buildTherapeuticWritingPromptBlock,
  structuredFormatHintForRecordType,
  therapeuticWritingForRecordType
} from './orb-therapeutic-writing.ts'

const _dir = dirname(fileURLToPath(import.meta.url))
const frameworkJson = JSON.parse(
  readFileSync(join(_dir, 'orb-recording-framework.json'), 'utf8')
) as {
  record_types: Array<{
    id: string
    label: string
    required_sections: string[]
    missing_evidence_checks: string[]
    safeguarding_checks: string[]
    professional_language_guidance: string
  }>
}

function getRecordType(id: string) {
  return frameworkJson.record_types.find((row) => row.id === id)
}

export type OrbOutputQualityFixture = {
  recordTypeId: string
  label: string
  roughInput: string
  expectedSectionThemes: string[]
  expectedQualityThemes: string[]
  expectedSafetyPrompts: string[]
  unsafePhrases: string[]
  structuredFormat?: 'table' | 'narrative' | 'mixed'
}

/** Realistic messy staff notes — short, incomplete, emotionally loaded where appropriate. */
export const ORB_OUTPUT_QUALITY_FIXTURES: OrbOutputQualityFixture[] = [
  {
    recordTypeId: 'daily_record',
    label: 'Daily Record',
    roughInput:
      'quiet morning. didnt want breakfast. said school is rubbish. played fifa later seemed ok. meds given. no contact today',
    expectedSectionThemes: ['presentation', 'interaction', 'voice', 'follow-up'],
    expectedQualityThemes: ['child', 'routine', 'positive'],
    expectedSafetyPrompts: ['not clear', 'not provided', 'follow-up'],
    unsafePhrases: ['manipulative', 'attention-seeking', 'kicked off'],
    structuredFormat: 'narrative'
  },
  {
    recordTypeId: 'incident_report',
    label: 'Incident Reflection',
    roughInput:
      'after contact kicked off in lounge. threw cushion. staff calmed him. small mark on arm? manager called. settled after 20 mins',
    expectedSectionThemes: ['before', 'observed', 'de-escalation', 'harm', 'notification'],
    expectedQualityThemes: ['context', 'adult response', 'safeguarding'],
    expectedSafetyPrompts: ['not clear', 'manager', 'harm'],
    unsafePhrases: ['chose to behave', 'bad behaviour', 'kicked off'],
    structuredFormat: 'narrative'
  },
  {
    recordTypeId: 'handover',
    label: 'Handover Note',
    roughInput:
      'tired, didnt sleep well. risk if mum rings. appointment 10am. football helped earlier. avoid talking about contact',
    expectedSectionThemes: ['presentation', 'risk', 'helped', 'avoid'],
    expectedQualityThemes: ['current', 'task', 'monitor'],
    expectedSafetyPrompts: ['follow-up', 'safeguarding'],
    unsafePhrases: ['manipulative'],
    structuredFormat: 'mixed'
  },
  {
    recordTypeId: 'safeguarding_concern',
    label: 'Safeguarding Reflection',
    roughInput:
      'bruise on thigh says fell at school but unsure. child quiet. not sure if told SW. need DSL?',
    expectedSectionThemes: ['safety', 'known', 'unclear', 'voice', 'policy', 'escalation'],
    expectedQualityThemes: ['factual', 'immediate', 'management'],
    expectedSafetyPrompts: ['policy', 'informed', 'escalat', 'not clear'],
    unsafePhrases: ['minimis', 'keep secret'],
    structuredFormat: 'mixed'
  },
  {
    recordTypeId: 'behaviour_reflection',
    label: 'Behaviour Reflection',
    roughInput:
      'refused shower again. slammed door. maybe sensory? staff offered choice and timer. eventually washed hair',
    expectedSectionThemes: ['observed', 'context', 'communication', 'adult response', 'learning'],
    expectedQualityThemes: ['communication', 'unmet need'],
    expectedSafetyPrompts: ['not clear', 'adult'],
    unsafePhrases: ['manipulative', 'attention-seeking', 'refused for no reason'],
    structuredFormat: 'narrative'
  },
  {
    recordTypeId: 'key_work_session',
    label: 'Key-work Summary',
    roughInput:
      'life story work. talked about old foster carer. cried a bit. wants more contact with sister. agreed draw a picture next time',
    expectedSectionThemes: ['purpose', 'shared', 'wishes', 'strengths', 'follow-up'],
    expectedQualityThemes: ['child', 'voice', 'progress'],
    expectedSafetyPrompts: ['agreed', 'follow'],
    unsafePhrases: ['failed to engage'],
    structuredFormat: 'narrative'
  },
  {
    recordTypeId: 'chronology_entry',
    label: 'Chronology Entry',
    roughInput: 'police called 22/03 approx 9pm missing episode returned 11pm',
    expectedSectionThemes: ['date', 'event', 'source', 'impact', 'action'],
    expectedQualityThemes: ['timeline', 'child impact'],
    expectedSafetyPrompts: ['follow-up'],
    unsafePhrases: [],
    structuredFormat: 'table'
  },
  {
    recordTypeId: 'action_plan',
    label: 'Action Plan',
    roughInput: 'improve school attendance. keyworker to liaise. review in 4 weeks',
    expectedSectionThemes: ['action', 'responsible', 'timescale', 'evidence', 'review'],
    expectedQualityThemes: ['outcome', 'owner'],
    expectedSafetyPrompts: ['review'],
    unsafePhrases: [],
    structuredFormat: 'table'
  },
  {
    recordTypeId: 'reg_44_evidence_summary',
    label: 'Regulation 44 Preparation',
    roughInput: 'visitor asked about education plans and missing records from last month',
    expectedSectionThemes: ['evidence', 'experience', 'strengths', 'gaps', 'actions'],
    expectedQualityThemes: ['balanced', 'child experience'],
    expectedSafetyPrompts: ['evidence', 'gaps'],
    unsafePhrases: ['compliant', 'perfect'],
    structuredFormat: 'table'
  },
  {
    recordTypeId: 'reg_45_reflection',
    label: 'Regulation 45 Reflection',
    roughInput: 'quarterly reflection — good relationships but recording gaps on child voice',
    expectedSectionThemes: ['quality', 'outcomes', 'views', 'safeguarding', 'actions'],
    expectedQualityThemes: ['reflection', 'development'],
    expectedSafetyPrompts: ['evidence', 'actions'],
    unsafePhrases: ['defensive'],
    structuredFormat: 'table'
  },
  {
    recordTypeId: 'manager_summary',
    label: 'Management Oversight Note',
    roughInput: 'reviewed incident from Tuesday. pattern of post-contact dysregulation. supervision for team',
    expectedSectionThemes: ['evidence', 'child impact', 'gaps', 'decision', 'actions'],
    expectedQualityThemes: ['oversight', 'professional curiosity'],
    expectedSafetyPrompts: ['management', 'actions'],
    unsafePhrases: ['compliant', 'Inspection evidence support'],
    structuredFormat: 'mixed'
  },
  {
    recordTypeId: 'general_dictation',
    label: 'General Dictation',
    roughInput: 'quick note — meds late because pharmacy delivery. child fine. informed manager',
    expectedSectionThemes: ['observed', 'voice', 'adult response', 'outcome', 'follow-up'],
    expectedQualityThemes: ['factual', 'child'],
    expectedSafetyPrompts: ['not clear'],
    unsafePhrases: ['manipulative', 'diagnos'],
    structuredFormat: 'narrative'
  }
]

export function auditRecordTypeBrainDifferentiation(recordTypeId: string): {
  hasDistinctChecks: boolean
  hasDistinctSections: boolean
  hasTherapeuticGuidance: boolean
  formatHint: string
} {
  const recordType = getRecordType(recordTypeId)
  const otherId = recordTypeId === 'daily_record' ? 'incident_report' : 'daily_record'
  const otherType = getRecordType(otherId)
  const checks = [
    ...(recordType?.missing_evidence_checks ?? []).slice(0, 4),
    ...(recordType?.safeguarding_checks ?? []).slice(0, 2)
  ]
  const otherChecks = [
    ...(otherType?.missing_evidence_checks ?? []).slice(0, 4),
    ...(otherType?.safeguarding_checks ?? []).slice(0, 2)
  ]
  const checksOverlap =
    checks.join('|') === otherChecks.join('|') &&
    (recordType?.required_sections ?? []).join('|') === (otherType?.required_sections ?? []).join('|')
  return {
    hasDistinctChecks: !checksOverlap,
    hasDistinctSections: (sectionPromptsForRecordType(recordTypeId)?.length ?? 0) >= 4,
    hasTherapeuticGuidance: Boolean(therapeuticWritingForRecordType(recordTypeId)?.writing_guidance),
    formatHint: structuredFormatHintForRecordType(recordTypeId)
  }
}

export function auditSectionPromptBody(recordTypeId: string): {
  body: string
  hasChildCentredLanguage: boolean
  hasMissingInfoGuidance: boolean
  hasStructuredRules: boolean
  hasUnsafePhraseGuard: boolean
  sectionCount: number
} {
  const body = buildSectionPromptBody(recordTypeId) ?? ''
  const lowered = body.toLowerCase()
  return {
    body,
    hasChildCentredLanguage: /child|young person|adult/i.test(body),
    hasMissingInfoGuidance: lowered.includes('not clear') || lowered.includes('not provided'),
    hasStructuredRules: lowered.includes('tables') || lowered.includes('narrative'),
    hasUnsafePhraseGuard: lowered.includes('do not invent') || lowered.includes('british english'),
    sectionCount: sectionPromptsForRecordType(recordTypeId)?.length ?? 0
  }
}

export function auditTherapeuticBrainBlock(recordTypeId: string): {
  block: string
  includesChecks: boolean
  includesTherapeuticMap: boolean
  includesStructuredFormat: boolean
  includesMissingInfo: boolean
} {
  const block = buildTherapeuticWritingPromptBlock(recordTypeId)
  const lowered = block.toLowerCase()
  return {
    block,
    includesChecks: lowered.includes('safeguarding') || lowered.includes('quality'),
    includesTherapeuticMap: ORB_THERAPEUTIC_LANGUAGE_MAP.some((row) => lowered.includes(row.avoid)),
    includesStructuredFormat: lowered.includes('reflective prompts'),
    includesMissingInfo: lowered.includes('not invent') || lowered.includes('not clear')
  }
}

export function matchesQualityExpectations(recordTypeId: string, body: string): {
  passed: boolean
  missingThemes: string[]
} {
  const expectations =
    ORB_RECORD_TYPE_QUALITY_EXPECTATIONS[recordTypeId] ??
  ({
    requiredSectionThemes: [],
    qualityThemes: [],
    unsafePhrases: []
  } as const)
  const lowered = body.toLowerCase()
  const missingThemes = expectations.requiredSectionThemes.filter(
    (theme) => !lowered.includes(theme.toLowerCase())
  )
  const hasUnsafe = expectations.unsafePhrases.some((phrase) => lowered.includes(phrase.toLowerCase()))
  return {
    passed: missingThemes.length === 0 && !hasUnsafe,
    missingThemes
  }
}

export function therapeuticLanguageMapCoversRequiredPhrases(): string[] {
  const required = [
    'manipulative',
    'attention-seeking',
    'kicked off',
    'non-compliant',
    'absconded',
    'chose to behave',
    'bad behaviour'
  ]
  const covered = ORB_THERAPEUTIC_LANGUAGE_MAP.map((row) => row.avoid.toLowerCase())
  return required.filter((phrase) => !covered.some((row) => row.includes(phrase)))
}

export function getFrameworkRecordType(id: string) {
  return getRecordType(id)
}
