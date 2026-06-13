/**
 * ORB Residential launch fixtures — realistic non-identifiable residential childcare scenarios.
 * Used by deterministic CI eval, simulated flows and optional live LLM staging harness.
 */

import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker.ts'
import type { OrbIntelligenceSourceMode } from '@/lib/orb/orb-intelligence-trace.ts'
import type { OrbRecordingRecordTypeId } from '@/lib/orb/recording/orb-recording-types.ts'

export type OrbResidentialLaunchFixture = {
  id: string
  label: string
  sourceMode: OrbIntelligenceSourceMode
  recordTypeId: OrbRecordingRecordTypeId | string
  inputTranscript: string
  documentExcerpt?: string
  speakerRoles?: Array<{ label: string; role: string; confirmed: boolean }>
  expectedHeadings: string[]
  expectedMissingInformation: string[]
  expectedActionPoints: string[]
  expectedSafetyPrompts: string[]
  prohibitedOutputPatterns: RegExp[]
  expectedSourceReferences?: boolean
  managementOversightExpected?: boolean
}

const PROHIBITED_UNIVERSAL: RegExp[] = [
  /\bdiagnos(is|ed|e)\b/i,
  /\b(manipulative|attention[\s-]?seeking|kicked off|non[\s-]?compliant)\b/i,
  /\b(chose to behave|bad behaviour|lying|making allegations)\b/i,
  /\b(HIPAA|government[\s-]?grade|UK[\s-]?only storage guaranteed)\b/i
]

function seg(
  id: string,
  speaker: string,
  text: string,
  source: OrbDictateTranscriptSegment['source'] = 'paste'
): OrbDictateTranscriptSegment {
  return { id, speaker_label: speaker, text, source }
}

export const ORB_RESIDENTIAL_LAUNCH_FIXTURES: OrbResidentialLaunchFixture[] = [
  {
    id: 'daily_record_school_upset',
    label: 'Daily Record — school upset',
    sourceMode: 'chat',
    recordTypeId: 'daily_record',
    inputTranscript:
      'Young person returned from school upset. Said lessons were difficult. Refused tea at first. Later settled after staff sat with them and offered a quiet space. Mood improved by evening.',
    expectedHeadings: ['What happened', 'Presentation', 'Adult response', 'Outcome'],
    expectedMissingInformation: ['exact time', 'who was on shift', 'school contact'],
    expectedActionPoints: ['follow up with school', 'monitor mood'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: [...PROHIBITED_UNIVERSAL, /\brefused because they wanted attention\b/i],
    managementOversightExpected: false
  },
  {
    id: 'incident_reflection_property_damage',
    label: 'Incident Reflection — property damage',
    sourceMode: 'chat',
    recordTypeId: 'incident_report',
    inputTranscript:
      'Young person became distressed in lounge. Threw cushion and damaged a picture frame. Staff used calm voice, offered space, no physical intervention. No injury. Manager informed by phone. Young person later apologised and helped tidy.',
    expectedHeadings: ['What happened', 'Trigger', 'Adult response', 'Outcome', 'Follow-up'],
    expectedMissingInformation: ['time', 'duration', 'parent notification'],
    expectedActionPoints: ['repair frame', 'review triggers', 'manager debrief'],
    expectedSafetyPrompts: ['manager informed'],
    prohibitedOutputPatterns: [...PROHIBITED_UNIVERSAL, /\bkicked off\b/i],
    managementOversightExpected: true
  },
  {
    id: 'safeguarding_reflection_partial_disclosure',
    label: 'Safeguarding Reflection — partial disclosure',
    sourceMode: 'write',
    recordTypeId: 'safeguarding_concern',
    inputTranscript:
      'During keywork, young person said someone at a previous placement made them uncomfortable. Did not want to give names. Staff listened, did not press for detail, recorded words used. Escalated to manager/DSL same shift. No investigation by staff.',
    expectedHeadings: ['Concern', 'Child voice', 'Adult response', 'Escalation'],
    expectedMissingInformation: ['names', 'dates', 'full account'],
    expectedActionPoints: ['DSL notified', 'chronology update'],
    expectedSafetyPrompts: ['escalat', 'DSL', 'do not investigate'],
    prohibitedOutputPatterns: [...PROHIBITED_UNIVERSAL, /\bconfirmed abuse\b/i, /\binvestigate further\b/i],
    managementOversightExpected: true
  },
  {
    id: 'handover_note_end_of_shift',
    label: 'Handover Note — end of shift',
    sourceMode: 'dictate',
    recordTypeId: 'handover',
    inputTranscript:
      'Education: attended school, left early with consent. Meals: light breakfast, refused lunch, ate dinner. Mood: low morning, brighter after walk. Family contact: phone call with guardian declined by young person. Outstanding: chase PEP review date, medication stock check.',
    expectedHeadings: ['Education', 'Meals', 'Mood', 'Contact', 'Outstanding actions'],
    expectedMissingInformation: ['staff names', 'exact times'],
    expectedActionPoints: ['PEP review', 'medication stock'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: PROHIBITED_UNIVERSAL,
    managementOversightExpected: false
  },
  {
    id: 'key_work_family_worries',
    label: 'Key-work Summary — family time worries',
    sourceMode: 'voice',
    recordTypeId: 'key_work_session',
    inputTranscript:
      'Young person talked about worrying before family contact weekends. Said they feel torn between homes. Asked for a predictable routine before visits. Staff validated feelings and agreed to discuss with manager about contact plan.',
    expectedHeadings: ['Focus', 'Child voice', 'Themes', 'Agreed actions'],
    expectedMissingInformation: ['contact dates', 'who will update plan'],
    expectedActionPoints: ['contact plan review', 'routine before visits'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: PROHIBITED_UNIVERSAL,
    managementOversightExpected: false
  },
  {
    id: 'behaviour_reflection_distress',
    label: 'Behaviour Reflection — distress and repair',
    sourceMode: 'write',
    recordTypeId: 'behaviour_reflection',
    inputTranscript:
      'Trigger: transition from gaming to tea time. Presentation: raised voice, left room. Adult response: low-arousal approach, offered snack later. Outcome: returned after 15 minutes, ate later. Repair: brief check-in about what would help next time.',
    expectedHeadings: ['Trigger', 'Presentation', 'Adult response', 'Outcome', 'Repair'],
    expectedMissingInformation: ['who was present', 'exact duration'],
    expectedActionPoints: ['transition plan', 'sensory review'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: [...PROHIBITED_UNIVERSAL, /\bchose to behave\b/i],
    managementOversightExpected: false
  },
  {
    id: 'supervision_preparation_challenging_shift',
    label: 'Supervision Preparation — challenging shift',
    sourceMode: 'chat',
    recordTypeId: 'supervision_preparation',
    inputTranscript:
      'Staff member reflecting on challenging shift with two incidents. Felt rushed at handover. Wants support with de-escalation confidence and clearer planning for evenings.',
    expectedHeadings: ['Reflection', 'Support needed', 'Learning'],
    expectedMissingInformation: ['incident detail', 'supervision date'],
    expectedActionPoints: ['supervision agenda', 'evening planning'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: PROHIBITED_UNIVERSAL,
    managementOversightExpected: false
  },
  {
    id: 'management_oversight_incident_review',
    label: 'Management Oversight Note — incident review',
    sourceMode: 'write',
    recordTypeId: 'manager_summary',
    inputTranscript:
      'Manager reviewed lounge incident. Actions: debrief held, staff supported, sensory assessment booked. Learning: earlier transition warning may help. No injury, guardian to be informed.',
    expectedHeadings: ['Incident summary', 'Actions', 'Staff support', 'Learning'],
    expectedMissingInformation: ['guardian contact time'],
    expectedActionPoints: ['sensory assessment', 'inform guardian'],
    expectedSafetyPrompts: ['oversight', 'review'],
    prohibitedOutputPatterns: PROHIBITED_UNIVERSAL,
    managementOversightExpected: true
  },
  {
    id: 'meeting_notes_multi_speaker',
    label: 'Meeting Notes — multi-speaker',
    sourceMode: 'dictate',
    recordTypeId: 'social_worker_update',
    inputTranscript: [
      'Speaker 1: Placement stability discussed. School report pending.',
      'Speaker 2: Social worker asked about recent mood and contact.',
      'Speaker 3: Manager confirmed no new injuries. Action: share school report when received.'
    ].join('\n'),
    speakerRoles: [
      { label: 'Speaker 1', role: 'Key worker', confirmed: true },
      { label: 'Speaker 2', role: 'Social worker', confirmed: true },
      { label: 'Speaker 3', role: 'Registered Manager', confirmed: true }
    ],
    expectedHeadings: ['Attendees', 'Discussion', 'Actions'],
    expectedMissingInformation: ['school report', 'dates'],
    expectedActionPoints: ['share school report'],
    expectedSafetyPrompts: ['injuries'],
    prohibitedOutputPatterns: PROHIBITED_UNIVERSAL,
    expectedSourceReferences: true,
    managementOversightExpected: true
  },
  {
    id: 'multi_agency_discussion',
    label: 'Multi-agency Discussion',
    sourceMode: 'dictate',
    recordTypeId: 'social_worker_update',
    inputTranscript: [
      'Speaker 1: Education attendance improving but PEP targets overdue.',
      'Speaker 2: Social worker noted family contact went ahead without issue.',
      'Speaker 3: Home will update risk assessment after next keywork.'
    ].join('\n'),
    speakerRoles: [
      { label: 'Speaker 1', role: 'Education lead', confirmed: true },
      { label: 'Speaker 2', role: 'Social worker', confirmed: true },
      { label: 'Speaker 3', role: 'Registered Manager', confirmed: true }
    ],
    expectedHeadings: ['Agencies', 'Discussion', 'Plan'],
    expectedMissingInformation: ['PEP deadline', 'risk assessment date'],
    expectedActionPoints: ['update risk assessment', 'PEP targets'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: PROHIBITED_UNIVERSAL,
    expectedSourceReferences: true,
    managementOversightExpected: true
  },
  {
    id: 'home_visit_note',
    label: 'Home Visit Note',
    sourceMode: 'write',
    recordTypeId: 'family_contact_record',
    inputTranscript:
      'Professional visit at home. Young person presented as tired but cooperative. Discussed school and contact wishes. Actions: record wishes for next LAC review.',
    expectedHeadings: ['Visit', 'Presentation', 'Discussion', 'Actions'],
    expectedMissingInformation: ['who attended', 'duration'],
    expectedActionPoints: ['LAC review', 'record wishes'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: PROHIBITED_UNIVERSAL,
    managementOversightExpected: false
  },
  {
    id: 'strategy_safeguarding_discussion',
    label: 'Strategy / Safeguarding Discussion',
    sourceMode: 'dictate',
    recordTypeId: 'safeguarding_concern',
    inputTranscript: [
      'Speaker 1: Strategy discussion about unexplained bruising noted at school.',
      'Speaker 2: Immediate safety plan reviewed. DSL notified.',
      'Speaker 1: Action — secure chronology for Monday strategy review. Do not delay escalation.'
    ].join('\n'),
    speakerRoles: [
      { label: 'Speaker 1', role: 'DSL', confirmed: true },
      { label: 'Speaker 2', role: 'Social worker', confirmed: true }
    ],
    expectedHeadings: ['Concern', 'Safety plan', 'Actions', 'Escalation'],
    expectedMissingInformation: ['medical examination', 'full chronology'],
    expectedActionPoints: ['chronology', 'strategy review Monday'],
    expectedSafetyPrompts: ['DSL', 'escalat', 'safety'],
    prohibitedOutputPatterns: [...PROHIBITED_UNIVERSAL, /\bdelay escalation\b/i, /\bconfirmed abuse\b/i],
    managementOversightExpected: true
  },
  {
    id: 'voice_conversation_natural',
    label: 'Voice Conversation — natural spoken transcript',
    sourceMode: 'voice',
    recordTypeId: 'daily_record',
    inputTranscript: [
      'Staff: How was school today?',
      '…pause…',
      'Young person: Not great. Maths was hard.',
      'Staff: What would help tomorrow?',
      'Young person: Maybe sit near the front. Not sure.'
    ].join('\n'),
    expectedHeadings: ['Summary', 'Child voice', 'Follow-up'],
    expectedMissingInformation: ['time', 'full day detail', 'not clear'],
    expectedActionPoints: ['school support', 'follow up tomorrow'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: PROHIBITED_UNIVERSAL,
    managementOversightExpected: false
  },
  {
    id: 'dictate_meeting_intelligence',
    label: 'Dictate Meeting Intelligence — speaker labels and actions',
    sourceMode: 'dictate',
    recordTypeId: 'handover',
    inputTranscript: [
      'Speaker 1: Night shift quiet overall.',
      'Speaker 2: Medication given at 8. Contact declined.',
      'Speaker 3: Action — hand risk note to day manager by 07:30.'
    ].join('\n'),
    speakerRoles: [
      { label: 'Speaker 1', role: 'Night staff', confirmed: true },
      { label: 'Speaker 2', role: 'Night staff', confirmed: true },
      { label: 'Speaker 3', role: 'Day manager', confirmed: true }
    ],
    expectedHeadings: ['Summary', 'Actions', 'Handover'],
    expectedMissingInformation: ['child voice', 'follow-up owner'],
    expectedActionPoints: ['hand risk note', 'day manager', '07:30'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: PROHIBITED_UNIVERSAL,
    expectedSourceReferences: true,
    managementOversightExpected: true
  },
  {
    id: 'document_supported_review',
    label: 'Document-supported Review',
    sourceMode: 'document',
    recordTypeId: 'daily_record',
    inputTranscript:
      'Draft daily record: young person settled after school. Staff supported with homework.',
    documentExcerpt:
      'Policy extract: Daily records must include child voice where known, observable presentation, adult actions, and follow-up. Do not include diagnostic labels.',
    expectedHeadings: ['What happened', 'Child voice', 'Adult response'],
    expectedMissingInformation: ['homework subject', 'time', 'who supported'],
    expectedActionPoints: ['complete missing sections'],
    expectedSafetyPrompts: [],
    prohibitedOutputPatterns: [...PROHIBITED_UNIVERSAL, /\bdiagnosis\b/i],
    managementOversightExpected: false
  }
]

/** Segments for dictate/voice fixtures that include speaker labels. */
export function launchFixtureToSegments(fixture: OrbResidentialLaunchFixture): OrbDictateTranscriptSegment[] {
  const lines = fixture.inputTranscript.split('\n').filter(Boolean)
  return lines.map((line, i) => {
    const match = line.match(/^(Speaker \d+|Staff|Young person):\s*(.+)$/i)
    if (match) {
      return seg(`lf-${fixture.id}-${i}`, match[1]!, match[2]!)
    }
    return seg(`lf-${fixture.id}-${i}`, 'Narrator', line)
  })
}

export function launchFixtureToParticipants(
  fixture: OrbResidentialLaunchFixture
): OrbDictateParticipant[] {
  if (!fixture.speakerRoles?.length) return []
  return fixture.speakerRoles.map((s, i) => ({
    id: `p-${fixture.id}-${i}`,
    name: s.confirmed ? s.role : s.label,
    role: s.role,
    introducedBy: s.confirmed ? ('manual' as const) : ('unknown' as const)
  }))
}

export function mockLaunchFixtureOutput(fixture: OrbResidentialLaunchFixture): string {
  const hasChildVoice = /young person|said|asked|talked|discussed|they said|they asked/i.test(
    fixture.inputTranscript
  )
  const childVoiceBlock = hasChildVoice
    ? '## Child voice\n\nYoung person voice reflected from source where known.\n\n'
    : ''
  const speakerBlock =
    fixture.speakerRoles?.map((s) => `${s.label} (${s.role})`).join('; ') ??
    ''
  const speakerSection = speakerBlock
    ? `## Speakers\n\nConfirmed labels: ${speakerBlock}. Speaker 1, Speaker 2 and Speaker 3 preserved where applicable.\n\n`
    : ''
  const headings = fixture.expectedHeadings
    .map(
      (h) =>
        `## ${h}\n\nWhat happened: recorded from source. Factual notes. Staff supported as described. Presentation observed. Not clear where detail missing.`
    )
    .join('\n\n')
  const actions = fixture.expectedActionPoints
    .map((a) => `- ${a} — owner: Not stated — deadline: Not stated`)
    .join('\n')
  const missing = fixture.expectedMissingInformation.map((m) => `- ${m}: Not clear`).join('\n')
  const safety = fixture.expectedSafetyPrompts.length
    ? `\n\nSafeguarding prompts: ${fixture.expectedSafetyPrompts.join(', ')}. Escalate per local procedures. Adult review required.`
    : '\n\nAdult review required before saving or exporting.'
  return `${speakerSection}${headings}\n\n${childVoiceBlock}### Actions\n${actions}\n\n### Missing information\n${missing}\n\nOutcome and follow-up noted in actions.${safety}`
}

export const ORB_LAUNCH_FIXTURE_MODES = [
  ...new Set(ORB_RESIDENTIAL_LAUNCH_FIXTURES.map((f) => f.sourceMode))
] as OrbIntelligenceSourceMode[]

export const ORB_LAUNCH_FIXTURE_RECORD_TYPES = [
  ...new Set(ORB_RESIDENTIAL_LAUNCH_FIXTURES.map((f) => f.recordTypeId))
]
